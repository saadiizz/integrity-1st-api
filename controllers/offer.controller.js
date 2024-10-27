const createError = require("http-errors");
const { Offer, User } = require("../models");
const { NOTIFICATION_KIND } = require("../constants");
const { createCustomerIONotificationEvent } = require("./users.controller");

const createOffer = async (data) => {
  const offer = await Offer.findOne({ title: data.title });
  if (offer) {
    throw createError(403, "Offer with such title already exists");
  }

  // const allUsers = await User.find({}).select("_id");
  // await Promise.all(
  //   allUsers.map((u) =>
  //     createCustomerIONotificationEvent(
  //       u._id,
  //       NOTIFICATION_KIND.NEW_OFFER_ADDED,
  //       {
  //         offerTitle: data.title,
  //       },
  //       "New Offer Added",
  //       `New offer ${data.title} has been added`
  //     )
  //   )
  // );

  return Offer.create(data);
};

const getAllOffers = (page = 1, limit = 10, search = "") => {
	const query = {
		$or: [
			{ title: { $regex: search, $options: "i" } },
			{ description: { $regex: search, $options: "i" } },
		],
	};

	return Promise.all([
		Offer.find(query)
      .sort({createdAt: -1})
			.skip((page - 1) * limit)
			.limit(limit),
		Offer.count(query),
	]);
};

const deleteOffers = async (offerIds) =>
  Promise.all(offerIds.map((offerId) => Offer.findByIdAndRemove(offerId.trim()))); 

const updateOffer = (offerId, data) =>
	Offer.findByIdAndUpdate(offerId, data, { new: true });

module.exports = {
  createOffer,
  updateOffer,
  deleteOffers,
  getAllOffers,
};
