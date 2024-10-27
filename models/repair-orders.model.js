const mongoose = require("mongoose");
const { ObjectId, Mixed } = mongoose.Schema.Types;
const timestamps = require("mongoose-timestamp");

const {
  MODELS: { REPAIR_ORDER, VEHICLE },
} = require("../constants");

const schema = new mongoose.Schema({
  vehicleId: {
    type: ObjectId,
    ref: VEHICLE,
  },
  repairOrderNumber: Number,
  repairOrderStatusId: Number, // [ 1 - (Estimate), 2 - (Work-in-Progress), 3 - (Complete), 4 - (Saved for Later), 5 - (Posted), 6 - (Accounts Receivable), 7 - (Deleted) ]
  jobs: [Mixed],
  tekmetricRaw: Mixed,
});

schema.plugin(timestamps);
module.exports = new mongoose.model(REPAIR_ORDER, schema);
