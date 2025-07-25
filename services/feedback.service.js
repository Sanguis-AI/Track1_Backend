const Feedback = require('../models/Feedback');
const Sentiment = require('sentiment');
const natural = require('natural');

const sentimentAnalyzer = new Sentiment(); // Initialize sentiment analyzer
const tokenizer = new natural.WordTokenizer();

/**
 * Creates a new feedback entry.
 * @param {string} [userId] - Optional ID of the user giving feedback (if authenticated)
 * @param {number} [rating] - Optional rating (1-5)
 * @param {string} message - The feedback message
 * @param {string} [type] - Type of feedback (e.g., 'chatbot', 'doctor')
 * @param {string} [associatedEntity] - ID of the entity feedback is about (e.g., doctorId, appointmentId)
 * @param {string} [associatedEntityType] - Type of the associated entity ('Doctor', 'Appointment')
 * @returns {object} The created feedback object.
 */
const submitFeedback = async (userId, rating, message, type, associatedEntity, associatedEntityType) => {
    if (!message) {
        throw new Error('Feedback message is required.');
    }

    const result = sentimentAnalyzer.analyze(message);
    let sentimentScore = result.score; // Numeric score
    let sentimentClassification; // 'positive', 'negative', 'neutral'

    if (sentimentScore > 0) {
        sentimentClassification = 'positive';
    } else if (sentimentScore < 0) {
        sentimentClassification = 'negative';
    } else {
        sentimentClassification = 'neutral';
    }

    const tokens = tokenizer.tokenize(message.toLowerCase()); // Convert to lowercase
    const stopWords = new Set(natural.stopwords); // Use natural's built-in English stop words
    const importantWords = tokens.filter(token =>
        token.length > 2 && // Ignore very short words
        !stopWords.has(token) && // Remove common stop words
        token.match(/^[a-z]+$/) // Only keep alphabetic words
    );

    const topicCounts = {};
    importantWords.forEach(word => {
        topicCounts[word] = (topicCounts[word] || 0) + 1;
    });

    // Extract potential topics (e.g., top N most frequent, or specific keywords)
    // For "long waits", we can look for specific phrases or related terms
    const extractedTopics = new Set();
    if (message.toLowerCase().includes('long wait')) extractedTopics.add('long wait times');
    if (message.toLowerCase().includes('wait time')) extractedTopics.add('wait times');
    if (message.toLowerCase().includes('queue')) extractedTopics.add('queue issues');
    if (message.toLowerCase().includes('staff') || message.toLowerCase().includes('reception')) extractedTopics.add('staff experience');
    if (message.toLowerCase().includes('doctor') || message.toLowerCase().includes('physician')) extractedTopics.add('doctor experience');
    if (message.toLowerCase().includes('booked') || message.toLowerCase().includes('appointment')) extractedTopics.add('appointment booking');
    if (message.toLowerCase().includes('app') || message.toLowerCase().includes('platform') || message.toLowerCase().includes('system')) extractedTopics.add('platform experience');
    if (message.toLowerCase().includes('bug') || message.toLowerCase().includes('error')) extractedTopics.add('bug report');
    if (message.toLowerCase().includes('friendly') || message.toLowerCase().includes('polite')) extractedTopics.add('positive interaction');
    if (message.toLowerCase().includes('rude') || message.toLowerCase().includes('unhelpful')) extractedTopics.add('negative interaction');
    if (message.toLowerCase().includes('easy') || message.toLowerCase().includes('simple')) extractedTopics.add('ease of use');
    if (message.toLowerCase().includes('difficult') || message.toLowerCase().includes('confusing')) extractedTopics.add('difficulty of use');


    // Add the top 3 frequent keywords as general topics if not already covered by specific phrases
    const sortedTopics = Object.entries(topicCounts).sort(([, a], [, b]) => b - a);
    sortedTopics.slice(0, 3).forEach(([word]) => {
        // Avoid adding general words if already covered by specific topics
        if (!['time', 'wait', 'doctor', 'staff', 'app'].includes(word) && !extractedTopics.has(word)) {
            extractedTopics.add(word);
        }
    });

    const feedback = new Feedback({
        userId,
        rating,
        message,
        type,
        associatedEntity,
        associatedEntityType,
        sentimentScore,          
        sentimentClassification, 
        topics: Array.from(extractedTopics)
    });
    await feedback.save();
    return feedback;
};

/**
 * Retrieves all feedback entries (typically for admin use).
 */
const getAllFeedback = async () => {
    return await Feedback.find().populate('userId', 'username email').sort({ createdAt: -1 }).lean();
};

/**
 * Retrieves feedback entries for a specific user.
 * @param {string} userId
 */
const getUserFeedback = async (userId) => {
    return await Feedback.find({ userId }).sort({ createdAt: -1 }).lean();
};

module.exports = {
    submitFeedback,
    getAllFeedback,
    getUserFeedback
};