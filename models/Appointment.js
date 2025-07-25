
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Given that doctors are also 'User's with role 'doctor'
    date: { type: Date, required: true },
    time: { type: String, required: true }, // e.g., "10:00 AM"
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
    notes: { type: String } // Doctor's notes after the appointment
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);