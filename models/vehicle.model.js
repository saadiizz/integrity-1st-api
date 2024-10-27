const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const { ObjectId, Mixed } = mongoose.Schema.Types;

const {
  MODELS: { VEHICLE, USER },
} = require("../constants");

const schema = new mongoose.Schema({
  tekmetricId: Number,
  name: { type: String, default: "Vehicle 1" },
  imageURL: { type: String, default: "" },
  premiumStartAt: { type: Date },
  premiumEndAt: { type: Date },
  isPremiumRequestSubmitted: { type: Boolean, default: false },
  tekmetricRaw: Mixed,
  servicesDueCount: { type: Number, default: 0 }, // maintenance list count
  userId: {
    type: ObjectId,
    ref: USER,
  },
  deletionRequest: {
    isRequested: { type: Boolean, default: false },
    requestedAt: Date,
    reason: String,
    otherReason: String,
  },
  mileage: { type: Number, default: 0 },
  recomendUpdatedAt: { type: Date },
  serviceUpdatedAt: { type: Date }
});

schema.plugin(timestamps);
module.exports = new mongoose.model(VEHICLE, schema);
