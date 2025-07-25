
const Patient = require('../models/Patient');

const getPatientMedicalHistory = async (userId) => {
    return await Patient.findOne({ userId }).lean(); // .lean() for plain JS objects
};

const updatePatientMedicalHistory = async (userId, data) => {
    return await Patient.findOneAndUpdate({ userId }, data, { new: true, upsert: true });
};

module.exports = {
    getPatientMedicalHistory,
    updatePatientMedicalHistory,
};