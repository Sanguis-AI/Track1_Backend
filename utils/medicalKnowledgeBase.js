//A simplified local medical knowledge base. Later on, this would be a much larger, external, and regularly updated database 

const medicalKnowledgeBase = {
    // Simplified drug side effects
    drugSideEffects: {
        'Aspirin': ['stomach upset', 'heartburn', 'nausea', 'bleeding risk'],
        'Metformin': ['nausea', 'diarrhea', 'abdominal discomfort', 'lactic acidosis (rare)'],
        'Lisinopril': ['dry cough', 'dizziness', 'fatigue', 'angioedema (rare)'],
        'Amoxicillin': ['rash', 'nausea', 'diarrhea', 'allergic reaction (severe)'],
    },
    // Simplified urgent care criteria
    urgentCareCriteria: {
        'chest pain': 'Seek immediate emergency medical attention.',
        'difficulty breathing': 'Seek immediate emergency medical attention.',
        'sudden severe headache': 'Seek immediate emergency medical attention.',
        'loss of consciousness': 'Seek immediate emergency medical attention.',
        'unilateral weakness': 'Seek immediate emergency medical attention (stroke symptoms).',
        'fever over 103F': 'Consult a doctor urgently.',
        'sudden vision changes': 'Consult a doctor urgently.',
    },
    getSideEffects: (medicationName) => {
        return medicalKnowledgeBase.drugSideEffects[medicationName] || null;
    },
    getUrgentCareCriteria: (symptom) => {
        return medicalKnowledgeBase.urgentCareCriteria[symptom] || null;
    }
};

module.exports = { medicalKnowledgeBase };