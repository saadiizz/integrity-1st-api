const createError = require("http-errors");
const express = require("express");
const Joi = require("joi");
const path = require("path");

const { auth, validate, jwtAuth } = require("../middlewares");
const { authController, usersController, customerioController } = require("../controllers");
const { sendEmail } = require("../utils/aws.util");
const { SEND_PHONE_CODE_SOURCE, USER_STATUS } = require("../constants");
const { getSafeUserToReturn } = require("../utils/generic.util");
const { updateUserTokens } = require("../controllers/users.controller");

const router = express.Router();

router.post(
  "/send-phonecode",
  [
    validate({
      body: Joi.object({
        phoneNumber: Joi.string().required(),
        password: Joi.string().required(),
        shopId: Joi.string().required(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      const { phoneNumber, shopId, password } = req.body;
      if (await usersController.isPhoneExists(phoneNumber)) {
        throw createError(409, "Phone number already exists");
      }
      await authController.sendCodeOnPhone(phoneNumber, shopId, password);
      res.status(200).send({ message: "Code has been sent succesfully" });
    } catch (error) {
      next(error);
    }
  }
);


router.post(
  "/send-forgot-phonecode",
  [
    validate({
      body: Joi.object({
        phoneNumber: Joi.string().required()
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      const { phoneNumber } = req.body;
      const user = await authController.getUserByPhoneNumber(phoneNumber);
      if (!user) {
        throw createError(403, "No user found against this phone number.");
      }

      await authController.sendCodeOnPhone(phoneNumber);
      await customerioController.track(user.tekmetricId, "forgot_password_request")

      
      res.status(200).send({ message: "Code has been sent succesfully" });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/verify-phonecode",
  [
    validate({
      body: Joi.object({
        phoneNumber: Joi.string().required(),
        code: Joi.string().required(),
        tokenData: Joi.object().optional(),
        deviceType: Joi.string().optional(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      let { phoneNumber, code, deviceType, tokenData } = req.body;
      phoneNumber = phoneNumber.replaceAll(" ", "");

      const { shopId, password } = await authController.verifyPhoneCode(
        phoneNumber,
        code
      );
      if (!shopId) {
        throw createError(400, "Error: Invalid path used to register, no shopId found");
      }

      const user = await authController.register(phoneNumber, shopId, password, deviceType);
      if (tokenData) {
        await updateUserTokens(user, tokenData);
      }
      res.status(200).json({
        token: auth.createToken({ _id: user._id }),
        user: getSafeUserToReturn(user),
      });
    } catch (error) {
      next(error);
    }
  }
);


router.post(
  "/verify-forgot-phonecode",
  [
    validate({
      body: Joi.object({
        phoneNumber: Joi.string().required(),
        code: Joi.string().required(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      let { phoneNumber, code } = req.body;
      phoneNumber = phoneNumber.replaceAll(" ", "");

      await authController.verifyPhoneCode(phoneNumber, code);

      const user = await authController.getUserByPhoneNumber(phoneNumber);
      if (!user) {
        throw createError(403, "No user found against this phone number.");
      }
      // await customerioController.track(user.tekmetricId, "forgot_password_success"); this will be called from FE as decided on call with Ismaiel

      res.status(200).json({
        token: auth.createToken({ _id: user._id }),
        user: getSafeUserToReturn(user),
      });
    } catch (error) {
      next(error);
    }
  }
);


router.post(
  "/login",
  [
    validate({
      body: Joi.object({
        phoneNumber: Joi.string().required(),
        password: Joi.string().min(6).required(),
        tokenData: Joi.object().optional(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      let { phoneNumber, password, tokenData } = req.body;
      const user = await authController.login(phoneNumber, password);
      if (user.userStatus === USER_STATUS.BLOCKED) {
        throw createError(410, "Your account has been blocked");
      }

      if (tokenData) {
        await updateUserTokens(user, tokenData);
      }

      if (user.userStatus === USER_STATUS.DELETED) {
        throw createError(410, "Your account has been deleted");
      }

      res.status(200).json({
        token: auth.createToken({ _id: user._id }),
        user: getSafeUserToReturn(user),
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/send-email-verification-link",
  auth.verifyToken,
  async (req, res, next) => {
    try {
      const { email } = req.user;
      await authController.sendEmailVerificationLink(email);
      res.status(200).send();
    } catch (error) {
      next(error);
    }
  }
);

router.get("/verify-email", async (req, res, next) => {
  try {
    const { code, email } = req.query;

    await authController.verifyEmailCode(email, code);

    res.status(200).send("Your email has been verified successfully");
  } catch (error) {
    res.status(200).send(error.message);
    // next(error);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;
    await authController.forgotPassword(email);
    res.status(200).send("Recovery email has been sent successfully");
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  const { email, code, newPassword } = req.body;

  try {
    await authController.resetPassword(email, code, newPassword);

    res
      .status(200)
      .send("Password updated sucessfully, you can now login through the app.");
  } catch (error) {
    next(error);
  }
});

router.post(
  "/change-password",
  auth.verifyToken,
  validate({
    body: Joi.object({
      oldPassword: Joi.string().required(),
      newPassword: Joi.string().min(6).required(),
    }),
  }),
  async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;

    try {
      await authController.changePassword(req.user, oldPassword, newPassword);

      res.status(200).send("Password updated sucsessfully");
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/",
  auth.verifyToken,
  async (req, res, next) => {
    try {
      await authController.deleteAccount(req.user);

      res.status(200).send("Account deleted sucsessfully");
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
