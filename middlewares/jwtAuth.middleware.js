const jwt = require("jsonwebtoken");
const { USER_STATUS } = require("../constants");
const { User } = require("../models");

const JWTKEY = "891237WANDER8712983";

const createToken = (data) => jwt.sign(data, JWTKEY);

const decodeToken = (token) => {
  return jwt.verify(token, JWTKEY);
};

const verifyToken = async (req, res, next) => {
  const authorization = req.headers["authorization"];
  if (!authorization) {
    return res.status(401).send("A token is required for authentication");
  }
  const token = authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send("A token is required for authentication");
  }
  try {
    const decoded = decodeToken(token);
    const { _id: userId } = decoded;

    const user = await User.findById(userId).populate('shopId');
    if (!user) {
      return res
        .status(401)
        .json({ message: "Not authenticated, profile not found!" });
    }

    if (user.userStatus === USER_STATUS.BLOCKED) {
      return res
        .status(410)
        .json({ message: "Your account has been blocked" });
    }

    req.user = user;
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }
  return next();
};

module.exports = { verifyToken, createToken, decodeToken };
