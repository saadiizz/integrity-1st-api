const express = require("express");

const { error } = require("../middlewares");

const router = express.Router();

router.use(function (req, res, next) {
  if (req.method == "OPTIONS") {
    return res.json();
  } else {
    next();
  }
});

// router.use("/", require("./base.routes"));
router.use("/admin", require("./admin.routes"));
router.use("/auth", require("./auth.routes"));
router.use("/users", require("./user.routes"));
router.use("/shops", require("./shop.routes"));
router.use("/vehicle", require("./vehicle.routes"));
router.use("/dynamic-keys", require("./dynamic-keys.routes"));
router.use("/offer", require("./offer.routes"));
router.use("/blog", require("./blog.routes"));
router.use("/appointment", require("./appointment.routes"));
router.use("/web-hooks", require("./web-hooks.routes"));
router.use("/appointment-reason", require("./appointment-reason.routes"));
router.use("/customerio", require("./customerio.routes"));
router.use("/media", require("./media.routes"));

router.use(error);

module.exports = router;
