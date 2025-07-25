
const patientService = require('../services/patient.service');

const getPatientHistory = async (req, res, next) => {
    try {
        const userId = req.user.id; // From JWT payload
        const patientHistory = await patientService.getPatientMedicalHistory(userId);
        if (!patientHistory) {
            return res.status(404).json({ message: 'Patient history not found.' });
        }
        res.json(patientHistory);
    } catch (error) {
        next(error);
    }
};

const updatePatientHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const updatedHistory = await patientService.updatePatientMedicalHistory(userId, req.body);
        res.json({ message: 'Patient history updated successfully', data: updatedHistory });
    } catch (error) {
        next(error);
    }
};

module.exports = { getPatientHistory, updatePatientHistory };