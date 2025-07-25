// services/doctor.service.js
const DoctorProfile = require('../models/DoctorProfile');
const DoctorAvailability = require('../models/DoctorAvailability');
const User = require('../models/User'); // To link with User model

const createOrUpdateDoctorProfile = async (userId, profileData) => {
    return await DoctorProfile.findOneAndUpdate(
        { userId },
        profileData,
        { new: true, upsert: true }
    );
};

const getDoctorProfile = async (userId) => {
    return await DoctorProfile.findOne({ userId });
};

const addOrUpdateDoctorAvailability = async (doctorId, date, slots) => {

    console.log("Received date in addOrUpdateDoctorAvailability:", date);
    
    const startOfDay = new Date(date);
    
    console.log("startOfDay after new Date(date):", startOfDay);
    
    startOfDay.setUTCHours(0, 0, 0, 0); // Normalize date to start of day UTC
    
    console.log("startOfDay after normalization:", startOfDay);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999); // Normalize date to end of day UTC


    

    return await DoctorAvailability.findOneAndUpdate(
        {
            doctorId,
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        },
        { $set: { slots: slots, date: startOfDay } }, // Completely replace slots for the day
        { new: true, upsert: true }
    );
};

const getDoctorAvailability = async (doctorId, date) => {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return await DoctorAvailability.findOne({
        doctorId,
        date: {
            $gte: startOfDay,
            $lte: endOfDay
        }
    });
};

const findDoctorsBySpecialty = async (specialty) => {
    return await DoctorProfile.find({ specialty }).populate('userId', 'username');
};

module.exports = {
    createOrUpdateDoctorProfile,
    getDoctorProfile,
    addOrUpdateDoctorAvailability,
    getDoctorAvailability,
    findDoctorsBySpecialty,
};