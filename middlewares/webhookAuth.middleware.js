const { WEB_HOOK_KEY } = process.env;

const authenticateWebhookMDW = (req, res, next) => {
  const authKey = req.headers["authorization"];
  if (!authKey) {
    return res.status(401).send("Authorization missing in headers");
  }

  if (authKey !== WEB_HOOK_KEY) {
    return res.status(401).send("Provided auth key is invalid");
  }

  next();
};

module.exports = authenticateWebhookMDW;
