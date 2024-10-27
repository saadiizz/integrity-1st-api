const { AppointmentReason } = require("../models");

const getAppointmentReasonById = (appointmentReasonId) => {
  return AppointmentReason.findById(appointmentReasonId);
}

const createAppointmentReasons = (reasons) =>
  AppointmentReason.create([
    { title: "Routine Maintenance (e.g. Oil Change)" },
    { title: "A/C Service" },
    { title: "Alignments/Tires" },
    { title: "Brakes" },
    { title: "Collision & Body Work" },
    { title: "Check Engine Light" },
    { title: "Engine Repair" },
    { title: "State Inspection" },
    { title: "Pre-Purchase Inspection" },
    { title: "Other" },
  ]);

const getAllAppointmentReasons = () => {
  // await createAppointmentReasons();
  return AppointmentReason.find({}).sort({createdAt:1});
};

module.exports = {
  getAllAppointmentReasons,
  getAppointmentReasonById,
};
