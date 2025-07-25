// services/gemini.service.js
const geminiModel = require('../config/gemini.config');
const { getPatientMedicalHistory } = require('./patient.service');
const { medicalKnowledgeBase } = require('../utils/medicalKnowledgeBase');
// Removed: const axios = require('axios');
require('dotenv').config();

// Removed: const PYTHON_TRANSLATION_API_URL = process.env.PYTHON_TRANSLATION_API_URL;
// Removed: translateText function

const generateMedicalResponse = async (userId, userQuestion, userLanguage = 'en') => {
    try {
        // No translation needed here; userQuestion is assumed to be in the target language (e.g., English)
        const questionInTargetLanguage = userQuestion;

        const patientHistory = await getPatientMedicalHistory(userId);
        let historyContext = "No specific medical history provided.";
        if (patientHistory) {
            historyContext = `
            Patient's Medical History:
            Date of Birth: ${patientHistory.dateOfBirth ? patientHistory.dateOfBirth.toISOString().split('T')[0] : 'N/A'}
            Gender: ${patientHistory.gender || 'N/A'}
            Allergies: ${patientHistory.allergies && patientHistory.allergies.length > 0 ? patientHistory.allergies.join(', ') : 'None'}
            Current Medications: ${patientHistory.medications && patientHistory.medications.length > 0 ? patientHistory.medications.map(m => `${m.name} (${m.dosage}, ${m.frequency})`).join('; ') : 'None'}
            Past Medical Conditions: ${patientHistory.pastMedicalHistory && patientHistory.pastMedicalHistory.length > 0 ? patientHistory.pastMedicalHistory.map(c => `${c.condition} (Diagnosed: ${c.diagnosisDate ? c.diagnosisDate.toISOString().split('T')[0] : 'N/A'})`).join('; ') : 'None'}
            `;
        }

        let knowledgeContext = "";
        const questionLower = questionInTargetLanguage.toLowerCase(); // Use the direct question for lookup
        for (const med of (patientHistory?.medications || [])) {
            if (questionLower.includes(med.name.toLowerCase())) {
                const knownSideEffects = medicalKnowledgeBase.getSideEffects(med.name);
                if (knownSideEffects) {
                    knowledgeContext += `Known side effects for ${med.name}: ${knownSideEffects.join(', ')}. `;
                }
            }
        }
        for (const symptom in medicalKnowledgeBase.urgentCareCriteria) {
            if (questionLower.includes(symptom.toLowerCase())) {
                knowledgeContext += `Urgent care criteria for ${symptom}: ${medicalKnowledgeBase.urgentCareCriteria[symptom]}. `;
            }
        }

        const prompt = `
        You are a highly knowledgeable medical assistant. Your goal is to provide helpful, but not diagnostic, information based on the user's symptoms and medical history.
        Always advise consulting a qualified medical professional for diagnosis and treatment.
        If the symptoms suggest an urgent or emergency situation, explicitly state the need for urgent care or emergency services.
        If an appointment is recommended, suggest a relevant specialty if possible (e.g., General Practitioner, Cardiologist).

        ${historyContext}
        ${knowledgeContext}

        User's current symptoms/question: "${questionInTargetLanguage}"

        Based on the provided information, respond in ${userLanguage || 'English'}:
        1. Identify potential interpretations of the symptoms, especially considering the patient's medications (possible side effects) or past conditions (possible complications).
        2. Suggest a course of action:
            - If it seems like a mild side effect, recommend monitoring and contacting their doctor if it worsens.
            - If it suggests a potential complication, recommend prompt consultation with their doctor.
            - If it indicates an urgent or emergency situation, *strongly* recommend seeking immediate medical attention (e.g., go to ER, call emergency services).
        3. If an appointment is recommended, explicitly state the recommended specialty (e.g., "General Practitioner", "Cardiologist").
        4. Do not provide a diagnosis.
        5. End with a disclaimer: "Disclaimer: This information is for educational purposes only and not a substitute for professional medical advice. Always consult a healthcare professional for diagnosis and treatment."
        `;

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const textFromGemini = response.text();
        console.log(`Gemini's response: ${textFromGemini}`);

        // No translation needed for the final response text
        let finalResponseText = textFromGemini;

        // Action flags for the controller
        let requiresAppointment = false;
        let recommendedUrgency = 'routine'; // 'routine', 'urgent', 'emergency'
        let recommendedSpecialty = null;
        let requiresUserPreference = false; // New flag

        // Simple keyword detection for urgency and specialty
        if (textFromGemini.toLowerCase().includes('immediate medical attention') || textFromGemini.toLowerCase().includes('emergency room') || textFromGemini.toLowerCase().includes('call emergency services')) {
            requiresAppointment = true;
            recommendedUrgency = 'emergency';
        } else if (textFromGemini.toLowerCase().includes('consult your doctor promptly') || textFromGemini.toLowerCase().includes('urgent appointment')) {
            requiresAppointment = true;
            recommendedUrgency = 'urgent';
        } else if (textFromGemini.toLowerCase().includes('consult a doctor') || textFromGemini.toLowerCase().includes('schedule an appointment')) {
            requiresAppointment = true;
            recommendedUrgency = 'routine';
        }

        // Attempt to extract specialty (simple regex for common terms)
        const specialtyMatches = textFromGemini.match(/(general practitioner|cardiologist|pediatrician|dermatologist|neurologist|gastroenterologist)/i);
        if (specialtyMatches && specialtyMatches.length > 0) {
            recommendedSpecialty = specialtyMatches[0].toLowerCase();
            recommendedSpecialty = recommendedSpecialty.charAt(0).toUpperCase() + recommendedSpecialty.slice(1);
        } else if (requiresAppointment) {
            recommendedSpecialty = 'General Practitioner';
        }

        if (requiresAppointment && recommendedUrgency !== 'emergency') {
            requiresUserPreference = true;
        }

        return {
            responseText: finalResponseText,
            requiresAppointment: requiresAppointment,
            recommendedUrgency: recommendedUrgency,
            recommendedSpecialty: recommendedSpecialty,
            requiresUserPreference: requiresUserPreference
        };

    } catch (error) {
        console.error("Error generating medical response:", error);
        throw new Error("Could not process your request at this time.");
    }
};

module.exports = { generateMedicalResponse };



















// const geminiModel = require('../config/gemini.config');
// const { getPatientMedicalHistory } = require('./patient.service');
// const { medicalKnowledgeBase } = require('../utils/medicalKnowledgeBase');
// const axios = require('axios');
// require('dotenv').config();

// const PYTHON_TRANSLATION_API_URL = process.env.PYTHON_TRANSLATION_API_URL;

// const translateText = async (text, sourceLang, targetLang) => {
//     try {
//         const response = await axios.post(PYTHON_TRANSLATION_API_URL, {
//             text,
//             source_lang: sourceLang,
//             target_lang: targetLang
//         });
//         return response.data.translated_text;
//     } catch (error) {
//         console.error(`Error translating from ${sourceLang} to ${targetLang}:`, error.message);
//         return text; // Fallback
//     }
// };

// const generateMedicalResponse = async (userId, userQuestion, userLanguage = 'en') => {
//     try {
//         let questionInEnglish = userQuestion;
//         if (userLanguage !== 'en') {
//             questionInEnglish = await translateText(userQuestion, userLanguage, 'en');
//             console.log(`Translated question to English: ${questionInEnglish}`);
//         }

//         const patientHistory = await getPatientMedicalHistory(userId);
//         let historyContext = "No specific medical history provided.";
//         if (patientHistory) {
//             historyContext = `
//             Patient's Medical History:
//             Date of Birth: ${patientHistory.dateOfBirth ? patientHistory.dateOfBirth.toISOString().split('T')[0] : 'N/A'}
//             Gender: ${patientHistory.gender || 'N/A'}
//             Allergies: ${patientHistory.allergies && patientHistory.allergies.length > 0 ? patientHistory.allergies.join(', ') : 'None'}
//             Current Medications: ${patientHistory.medications && patientHistory.medications.length > 0 ? patientHistory.medications.map(m => `${m.name} (${m.dosage}, ${m.frequency})`).join('; ') : 'None'}
//             Past Medical Conditions: ${patientHistory.pastMedicalHistory && patientHistory.pastMedicalHistory.length > 0 ? patientHistory.pastMedicalHistory.map(c => `${c.condition} (Diagnosed: ${c.diagnosisDate ? c.diagnosisDate.toISOString().split('T')[0] : 'N/A'})`).join('; ') : 'None'}
//             `;
//         }

//         let knowledgeContext = "";
//         const questionLower = questionInEnglish.toLowerCase();
//         for (const med of (patientHistory?.medications || [])) {
//             if (questionLower.includes(med.name.toLowerCase())) {
//                 const knownSideEffects = medicalKnowledgeBase.getSideEffects(med.name);
//                 if (knownSideEffects) {
//                     knowledgeContext += `Known side effects for ${med.name}: ${knownSideEffects.join(', ')}. `;
//                 }
//             }
//         }
//         for (const symptom in medicalKnowledgeBase.urgentCareCriteria) {
//             if (questionLower.includes(symptom.toLowerCase())) {
//                 knowledgeContext += `Urgent care criteria for ${symptom}: ${medicalKnowledgeBase.urgentCareCriteria[symptom]}. `;
//             }
//         }

//         const prompt = `
//         You are a highly knowledgeable medical assistant. Your goal is to provide helpful, but not diagnostic, information based on the user's symptoms and medical history.
//         Always advise consulting a qualified medical professional for diagnosis and treatment.
//         If the symptoms suggest an urgent or emergency situation, explicitly state the need for urgent care or emergency services.
//         If an appointment is recommended, suggest a relevant specialty if possible (e.g., General Practitioner, Cardiologist).

//         ${historyContext}
//         ${knowledgeContext}

//         User's current symptoms/question (originally in ${userLanguage}, translated to English): "${questionInEnglish}"

//         Based on the provided information, respond in English:
//         1. Identify potential interpretations of the symptoms, especially considering the patient's medications (possible side effects) or past conditions (possible complications).
//         2. Suggest a course of action:
//             - If it seems like a mild side effect, recommend monitoring and contacting their doctor if it worsens.
//             - If it suggests a potential complication, recommend prompt consultation with their doctor.
//             - If it indicates an urgent or emergency situation, *strongly* recommend seeking immediate medical attention (e.g., go to ER, call emergency services).
//         3. If an appointment is recommended, explicitly state the recommended specialty (e.g., "General Practitioner", "Cardiologist").
//         4. Do not provide a diagnosis.
//         5. End with a disclaimer: "Disclaimer: This information is for educational purposes only and not a substitute for professional medical advice. Always consult a healthcare professional for diagnosis and treatment."
//         `;

//         const result = await geminiModel.generateContent(prompt);
//         const response = await result.response;
//         const textFromGemini = response.text();
//         console.log(`Gemini's English response: ${textFromGemini}`);

//         let finalResponseText = textFromGemini;
//         if (userLanguage !== 'en') {
//             finalResponseText = await translateText(textFromGemini, 'en', userLanguage);
//             console.log(`Translated response to ${userLanguage}: ${finalResponseText}`);
//         }

//         // Action flags for the controller
//         let requiresAppointment = false;
//         let recommendedUrgency = 'routine'; // 'routine', 'urgent', 'emergency'
//         let recommendedSpecialty = null;
//         let requiresUserPreference = false; // New flag

//         // Simple keyword detection for urgency and specialty
//         if (textFromGemini.toLowerCase().includes('immediate medical attention') || textFromGemini.toLowerCase().includes('emergency room') || textFromGemini.toLowerCase().includes('call emergency services')) {
//             requiresAppointment = true;
//             recommendedUrgency = 'emergency';
//         } else if (textFromGemini.toLowerCase().includes('consult your doctor promptly') || textFromGemini.toLowerCase().includes('urgent appointment')) {
//             requiresAppointment = true;
//             recommendedUrgency = 'urgent';
//         } else if (textFromGemini.toLowerCase().includes('consult a doctor') || textFromGemini.toLowerCase().includes('schedule an appointment')) {
//             requiresAppointment = true;
//             recommendedUrgency = 'routine'; // Default to routine if no specific urgency mentioned
//         }

//         // Attempt to extract specialty (simple regex for common terms)
//         const specialtyMatches = textFromGemini.match(/(general practitioner|cardiologist|pediatrician|dermatologist|neurologist|gastroenterologist)/i);
//         if (specialtyMatches && specialtyMatches.length > 0) {
//             recommendedSpecialty = specialtyMatches[0].toLowerCase(); // Use the matched term
//             // Capitalize first letter for consistency
//             recommendedSpecialty = recommendedSpecialty.charAt(0).toUpperCase() + recommendedSpecialty.slice(1);
//         } else if (requiresAppointment) {
//             // Default to General Practitioner if AI recommends appointment but no specialty specified
//             recommendedSpecialty = 'General Practitioner';
//         }


//         // If an appointment is required and it's not an emergency, we should ask for preferences.
//         // For emergency, we might just try to book the fastest.
//         if (requiresAppointment && recommendedUrgency !== 'emergency') {
//             requiresUserPreference = true;
//         }

//         return {
//             responseText: finalResponseText,
//             requiresAppointment: requiresAppointment,
//             recommendedUrgency: recommendedUrgency,
//             recommendedSpecialty: recommendedSpecialty,
//             requiresUserPreference: requiresUserPreference // Indicate if more user input is needed
//         };

//     } catch (error) {
//         console.error("Error generating medical response:", error);
//         throw new Error("Could not process your request at this time.");
//     }
// };

// module.exports = { generateMedicalResponse };