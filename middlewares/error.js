const winston = require("winston"); //for loggin errors

module.exports = function (err, req, res, next) {
  winston.error(err.message, err);
  res.status(err.statusCode || 500).json({
    status: false,
    message: err.message || "Something went wrong!",
  });

  if (err.statusCode === 500 || !err.statusCode) {
    if (req && req.user && req.user.tekmetricId) {
      const { customerioController } = require("../controllers");
      customerioController.track(req.user.tekmetricId, "api_failed", {
        api_name: `${req.method} ${req.url}`,
        api_error: err.message || "Something went wrong!",
      });
    }
  }
};
