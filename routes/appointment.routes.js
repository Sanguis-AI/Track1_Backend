
const express = require('express');
const { findDoctors, createAppointment, getAppointments } = require('../controllers/appointment.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const router = express.Router();

// route for finding doctors
router.get('/find', protect, authorize('patient'), findDoctors);

router.route('/')
    .post(protect, authorize('patient'), createAppointment)
    .get(protect, authorize(['patient', 'doctor', 'admin']), getAppointments);

module.exports = router;