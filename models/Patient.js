
const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, required: true },
    allergies: [{ type: String }], // e.g., ['Penicillin', 'Pollen']
    medications: [{
        name: { type: String, required: true },
        dosage: { type: String },
        frequency: { type: String },
        startDate: { type: Date },
        endDate: { type: Date },
        // Consider adding a field for known side effects if maintaining a local drug database
        // Or link to a drug ID from a medical ontology
        sideEffects: [{ type: String }]
    }],
    pastMedicalHistory: [{
        condition: { type: String, required: true }, // e.g., 'Diabetes Mellitus Type 2' (use SNOMED/ICD codes)
        diagnosisDate: { type: Date },
        notes: { type: String }
    }],
    immunizations: [{
        name: { type: String },
        date: { type: Date }
    }],
    // Other relevant medical data
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);