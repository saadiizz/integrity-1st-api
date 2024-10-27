const express = require("express");

const { shopController } = require("../controllers");
const { auth } = require("../middlewares");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const shops = await shopController.getShopsList();
    res.status(200).json(shops);
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/:shopId",
  auth.verifyToken,
  async (req, res, next) => {
    try {
      const { shopId } = req.params;
      const shops = await shopController.updateShop(shopId, req.body);
      res.status(200).json(shops);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
