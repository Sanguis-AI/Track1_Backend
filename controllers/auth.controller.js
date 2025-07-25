
const User = require('../models/User');
const Patient = require('../models/Patient');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const registerUser = async (req, res, next) => {
    try {
        const { username, password, role, dateOfBirth, gender } = req.body;
        const userExists = await User.findOne({ username });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({ username, password, role });

        if (user && role === 'patient') {
            await Patient.create({
                userId: user._id,
                dateOfBirth,
                gender,
                allergies: [],
                medications: [],
                pastMedicalHistory: []
            });
        }

        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                role: user.role,
                token: jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' }),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        next(error);
    }
};

const loginUser = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (user && (await user.comparePassword(password))) {
            res.json({
                _id: user._id,
                username: user.username,
                role: user.role,
                token: jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' }),
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = { registerUser, loginUser };