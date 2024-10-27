const { TEKMETRIC_BASIC_AUTH, AUTH_TOKEN, TEKMETRIC_BASE_URL } = process.env;
const createError = require("http-errors");

const axios = require("axios");

let token; // production
// let token = "dd824dda-c02c-478a-aa84-cd9fdb217c15"; // sandbox

const getLatestRepairOrder = async (tekmetricShopId, vehicleId) => {
  const { getVehicleById } = require("./vehicle.controller");
  const vehicle = await getVehicleById(vehicleId);

  const {
    data: { content },
  } = await axios({
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    url: `${TEKMETRIC_BASE_URL}/repair-orders?shop=${tekmetricShopId}&vehicleId=${vehicle.tekmetricId}&sort=createdDate&sortDirection=DESC&size=1000`,
  });

  if (content.length) {
    return content[0];
  }
  return null;
};

const getAllRepairOrdersFromTekmetric = async (tekmetricShopId, vehicleId) => {
  const { getVehicleById } = require("./vehicle.controller");
  const vehicle = await getVehicleById(vehicleId);

  const {
    data: { content },
  } = await axios({
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    url: `${TEKMETRIC_BASE_URL}/repair-orders?shop=${tekmetricShopId}&vehicleId=${vehicle.tekmetricId}&sort=createdDate&sortDirection=DESC`,
  });

  return content;
};

const getToken = async () => {
  try {
    const {
      data: { access_token },
    } = await axios({
      method: "POST",
      headers: {
        Authorization: `Basic ${TEKMETRIC_BASIC_AUTH}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: { grant_type: "client_credentials" },
      url: `${TEKMETRIC_BASE_URL}/oauth/token`,
    });
    token = access_token;
    return token;
  } catch (error) {
    console.log(error,"Error while getting tekmetric token");
    throw Error("Error while getting tekmetric token");
  }
};

const getShops = async () => {
  if (!token) {
    token = await getToken();
  }
  const { data } = await axios({
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    url: `${TEKMETRIC_BASE_URL}/shops`,
  });
  return data;
};

const getCustomer = async (shopId, phone, tekmetricShopId) => {
  if (!token) {
    token = await getToken();
  }

  // because tekmetric phone numbers doesn't have country code on start
  phone = phone.substring(phone.length - 10);

  // to find tekmetric shopId
  if (!tekmetricShopId) {
    const { getShopById } = require("./shop.controller");
    const shop = await getShopById(shopId);
    if (!shop) {
      throw new Error("Shop doesn't exist against this ID");
    }
    if (!shop.tekmetricId) {
      throw new Error("Shop doesn't have tekmetric ID");
    }
    tekmetricShopId = shop.tekmetricId;
  }

  const { data } = await axios({
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    url: `${TEKMETRIC_BASE_URL}/customers?shop=${tekmetricShopId}&search=${phone}`,
  });

  if (!data.totalElements) {
    return null;
  }

  // taking first user from list
  const [userInfo] = data.content;

  return mapTekmetricCustomerToDBUser(userInfo);
};

const mapTekmetricCustomerToDBUser = async (tekmetricCustomer) => {
  const user = {};

  const { email, firstName, lastName, id } = tekmetricCustomer;
  user.email = email;
  user.fullName = `${firstName || ""} ${lastName || ""}`.trim();
  user.tekmetricRaw = tekmetricCustomer;
  user.tekmetricId = id;

  return user;
};

const createCustomer = async ({ shopId, fullName, phoneNumber, email, tekmetricShopId }) => {
  if (!token) {
    token = await getToken();
  }

  // because tekmetric phone numbers doesn't have country code on start
  phoneNumber = phoneNumber.substring(phoneNumber.length - 10);


  if (!tekmetricShopId && !shopId) {
    throw createError(400, `neither tekmetricShopId nor shopId`);
  }

  if (!tekmetricShopId && shopId) {
    const { getShopById } = require("./shop.controller");
    const shop = await getShopById(shopId);
    tekmetricShopId = shop.tekmetricId;
  }

  try {
    const {
      data: { data: user },
    } = await axios({
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      url: `${TEKMETRIC_BASE_URL}/customers`,
      data: {
        shopId: tekmetricShopId,
        firstName: fullName,
        email: [email],
        phone: [phoneNumber],
      },
    });

    return mapTekmetricCustomerToDBUser(user);
  } catch (error) {
    if (
      error &&
      error.response &&
      error.response.data &&
      error.response.data.message
    ) {
      throw new Error(error.response.data.message);
    }
    console.log("Error in createCustomer on Tekmetric", error.message);
    throw error;
  }
};

const getUserAllVehicles = async (tekmetricCustomerId, tekmetricShopId) => {
  if (!token) {
    token = await getToken();
  }

  const { data } = await axios({
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    url: `${TEKMETRIC_BASE_URL}/vehicles?shop=${tekmetricShopId}&customerId=${tekmetricCustomerId}&size=1000`,
  });

  return data.content;
};

const getServiceRecommendations = async (vehicleId, tekmetricShopId) => {
  // to find tekmetric vehicleId
  const { getVehicleById } = require("./vehicle.controller");
  const vehicle = await getVehicleById(vehicleId);

  const { data } = await axios({
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    url: `${TEKMETRIC_BASE_URL}/jobs?shop=${tekmetricShopId}&vehicleId=${vehicle.tekmetricId}&size=1000&authorized=false`,
  });

  return data.content;
};

// getUserAllVehicles(229772, 1);

// getToken();

const createAppointmentOntekmetric = async (
  shopId,
  startTime,
  endTime,
  title,
  description,
  vehicleTekmetricId,
  customerId,
) => {
  try {
    if (!token) {
      token = await getToken();
    }

    const body = {
      shopId,
      startTime: `${startTime}z`,
      endTime: `${endTime}z`,
      title,
      description,
    }

    if (customerId) {
      body.customerId = customerId
    }

    if (vehicleTekmetricId) {
      body.vehicleId = vehicleTekmetricId;
    }

    const { data: responseData } = await axios({
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: body,
      url: `${TEKMETRIC_BASE_URL}/appointments`,
    });
    if (responseData.type === "SUCCESS") {
      return responseData.data;
    }
    throw Error(
      `Error while creating appointment on tekmetric: ${responseData.message}`
    );
  } catch (error) {
    console.log(
      "Error while creating appointment on tekmetric",
      error.response.data.message
    );
    throw createError(
      400,
      `Error while creating appointment on tekmetric: ${error.response.data.message}`
    );
  }
};

module.exports = {
  getServiceRecommendations,
  createAppointmentOntekmetric,
  getUserAllVehicles,
  getLatestRepairOrder,
  getAllRepairOrdersFromTekmetric,
  getShops,
  getCustomer,
  createCustomer,
};
