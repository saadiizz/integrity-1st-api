const express = require("express");
const Joi = require("joi");

const { offerController } = require("../controllers");
const { auth, validate } = require("../middlewares");

const router = express.Router();

router.post(
  "/",
  auth.verifyToken,
  validate({
    body: Joi.object({
      title: Joi.string().required(),
      imageURL: Joi.string(),
      imageURL_mobile: Joi.string(),
      ctaKind: Joi.string(),
      ctaValue: Joi.string(),
      description: Joi.string(),
      discountPercentage: Joi.number(),
    }),
  }),
  async (req, res, next) => {
    try {
      const offer = await offerController.createOffer(req.body);
      res.status(200).json(offer);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
	"/",
	auth.verifyToken,
	validate({
		query: Joi.object({
			page: Joi.number(),
			limit: Joi.number(),
			search: Joi.string(),
		}),
	}),
	async (req, res, next) => {
		try {
			const { page, limit, search } = req.query;
			const [offers, total] = await offerController.getAllOffers(
				parseInt(page),
				parseInt(limit),
				search
			);
			res.status(200).json({ offers, total });
		} catch (error) {
			next(error);
		}
	}
);

router.patch("/:offerId", auth.verifyToken, async (req, res, next) => {
	try {
		const { offerId } = req.params;
		const updatedOffer = await offerController.updateOffer(offerId, req.body);
		res.status(200).json({ message: "Offer updated successfully", updatedOffer });
	} catch (error) {
		next(error);
	}
});

router.delete("/:offerIds", auth.verifyToken, async (req, res, next) => {
  try {
    const { offerIds } = req.params;
    await offerController.deleteOffers(offerIds.split(','));
    res.status(200).json({ message: "Offer removed successfully" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
