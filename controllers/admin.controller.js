const moment = require("moment");
const createError = require("http-errors");

const { USER_STATUS, REWARD_HISTORY_KINDS } = require("../constants");
const { User, Appointment, RepairOrder, Vehicle, RewardHistory } = require("../models");
const { createCustomerIONotificationEvent, updateUser } = require("./users.controller");
const { getSafeUserToReturn } = require("../utils/generic.util");

const getAllAdmins = () => {
  const admins = User.find({ isAdmin: true });
  return admins;
};

const createAdminNotification = async (kind, payload, title, description) => {
  const allAdmins = await getAllAdmins();
  return Promise.all(
    allAdmins.map((admin) =>
      createCustomerIONotificationEvent(admin, kind, payload, title, description)
    )
  );
};

const createUser = async (data) => {
  const user = await User.create({ ...data, isEmailVerified: true });
  await updateUser(user._id, { fullName: user.fullName }, user);
  return User.findById(user._id);
};

const updateUserById = async (userId, data) => {
  const user = await User.findById(userId);
  await updateUser(user._id, data, user);
  return User.findById(user._id);
};

const getAllAppointments = (search = "", page = 1, limit = 10, filters) => {
	const query = {
		$or: [
			{ description: { $regex: search, $options: "i" } },
			{ "guestUserInfo.fullName": { $regex: search, $options: "i" } },
			{ "guestUserInfo.email": { $regex: search, $options: "i" } },
			{ "guestUserInfo.phoneNumber": { $regex: search, $options: "i" } },
		],
		$and: [
			{
				appointmentAt: {
					$gte: filters?.fromDate
						? moment(filters?.fromDate)
						: moment("1 january 1970"),
				},
			},
			{ appointmentAt: { $lte: moment(filters?.toDate) } },
		],
	};

	if (filters?.user) {
		query.user = filters?.user;
	}

	return Promise.all([
		Appointment.find(query)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.populate("vehicle")
			.populate("appointmentReason"),
		Appointment.count(query),
	]);
};

const getUserReferrals = (userId) => User.find({ referrerUserId: userId });

const getUsersCount = async (filters = {}) => {
  let query = {};

  if ((Object.keys(filters) && !filters?.fromDate) || !filters?.toDate) {
    filters.fromDate = moment(
      filters?.fromDate ? filters.fromDate : "1 january 1970"
    );
    filters.toDate = moment(filters?.toDate ? filters.toDate : undefined);
  }

  if (filters) {
    query.$and = [
      { createdAt: { $gte: moment(filters?.fromDate) } },
      { createdAt: { $lte: moment(filters?.toDate) } },
    ];
  }

  return { usersCount: await User.count(query) };
};

const getAppointmentsCount = async (filters = {}) => {
  let query = {};

  if ((Object.keys(filters) && !filters?.fromDate) || !filters?.toDate) {
    filters.fromDate = moment(
      filters?.fromDate ? filters.fromDate : "1 january 1970"
    );
    filters.toDate = moment(filters?.toDate ? filters.toDate : undefined);
  }

  if (filters) {
    query.$and = [
      { createdAt: { $gte: moment(filters?.fromDate) } },
      { createdAt: { $lte: moment(filters?.toDate) } },
    ];
  }

  return { appointmentsCount: await Appointment.count(query) };
};

const getRepairOrdersCount = async (filters = {}) => {
  let query = {};

  if ((Object.keys(filters) && !filters?.fromDate) || !filters?.toDate) {
    filters.fromDate = moment(
      filters?.fromDate ? filters.fromDate : "1 january 1970"
    );
    filters.toDate = moment(filters?.toDate ? filters.toDate : undefined);
  }

  if (filters) {
    query.$and = [
      { createdAt: { $gte: moment(filters?.fromDate) } },
      { createdAt: { $lte: moment(filters?.toDate) } },
    ];
  }

  return { repairOrdersCount: await RepairOrder.count(query) };
};

const getStats = async (filters = {}) => {
  let query = {};

  if ((Object.keys(filters) && !filters?.fromDate) || !filters?.toDate) {
    filters.fromDate = moment(
      filters?.fromDate ? filters.fromDate : "1 january 1970"
    );
    filters.toDate = moment(filters?.toDate ? filters.toDate : undefined);
  }

  if (filters) {
    query.$and = [
      { createdAt: { $gte: moment(filters?.fromDate) } },
      { createdAt: { $lte: moment(filters?.toDate) } },
    ];
  }

  const [
    usersCount,
    activeUsersCount,
    blockedUsersCount,
    appointmentsCount,
    repairOrderCompletedCount,
    repairOrderIncompletedCount,
    vehicleRegisteredCount,
    vehicleDeletionRequestCount,
  ] = await Promise.all([
    User.count(query),
    User.count({ ...query, userStatus: USER_STATUS.ACTIVE }),
    User.count({ ...query, userStatus: USER_STATUS.BLOCKED }),
    Appointment.count(query),
    RepairOrder.count({ ...query, repairOrderStatusId: 3 }),
    RepairOrder.count({ ...query, repairOrderStatusId: { $ne: 3 } }),
    Vehicle.count(query),
    Vehicle.count({ ...query, "deletionRequest.isRequested": true }),
  ]);

  return {
    usersCount,
    activeUsersCount,
    blockedUsersCount,
    appointmentsCount,
    repairOrderCompletedCount,
    repairOrderIncompletedCount,
    vehicleRegisteredCount,
    vehicleDeletionRequestCount,
  };
};

const addReward = async (userId, amountToBeRewarded) => {
	const user = await User.findById(userId);

	// if (parseInt(amountToBeRewarded) + user?.rewardAmount <= 100) {

  await RewardHistory.create({
		user: userId,
		kind: REWARD_HISTORY_KINDS.ADMIN_AWARDED,
		amount: amountToBeRewarded,
  });

	user.rewardAmount = user.rewardAmount + parseInt(amountToBeRewarded);
	return user.save();

	// } else {
	//   throw new Error("Invalid Reward Amount!");
	// }
};

const removeReward = async (userId, amountToBeRemoved) => {
  const user = await User.findById(userId);

  if (parseInt(amountToBeRemoved) <= user?.rewardAmount) {
    user.rewardAmount = user.rewardAmount - parseInt(amountToBeRemoved);

    return user.save();
  } else {
    throw new Error("Invalid Reward Amount!");
  }
};

const getAllUsers = async (page = 1, limit = 10, search = "") => {
	const query = {
    $or: [
			{ fullName: { $regex: search, $options: "i" } },
			{ email: { $regex: search, $options: "i" } },
			{ phoneNumber: { $regex: search, $options: "i" } },
			{ gender: { $regex: search, $options: "i" } },
		],
		userStatus: {
			$ne: USER_STATUS.DELETED,
		},
	};

	const [users, total] = await Promise.all([
		User.find(query)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
      .populate('referrerUserId', "-password")
			.lean(),
		User.count(query),
	]);

	for (let u of users) {
		let referredUsers = await User.find({ referrerUserId: u._id });
    u.vehicles = await Vehicle.find({ userId: u._id });
    
    u.referrerUser = u.referrerUserId;
    delete u.referrerUserId;
		
    referredUsers = referredUsers.map((u) => getSafeUserToReturn(u));
		u.referredUsers = referredUsers;
	}

	return { users, total };
};

module.exports = {
  createAdminNotification,
  getAllAdmins,
  createUser,
  updateUserById,
  getAllAppointments,
  getUserReferrals,
  getUsersCount,
  getAppointmentsCount,
  getRepairOrdersCount,
  getStats,
  addReward,
  removeReward,
  getAllUsers,
};
