const customerioController = require("./customeio.controller");
const { User, UserToken, Notification, RewardHistory } = require("../models");
const { createCustomer } = require("./tekmetric.controller");
const { getShopById } = require("./shop.controller");
const createError = require("http-errors");
const { USER_STATUS, NOTIFICATION_KIND, REWARD_HISTORY_KINDS } = require("../constants");
const { getSafeUserToReturn } = require("../utils/generic.util");
const { query } = require("express");

// const readUserById = async (currentUser) => {
//   return User.findOne(
//     currentUser._id,
//     {
//       referralCode,
//       dynamicReferralLink: shortLink,
//     },
//     { new: true }
//   );
// };

const getUserByTekmetricId = async (userTekmetricId) => {
  const user = await User.findOne({
    tekmetricId: parseInt(userTekmetricId),
  });
  return user;
};

const getNotificationsList = (userId, page = 1, limit = 10) => {
  return Promise.all([
    Notification.find({ user: userId })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.count({ user: userId }),
  ]);
};

const readAllNotifications = (userId) => {
  return Notification.update(
    { user: userId },
    { isRead: true },
    { multi: true }
  );
};

const addNotificationInDB = (userId, kind, payload, title, description) => {
  return Notification.create({
    user: userId,
    payload,
    title,
    description,
    kind,
  });
}

const createCustomerIONotificationEvent = async (
	userId,
	kind,
	payload,
	title,
	description
) => {
	const user = await getUserById(userId);

	return customerioController.track(user.tekmetricId, "notification", {
		userId,
		kind,
		payload,
		title,
		description,
	});
};

// referrerUserId => who referred other person
// refereeUserId => who was referred
const notifyAboutReferralRegistered = async (
	referrerUserId,
	refereeUserId
) => {
	const referrerUser = await getUserById(referrerUserId);
	const refereeUser = await getUserById(refereeUserId);

	await customerioController.track(
		referrerUser.tekmetricId,
		"your_referral_registered",
		{
			referrerUserId: referrerUser.tekmetricId,
			refereeUserId: refereeUser.tekmetricId,
		}
	);
	await customerioController.track(
		refereeUser.tekmetricId,
		"refferal_account_registered",
		{
			referrerUserId: referrerUser.tekmetricId,
			refereeUserId: refereeUser.tekmetricId,
      fullName: refereeUser.fullName,
      phoneNumber: refereeUser.phoneNumber,
      email: refereeUser.email,
		}
	);

	// createCustomerIONotificationEvent(
	//   referrerUserId,
	//   NOTIFICATION_KIND.NEW_REFERRAL_REGISTERED,
	//   {
	//     refereeUserId,
	//   },
	//   "New Referral Registered",
	//   `${refereeName} has created their account`
	// );
};

const updateUser = async (userId, data, existingUser) => {
  let dataToUpdate = { ...data };
  if (!existingUser.tekmetricId && existingUser.shopId && data.fullName) {
    try {
      const tekmetricUser = await createCustomer({
        shopId: existingUser.shopId,
        fullName: data.fullName,
        phoneNumber: existingUser.phoneNumber,
        email: existingUser.email || data.email,
      });

      if (tekmetricUser.tekmetricId) {
        existingUser.tekmetricId = tekmetricUser.tekmetricId;
        try {
          await customerioController.createOrUpdateUser(
            tekmetricUser.tekmetricId,
            {
              phoneNumber: existingUser.phoneNumber,
            }
          );

          const cioBody = {
            existing_client: false,
            isAppUser: true,
            device_type: data.deviceType || "IOS",
          };
          if (existingUser.referralCode) {
            cioBody.referralCode = existingUser.referralCode;
          }
          if (dataToUpdate.referrerUserId) {
            const referrerUser = await getUserById(dataToUpdate.referrerUserId);
            cioBody.referredByID = referrerUser.tekmetricId;
          }
          await customerioController.track(
            tekmetricUser.tekmetricId,
            "new_app_account",
            cioBody
          );

          await customerioController.createOrUpdateUser(
            tekmetricUser.tekmetricId,
            cioBody
          );
        } catch (error) {
          console.log("Error in customer.io", error);
        }
      }

      dataToUpdate = { ...tekmetricUser, ...dataToUpdate };
    } catch (error) {
      console.log("Error while creating customer on Tekmetric", error.message);
      throw new Error(
        `Error while creating user on Tekmetric: ${error.message}`
      );
    }
  }

  if (
    data &&
    existingUser &&
    data.fullName &&
    (existingUser.email || data.email)
  ) {
    try {
      if (!existingUser.tekmetricId) {
        throw createError(
          500,
          "Tekmetric ID not found for creation/updation of customer.io user"
        );
      }
      const shop = await getShopById(existingUser.shopId);
      if (!shop) {
        throw createError(500,"User's shop not found in DB");
      }

      const fullName = dataToUpdate.fullName || existingUser.fullName;
      await customerioController.createOrUpdateUser(existingUser.tekmetricId, {
        fullName,
        referralCode: existingUser.referralCode,
        email: existingUser.email || dataToUpdate.email,
        firstName: fullName.split(" ")[0] || "",
        lastName: fullName.split(" ")[1] || "",
        shopId: shop.tekmetricId, // TODO: tekmetric shop id
      });
    } catch (error) {
      console.log("Error in customerio", error);
    }
  }

  return User.findByIdAndUpdate(userId, dataToUpdate, { new: true }).populate(
    "shopId"
  );
};

const isPhoneExists = async (phoneNumber) =>
  !!(await User.count({ phoneNumber }));

const findReferrerUser = (referralCode) =>
  User.findOne({ referralCode }).select("_id");

const updateUserTokens = async ({ tekmetricId, _id: userId }, tokenData) => {
  const { deviceId, fcmToken, osName } = tokenData;

  await UserToken.remove({ user: userId }, { multi: true });

  const userTokenData = await UserToken.findOne({ user: userId, deviceId });
  if (!userTokenData) {
    await UserToken.create({
      user: userId,
      deviceId,
      fcmToken,
      osName,
    });
  } else {
    userTokenData.deviceId = deviceId;
    userTokenData.fcmToken = fcmToken;
    userTokenData.osName = osName;
    await userTokenData.save();
  }
  if (tekmetricId) {
    const firebaseTokens = await UserToken.find({ user: userId }).sort({
      createdAt: -1,
    });
    const targetToken = firebaseTokens[0];

    await customerioController.addDevice(
      tekmetricId,
      targetToken.deviceId,
      targetToken.osName,
      targetToken.fcmToken
    );
  }
};

const deleteUserToken = async (userId, deviceId) => {
  const userTokenData = await UserToken.findOneAndRemove({
    user: userId,
    deviceId,
  });
  if (!userTokenData) {
    throw createError(400, "Token not found");
  }
};

const blockUser = async (userId) => {
  const user = await User.findOneAndUpdate(
    { _id: userId },
    { userStatus: USER_STATUS.BLOCKED }
  );
  if (!user) {
    throw createError(400, "User not found");
  }
};

const unblockUser = async (userId) => {
  const user = await User.findOneAndUpdate(
    { _id: userId },
    { userStatus: USER_STATUS.ACTIVE }
  );
  if (!user) {
    throw createError(400, "User not found");
  }
};

const getUserById = (userId) => {
  return User.findById(userId);
};

const getUserByIdWithPopulate = (userId, populate) => {
  return User.findById(userId).populate(populate);
};

const deleteUsers = (userIds) => {
  userIds = userIds.split(",");

  const promises = [];

  for (let userId of userIds) {
    promises.push(
      User.findByIdAndUpdate(userId, { userStatus: USER_STATUS.DELETED })
    );
  }

  return Promise.all(promises);
};

const getRewardTransactionHistory = async (userId) => {
  if (userId) {
    query.user = userId;
  }

  return RewardHistory.find({ user: userId });
};

const getTotalRewardsGiven = async (page = 1, limit = 1) => {
  const { REFERRAL_REWARD_ADDED, REFEREE_REWARD_ADDED, VISIT_REWARD_ADDED } =
    NOTIFICATION_KIND;

  const query = {
    kind: {
      $in: [REFERRAL_REWARD_ADDED, REFEREE_REWARD_ADDED, VISIT_REWARD_ADDED],
    },
  };

  const notifications = await Notification.find(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("user");

  return notifications.map((n) => {
    const kind = n.kind.split("_ADDED");

    const safeUser = getSafeUserToReturn(n.user);

    return { reward: kind[0], user: safeUser, payload: n.payload };
  });
};

const getTotalRewardsRedeemed = async (page = 1, limit = 10) => {
  const { REWARD_REDEEMED } = NOTIFICATION_KIND;

  const notifications = await Notification.find({
    kind: REWARD_REDEEMED,
  })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("user");

  return notifications.map((n) => {
    const safeUser = getSafeUserToReturn(n.user);

    return { reward: n.kind, user: safeUser, payload: n.payload };
  });
};

const getUserByReferralCode = (referralCode) => {
	return User.findOne({
		referralCode,
	});
};

module.exports = {
  getUserByReferralCode,
  updateUserTokens,
  getUserById,
  getUserByIdWithPopulate,
  findReferrerUser,
  updateUser,
  deleteUserToken,
  blockUser,
  unblockUser,
  isPhoneExists,
  getUserByTekmetricId,
  getNotificationsList,
  readAllNotifications,
  createCustomerIONotificationEvent,
  notifyAboutReferralRegistered,
  deleteUsers,
  getRewardTransactionHistory,
  getTotalRewardsGiven,
  addNotificationInDB,
  getTotalRewardsRedeemed
};
