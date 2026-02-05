const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    // Time slot (e.g., "10:00", "14:30")
    time: {
        type: String,
        required: true
    },
    // End time is optional, but helpful for calendar blocks. Default to 30 or 60 min later
    endTime: {
        type: String
    },
    patientName: {
        type: String,
        required: true
    },
    patientPhone: {
        type: String
    },
    patientDni: {
        type: String
    },
    insurance: {
        type: String
    },
    status: {
        type: String,
        enum: ['Available', 'Booked', 'Confirmed', 'Cancelled', 'Completed'],
        default: 'Booked' // "Available" might be used for open slots if we implement slot management later
    },
    notes: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to prevent double booking
appointmentSchema.index({ date: 1, time: 1, status: 1 }, { unique: false });

module.exports = mongoose.model('Appointment', appointmentSchema);
