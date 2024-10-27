module.exports = {
  auth: require("./jwtAuth.middleware"),
  authOptional: require("./jwtAuthOptional.middleware"),
  validate: require("./validate"),
  error: require("./error"),
  webhookAuth: require('./webhookAuth.middleware'),
  isAdminMDW: require('./isAdmin.middleware'),
};
