const express = require("express");
const createError = require("http-errors");
const Joi = require("joi");

const { POINT_KIND, BONUS_VALUE, NOTIFICATION_KIND, REWARD_HISTORY_KINDS } = require("../constants");
const {
  getUserByTekmetricId,
  createCustomerIONotificationEvent,
  addNotificationInDB,
} = require("../controllers/users.controller");
const { webhookAuth, validate } = require("../middlewares");
const {
  getVehicleByVin,
  makeVehiclePremium,
} = require("../controllers/vehicle.controller");
const { getByKey, getRawardValues } = require("../controllers/dynamic-keys.controller");
const { customerioController, usersController } = require("../controllers");
const { RewardHistory } = require("../models");

const router = express.Router();
Joi.objectId = require("joi-objectid")(Joi);

router.post(
  "/membership",
  [
    webhookAuth,
    validate({
      body: Joi.object({
        vin: Joi.string().required().required(),
        userTekmetricId: Joi.number().required(),
        startDate: Joi.string().required()
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      const { vin, userTekmetricId, startDate } = req.body;
      const user = await getUserByTekmetricId(userTekmetricId);
      if (!user) {
        throw createError(
          400,
          `User not found against tekmetric ID ${userTekmetricId}`
        );
      }

      const vehicle = await getVehicleByVin(vin);
      if (!vehicle) {
        throw createError(400, `Vehicle not found against vin ${vin}`);
      }
      if (vehicle.userId.toString() !== user._id.toString()) {
        throw createError(
          401,
          `This vehicle (${vin}) doesn't belong to this user with Tekmetric ID ${userTekmetricId}`
        );
      }

      // TODO: which data will be send, it will be told by Ashar bhai in sheet, for now there is nothing such info in sheet
      await customerioController.track(userTekmetricId, 'plat_mem_appt');

      await makeVehiclePremium(vehicle._id, startDate);

      res.status(200).send();
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/redeem",
  [
    webhookAuth,
    validate({
      body: Joi.object({
        points: Joi.number().required(),
        userTekmetricId: Joi.number().required(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      let { points, userTekmetricId } = req.body;
      points = parseInt(points);

      const user = await getUserByTekmetricId(userTekmetricId);
      if (!user) {
        throw createError(
          400,
          `User not found against tekmetric ID ${userTekmetricId}`
        );
      }
      if (user.rewardAmount < points) {
        await customerioController.track(user.tekmetricId, "redemption_error", {
          credits_at_start: user.rewardAmount,
          credits_used: points,
        });

        // user.rewardAmount = 0;
        // await user.save();

        throw createError(400, `User doesn't have that much reward points`);
      } else {
        await customerioController.track(user.tekmetricId, "credit_redeemed", {
          credits_at_start: user.rewardAmount,
          credits_used: points,
          credits_remaining: user.rewardAmount - points,
        });
        user.rewardAmount = user.rewardAmount - points;

        await RewardHistory.create({
          user: user._id,
          kind: REWARD_HISTORY_KINDS.REWARD_REDEEMED,
          amount: points
        })
        
        await createCustomerIONotificationEvent(
          user._id,
          NOTIFICATION_KIND.REWARD_REDEEMED,
          {
            creditAmount: points,
          },
          "Credit Redeemed",
          `You have redeemed $${points}`
        );

        await user.save();
      }

      res.status(200).send();
    } catch (error) {
      next(error);
    }
  }
);

router.post(
	"/notification",
	[
		webhookAuth,
		validate({
			body: Joi.object({
				title: Joi.string().required(),
				description: Joi.string().required(),
				kind: Joi.string().required(),
				payload: Joi.object(),
				userId: Joi.string().required(),
			}),
		}),
	],
	async (req, res, next) => {
		try {
			const { userId, kind, payload, title, description } = req.body;
			const newNotification = await addNotificationInDB(
				userId,
				kind,
				payload,
				title,
				description
			);

			res.status(200).json(newNotification);
		} catch (error) {
			next(error);
		}
	}
);

router.post(
  "/points",
  [
    webhookAuth,
    validate({
      body: Joi.object({
        kind: Joi.string().required(),
        userTekmetricId: Joi.number().required(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      const { kind, userTekmetricId } = req.body;
      const user = await getUserByTekmetricId(userTekmetricId);
      if (!user) {
        throw createError(
          400,
          `User not found against tekmetric ID ${userTekmetricId}`
        );
      }

      const { loyaltyBonusValue, referralBonusValue } = await getRawardValues();

      switch (kind) {
        case POINT_KIND.LOYALTY:
          await customerioController.track(
            user.tekmetricId,
            "visit_credit_earned",
            {
              credit_amount: loyaltyBonusValue,
            }
          );
          await RewardHistory.create({
            user: user._id,
            kind: REWARD_HISTORY_KINDS.VISIT_REWARD_ADDED,
            amount: loyaltyBonusValue
          })
          await createCustomerIONotificationEvent(
            user._id,
            NOTIFICATION_KIND.VISIT_REWARD_ADDED,
            {
              creditAmount: loyaltyBonusValue,
            },
            "New Visit Reward",
            `You have earned visit reward of $${referralBonusValue}`
          );
          break;

        case POINT_KIND.REFERRAL:
          const referrerUser = await usersController.getUserById(
            user.referrerUserId
          );
          if (!referrerUser) {
            throw createError(400, `referrerUser not found`);
          }
          referrerUser.rewardAmount =
            referrerUser.rewardAmount + referralBonusValue;
          await referrerUser.save();
          await customerioController.track(
            referrerUser.tekmetricId,
            "referee_credit_earned",
            {
              credit_amount: referralBonusValue,
              referral_full_name: user.fullName,
            }
          );
          await RewardHistory.create({
            user: user._id,
            kind: REWARD_HISTORY_KINDS.REFEREE_REWARD_ADDED,
            amount: referralBonusValue
          })
          await createCustomerIONotificationEvent(
            user._id,
            NOTIFICATION_KIND.REFEREE_REWARD_ADDED,
            {
              creditAmount: referralBonusValue,
              referralFullname: user.fullName,
            },
            "New Referee Reward",
            `You have earned referee reward of $${credit_amount}`
          );

          await customerioController.track(
            user.tekmetricId,
            "referral_credit_earned",
            {
              credit_amount: referralBonusValue,
              referee_full_name: referrerUser.fullName,
            }
          );
          await RewardHistory.create({
            user: user._id,
            kind: REWARD_HISTORY_KINDS.REFERRAL_REWARD_ADDED,
            amount: referralBonusValue
          })
          await createCustomerIONotificationEvent(
            user._id,
            NOTIFICATION_KIND.REFERRAL_REWARD_ADDED,
            {
              creditAmount: referralBonusValue,
              refereeFullName: referrerUser.fullName,
            },
            "New Referral Reward",
            `You have earned referral reward of $${referralBonusValue}`
          );
          break;

        default:
          throw createError(400, `Invalid kind provided`);
      }

      switch (kind) {
        case POINT_KIND.LOYALTY:
          user.rewardAmount = user.rewardAmount + loyaltyBonusValue;
          break;

        case POINT_KIND.REFERRAL:
          user.rewardAmount = user.rewardAmount + referralBonusValue;
          break;

        default:
          throw createError(400, `Invalid kind provided`);
      }
      // if (user.rewardAmount > 100) {
      //   user.rewardAmount = 100;
      // }
      await user.save();

      res.status(200).send();
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
