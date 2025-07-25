
const express = require('express');
const { getPatientHistory, updatePatientHistory } = require('../controllers/patient.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const router = express.Router();

router.route('/')
    .get(protect, authorize('patient'), getPatientHistory)
    .put(protect, authorize('patient'), updatePatientHistory);

module.exports = router;