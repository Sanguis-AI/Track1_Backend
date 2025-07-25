const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db.config');
const errorHandler = require('./middleware/error.middleware');
const translationRoutes = require('./routes/translation.routes');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const chatbotRoutes = require('./routes/chatbot.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const doctorRoutes = require('./routes/doctor.routes'); // NEW
const reminderRoutes = require('./routes/reminder.routes'); // NEW
const feedbackRoutes = require('./routes/feedback.routes');   // NEW

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes); // NEW
app.use('/api/reminders', reminderRoutes); // e.g., POST /api/reminders/schedule, GET /api/reminders/my
app.use('/api/feedback', feedbackRoutes); // e.g., POST /api/feedback, GET /api/feedback, GET /api/feedback/my
app.use('/api/translate', translationRoutes);

// Basic route
app.get('/', (req, res) => {
    res.send('Medical AI Assistant API is running! 🤖⚕️');
});

// Error handling middleware (should be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode.`);
});