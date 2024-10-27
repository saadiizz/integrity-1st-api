const express = require("express");

const { dynamicKeysController } = require("../controllers");
const { auth, authOptional, isAdminMDW } = require("../middlewares");

const router = express.Router();

router.get("/", authOptional.verifyToken, async (req, res, next) => {
  try {
    const keys = await dynamicKeysController.getAllKeys(!!req.user);
    res.status(200).json(keys);
  } catch (error) {
    next(error);
  }
});

router.get("/:keys", authOptional.verifyToken, async (req, res, next) => {
  try {
    const { keys } = req.params;
    const value = await dynamicKeysController.getDynamicValueByKeys(
      keys.split(",").map((k) => k.trim()),
      !!req.user
    );
    res.status(200).json(value);
  } catch (error) {
    next(error);
  }
});

router.post("/", auth.verifyToken, isAdminMDW, async (req, res, next) => {
  try {
    const { key, value, isPublic } = req.body;
    const newDynamicKey = await dynamicKeysController.createDynamicKey(
      key,
      value,
      isPublic,
    );
    res.status(200).json(newDynamicKey);
  } catch (error) {
    next(error);
  }
});

router.patch("/:key", auth.verifyToken, isAdminMDW, async (req, res, next) => {
  try {
    const { key } = req.params;
    const updatedDynamicKey = await dynamicKeysController.updateDynamicKey(
      key,
      req.body
    );
    res.status(200).json(updatedDynamicKey);
  } catch (error) {
    next(error);
  }
});

router.delete("/:dynamicKeyId", auth.verifyToken, isAdminMDW, async (req, res, next) => {
  try {
    const { dynamicKeyId } = req.params;
    await dynamicKeysController.deleteDynamicKeyById(dynamicKeyId);
    res.status(200).json({ message: "Dynamic key removed successfully" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
