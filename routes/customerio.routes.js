const express = require("express");
const { customerioController,usersController,tekmetricController } = require("../controllers");
const router = express.Router();

const { auth } = require("../middlewares");

router.post("/:eventName", auth.verifyToken, async (req, res, next) => {
  try {
    const { eventName } = req.params;
    const { data } = req.body;

    await customerioController.track(req.user.tekmetricId, eventName, data);

    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

router.post("/:eventName/anonymous", async (req, res, next) => {
  try {
    const { eventName } = req.params;
    const{data:{referralCode}} = req.body
    let referrerUser;
    if (referralCode) {
      referrerUser = await usersController.getUserByReferralCode(referralCode);
      let userTekmetricId;
      let tekmetricUser = await tekmetricController.getCustomer(
        null,
        referrerUser.phoneNumber,
        referrerUser.tekmetricRaw.shopId
      );
      if (!tekmetricUser) {
        throw createError.InternalServerError(
          "Customer not created in customer.io"
        );
        // tekmetricUser = await tekmetricController.createCustomer({
        //   tekmetricShopId,
        //   fullName,
        //   phoneNumber,
        //   email,
        // });
      }
      userTekmetricId = tekmetricUser.tekmetricId;
      
      if (!referrerUser) {
        throw createError.BadRequest("Invalid referral code");
      }
      if (!referrerUser.tekmetricId) {
        throw createError.InternalServerError(
          "referrerUser doesn't have tekmetricId"
        );
      }

      await customerioController.trackAnonymous(userTekmetricId, eventName, req.body);
      res.status(200).send();
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
