// controllers/chatbot.controller.js
const geminiService = require('../services/gemini.service');
const appointmentService = require('../services/appointment.service');
const doctorService = require('../services/doctor.service'); // Added to find doctors

// --- IMPORTANT: Session State Management (Simplified for example) ---
// In a real application, session state should be managed robustly,
// e.g., using a dedicated session store (Redis, database) tied to userId,
// or by the frontend managing conversation turn states.
// For this example, we simulate by assuming the frontend sends `conversationState`
// and `preferredTime`/`preferredDoctorId` in subsequent requests.

const getChatResponse = async (req, res, next) => {
    try {
        console.log("Chatbot Controller - Request User ID:", req.user ? req.user.id : "User object or ID is missing"); // ADD THIS
        
        const {
            question,
            language,
            conversationState, // Frontend sends this (e.g., 'waitingForTimePreference', 'initial')
            preferredTime,     // Frontend sends this if user provides time
            preferredDoctorId  // Frontend sends this if user selects a doctor
        } = req.body;

        const userId = req.user.id;
        const userLanguage = language || 'en';

        if (!question) {
            return res.status(400).json({ message: 'Question is required.' });
        }

        let chatbotResponse = {};
        let appointmentDetails = null;
        let availableDoctors = [];
        let actionRequired = 'none'; // 'ask_preference', 'offer_slots', 'booked_generic', 'booked_specific', 'direct_emergency'

        // --- Step 1: Initial AI Assessment (Always happens first, or if state is reset) ---
        if (conversationState === 'initial' || !conversationState) {
            const {
                responseText,
                requiresAppointment,
                recommendedUrgency,
                recommendedSpecialty,
                requiresUserPreference
            } = await geminiService.generateMedicalResponse(userId, question, userLanguage);

            chatbotResponse.response = responseText;
            chatbotResponse.recommendedUrgency = recommendedUrgency;
            chatbotResponse.recommendedSpecialty = recommendedSpecialty;

            if (requiresAppointment) {
                if (recommendedUrgency === 'emergency') {
                    // EMERGENCY: Directly advise ER, no booking through this system (usually)
                    actionRequired = 'direct_emergency';
                    chatbotResponse.response += "\n\n**Please proceed to the nearest emergency room or call your local emergency services immediately.**";
                } else if (requiresUserPreference) {
                    // ROUTINE/URGENT: Ask for preferences
                    actionRequired = 'ask_preference';
                    chatbotResponse.response += `\n\nIf you'd like to book an appointment with a ${recommendedSpecialty || 'doctor'}, please specify your preferred date and time, or if you have a specific doctor in mind.`;
                    chatbotResponse.nextAction = 'provide_preference'; // Frontend hint
                    chatbotResponse.dataForNextTurn = { // Data to carry to next turn
                        recommendedSpecialty: recommendedSpecialty,
                        recommendedUrgency: recommendedUrgency
                    };
                } else {
                    // Should not hit this path if `requiresUserPreference` is true for non-emergency.
                    // This could be a direct "book now" or if AI determined no preference needed.
                    // For safety, assume generic booking for urgent if no preference provided immediately.
                    actionRequired = 'offer_slots_or_book_generic'; // Will search for slots or book generic based on urgency
                }
            } else {
                actionRequired = 'none'; // No appointment needed
            }
        }
        // --- Step 2: User has provided preferences (or system needs to find slots) ---
        else if (conversationState === 'waitingForTimePreference' && preferredTime) {
            // User provided a preferred time, now find doctors based on that
            const { recommendedSpecialty, recommendedUrgency } = req.body.context; // Assuming context from previous turn
            const specialty = recommendedSpecialty || 'General Practitioner'; // Use recommended or default

            const datePref = new Date(preferredTime);
            // Find doctors based on specialty, urgency, and preferred time
            availableDoctors = await appointmentService.findAvailableDoctors(
                specialty,
                recommendedUrgency,
                datePref
            );

            if (availableDoctors.length > 0) {
                actionRequired = 'offer_slots';
                chatbotResponse.response = `Great! I found some available slots with a ${specialty} around your preferred time.`;
                chatbotResponse.availableDoctors = availableDoctors.map(doc => ({
                    doctorId: doc.doctorId,
                    doctorName: doc.doctorName,
                    specialty: doc.specialty,
                    availableOn: doc.availableOn, // Date string
                    slots: doc.availableSlots.map(slot => ({ // Only send necessary slot info
                        startTime: slot.startTime,
                        endTime: slot.endTime
                    }))
                }));
                chatbotResponse.nextAction = 'select_slot'; // Frontend hint
            } else {
                actionRequired = 'ask_preference_again';
                chatbotResponse.response = `I couldn't find available appointments with a ${specialty} around your preferred time (${preferredTime}). Would you like to try a different time or date, or should I look for the next available general appointment?`;
                chatbotResponse.nextAction = 'provide_preference'; // Frontend hint
                chatbotResponse.dataForNextTurn = { // Carry context forward
                    recommendedSpecialty: specialty,
                    recommendedUrgency: recommendedUrgency
                };
            }
        }
        // --- Step 3: User has selected a specific slot/doctor (or confirms generic urgent) ---
        else if (conversationState === 'confirmBooking' && preferredDoctorId && preferredTime) {
            // User selected a specific doctor and time, proceed to book
            try {
                const datePart = preferredTime.substring(0, 10); // Get "YYYY-MM-DD" directly from the string
                const timePart = preferredTime.substring(11, 16); // Get "HH:MM" directly from the string

                // Add a log to confirm here:
                console.log("Chatbot Controller - Preparing to book with (extracted):");
                console.log("  datePart:", datePart);
                console.log("  timePart:", timePart);
                const bookedAppt = await appointmentService.bookAppointment(
                    userId,
                    preferredDoctorId,
                    datePart, // Use the date part
                    timePart, // Use the time part
                    `AI-recommended appointment (user selected slot)`
                );
                actionRequired = 'booked_specific';
                appointmentDetails = {
                    message: `Your appointment has been successfully booked with Dr. ${bookedAppt.doctorId.username || preferredDoctorId} on ${bookedAppt.date.toDateString()} at ${bookedAppt.time}.`,
                    appointmentId: bookedAppt._id,
                    date: bookedAppt.date,
                    time: bookedAppt.time,
                    status: bookedAppt.status
                };
                chatbotResponse.response = appointmentDetails.message;
            } catch (bookingError) {
                console.error("Error booking specific appointment:", bookingError);
                actionRequired = 'booking_failed';
                chatbotResponse.response = `I apologize, there was an issue booking that specific appointment: ${bookingError.message}. The slot might have just been taken. Please try selecting another slot or try again.`;
                chatbotResponse.nextAction = 're_select_slot'; // Frontend hint
            }
        }
        // --- Step 4: Fallback for generic urgent booking if no preference provided after initial prompt for urgent case ---
        else if (conversationState === 'initial' && chatbotResponse.recommendedUrgency === 'urgent' && !preferredTime) {
             // AI recommended urgent, but user didn't provide preference in this turn.
             // Auto-book generic urgent if the AI initially indicated "urgent" and we have no preferences.
            try {
                // Book the absolute earliest general practitioner appointment
                const earliestDoctors = await appointmentService.findAvailableDoctors(
                    'General Practitioner',
                    'urgent',
                    new Date() // Search from now
                );

                if (earliestDoctors.length > 0 && earliestDoctors[0].availableSlots.length > 0) {
                    const bestDoctorId = earliestDoctors[0].doctorId;
                    const bestSlot = earliestDoctors[0].availableSlots[0];
                    const bestDate = earliestDoctors[0].availableOn;

                    const bookedAppt = await appointmentService.bookAppointment(
                        userId,
                        bestDoctorId,
                        bestDate,
                        bestSlot.startTime,
                        `AI-recommended generic urgent appointment`
                    );
                    actionRequired = 'booked_generic';
                    appointmentDetails = {
                        message: `Given the urgency, I've booked you the earliest available appointment with a General Practitioner. Your appointment is with Dr. ${bookedAppt.doctorId.username || bestDoctorId} on ${bookedAppt.date.toDateString()} at ${bookedAppt.time}.`,
                        appointmentId: bookedAppt._id,
                        date: bookedAppt.date,
                        time: bookedAppt.time,
                        status: bookedAppt.status
                    };
                    chatbotResponse.response = appointmentDetails.message;
                } else {
                    actionRequired = 'no_generic_found';
                    chatbotResponse.response = "I couldn't find any immediate general practitioner appointments. Please try again later or contact the clinic directly for urgent cases.";
                }
            } catch (bookingError) {
                console.error("Error booking generic urgent appointment:", bookingError);
                actionRequired = 'booking_failed_generic';
                chatbotResponse.response = `I apologize, there was an issue booking a generic urgent appointment: ${bookingError.message}. Please try again or contact the clinic directly.`;
            }
        }
        else {
            // Handle other conversational states or provide a general response
            chatbotResponse.response = chatbotResponse.response || `I'm not sure how to proceed. Could you please rephrase or provide more details?`;
            actionRequired = 'unknown_state';
        }


        // Final Response to Frontend
        res.json({
            ...chatbotResponse,
            appointment: appointmentDetails,
            actionRequired: actionRequired // Indicate to frontend what the next step is
        });

    } catch (error) {
        next(error);
    }
};

module.exports = { getChatResponse };