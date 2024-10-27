const randomString = require("randomstring");

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } =
  process.env;

const client = require("twilio")(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

const sendSMS = async (to, message) => {
  try {
    await client.messages.create({
      body: message,
      from: TWILIO_FROM_NUMBER,
      to,
    });
    console.log(`SMS sent successfully to ${to}`);
  } catch (error) {
    console.log("Error while sending SMS", error);
  }
};

const getSafeUserToReturn = (user) => {
  user = JSON.parse(JSON.stringify(user));

  delete user.password;
  return user;
};

module.exports = {
  getSafeUserToReturn,
  createRandomCode: (length = 6, kind = 'numeric') =>
    randomString.generate({
      length,
      charset: kind,
      capitalization: "uppercase",
    }),
  isProduction: () => process.env.ENVIRONMENT === "Production",
  sendSMS,
};
