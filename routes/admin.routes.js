const createError = require("http-errors");
const express = require("express");
const Joi = require("joi");
Joi.objectId = require("joi-objectid")(Joi);

const { auth, isAdminMDW, validate } = require("../middlewares");
const {
  authController,
  adminController,
  usersController,
} = require("../controllers");
const { USER_STATUS } = require("../constants");
const { getSafeUserToReturn } = require("../utils/generic.util");
const { handleAppointmentCreationRequest } = require("../controllers/appointment.controller");

const router = express.Router();

router.post(
  "/login",
  validate({
    body: Joi.object({
      phoneNumber: Joi.string().required(),
      password: Joi.string().min(6).required(),
    }),
  }),
  async (req, res, next) => {
    try {
      let { phoneNumber, password } = req.body;
      const user = await authController.login(phoneNumber, password);
      if (!user.isAdmin) {
        throw createError(401, "You don't have admin access");
      }

      if (user.userStatus === USER_STATUS.BLOCKED) {
        throw createError(410, "Your account has been blocked");
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
  "/get-appointments",
  [
    auth.verifyToken,
    isAdminMDW,
    validate({
      body: Joi.object({
        search: Joi.string(),
        page: Joi.number(),
        limit: Joi.number(),
        filters: Joi.object(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      let { page, limit, filters, search = "" } = req.body;

      const [appointments, total] = await adminController.getAllAppointments(
        search,
        page,
        limit,
        filters
      );

      res.status(200).json({ appointments, total });
    } catch (error) {
      next(error);
    }
  }
);


router.post(
	"/appointments",
	[
		auth.verifyToken,
		isAdminMDW,
		validate({
			body: Joi.object({
				userId: Joi.string().required(),
				appointmentAt: Joi.string().required(),
				description: Joi.string().allow(""),
				isEarlyBird: Joi.boolean(),
				isAfterHours: Joi.boolean(),
				vehicle: Joi.objectId(),
				appointmentReason: Joi.objectId(),
			}),
		}),
	],
	async (req, res, next) => {
		try {
			let { userId } = req.body;
			const user = await usersController.getUserByIdWithPopulate(
				userId,
				"shopId"
			);
			if (!user) {
				throw createError(401, "User not found");
			}

			const appointment = await handleAppointmentCreationRequest(
				user,
				req.body
			);

			res.status(200).json(appointment);
		} catch (error) {
			next(error);
		}
	}
);

router.get(
  "/reward-transaction-history",
  [
    auth.verifyToken,
    isAdminMDW,
    validate({
      query: Joi.object({
        userId: Joi.string(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      const { userId } = req.query;

      const rewardTransactionHistory =
        await usersController.getRewardTransactionHistory(userId);

      res.status(200).json(rewardTransactionHistory);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/total-rewards-given",
  [
    auth.verifyToken,
    isAdminMDW,
    validate({
      query: Joi.object({
        page: Joi.number(),
        limit: Joi.number(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      const { page, limit } = req.query;

      const totalRewardsGiven = await usersController.getTotalRewardsGiven(
        page,
        limit
      );

      res.status(200).json(totalRewardsGiven);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/total-rewards-redeemed",
  [
    auth.verifyToken,
    isAdminMDW,
    validate({
      query: Joi.object({
        page: Joi.number(),
        limit: Joi.number(),
      }),
    }),
  ],
  async (req, res, next) => {
    const { page, limit } = req.query;

    try {
      const totalRewardsRedeemed =
        await usersController.getTotalRewardsRedeemed(page, limit);

      res.status(200).json(totalRewardsRedeemed);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/user-referrals",
  [
    auth.verifyToken,
    isAdminMDW,
    validate({
      query: Joi.object({
        userId: Joi.string().required(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      const { userId } = req.query;

      const userReferrals = await adminController.getUserReferrals(userId);

      res.status(200).json(userReferrals);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/get-appointments-count",
  [
    auth.verifyToken,
    isAdminMDW,
    validate({
      body: Joi.object({
        filters: Joi.object(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      const { filters } = req.body;

      const userCountObj = await adminController.getAppointmentsCount(filters);

      res.status(200).json(userCountObj);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/get-users-count",
  [
    auth.verifyToken,
    isAdminMDW,
    validate({
      body: Joi.object({
        filters: Joi.object(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      const { filters } = req.body;

      const userCountObj = await adminController.getUsersCount(filters);

      res.status(200).json(userCountObj);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/get-repair-orders-count",
  [
    auth.verifyToken,
    isAdminMDW,
    validate({
      body: Joi.object({
        filters: Joi.object(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      const { filters } = req.body;

      const userCountObj = await adminController.getRepairOrdersCount(filters);

      res.status(200).json(userCountObj);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/add-Reward",
  [
    auth.verifyToken,
    isAdminMDW,
    validate({
      query: Joi.object({
        userId: Joi.objectId(),
        rewardAmount: Joi.number(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      const { userId, rewardAmount } = req.query;

      await adminController.addReward(userId, rewardAmount);

      res.status(200).json("Reward added successfully");
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/remove-Reward",
  [
    auth.verifyToken,
    isAdminMDW,
    validate({
      query: Joi.object({
        userId: Joi.objectId(),
        rewardAmount: Joi.number(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      const { userId, rewardAmount } = req.query;

      await adminController.removeReward(userId, rewardAmount);

      res.status(200).json("Reward removed successfully");
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/get-stats",
  [
    auth.verifyToken,
    isAdminMDW,
    validate({
      body: Joi.object({
        filters: Joi.object(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      const { filters } = req.body;

      const stats = await adminController.getStats(filters);

      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }
);

router.use("/users", require("./admin/users.admin.routes"));

module.exports = router;
