const mongoose = require("mongoose");

const {
  MODELS: { CRON_JOBS },
  CRON_JOB,
} = require("../constants");

const schema = new mongoose.Schema({
  cronName: { type: String, required: true, enum: CRON_JOB },
  lastRunAt: { type: Date, required: true },
  recordsUpdated: { type: Number, required: true },
});

const model = new mongoose.model(CRON_JOBS, schema);
module.exports = model;
