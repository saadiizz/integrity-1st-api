const winston = require("winston");

module.exports = function () {
  process.on("uncaughtException", (ex) => {
    console.log("WE GOT AN UNCAUGHT EXCEPTION");
    winston.error(ex.message, ex);
  });

  process.on("unhandledRejection", (ex) => {
    console.log("WE GOT AN UNCAUGHT REJECTION");
    winston.error(ex.message, ex);
  });

  winston.add(new winston.transports.File({ filename: "logfile.log" }));
  winston.add(
    new winston.transports.Console({ colorize: true, prettyPrint: true })
  );
};
