const createError = require("http-errors");
const { DynamicKeys } = require("../models");
const { BONUS_VALUE } = require("../constants");

const createDynamicKey = async (key, value, isPublic) => {
  const dynamicKey = await DynamicKeys.findOne({ key });
  if (dynamicKey) {
    throw createError(403, "Key already exists");
  }

  return DynamicKeys.create({
    key,
    value,
    isPublic,
  });
};

const updateDynamicKey = async (key, data) => {
  const dynamicKey = await DynamicKeys.findOneAndUpdate({ key }, data, {
		new: true,
  });
  if (dynamicKey) {
    return dynamicKey;
  }

  throw createError(403, "Key not found");
};

const deleteDynamicKeyById = async (dynamicKeyId) => {
  if (!(await DynamicKeys.findById(dynamicKeyId))) {
    throw createError(404, "Dynamic key not found against this ID");
  }

  return DynamicKeys.findByIdAndRemove(dynamicKeyId);
};

const getAllKeys = (isUserExists) => {
  const query = {};
  if (!isUserExists) {
    query.isPublic = true;
  }
  return DynamicKeys.find(query);
};

const getRawardValues = async () => {
  const [referralBonusObj, loyaltyBonusObj] = await Promise.all([
    getByKey(BONUS_VALUE.REFERRAL),
    getByKey(BONUS_VALUE.LOYALTY),
  ]);
  if (!referralBonusObj || !loyaltyBonusObj) {
    throw createError(
      400,
      "ERROR: referralBonusValue or loyaltyBonusValue not defined in dynamic keys"
    );
  }
  const loyaltyBonusValue = parseInt(loyaltyBonusObj.value);
  const referralBonusValue = parseInt(referralBonusObj.value);

  return { loyaltyBonusValue, referralBonusValue };
};

const getByKey = (key) => {
  return DynamicKeys.findOne({ key });
};

const getDynamicValueByKeys = async (keys, isUserExists) => {
  const query = { key: { $in: keys } };
  if (!isUserExists) {
    query.isPublic = true;
  }

  const dynamicKeys = await DynamicKeys.find(query);
  return dynamicKeys;
};

module.exports = {
  createDynamicKey,
  updateDynamicKey,
  getAllKeys,
  getDynamicValueByKeys,
  deleteDynamicKeyById,
  getRawardValues,
  getByKey,
};
