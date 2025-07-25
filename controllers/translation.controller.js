// controllers/translation.controller.js
const translationService = require('../services/translation.servic');

const translate = (req, res, next) => {
    try {
        const { text, fromLang, toLang } = req.body;

        if (!text || !fromLang || !toLang) {
            return res.status(400).json({ message: 'Missing required fields: text, fromLang, toLang.' });
        }

        if (!['ewondo', 'english'].includes(fromLang.toLowerCase()) || !['ewondo', 'english'].includes(toLang.toLowerCase())) {
            return res.status(400).json({ message: 'Invalid languages. Supported: ewondo, english.' });
        }

        const translatedText = translationService.translateText(text, fromLang.toLowerCase(), toLang.toLowerCase());

        if (translatedText === null) {
            // This indicates the text wasn't found in our limited dictionary
            return res.status(404).json({
                message: 'Translation not found for the given text and language pair. Consider using a more advanced translation service for broader coverage.',
                originalText: text,
                fromLang,
                toLang
            });
        }

        res.status(200).json({
            originalText: text,
            fromLang,
            toLang,
            translatedText
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    translate
};