const isAdminMDW = async (req, res, next) => {
  if (!req.user) {
    return res
      .status(401)
      .json({ message: "A token is required for authentication" });
  }

  if (!req.user.isAdmin) {
    return res
      .status(401)
      .json({ message: "Only admin is allowed to access this API" });
  }

  return next();
};

module.exports = isAdminMDW;
