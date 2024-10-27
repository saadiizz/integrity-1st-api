const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const { ObjectId } = mongoose.Schema.Types;
const {
  MODELS: { USER, USER_TOKEN },
  OS_NAME,
} = require("../constants");

const tokenSchema = new mongoose.Schema({
  user: { type: ObjectId, ref: USER },
  deviceId: { type: String },
  fcmToken: { type: String, required: true },
  osName: {
    type: String,
    required: true,
    enum: Object.values(OS_NAME),
  },
});

tokenSchema.plugin(timestamps);
module.exports = mongoose.model(USER_TOKEN, tokenSchema);
