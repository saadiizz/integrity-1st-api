const jwt = require("jsonwebtoken");
const { User } = require("../models");

const JWTKEY = "891237WANDER8712983";

const decodeToken = (token) => {
  return jwt.verify(token, JWTKEY);
};

const verifyToken = async (req, res, next) => {
  const authorization = req.headers["authorization"];
  if (!authorization) {
    return next();
  }
  const token = authorization.split(" ")[1];
  if (!token) {
    return next();
  }
  try {
    const decoded = decodeToken(token);
    const { _id: userId } = decoded;

    const user = await User.findById(userId).populate("shopId");
    if (!user) {
      return next();
    }

    req.user = user;
  } catch (err) {
    return next();
  }
  return next();
};

module.exports = { verifyToken };
