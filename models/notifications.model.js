const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");
const { ObjectId, Mixed } = mongoose.Schema.Types;

const {
  MODELS: { NOTIFICATION, USER },
  NOTIFICATION_KIND,
} = require("../constants");

const schema = new mongoose.Schema({
  title: String,
  description: String,
  kind: {
    type: String,
    required: true,
    enum: Object.values(NOTIFICATION_KIND),
  },
  payload: Mixed,
  user: { type: ObjectId, ref: USER },
  isRead: { type: Boolean, default: false },
});

schema.plugin(timestamps);
module.exports = new mongoose.model(NOTIFICATION, schema);
