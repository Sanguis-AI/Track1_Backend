const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminder.controller');
const { protect } = require('../middleware/auth.middleware');

// Route to schedule a reminder (can be used by admin or internal logic)
router.post('/schedule', protect, reminderController.scheduleManualReminder);

// Route to get a user's reminders
router.get('/my', protect, reminderController.getMyReminders);

module.exports = router;