
const mongoose = require('mongoose');

const doctorProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    specialty: { type: String, required: true }, // e.g., 'General Practitioner', 'Cardiologist', 'Pediatrician'
    qualifications: [{ type: String }],
    experienceYears: { type: Number },
    clinicAddress: { type: String },
    contactNumber: { type: String },
    

}, { timestamps: true });

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);