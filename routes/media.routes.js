const multer = require("multer");
const upload = multer();
const path = require("path");
const cloudinary = require("cloudinary");

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const createError = require("http-errors");

const express = require("express");
const Joi = require("joi");

const { offerController } = require("../controllers");
const { auth, validate } = require("../middlewares");
const { unlink, unlinkSync } = require("fs");

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    req.fileName = file.originalname;
    cb(null, file.originalname);
  },
});

router.post("/", auth.verifyToken, async (req, res, next) => {
  try {
    const fileSize = req.headers["content-length"];
    if (fileSize > 5e6) {
      throw createError(400, "Max file size is 5mb");
    }
    
    multer({ storage }).single("image")(req, res, async (err) => {
      const fileWithPath = `uploads/${req.fileName}`;
      try {
        const result = await cloudinary.v2.uploader.upload(
          fileWithPath,
          { resource_type: "image" }
        );
        res.status(200).json({
          url: result.url,
        });
        unlinkSync(fileWithPath);
      } catch (error) {
        debugger;
        // unlink(fileWithPath);s
        console.log("Error while uploading media", error);
        throw createError(400, "Error while uploading media");
      }
    });
  } catch (error) {
    debugger;
    next(error);
  }
});

module.exports = router;
