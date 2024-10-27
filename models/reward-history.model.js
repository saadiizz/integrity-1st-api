const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const { ObjectId } = mongoose.Schema.Types;
const {
	MODELS: { USER, REWARD_HISTORY },
	REWARD_HISTORY_KINDS,
} = require("../constants");

const schema = new mongoose.Schema({
	user: {
		type: ObjectId,
		index: true,
		ref: USER,
	},
	amount: {
		type: Number,
		default: 0,
	},
	kind: {
		type: String,
		enum: Object.values(REWARD_HISTORY_KINDS),
	},
});

schema.plugin(timestamps);
const RewardHistory = mongoose.model(REWARD_HISTORY, schema);

module.exports = RewardHistory;
