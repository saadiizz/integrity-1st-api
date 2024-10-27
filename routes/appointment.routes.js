const express = require("express");
const createError = require("http-errors");
const Joi = require("joi");

const { customerioController } = require("../controllers");
const {
  BONUS_VALUE,
  NOTIFICATION_KIND,
  APPOINTMENT_STATUS,
} = require("../constants");
const {
  createGuestAppointment,
  getAppointmentList,
  updateAppoitment,
  deleteAppoitments,
  handleAppointmentCreationRequest,
  getAppointmentById,
  getAppointmentsCountPerUser,
} = require("../controllers/appointment.controller");
const { auth, validate } = require("../middlewares");
const {
  getByKey,
  getRawardValues,
} = require("../controllers/dynamic-keys.controller");
const { createAdminNotification } = require("../controllers/admin.controller");
const tekmetricController = require("../controllers/tekmetric.controller");
const {
  getAppointmentReasonById,
} = require("../controllers/appointment-reason.controller");
const { getUserByReferralCode } = require("../controllers/users.controller");

const router = express.Router();
Joi.objectId = require("joi-objectid")(Joi);

router.post(
  "/",
  [
    auth.verifyToken,
    validate({
      body: Joi.object({
        appointmentAt: Joi.string().required(),
        description: Joi.string().allow(""),
        isEarlyBird: Joi.boolean(),
        isAfterHours: Joi.boolean(),
        vehicle: Joi.objectId(),
        appointmentReason: Joi.objectId(),
        pageName: Joi.string(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      const appointment = await handleAppointmentCreationRequest(
        req.user,
        req.body
      );
      res.status(200).json(appointment);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/",
  [
    auth.verifyToken,
    validate({
      query: Joi.object({
        page: Joi.number(),
        limit: Joi.number(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      const { _id } = req.user;
      const { page, limit } = req.query;
      const [appointments, total] = await getAppointmentList(
        _id,
        parseInt(page),
        parseInt(limit)
      );
      res.status(200).json({ appointments, total });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/:appointmentId", async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await getAppointmentById(appointmentId);
    res.status(200).json(appointment);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/guest",
  [
    validate({
      body: Joi.object({
        tekmetricShopId: Joi.number().required(),
        fullName: Joi.string().required(),
        email: Joi.string().required(),
        phoneNumber: Joi.string().required(),

        appointmentAt: Joi.string().required(),
        description: Joi.string().allow(""),
        isEarlyBird: Joi.boolean(),
        isAfterHours: Joi.boolean(),

        // if it will be there then trigger cio events refferal_appointment_set, your_referral_booked
        referralCode: Joi.string().required(),

        appointmentReason: Joi.objectId(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      const {
        tekmetricShopId,
        fullName,
        phoneNumber,
        email,
        appointmentAt,
        description,
        isEarlyBird,
        isAfterHours,
        referralCode,
        appointmentReason: appointmentReasonId,
      } = req.body;
      let referrerUser;
      if (referralCode) {
        referrerUser = await getUserByReferralCode(referralCode);
        if (!referrerUser) {
          throw createError.BadRequest("Invalid referral code");
        }

        if (!referrerUser.tekmetricId) {
          throw createError.InternalServerError(
            "referrerUser doesn't have tekmetricId"
          );
        }
        // event for referrer
        await customerioController.track(
          referrerUser.tekmetricId,
          "your_referral_booked",
          {
            referralCode,
          }
        );
      }

      let userTekmetricId;
      let tekmetricUser = await tekmetricController.getCustomer(
        null,
        phoneNumber,
        tekmetricShopId
      );
      if (!tekmetricUser) {
        tekmetricUser = await tekmetricController.createCustomer({
          tekmetricShopId,
          fullName,
          phoneNumber,
          email,
        });
      }
      userTekmetricId = tekmetricUser.tekmetricId;

      await customerioController.createOrUpdateUser(userTekmetricId, {
        fullName,
        phoneNumber,
        email,
        isAppUser: false,
      });

      if (referralCode) {
        // event for referee
        await customerioController.track(
          userTekmetricId,
          "refferal_appointment_set",
          {
            tekmetricShopId,
            fullName,
            phoneNumber,
            email,
            appointmentAt,
            description,
            isEarlyBird,
            isAfterHours,
            // referralCode,
            appointmentReason: appointmentReasonId,
            // referrerUser: referrerUser.tekmetricId,
          }
        );
      }

      const { loyaltyBonusValue, referralBonusValue } = await getRawardValues();
      let rewardValue = loyaltyBonusValue;
      const newAppointment = await createGuestAppointment({
        fullName,
        email,
        phoneNumber,
        appointmentAt,
        description,
        isEarlyBird,
        isAfterHours,
        appointmentReasonId,
        tekmetricShopId,
        userTekmetricId,
      });
      rewardValue = referralBonusValue;

      res.status(200).json({ ...newAppointment.toJSON(), rewardValue });

      createAdminNotification(
        NOTIFICATION_KIND.NEW_APPOINTMENT_CREATED,
        { appointmentId: newAppointment._id },
        "New Guest Appointment",
        "New guest appointment has been created"
      );
    } catch (error) {
      next(error);
    }
  }
);

router.delete("/:appointmentIds", async (req, res, next) => {
  try {
    const { appointmentIds } = req.params;
    const updatedAppointment = await deleteAppoitments(
      appointmentIds.split(","),
      {
        status: APPOINTMENT_STATUS.DELETED,
      }
    );
    res.status(200).json(updatedAppointment);
  } catch (error) {
    next(error);
  }
});

router.patch("/:appointmentId", async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const updatedAppointment = await updateAppoitment(appointmentId, req.body);
    res.status(200).json(updatedAppointment);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
