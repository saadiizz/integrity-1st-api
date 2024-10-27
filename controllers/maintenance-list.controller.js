const createError = require("http-errors");
const axios = require("axios");

const { CARMD_AUTH_KEY, CARMD_PARTNER_TOKEN } = process.env;
const { MaintenanceList, Vehicle } = require("../models");
const { create } = require("lodash");

const getMaintenanceListByVehicleId = async (vehicleId) => {
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    throw new Error("Vehicle not found by ID");
  }

  const { tekmetricRaw } = vehicle;
  if (!tekmetricRaw) {
    throw new Error("Vehicle not synced with Tekmetric");
  }

  const { year, make, model } = tekmetricRaw;

  const {list, isFetchedFromCarMD} = await fetchMaintenanceListFromDB(year, make, model, vehicle);
  if (isFetchedFromCarMD) {
    return list;
  }

  try {
    // if maintenance list not found in DB, then fetch from carMD
    await fetchMaintenanceListFromCarMD(vehicle.tekmetricRaw.vin, year, make, model);
  } catch (error) {
    console.log("Error while fetching data from CarMD", error, vehicle.tekmetricRaw.vin, year, make, model);
    // throw createError(500, "Error while fetching data from CarMD");
  }
  

  const { list: list2 } = await fetchMaintenanceListFromDB(
    year,
    make,
    model,
    vehicle
  );
  return list2
};

const fetchMaintenanceListFromDB = async (year, make, model, vehicle) => {
  const maintenanceList = await MaintenanceList.findOne({ year, make, model });
  if (!maintenanceList) {
    return { isFetchedFromCarMD: false, list: [] };
  }

  const list = filterMaintenanceListBasedOnMileage(maintenanceList, vehicle);
  return { isFetchedFromCarMD: true, list };
};

const filterMaintenanceListBasedOnMileage = async (
  maintenanceList,
  vehicle
) => {
  const { mileage } = vehicle;
  if (!mileage || mileage <= 1) {
    // throw createError(400, {
    //   message: "Mileage could not be identified",
    //   ERROR_CODE: "NEED_MILEAGE_FROM_USER",
    // });
    return [];
  }

  const { details } = maintenanceList;


  if (mileage <= 60000) {
    return details.filter(d => d.due_mileage <= 60000)
  } else {
    return details.filter(d => d.due_mileage > 60000)
  }
  // const uniqueLimits = [...new Set(details.map((i) => i.due_mileage))];
  // const targetLimit = uniqueLimits.sort((a,b) => a<b ? 1 : -1).find(l => l <= mileage);
  // const targetList = details.filter((item) => item.due_mileage === targetLimit);
  // return targetList;
};

const fetchMaintenanceListFromCarMD = async (vin, year, make, model) => {
  try {
		const { data: responseData } = await axios({
			method: "GET",
			headers: {
				Authorization: `Basic ${CARMD_AUTH_KEY}`,
				"partner-token": CARMD_PARTNER_TOKEN,
			},
			url: vin
				? `http://api.carmd.com/v3.0/maintlist?vin=${vin}`
				: `http://api.carmd.com/v3.0/maintlist?year=${year}&make=${make}&model=${model}`,
		});

		if (!responseData.data) {
			throw new Error(responseData.message.message);
		}

		return MaintenanceList.create({
			year,
			make,
			model,
			details: responseData.data,
		});
  } catch (error) {
		console.log(
			`Error while fetching maintenance list from carMD:`,
			error.message
		);
		throw new Error(
			`Error while fetching maintenance list from carMD: ${error.message}`
		);
  }
};

module.exports = {
  getMaintenanceListByVehicleId,
};
