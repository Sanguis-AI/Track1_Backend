
const mongoose = require('mongoose');

const doctorAvailabilitySchema = new mongoose.Schema({
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    date: { 
        type: Date, 
        required: true 
    }, 
    slots: [{
        startTime: { type: String, required: true }, // e.g., "09:00" (24-hour format)
        endTime: { type: String, required: true },   // e.g., "09:30"
        isBooked: { type: Boolean, default: false }, // True if this specific slot is booked
        appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null } // Link to appointment
    }],
    // Optional: for block booking or entire day availability
    isAvailableAllDay: { type: Boolean, default: false },
    // Optional: Capacity for concurrent patients or total slots per day
    dailyCapacity: { type: Number, default: 0 }
}, { timestamps: true });


doctorAvailabilitySchema.index({ doctorId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DoctorAvailability', doctorAvailabilitySchema);