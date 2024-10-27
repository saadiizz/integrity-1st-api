const mongoose = require("mongoose");

const {
  MODELS: { DYNAMIC_KEYS },
} = require("../constants");

const schema = new mongoose.Schema({
  key: { type: String, required: true, index: true },
  value: { type: String, required: true },
  isPublic: { type: Boolean, default: false },
});

module.exports = new mongoose.model(DYNAMIC_KEYS, schema);
