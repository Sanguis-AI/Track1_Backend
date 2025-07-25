const appointmentService = require('../services/appointment.service');
const doctorService = require('../services/doctor.service'); // New import

const findDoctors = async (req, res, next) => {
    try {
        const { specialty, urgencyLevel, preferredDateTime } = req.query; // Query params
        if (!specialty || !urgencyLevel) {
            return res.status(400).json({ message: 'Specialty and urgency level are required.' });
        }

        const preferredDate = preferredDateTime ? new Date(preferredDateTime) : new Date(); // Default to now if not provided

        const availableDoctors = await appointmentService.findAvailableDoctors(
            specialty,
            urgencyLevel,
            preferredDate
        );

        if (availableDoctors.length === 0) {
            return res.status(200).json({ message: 'No doctors found matching your criteria at this time.', doctors: [] });
        }

        res.json({ message: 'Doctors found', doctors: availableDoctors });
    } catch (error) {
        next(error);
    }
};


const createAppointment = async (req, res, next) => {
    try {
        const patientId = req.user.id; // Patient ID from authenticated user
        const { doctorId, date, time, reason } = req.body;

        if (!doctorId || !date || !time || !reason) {
            return res.status(400).json({ message: 'Doctor ID, date, time, and reason are required.' });
        }

        const newAppointment = await appointmentService.bookAppointment(
            patientId,
            doctorId,
            date,
            time,
            reason
        );
        res.status(201).json({ message: 'Appointment booked successfully', data: newAppointment });
    } catch (error) {
        next(error);
    }
};

const getAppointments = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let appointments;
        if (role === 'patient') {
            appointments = await appointmentService.getPatientAppointments(userId);
        } else if (role === 'doctor') {
            appointments = await appointmentService.getDoctorAppointments(userId);
        } else if (role === 'admin') {
            // Admin can view all appointments (needs to be implemented in service)
            // For now, let's return a message we can later on retieve the list of all appointments if needed
            return res.status(501).json({ message: 'Admin view for all appointments not yet implemented.' });
        } else {
            return res.status(403).json({ message: 'Unauthorized role to view appointments.' });
        }
        res.json(appointments);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    findDoctors, 
    createAppointment,
    getAppointments
};