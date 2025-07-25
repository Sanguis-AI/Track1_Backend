// This controller allows doctors to manage their profiles and availability

const doctorService = require('../services/doctor.service');
const { authorize } = require('../middleware/auth.middleware');

const createOrUpdateProfile = async (req, res, next) => {
    try {
        const userId = req.user.id; // Doctor's user ID
        const profileData = req.body;
        const doctorProfile = await doctorService.createOrUpdateDoctorProfile(userId, profileData);
        res.json({ message: 'Doctor profile updated successfully', data: doctorProfile });
    } catch (error) {
        next(error);
    }
};

const getMyProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const doctorProfile = await doctorService.getDoctorProfile(userId);
        if (!doctorProfile) {
            return res.status(404).json({ message: 'Doctor profile not found.' });
        }
        res.json(doctorProfile);
    } catch (error) {
        next(error);
    }
};

const setAvailability = async (req, res, next) => {
    try {
        const doctorId = req.user.id;
        const { date, slots } = req.body; // date: "YYYY-MM-DD", slots: [{startTime: "HH:MM", endTime: "HH:MM"}, ...]

        console.log("Controller - Raw date from request body:", date); // ADD THIS
        console.log("Controller - Type of date from request body:", typeof date); // ADD THIS

        if (!date || !Array.isArray(slots) || slots.length === 0) {
            return res.status(400).json({ message: 'Date and an array of slots are required.' });
        }
        // Further validation: Check if date is a valid date string
        const testDate = new Date(date);
        if (isNaN(testDate.getTime())) { // Check if it's an "Invalid Date"
            return res.status(400).json({ message: 'Invalid date format provided.' });
        }

        const availability = await doctorService.addOrUpdateDoctorAvailability(doctorId, date, slots);
        res.status(201).json({ message: 'Doctor availability set/updated successfully', data: availability });
    } catch (error) {
        next(error);
    }
};

const getDoctorAvailability = async (req, res, next) => {
    try {
        const { doctorId } = req.params; 
        const { date } = req.query;
        if (!doctorId || !date) {
            return res.status(400).json({ message: 'Doctor ID and date are required.' });
        }
        const availability = await doctorService.getDoctorAvailability(doctorId, date);
        if (!availability) {
            return res.status(404).json({ message: 'Availability not found for this doctor on this date.' });
        }
        res.json(availability);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createOrUpdateProfile,
    getMyProfile,
    setAvailability,
    getDoctorAvailability
};