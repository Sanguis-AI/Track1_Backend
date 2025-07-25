const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Allow anonymous feedback
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: false // Rating can be optional, text feedback might be enough
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    type: { // e.g., 'chatbot', 'doctor', 'platform_experience', 'bug_report'
        type: String,
        enum: ['chatbot', 'doctor', 'platform_experience', 'bug_report', 'other'],
        default: 'other'
    },
    associatedEntity: { // If feedback is about a specific doctor or appointment
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    associatedEntityType: {
        type: String,
        enum: ['Doctor', 'Appointment', null],
        required: false
    },
    sentimentScore: {
        type: Number,
        required: false // Will be calculated, not directly provided by user
    },
    sentimentClassification: {
        type: String,
        enum: ['positive', 'negative', 'neutral', null],
        required: false // Will be calculated
    },
    topics: { // An array of strings for extracted topics/keywords
        type: [String],
        default: []
    },
    // For internal use
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'resolved'],
        default: 'pending'
    },
    adminNotes: { type: String }

}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);