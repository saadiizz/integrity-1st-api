const moment = require("moment");
const express = require("express");
const createError = require("http-errors");

const Joi = require("joi");
const { auth, validate } = require("../middlewares");
const {
  getAllVehicles,
  getVehicleServiceRecommendations,
  syncMileageInVehicle,
  getVehicleHistory,
  updateMileageInVehicle,
  createVehicleDeletionRequest,
  vechicleFetchUpdate
} = require("../controllers/vehicle.controller");
const {
  getMaintenanceListByVehicleId,
} = require("../controllers/maintenance-list.controller");
const { customerioController } = require("../controllers");
const { AppointmentReason } = require("../models");

const router = express.Router();
Joi.objectId = require("joi-objectid")(Joi);

router.get("/", auth.verifyToken, async (req, res, next) => {
  try {
    const vehicles = await getAllVehicles(req.user);
    res.json(
      vehicles.map((v) => ({
        isPremium:
          v.premiumEndAt && moment().isBefore(v.premiumEndAt) ? true : false,
        ...JSON.parse(JSON.stringify(v)),
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:vehicleId/deletion-request",
  auth.verifyToken,
  async (req, res, next) => {
    try {
      const { vehicleId } = req.params;
      const { reason, otherReason } = req.body;
      const vehicle = await createVehicleDeletionRequest(
        vehicleId,
        req.user._id,
        reason,
        otherReason
      );
      res
        .status(200)
        .json({ message: "Deletion request submitted successfully" });
        

      const { tekmetricRaw } = vehicle;
      const { year, make, model } = tekmetricRaw;


      let reasonText;
      if (reason && reason.length === 24) { // objectId
        const reasonDoc = await AppointmentReason.findById(reason);
        if (!reasonDoc || !reasonDoc.title) {
          throw createError(400, "Invalid reason ID");
        }
        reasonText = reasonDoc.title;
      }

      await customerioController.track(
			req.user.tekmetricId,
			"vehicle_removed",
			{
				vehicle_year: year || "",
				vehicle_make: make || "",
				vehicle_model: model || "",
				reason: reasonText || reason,
				otherReason: otherReason || "",
			}
		);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:vehicleId/recommendations",
  auth.verifyToken,
  async (req, res, next) => {
    try {
      const { vehicleId } = req.params;
      const vehicles = await getVehicleServiceRecommendations(
        vehicleId,
        req.user.shopId.tekmetricId,
        req.user._id
      );
      res.json(vehicles);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:vehicleId/maintenance-list",
  auth.verifyToken,
  validate({
    params: Joi.object({
      vehicleId: Joi.objectId().required(),
    }),
    query: Joi.object({
      mileage: Joi.number().optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const { vehicleId } = req.params;
      const { mileage } = req.query;

      if (mileage) {
        await updateMileageInVehicle(vehicleId, mileage);
      } else {
        try {
          await syncMileageInVehicle(vehicleId, req.user.shopId.tekmetricId);
        } catch (error) {
          console.log("Error in syncMileageInVehicle", error.message);
        }
      }
      await vechicleFetchUpdate(vehicleId,"serviceUpdatedAt")
      const maintenanceList = await getMaintenanceListByVehicleId(vehicleId);
      res.json(maintenanceList);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:vehicleId/service-history",
  auth.verifyToken,
  validate({
    params: Joi.object({
      vehicleId: Joi.objectId().required(),
    }),
  }),
  async (req, res, next) => {
    try {
      const { vehicleId } = req.params;

      const history = await getVehicleHistory(
        vehicleId,
        req.user.shopId.tekmetricId
      );

      res.json(history);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
