const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const {
  MODELS: { APPOINTMENT_REASON },
} = require("../constants");

const schema = new mongoose.Schema({
  title: { type: String, required: true },
});

schema.plugin(timestamps);
module.exports = new mongoose.model(APPOINTMENT_REASON, schema);
