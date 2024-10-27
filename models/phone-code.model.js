const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const { ObjectId } = mongoose.Schema.Types;
const {
  MODELS: { PHONE_CODE, SHOP },
} = require("../constants");

const schema = new mongoose.Schema({
  code: String,
  phoneNumber: String,
  password: String,
  shopId: {
    type: ObjectId,
    ref: SHOP,
  },
  expiry: { type: Date, expires: "10m", default: Date.now },
});

schema.plugin(timestamps);
module.exports = new mongoose.model(PHONE_CODE, schema);
