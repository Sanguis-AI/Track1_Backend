const twilio = require('twilio');
const Reminder = require('../models/Reminder');
const User = require('../models/User'); // To get user's phone number
const Appointment = require('../models/Appointment'); // To get appointment details

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

/**
 * Creates a new reminder entry in the database.
 * @param {string} userId
 * @param {string} type - 'appointment', 'medication', 'general'
 * @param {string} message
 * @param {Date} scheduledTime
 * @param {string} contactMethod - 'sms', 'call'
 * @param {string} [appointmentId] - Optional, for appointment reminders
 * @param {object} [medicationDetails] - Optional, for medication reminders { name, dosage, frequency }
 * @returns {object} The created reminder object.
 */
const createReminder = async (userId, type, message, scheduledTime, contactMethod, appointmentId = null, medicationDetails = {}) => {
    const reminder = new Reminder({
        userId,
        type,
        message,
        scheduledTime,
        contactMethod,
        appointmentId,
        medicationName: medicationDetails.name,
        dosage: medicationDetails.dosage,
        frequency: medicationDetails.frequency,
        startDate: medicationDetails.startDate,
        endDate: medicationDetails.endDate
    });
    await reminder.save();
    return reminder;
};

/**
 * Sends an SMS reminder using Twilio.
 * @param {string} toPhoneNumber - Recipient's phone number (E.164 format)
 * @param {string} message - SMS message content
 */
const sendSmsReminder = async (toPhoneNumber, message) => {
    if (!twilioPhoneNumber) {
        console.warn("TWILIO_PHONE_NUMBER is not set. SMS reminder not sent.");
        throw new Error("Twilio phone number not configured.");
    }
    try {
        const sms = await twilioClient.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: toPhoneNumber
        });
        console.log(`SMS sent to ${toPhoneNumber}: ${sms.sid}`);
        return sms;
    } catch (error) {
        console.error(`Error sending SMS to ${toPhoneNumber}:`, error);
        throw new Error(`Failed to send SMS: ${error.message}`);
    }
};

/**
 * Makes a call reminder using Twilio (text-to-speech).
 * @param {string} toPhoneNumber - Recipient's phone number (E.164 format)
 * @param {string} message - Text to be read aloud (or TwiML URL)
 */
const makeCallReminder = async (toPhoneNumber, message) => {
    if (!twilioPhoneNumber) {
        console.warn("TWILIO_PHONE_NUMBER is not set. Call reminder not made.");
        throw new Error("Twilio phone number not configured.");
    }
    try {
        // For a simple text-to-speech call, use a TwiML Bin or dynamically generate TwiML
        // For simplicity, we'll use a direct speech message.
        // In production, you'd likely host TwiML or use Twilio Functions.
        const call = await twilioClient.calls.create({
            twiml: `<Response><Say>${message}</Say></Response>`,
            from: twilioPhoneNumber,
            to: toPhoneNumber
        });
        console.log(`Call initiated to ${toPhoneNumber}: ${call.sid}`);
        return call;
    } catch (error) {
        console.error(`Error making call to ${toPhoneNumber}:`, error);
        throw new Error(`Failed to make call: ${error.message}`);
    }
};

/**
 * Schedules a new appointment reminder. This function would typically be called
 * when an appointment is booked.
 * @param {string} appointmentId
 * @param {Date} appointmentDate
 * @param {string} appointmentTime
 * @param {string} patientId
 * @param {string} doctorName
 * @param {string} contactMethod - 'sms' or 'call'
 */
const scheduleAppointmentReminder = async (appointmentId, appointmentDate, appointmentTime, patientId, doctorName, contactMethod) => {
    const patient = await User.findById(patientId);
    if (!patient || !patient.phoneNumber) {
        throw new Error('Patient not found or phone number missing.');
    }

    // Combine date and time for the actual appointment time
    const [hours, minutes] = appointmentTime.split(':').map(Number);
    const fullAppointmentDateTime = new Date(appointmentDate);
    fullAppointmentDateTime.setUTCHours(hours, minutes, 0, 0);

    // Schedule reminder X minutes before the appointment
    const reminderTime = new Date(fullAppointmentDateTime.getTime() - (30 * 60 * 1000)); // 30 minutes before

    const message = `Hello ${patient.username}, this is a reminder for your appointment with Dr. ${doctorName} on ${fullAppointmentDateTime.toDateString()} at ${appointmentTime}. Reason: ${Appointment.reason || 'medical consultation'}. Please be on time.`;

    // Create the reminder record
    const reminder = await createReminder(
        patientId,
        'appointment',
        message,
        reminderTime,
        contactMethod,
        appointmentId
    );

    // In a real system, you'd use a cron job or a dedicated scheduling service (like Agenda.js, Node-Schedule)
    // to pick up 'pending' reminders and send them at `scheduledTime`.
    // For this example, we'll just log that it's "scheduled".
    console.log(`Reminder scheduled for appointment ${appointmentId} to be sent via ${contactMethod} at ${reminderTime.toISOString()}`);
    console.log(`Reminder Message: ${message}`);

    // This is where you would integrate with a real scheduler.
    // For now, we'll simulate immediate sending for testing, but ideally
    // this would be a separate process.
    if (contactMethod === 'sms') {
        // await sendSmsReminder(patient.phoneNumber, message); // Uncomment for actual sending
    } else if (contactMethod === 'call') {
        // await makeCallReminder(patient.phoneNumber, message); // Uncomment for actual sending
    }

    return reminder;
};

/**
 * Retrieves all reminders for a specific user.
 * @param {string} userId
 */
const getUserReminders = async (userId) => {
    return await Reminder.find({ userId }).sort({ scheduledTime: -1 }).lean();
};


module.exports = {
    createReminder,
    sendSmsReminder, // Exposed for direct use, but typically used internally
    makeCallReminder, // Exposed for direct use, but typically used internally
    scheduleAppointmentReminder,
    getUserReminders
};