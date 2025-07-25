const Appointment = require('../models/Appointment');
const DoctorAvailability = require('../models/DoctorAvailability');
const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
const reminderService = require('./reminder.service'); // Assuming User model is used for both doctors and patients

/**
 * Finds available doctors based on specialty, urgency, and preferred time.
 * @param {string} specialty - Medical specialty (e.g., 'Cardiologist', 'Pediatrician').
 * @param {string} urgencyLevel - 'emergency', 'urgent', 'routine'.
 * @param {Date} preferredDateTime - Patient's preferred date and time for the appointment.
 * @returns {Array} - An array of available doctor objects with their available slots.
 */
const findAvailableDoctors = async (specialty, urgencyLevel, preferredDateTime) => {
    const searchDate = new Date(preferredDateTime);
    searchDate.setUTCHours(0, 0, 0, 0); // Normalize to start of day UTC

    const maxSearchDays = 7; // Look for appointments within the next 7 days
    let doctorsFound = [];

    for (let i = 0; i < maxSearchDays; i++) {
        const currentDate = new Date(searchDate);
        currentDate.setDate(searchDate.getDate() + i); // Iterate through days

        // 1. Find doctors by specialty
        const doctorsInSpecialty = await DoctorProfile.find({ specialty }).populate('userId', 'username');

        if (doctorsInSpecialty.length === 0) {
            continue; // No doctors in this specialty for the current search iteration
        }

        // 2. For each doctor, check their availability for the current date
        for (const doctorProfile of doctorsInSpecialty) {
            // Normalize current date for querying DoctorAvailability
            const availabilityQueryDateStart = new Date(currentDate);
            availabilityQueryDateStart.setUTCHours(0,0,0,0);
            const availabilityQueryDateEnd = new Date(currentDate);
            availabilityQueryDateEnd.setUTCHours(23,59,59,999);

            const doctorAvailability = await DoctorAvailability.findOne({
                doctorId: doctorProfile.userId._id,
                date: {
                    $gte: availabilityQueryDateStart,
                    $lte: availabilityQueryDateEnd
                }
            });

            if (doctorAvailability && doctorAvailability.slots.length > 0) {
                // Filter available (not booked) slots
                const availableSlots = doctorAvailability.slots.filter(slot => !slot.isBooked);

                if (availableSlots.length > 0) {
                    // 3. Filter by preferred time (if provided and relevant)
                    let relevantSlots = availableSlots;
                    if (preferredDateTime) {
                        const preferredHour = preferredDateTime.getHours();
                        const preferredMinute = preferredDateTime.getMinutes();

                        relevantSlots = availableSlots.filter(slot => {
                            const [slotHour, slotMinute] = slot.startTime.split(':').map(Number);
                            const slotTime = slotHour * 60 + slotMinute;
                            const preferredTimeInMinutes = preferredHour * 60 + preferredMinute;

                            // Example: Consider slots within +/- 2 hours of preferred time
                            const timeDifference = Math.abs(slotTime - preferredTimeInMinutes);
                            return timeDifference <= 120; // 120 minutes = 2 hours
                        });
                    }

                    // 4. Implement Urgency Logic:
                    if (relevantSlots.length > 0) {
                        relevantSlots.sort((a, b) => {
                            // Simple sort by start time for now
                            const [hourA, minA] = a.startTime.split(':').map(Number);
                            const [hourB, minB] = b.startTime.split(':').map(Number);
                            return (hourA * 60 + minA) - (hourB * 60 + minB);
                        });

                        const selectedSlots = [];
                        if (urgencyLevel === 'emergency') {
                            selectedSlots.push(relevantSlots[0]);
                        } else if (urgencyLevel === 'urgent') {
                            selectedSlots.push(...relevantSlots.slice(0, 3));
                        } else { // routine
                            selectedSlots.push(...relevantSlots.slice(0, 5));
                        }

                        if (selectedSlots.length > 0) {
                            doctorsFound.push({
                                doctorId: doctorProfile.userId._id,
                                doctorName: doctorProfile.userId.username,
                                specialty: doctorProfile.specialty,
                                availableOn: currentDate.toISOString().split('T')[0], // Just the date part
                                slots: selectedSlots
                            });

                            if (urgencyLevel === 'emergency' || urgencyLevel === 'urgent') {
                                // This assumes finding one doctor with an immediate slot is sufficient
                                return doctorsFound;
                            }
                        }
                    }
                }
            }
        }
    }
    return doctorsFound;
};


/**
 * Books an appointment, marking the specific slot as booked.
 * @param {string} patientId - The patient's user ID.
 * @param {string} doctorId - The doctor's user ID.
 * @param {string} date - ISO date string (e.g., "YYYY-MM-DD").
 * @param {string} time - Time string (e.g., "HH:MM").
 * @param {string} reason - Reason for the appointment.
 * @returns {object} The created appointment object.
 */
const bookAppointment = async (patientId, doctorId, date, time, reason) => {
    console.log("Appointment Service - Incoming Data for Booking:");
    console.log("  patientId:", patientId);
    console.log("  doctorId:", doctorId);
    console.log("  date (string):", date);
    console.log("  time (string):", time);
    console.log("  reason:", reason);

    // Normalize the date to the start and end of the day for querying
    const appointmentDateStart = new Date(date);
    appointmentDateStart.setUTCHours(0, 0, 0, 0); // Start of the day UTC

    const appointmentDateEnd = new Date(date);
    appointmentDateEnd.setUTCHours(23, 59, 59, 999); // End of the day UTC

    console.log("Appointment Service - Querying for availability between:", appointmentDateStart.toISOString(), "and", appointmentDateEnd.toISOString());

    const doctorAvailability = await DoctorAvailability.findOne({
        doctorId,
        // *** CRITICAL CHANGE: Use date range query instead of exact match for robustness ***
        date: {
            $gte: appointmentDateStart,
            $lte: appointmentDateEnd
        }
    });

    console.log("Appointment Service - Found doctorAvailability document:");
    console.log(doctorAvailability ? JSON.stringify(doctorAvailability, null, 2) : "Not found");

    if (!doctorAvailability) {
        console.log("Appointment Service - No availability document found for query.");
        throw new Error('Doctor not available on this date.');
    }

    // Find the specific slot and check if it's available and not already booked
    const slotIndex = doctorAvailability.slots.findIndex(
        slot => {
            const isMatch = slot.startTime === time && !slot.isBooked;
            console.log(`Checking slot: { startTime: ${slot.startTime}, isBooked: ${slot.isBooked} }. Match with requested time (${time}) and not booked: ${isMatch}`);
            return isMatch;
        }
    );

    console.log("Appointment Service - Found slotIndex:", slotIndex);

    if (slotIndex === -1) {
        console.log("Appointment Service - Slot not found in availability or is already booked.");
        throw new Error('Selected time slot is not available or already booked.');
    }

    // Create the new appointment document
    const newAppointment = new Appointment({
        patientId: patientId, // Matches schema 'patientId'
        doctorId: doctorId,   // Matches schema 'doctorId'
        date: new Date(`${date}T${time}:00.000Z`), // Combine date and time into a single Date object for accuracy
        time,
        reason,
        status: 'confirmed'
    });

    await newAppointment.save();
    console.log("Appointment Service - New appointment created with ID:", newAppointment._id);

    // Mark the slot as booked in DoctorAvailability
    doctorAvailability.slots[slotIndex].isBooked = true;
    doctorAvailability.slots[slotIndex].appointmentId = newAppointment._id; // Link appointment to slot
    await doctorAvailability.save();
    console.log("Appointment Service - Doctor availability updated (slot marked as booked).");

    const doctorUser = await User.findById(doctorId); // Assuming doctorId is a User ID
    const patientUser = await User.findById(patientId); // Assuming patientId is a User ID

    if (patientUser && patientUser.phoneNumber && patientUser.reminderPreference) { // Assuming User model has phoneNumber and reminderPreference field
        // Example: Schedule SMS reminder 30 minutes before
        await reminderService.scheduleAppointmentReminder(
            newAppointment._id,
            newAppointment.date, // This is the full date object
            newAppointment.time, // This is the "HH:MM" string
            patientId,
            doctorUser ? doctorUser.username : 'Unknown Doctor',
            patientUser.reminderPreference // e.g., 'sms', 'call'
        );
    } else {
        console.warn(`Could not schedule reminder for patient ${patientId}: Phone number or reminder preference missing.`);
    }

    // Populate doctor and patient details for the response
    const createdAppointment = await Appointment.findById(newAppointment._id)
        .populate('doctorId', 'username specialty') // Assuming 'doctorId' refers to 'User' model
        .populate('patientId', 'username email');   // Assuming 'patientId' refers to 'User' model
    return createdAppointment;
};


const getPatientAppointments = async (patientId) => {
    return await Appointment.find({ patientId }).populate('doctorId', 'username').lean();
};

const getDoctorAppointments = async (doctorId) => {
    return await Appointment.find({ doctorId }).populate('patientId', 'username').lean();
};


module.exports = {
    findAvailableDoctors,
    bookAppointment,
    getPatientAppointments,
    getDoctorAppointments
};