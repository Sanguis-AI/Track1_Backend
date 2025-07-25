
const express = require('express');
const {
    createOrUpdateProfile,
    getMyProfile,
    setAvailability,
    getDoctorAvailability
} = require('../controllers/doctor.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const router = express.Router();

// Doctor profile management
router.route('/profile')
    .post(protect, authorize('doctor'), createOrUpdateProfile)
    .put(protect, authorize('doctor'), createOrUpdateProfile) 
    .get(protect, authorize('doctor'), getMyProfile); 

// Doctor availability management
router.route('/availability')
    .post(protect, authorize('doctor'), setAvailability); // Set/update daily availability

router.get('/availability/:doctorId', protect, authorize(['patient', 'doctor', 'admin']), getDoctorAvailability);

module.exports = router;