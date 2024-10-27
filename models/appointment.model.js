const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const { ObjectId } = mongoose.Schema.Types;
const {
  MODELS: { APPOINTMENT, VEHICLE, USER, APPOINTMENT_REASON }, APPOINTMENT_STATUS,
} = require("../constants");

const schema = new mongoose.Schema({
  appointmentAt: { type: Date, required: true },
  isEarlyBird: { type: Boolean, default: false },
  isAfterHours: { type: Boolean, default: false },
  vehicle: {
    type: ObjectId,
    ref: VEHICLE,
  },
  user: {
    type: ObjectId,
    ref: USER,
  },
  appointmentReason: {
    type: ObjectId,
    ref: APPOINTMENT_REASON,
  },
  pageName: { type: String },
  description: { type: String },
  tekmetricId: Number,
  guestUserInfo: {
    userTekmetricId: Number,
    tekmetricShopId: Number,
    fullName: String,
    email: String,
    phoneNumber: String,
  },
  status: {
    type: String,
    default: APPOINTMENT_STATUS.ACTIVE,
    enum: APPOINTMENT_STATUS,
  },
});

schema.plugin(timestamps);
module.exports = new mongoose.model(APPOINTMENT, schema);
