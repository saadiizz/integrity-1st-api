const moment = require("moment");
const createError = require("http-errors");

const { Appointment } = require("../models");
const { getAppointmentReasonById } = require("./appointment-reason.controller");
const { createAppointmentOntekmetric } = require("./tekmetric.controller");
const { BONUS_VALUE, NOTIFICATION_KIND, APPOINTMENT_STATUS } = require("../constants");

const customerioController = require("./customeio.controller");
const {
  getRawardValues,
} = require("./dynamic-keys.controller");
const { createAdminNotification } = require("./admin.controller");

const getAppointmentCount = (userId) => {
  return Appointment.count({ user: userId });
};

const getAppointmentList = (userId, page = 1, limit = 10) => {
  return Promise.all([
		Appointment.find({ user: userId, status: APPOINTMENT_STATUS.ACTIVE })
			.sort({ createdAt: 1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.populate("vehicle")
      .populate("user")
			.populate("appointmentReason"),
		Appointment.count({ user: userId }),
  ]);
};

const createGuestAppointment = async ({
  fullName,
  email,
  phoneNumber,
  appointmentAt,
  description,
  isEarlyBird,
  isAfterHours,
  appointmentReasonId,
  tekmetricShopId,
  userTekmetricId,
}) => {
  const { title: reasonTitle } = await getAppointmentReasonById(
    appointmentReasonId
  );

  const tekmetricAppointmentId = await createAppointmentOntekmetric(
    tekmetricShopId,
    moment(appointmentAt).format().slice(0, 19),
    moment(appointmentAt).add(1, "hour").format().slice(0, 19),
    reasonTitle || "",
    description || "",
    null,
    userTekmetricId
  );

  const appointment = await Appointment.create({
    isEarlyBird,
    isAfterHours,
    description,
    appointmentAt,
    appointmentReason: appointmentReasonId,
    tekmetricId: tekmetricAppointmentId,
    guestUserInfo: {
      userTekmetricId,
      tekmetricShopId,
      fullName,
      email,
      phoneNumber,
    },
  });

  return appointment;
};

const updateAppoitment = (appointmentId, data) => {
	return Appointment.findByIdAndUpdate(appointmentId, data);
};

const deleteAppoitments = (appointmentIds, data) => {
	return Appointment.update(
		{
			_id: {
				$in: appointmentIds,
			},
		},
		data
	);
};


const getAppointmentById = (appointmentId) => {
	return Appointment.findById(appointmentId)
		.populate("appointmentReason")
		.populate("vehicle");
};

const createAppointment = async (userId, appointment, user) => {
  const { appointmentReason: appointmentReasonId } = appointment;
  const { title: reasonTitle } = await getAppointmentReasonById(
    appointmentReasonId
  );

  if (!user.shopId || !user.shopId.tekmetricId) {
    throw new Error(
      "User's shop is not synced with Tekmetric, please contact admin"
    );
  }

  let vehicle = {};
  if (appointment.vehicle) {
    const vehicleController = require("./vehicle.controller");
    vehicle = await vehicleController.getVehicleById(appointment.vehicle);
    if (!vehicle) {
      throw createError(400, "Invalid vehicle ID");
    }
    if (!vehicle.tekmetricId) {
      throw createError(400, "Vehicle is not registered on Tekmetric");
    }
  }

  const tekmetricId = await createAppointmentOntekmetric(
    user.shopId.tekmetricId,
    moment(appointment.appointmentAt).format().slice(0, 19),
    moment(appointment.appointmentAt).add(1, "hour").format().slice(0, 19),
    reasonTitle || "",
    appointment.description || "",
    vehicle.tekmetricId,
    user.tekmetricId ? user.tekmetricId : ""
  );

  return Appointment.create({
    user: userId,
    ...appointment,
    tekmetricId,
  });
};

const getAppointmentsCountPerUser = (userId) => {
  return Appointment.count({
    user: userId,
  });
};

const handleAppointmentCreationRequest = async (userData, appointmentData) => {
	const { _id: userId, tekmetricId: userTekmetricId } = userData;
	const { pageName, appointmentReason, description } = appointmentData;

	let appointmentReasonTitle = "";
	if (appointmentReason) {
		appointmentReasonTitle = (
			await getAppointmentReasonById(appointmentReason)
		).title;
	}

	switch (pageName) {
		case "SERVICE_DUE":
			await customerioController.track(
				userTekmetricId,
				"service_due_appt",
				{}
			);
			break;

		case "PLATNUM_MEMBER":
			await customerioController.track(
				userTekmetricId,
				"plat_mem_appt",
				{}
			);
			break;

		case "RECENTLY_RECOMMENDED":
			await customerioController.track(
				userTekmetricId,
				"recent_reco_appt",
				{}
			);
			break;

		default:
			break;
	}

	const { loyaltyBonusValue, referralBonusValue } = await getRawardValues();

	let rewardValue = loyaltyBonusValue;
	const newAppointment = await createAppointment(userId, appointmentData, userData);
	const count = await getAppointmentsCountPerUser(userId);
	if (count === 1 && userData.referrerUserId) {
		rewardValue = referralBonusValue;
	}

	createAdminNotification(
		NOTIFICATION_KIND.NEW_APPOINTMENT_CREATED,
		{
			appointmentId: newAppointment._id,
			userId,
			description,
			appointmentReason: appointmentReasonTitle,
		},
		"New Appointment",
		"New appointment has been created"
	);

	return { ...newAppointment.toJSON(), rewardValue };
};


module.exports = {
  getAppointmentsCountPerUser,
  createAppointment,
  handleAppointmentCreationRequest,
  updateAppoitment,
  getAppointmentById,
  deleteAppoitments,
  getAppointmentList,
  getAppointmentCount,
  createGuestAppointment,
};
