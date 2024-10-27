const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const {
  MODELS: { OFFER },
} = require("../constants");

const schema = new mongoose.Schema({
  title: String,
  imageURL: String,
  imageURL_mobile: String,
  ctaKind: String,
  ctaValue: String,
  description: String,
  discountPercentage: Number,
});

schema.plugin(timestamps);
module.exports = new mongoose.model(OFFER, schema);
