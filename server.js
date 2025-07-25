const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db.config');
const errorHandler = require('./middleware/error.middleware');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser middleware
app.use(express.json()); // Allows parsing of JSON request bodies

// Import routes
const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const chatbotRoutes = require('./routes/chatbot.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const doctorRoutes = require('./routes/doctor.routes'); // NEW

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes); // NEW

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