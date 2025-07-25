
const express = require('express');
const router = express.Router();
const translationController = require('../controllers/translation.controller');

// No authentication needed for a public translation endpoint
router.post('/', translationController.translate);

module.exports = router;