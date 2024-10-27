const createError = require("http-errors");
const axios = require("axios");

const { CARMD_AUTH_KEY, CARMD_PARTNER_TOKEN } = process.env;

const getCarMDCredits = async () => {
  try {
    const { data: responseData } = await axios({
      method: "GET",
      headers: {
        Authorization: `Basic ${CARMD_AUTH_KEY}`,
        "partner-token": CARMD_PARTNER_TOKEN,
      },
      url: `http://api.carmd.com/v3.0/credits`,
    });

    if (!responseData.data) {
      throw new Error(responseData.message.message);
    }

    return responseData.data.credits;
  } catch (error) {
    console.log(`Error while fetching credits from carMD:`, error.message);
    throw createError(
      403,
      `Error while fetching credits from carMD: ${error.message}`
    );
  }
};

module.exports = {
  getCarMDCredits,
};
