const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming users (patients) are in the 'User' model
        required: true
    },
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: false // Not all reminders are for appointments (e.g., medication)
    },
    type: {
        type: String,
        enum: ['appointment', 'medication', 'general'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    scheduledTime: { // When the reminder should be sent (e.g., 30 mins before appointment)
        type: Date,
        required: true
    },
    contactMethod: {
        type: String,
        enum: ['sms', 'call', 'email', 'in-app-notification'], // Add more as needed
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'cancelled'],
        default: 'pending'
    },
    // For medication reminders, could add details
    medicationName: { type: String },
    dosage: { type: String },
    frequency: { type: String }, // e.g., 'daily', 'twice a day'
    startDate: { type: Date },
    endDate: { type: Date }

}, { timestamps: true });

// Optional: Index for faster queries
reminderSchema.index({ scheduledTime: 1, status: 1 });
reminderSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);