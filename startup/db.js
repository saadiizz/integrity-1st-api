const winston = require("winston");
const mongoose = require("mongoose");
const { MONGODB_URL, MONGODB_LOCAL_URL } = process.env;

module.exports = function () {
  mongoose
    .connect(MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      const msg = "Connected to MongoDB";
      console.log(msg);
      winston.info(msg);
    })
    .catch((err) => winston.error(err));
};
