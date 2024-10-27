const moment = require("moment");
const createError = require("http-errors");

const { Vehicle, TekmetricRecommendation, RepairOrder } = require("../models");
const {
  getUserAllVehicles,
  getServiceRecommendations,
  getLatestRepairOrder,
  getAllRepairOrdersFromTekmetric,
} = require("./tekmetric.controller");
const { getVehicleImage } = require("./vehicle-image.controller");
const { getMaintenanceListByVehicleId } = require("./maintenance-list.controller");

const getVehicleByVin = async (vin) => {
  const vehicle = await Vehicle.findOne({ "tekmetricRaw.vin": vin });
  return vehicle;
};

const makeVehiclePremium = async (vehicleId, startDate) => {
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    throw createError(400, "Vehicle not found");
  }
  if (vehicle.premiumEndAt && moment().isBefore(vehicle.premiumEndAt)) {
    throw createError(400, "This vehicle is already on premium plan");
  }
  if (!moment(startDate).isValid) {
    throw createError(400, "startDate format is invalid");
  }

  vehicle.premiumStartAt = moment(startDate);
  vehicle.premiumEndAt = moment().add(1, "year");
  await vehicle.save();
  return;
};

const syncVehicles = async (tekmetricCustomerId, tekmetricShopId, userId) => {
  if ((tekmetricCustomerId, tekmetricShopId)) {
    const tekmetricVehicles = await getUserAllVehicles(
      tekmetricCustomerId,
      tekmetricShopId
    );
    if (tekmetricVehicles && tekmetricVehicles.length) {
      const existingVehicles = await Vehicle.find({ userId });
      const existingVehiclesIds = existingVehicles.map((s) => s.tekmetricId);
      const vehiclesToAdd = tekmetricVehicles.filter(
        (v) => !existingVehiclesIds.includes(v.id)
      );

      if (vehiclesToAdd && vehiclesToAdd.length) {
        const docsToInsert = [];
        for (const v of vehiclesToAdd) {
          const imageURL = await getVehicleImage(v.make, v.model, v.year);
          docsToInsert.push({
            tekmetricId: v.id,
            name: v.make,
            // premiumStartAt: moment().subtract(3, "months"),
            // premiumEndAt: moment().add(9, "months"),
            tekmetricRaw: v,
            imageURL,
            userId,
          });
        }
        await Vehicle.insertMany(docsToInsert);
      }
    }
  }
};

const getAllVehicles = async ({
  _id: userId,
  tekmetricId: tekmetricCustomerId,
  shopId,
}) => {
  const query = { userId, "deletionRequest.isRequested": false };
  let allVehicles = await Vehicle.find(query);
  if (tekmetricCustomerId && shopId) {
    await syncVehicles(tekmetricCustomerId, shopId.tekmetricId, userId);
  }
  if (allVehicles.length) {
    await Promise.all(allVehicles.map(v => updateVehicleServicesDueCount(v._id)))
  }

  return Vehicle.find(query);
};

const createVehicleDeletionRequest = async (
  vehicleId,
  userId,
  reason,
  otherReason
) => {
  let vehicle = await Vehicle.findById(vehicleId);

  if (!vehicle) {
    throw createError(404, "Vehicle not found");
  }

  if (vehicle.deletionRequest && vehicle.deletionRequest.isRequested) {
    throw createError(500, "You have already submitted this request");
  }

  if (vehicle.userId && vehicle.userId.toString() !== userId.toString()) {
    throw createError(403, "You don't have permission to delete this vehicle");
  }

  vehicle.deletionRequest = {
    isRequested: true,
    requestedAt: moment(),
    reason,
    otherReason,
  };

  vehicle.save();
  return vehicle;
};

const syncTekmetricRecommendationInDB = async (
  vehicleId,
  tekmetricShopId,
  userId
) => {
  const fetchedRecommendations = await getServiceRecommendations(
    vehicleId,
    tekmetricShopId
  );

  if (fetchedRecommendations && fetchedRecommendations.length) {
    const existingRecommendations = await TekmetricRecommendation.find({
      userId,
    });
    const existingRecommendationIds = existingRecommendations.map(
      (s) => s.tekmetricId
    );
    const recommendationsToAdd = fetchedRecommendations.filter(
      (r) => !existingRecommendationIds.includes(r.id)
    );

    if (recommendationsToAdd && recommendationsToAdd.length) {
      const docsToInsert = [];
      for (const r of recommendationsToAdd) {
        docsToInsert.push({
          tekmetricId: r.id,
          title: r.name,
          tekmetricRaw: r,
          user: userId,
          vehicle: vehicleId,
        });
      }
      await TekmetricRecommendation.insertMany(docsToInsert);
    }
  }
};

const getVehicleServiceRecommendations = async (
  vehicleId,
  tekmetricShopId,
  userId
) => {
  try {
    await syncTekmetricRecommendationInDB(vehicleId, tekmetricShopId, userId);
  } catch (error) {
    console.log(
      "Error while syncing vehicle tekmetric recommendations",
      error.message
    );
  }

 await vechicleFetchUpdate(vehicleId,"recomendUpdatedAt")
  const recommendations = await TekmetricRecommendation.find({
    // user: userId,
    vehicle: vehicleId,
  })
  return recommendations;
};

const updateVehicleServicesDueCount = async (vehicleId) => {
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    throw createError(400, "Vehicle not found");
  }
  const maintenanceList = await getMaintenanceListByVehicleId(vehicleId);
  
  const servicesDueCount = maintenanceList.length;
  vehicle.servicesDueCount = servicesDueCount;
  await vehicle.save();

  return servicesDueCount;
};

const getVehicleById = (id) => {
  return Vehicle.findById(id);
};

const syncMileageInVehicle = async (vehicleId, tekmetricShopId) => {
  const latestRepairOrder = await getLatestRepairOrder(
    tekmetricShopId,
    vehicleId
  );

  if (!latestRepairOrder || !latestRepairOrder.milesIn) {
    return;
  }

  return Vehicle.findByIdAndUpdate(
    vehicleId,
    { mileage: latestRepairOrder.milesIn },
    { new: true }
  );
};

const updateMileageInVehicle = async (vehicleId, mileage) => {
  await Vehicle.findByIdAndUpdate(vehicleId, { mileage });
  return;
};
const vechicleFetchUpdate = async (vehicleId,vechileUpdateKey)=>{
   await Vehicle.findByIdAndUpdate(
    vehicleId,
    { [vechileUpdateKey]: moment() },
    { new: true }
  );
  return ;
}

const getVehicleHistory = async (vehicleId, tekmetricShopId) => {
  try {
    const [history] = await Promise.all([
      getAllRepairOrdersFromTekmetric(tekmetricShopId, vehicleId),
      RepairOrder.remove({ vehicleId }, { multi: true }),
    ]);
    // await vechicleFetchUpdate(vehicleId,"serviceUpdatedAt")
    await RepairOrder.create(
      history.map((i) => ({
        vehicleId,
        repairOrderNumber: i.repairOrderNumber,
        repairOrderStatusId: i.repairOrderStatus.id,
        jobs: i.jobs,
        tekmetricRaw: i,
      }))
    );
  } catch (error) {
    console.log("Error while syncing repair orders list with Tekmetric");
  }

  const repairOrders = await RepairOrder.find({
    vehicleId,
    repairOrderStatusId: 5,
  });

  for (let ro of repairOrders) {
    ro.jobs = ro.jobs.filter((j) => j.authorized);
  }

  return repairOrders.filter((ro) => ro.jobs.length);
};

module.exports = {
  syncMileageInVehicle,
  getVehicleServiceRecommendations,
  updateMileageInVehicle,
  getAllVehicles,
  createVehicleDeletionRequest,
  getVehicleById,
  syncVehicles,
  getVehicleHistory,
  getVehicleByVin,
  makeVehiclePremium,
  updateVehicleServicesDueCount,
  vechicleFetchUpdate
};
