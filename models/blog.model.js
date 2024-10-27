const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const {
  MODELS: { BLOG },
} = require("../constants");

const schema = new mongoose.Schema({
  title: String,
  imageURL: String,
  ctaKind: String,
  ctaValue: String,
  description: String,
});

schema.plugin(timestamps);
module.exports = new mongoose.model(BLOG, schema);
