const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const { ObjectId, Mixed } = mongoose.Schema.Types;
const {
  MODELS: { USER, SHOP },
  UNITS,
  GENDERS,
  USER_STATUS,
} = require("../constants");

const userSchema = new mongoose.Schema({
  email: { type: String, index: true, default: "" },
  isEmailVerified: { type: Boolean, default: false },
  password: String,
  phoneNumber: { type: String, index: true },
  fullName: { type: String, default: "" },
  rewardAmount: {
    type: Number,
    default: 0,
    // max: 100,
  },
  gender: {
    type: String,
    enum: Object.values(GENDERS),
  },
  dateOfBirth: Date,
  stopId: {
    type: ObjectId,
    ref: SHOP,
  },
  age: Number,
  referralCode: { type: String, index: true },
  referrerUserId: {
    type: ObjectId,
    index: true,
    ref: USER,
  },
  isReferralBonusGrated: {
    type: Boolean,
    default: false,
  },
  lastLoginAt: {
    type: Date,
    required: true,
    default: Date.now(),
  },
  isLoginLocked: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  userStatus: {
    type: String,
    default: USER_STATUS.ACTIVE,
    enum: USER_STATUS,
  },
  invalidLoginAttempts: { type: Number, default: 0 },
  shopId: {
    type: ObjectId,
    index: true,
    ref: SHOP,
  },
  tekmetricRaw: Mixed,
  tekmetricId: Number,
});

userSchema.index({ homeLocation: "2dsphere" });

userSchema.plugin(timestamps);

userSchema.virtual("distanceConversionValue").get(function () {
  return this.distanceUnit === UNITS.KM ? 1000 : 1609.34;
});

const User = mongoose.model(USER, userSchema);

module.exports = User;
