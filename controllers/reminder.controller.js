const reminderService = require('../services/reminder.service');
const Appointment = require('../models/Appointment'); // To get appointment details if needed
const User = require('../models/User'); // To get doctor name

// Endpoint to manually schedule a reminder (for testing/admin)
const scheduleManualReminder = async (req, res, next) => {
    try {
        const {
            userId,        // The user ID for whom the reminder is
            type,          // 'appointment', 'medication', 'general'
            message,
            scheduledTime, // ISO string
            contactMethod, // 'sms', 'call'
            appointmentId, // Optional
            medicationDetails // Optional { name, dosage, frequency }
        } = req.body;

        if (!userId || !type || !message || !scheduledTime || !contactMethod) {
            return res.status(400).json({ message: 'Missing required reminder fields.' });
        }

        const reminder = await reminderService.createReminder(
            userId,
            type,
            message,
            new Date(scheduledTime),
            contactMethod,
            appointmentId,
            medicationDetails
        );

        // In a real app, this would trigger a background job to send the reminder.
        // For demonstration, we'll just return the scheduled reminder.
        res.status(201).json({ message: 'Reminder scheduled successfully (will be sent by background worker)', reminder });

    } catch (error) {
        next(error);
    }
};

// Endpoint to get a user's reminders
const getMyReminders = async (req, res, next) => {
    try {
        const userId = req.user.id; // From auth middleware
        const reminders = await reminderService.getUserReminders(userId);
        res.status(200).json(reminders);
    } catch (error) {
        next(error);
    }
};


module.exports = {
    scheduleManualReminder,
    getMyReminders
};