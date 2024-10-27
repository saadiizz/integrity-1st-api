require("dotenv").config();

const express = require("express");
const winston = require("winston");
const path = require("path");
const cors = require("cors");

const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");

const PORT = process.env.PORT || 8080;

const app = express();

const http = require("http");
const server = http.createServer(app);

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Server is up and running",
  });
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/auth/recover-password", async (req, res, next) => {
  res.sendFile(path.join(__dirname, "/views/reset-password.html"));
});

require("./startup/logging")();
require("./startup/config")(app);
require("./startup/db")();
app.use(require("./routes"));

// // cron jobs
require("./cron-jobs/check-carmd-credits.cron");

server.listen(PORT, () => console.log(`Server is listening at ${PORT}`));
