const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedback.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Route to submit feedback (can be anonymous or authenticated)
router.post('/', protect, feedbackController.submitUserFeedback);

// Route to get all feedback (Admin only)
router.get('/', protect, authorize('admin'), feedbackController.listAllFeedback);

// Route to get feedback submitted by the current user
router.get('/my', protect, feedbackController.getMyFeedback);

module.exports = router;