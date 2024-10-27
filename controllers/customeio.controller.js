const createError = require("http-errors");
const { TrackClient, RegionUS } = require("customerio-node");
const { CUSTOMERIO_SITE_ID, CUSTOMERIO_API_KEY } = process.env;

const cio = new TrackClient(CUSTOMERIO_SITE_ID, CUSTOMERIO_API_KEY, {
  region: RegionUS,
});

const createOrUpdateUser = (userTekmetricId, data) => {
  return cio.identify(userTekmetricId, data);
};

const track = (userTekmetricId, eventName, data = {}) => {
  if (!userTekmetricId) {
    throw createError(
      500,
      "userTekmetricId not found to send track event in customer.io"
    );
  }
  return cio.track(userTekmetricId, { name: eventName, data });
};

const addDevice = (userTekmetricId, deviceId, osName, firebaseToken) => {
  return cio.addDevice(userTekmetricId, deviceId, osName, { firebaseToken });
};

const trackAnonymous = async (userTekmetricId, eventName, data = {}) => {
  if (!userTekmetricId) {
    throw createError(
      500,
      "userTekmetricId not found to send track event in customer.io"
    );
  }
  cio.track(userTekmetricId, { name: eventName, data });
};

module.exports = {
  createOrUpdateUser,
  track,
  trackAnonymous,
  addDevice,
};
