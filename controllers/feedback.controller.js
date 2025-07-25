const feedbackService = require('../services/feedback.service');

// Endpoint for submitting feedback
const submitUserFeedback = async (req, res, next) => {
    try {
        const userId = req.user ? req.user.id : null; // Get userId from authenticated user, or null for anonymous
        const { rating, message, type, associatedEntity, associatedEntityType } = req.body;

        if (!message) {
            return res.status(400).json({ message: 'Feedback message is required.' });
        }

        const feedback = await feedbackService.submitFeedback(
            userId,
            rating,
            message,
            type,
            associatedEntity,
            associatedEntityType
        );

        res.status(201).json({ message: 'Feedback submitted successfully!', feedback });

    } catch (error) {
        next(error);
    }
};

// Endpoint to get all feedback (Admin only)
const listAllFeedback = async (req, res, next) => {
    try {
        // Implement role-based access control here (e.g., check req.user.role === 'admin')
        if (req.user.role !== 'admin') { // Assuming your auth middleware attaches role
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }
        const feedbackList = await feedbackService.getAllFeedback();
        res.status(200).json(feedbackList);
    } catch (error) {
        next(error);
    }
};

// Endpoint to get feedback for the current user
const getMyFeedback = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const feedbackList = await feedbackService.getUserFeedback(userId);
        res.status(200).json(feedbackList);
    } catch (error) {
        next(error);
    }
};


module.exports = {
    submitUserFeedback,
    listAllFeedback,
    getMyFeedback
};