const express = require("express");

const Joi = require("joi");
const {
  getAllAppointmentReasons,
} = require("../controllers/appointment-reason.controller");
const { auth } = require("../middlewares");

const router = express.Router();
Joi.objectId = require("joi-objectid")(Joi);

router.get("/", async (req, res, next) => {
  try {
    const allReasons = await getAllAppointmentReasons();
    res.status(200).json(allReasons);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
