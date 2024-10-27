const express = require("express");
const createError = require("http-errors");

const Joi = require("joi");

const { usersController, authController } = require("../controllers");
const { auth, validate } = require("../middlewares");
const {
  getSafeUserToReturn,
  getRandomAlphanumericCode,
  createRandomCode,
} = require("../utils/generic.util");
const {
  findReferrerUser,
  notifyAboutReferralRegistered,
} = require("../controllers/users.controller");
const { createAdminNotification } = require("../controllers/admin.controller");
const { NOTIFICATION_KIND } = require("../constants");

const router = express.Router();
Joi.objectId = require("joi-objectid")(Joi);

router.get(
  "/referee",
  auth.verifyToken,
  validate({
    query: Joi.object({
      customReferralId: Joi.objectId(),
    }),
  }),
  async function (req, res, next) {
    try {
      const referees = await usersController.getReferees(req.user, req.query);

      res.status(200).send(referees);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/",
  auth.verifyToken,
  validate({
    body: Joi.object({
      email: Joi.string().email(),
      password: Joi.string().min(6),
      fullName: Joi.string(),
      aboutMe: Joi.string(),
      phoneNumber: Joi.string().optional(),
      // userName: Joi.string(),
      // preferredName: Joi.string(),
      // gender: Joi.string(),
      // connectWith: Joi.array(),
      // dateOfBirth: Joi.string(),
      // homeLocation: Joi.object(),
      // interests: Joi.array(),
      // images: Joi.array(),
      // userLanguages: Joi.array(),
      // userHeightCm: Joi.number(),
      // jobTitle: Joi.string(),
      // jobCompany: Joi.string(),
      // userSchool: Joi.string(),
      // isHosting: Joi.boolean(),
      // isMeetLocalHosts: Joi.boolean(),
      // ageRange: Joi.object(),
      // maxDistance: Joi.number(),
      // distanceUnit: Joi.string(),
      // isHideProfile: Joi.boolean(),
      // isHideAge: Joi.boolean(),
      // userTimeZone: Joi.string(),
      // emergencyContact: Joi.object(),
      // isTutorialDone: Joi.boolean(),
      // isSubscriptionModalOff: Joi.boolean(),
      // userStatus: Joi.string(),
      // notificationSettings: Joi.object(),
      // referralCode: Joi.string(),
    }),
  }),
  async (req, res, next) => {
    const { _id } = req.user;

    try {
      const user = await usersController.updateUser(_id, req.body, req.user);
      res.status(200).json(getSafeUserToReturn(user));
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/post-register",
  [
    auth.verifyToken,
    validate({
      body: Joi.object({
        fullName: Joi.string().required(),
        email: Joi.string().required(),
        referralCode: Joi.string().optional(),
        deviceType: Joi.string().optional(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      let { email, referralCode, fullName, deviceType } = req.body;
      const { _id: userId } = req.user;

      const userData = {
        deviceType,
        fullName,
        email,
      };

      let referrerUser;
      if (referralCode) {
        referrerUser = await findReferrerUser(referralCode);
        if (!referrerUser) {
          throw createError(400, "Invalid referral code");
        }
        userData.referrerUserId = referrerUser._id;
      }

      const user = await usersController.updateUser(userId, userData, req.user);

      res.status(200).json(getSafeUserToReturn(user));

      if (referralCode) {
			  await notifyAboutReferralRegistered(referrerUser._id, userId);
		  }

      createAdminNotification(
        NOTIFICATION_KIND.NEW_ACCOUNT_REGISTERED,
        { userId },
        "New account registered",
        `New user ${fullName} has created their account`
      );
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/phone-number",
  auth.verifyToken,
  validate({
    body: Joi.object({
      phoneNumber: Joi.string().required(),
      code: Joi.string().required(),
    }),
  }),
  async (req, res, next) => {
    try {
      const { _id } = req.user;
      let { phoneNumber, code } = req.body;

      phoneNumber = phoneNumber.replaceAll(" ", "");
      await authController.verifyPhoneCode(phoneNumber, code);

      const user = await usersController.updateUser(
        _id,
        { phoneNumber },
        req.user
      );

      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }
);

router.get("/me", auth.verifyToken, async function (req, res, next) {
  try {
    res.status(200).json(getSafeUserToReturn(req.user));
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/token",
  auth.verifyToken,
  validate({
    body: Joi.object({
      tokenData: Joi.object().required(),
    }),
  }),
  async function (req, res, next) {
    const { _id } = req.user;
    const { tokenData } = req.body;

    try {
      // await usersController.updateUserTokens(_id, tokenData);
      res.status(200).send();
    } catch (error) {
      next(error);
    }
  }
);

router.delete("/token", auth.verifyToken, async function (req, res, next) {
  const { _id } = req.user;
  const { deviceId } = req.query;

  try {
    await usersController.deleteUserToken(_id, deviceId);
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:userId/block",
  auth.verifyToken,
  async function (req, res, next) {
    const { userId } = req.params;

    try {
      await usersController.blockUser(userId);
      res.status(200).send();
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:userId/block",
  auth.verifyToken,
  async function (req, res, next) {
    const { userId } = req.params;

    try {
      await usersController.unblockUser(userId);
      res.status(200).send();
    } catch (error) {
      next(error);
    }
  }
);

router.get("/notifications", auth.verifyToken, async (req, res, next) => {
  try {
    const { _id: userId } = req.user;
    const { page, limit } = req.query;
    const [notifications, total] = await usersController.getNotificationsList(
      userId,
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json({ notifications, total });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/notifications/read-all",
  auth.verifyToken,
  async (req, res, next) => {
    try {
      const { _id: userId } = req.user;
      await usersController.readAllNotifications(userId);

      res.status(200).json({ message: "Notifications read successfully" });
    } catch (error) {
      next(error);
    }
  }
);

router.delete("/", auth.verifyToken, async (req, res, next) => {
  try {
    const { userIds } = req.query;

    await usersController.deleteUsers(userIds);

    res.status(200).json("Users deleted successfully.");
  } catch (error) {
    next(error);
  }
});

router.get(
  "/reward-transaction-history",
  auth.verifyToken,
  async (req, res, next) => {
    try {
      const { _id: userId } = req.user;

      const rewardTransactionHistory =
        await usersController.getRewardTransactionHistory(userId);

      res.status(200).json(rewardTransactionHistory);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
