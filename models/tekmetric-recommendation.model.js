const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const { ObjectId, Mixed } = mongoose.Schema.Types;
const {
  MODELS: { VEHICLE, USER, TEKMETRIC_RECOMMENDATION },
} = require("../constants");

const schema = new mongoose.Schema({
  vehicle: {
    type: ObjectId,
    ref: VEHICLE,
  },
  user: {
    type: ObjectId,
    ref: USER,
    required: true,
  },
  title: String,
  tekmetricId: Number,
  tekmetricRaw: Mixed,
});

schema.plugin(timestamps);
module.exports = new mongoose.model(TEKMETRIC_RECOMMENDATION, schema);
