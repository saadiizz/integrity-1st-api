const express = require("express");
const Joi = require("joi");

const {
  createUser,
  updateUserById,
  getAllUsers,
} = require("../../controllers/admin.controller");
const { validate, auth } = require("../../middlewares");
const { getSafeUserToReturn } = require("../../utils/generic.util");

const router = express.Router();

router.post(
  "/",
  [
    auth.verifyToken,
    validate({
      body: Joi.object({
        phoneNumber: Joi.string().required(),
        password: Joi.string().min(6).required(),
        email: Joi.string().required(),
        fullName: Joi.string().required(),
        shopId: Joi.string().required(),
      }),
    }),
  ],
  async (req, res, next) => {
    try {
      const { phoneNumber, email, password, fullName, shopId } = req.body;

      const user = await createUser({
        phoneNumber,
        email,
        password,
        fullName,
        shopId,
      });
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }
);

router.patch("/:userId", [auth.verifyToken], async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await updateUserById(userId, req.body);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

router.get("/", auth.verifyToken, async (req, res, next) => {
	try {
    let { page, limit, search } = req.query;

		const {users, total} = await getAllUsers(page, limit, search);

		res.status(200).json({
			total,
			users: users.map((u) => getSafeUserToReturn(u)),
		});
	} catch (error) {
		next(error);
	}
});

module.exports = router;
