const mongoose = require("mongoose");

const {
  MODELS: { SHOP },
} = require("../constants");

const schema = new mongoose.Schema({
  tekmetricId: Number,
  environment: String,
  name: { type: String, required: true },
  nickname: String,
  phone: String,
  email: String,
  website: String,
  timeZoneId: String,
  address: mongoose.Schema.Types.Mixed,
  latitude: { type: Number, default: 0 },
  longitude: { type: Number, default: 0 },
  googleMapsLink: { type: String, default: "" },
  image: { type: String, default: "" },
  openingHours: [
    {
      from: String,
      till: String,
    },
  ],
});

module.exports = new mongoose.model(SHOP, schema);
