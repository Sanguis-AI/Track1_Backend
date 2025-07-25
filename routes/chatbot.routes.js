
const express = require('express');
const { getChatResponse } = require('../controllers/chatbot.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const router = express.Router();

router.post('/', protect, authorize('patient'), getChatResponse);

module.exports = router;