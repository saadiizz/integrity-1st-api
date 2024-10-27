const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const { Mixed } = mongoose.Schema.Types;
const {
  MODELS: { MAINTENANCE_LIST },
} = require("../constants");

const schema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
  },
  make: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  details: Mixed,
});

schema.plugin(timestamps);
module.exports = new mongoose.model(MAINTENANCE_LIST, schema);
