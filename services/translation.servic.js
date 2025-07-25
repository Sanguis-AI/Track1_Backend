// services/translation.service.js
const { ewondoToEnglishMap, englishToEwondoMap } = require('../data/translations');

/**
 * Translates text based on a dictionary lookup.
 * @param {string} text - The text to translate.
 * @param {string} fromLang - The source language ('ewondo' or 'english').
 * @param {string} toLang - The target language ('ewondo' or 'english').
 * @returns {string|null} The translated text, or null if not found.
 */
const translateText = (text, fromLang, toLang) => {
    // Normalize input text for lookup (remove leading/trailing spaces, maybe lowercase if appropriate for data)
    const normalizedText = text.trim();

    if (fromLang === 'ewondo' && toLang === 'english') {
        return ewondoToEnglishMap.get(normalizedText) || null;
    } else if (fromLang === 'english' && toLang === 'ewondo') {
        return englishToEwondoMap.get(normalizedText) || null;
    } else {
        return null; // Invalid language combination
    }
};

module.exports = {
    translateText
};