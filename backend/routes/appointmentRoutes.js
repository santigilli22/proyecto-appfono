const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');

// GET /api/appointments - Get all appointments (optionally filter by range)
router.get('/', async (req, res) => {
    try {
        const { start, end } = req.query;
        let query = {};

        if (start && end) {
            // Adjust bounds to cover the full range in UTC
            // Start at 00:00:00 UTC
            const startDate = new Date(start);
            // End at 23:59:59 UTC
            const endDate = new Date(end);
            endDate.setUTCHours(23, 59, 59, 999);

            query.date = {
                $gte: startDate,
                $lte: endDate
            };
        }

        const appointments = await Appointment.find(query).sort({ date: 1, time: 1 });
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/appointments - Create a new appointment
router.post('/', async (req, res) => {
    try {
        const { date, time, patientName, patientPhone, patientDni, insurance, notes } = req.body;

        // Force date to UTC Noon to avoid timezone shifts (e.g. 2023-01-01 -> 2022-12-31 21:00)
        // Storing as T12:00:00Z ensures it stays on the same day in all Americas/Europe timezones
        const utcDate = new Date(date + 'T12:00:00Z');

        // Basic validation: Check if slot is already taken?
        // For strictness, yes. But Admin might want to double book. Let's Warn or Allow.
        // For turnero, usually we want to block.
        const existing = await Appointment.findOne({
            date: utcDate,
            time,
            status: { $nin: ['Cancelled'] }
        });

        if (existing) {
            return res.status(409).json({ message: 'El horario ya está ocupado.' });
        }

        const appointment = new Appointment({
            date: utcDate,
            time,
            patientName,
            patientPhone,
            patientDni,
            insurance,
            notes,
            status: 'Confirmed'
        });

        const newAppointment = await appointment.save();
        res.status(201).json(newAppointment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT /api/appointments/:id - Update status or details
router.put('/:id', async (req, res) => {
    try {
        const { status, notes, date, time } = req.body;
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) return res.status(404).json({ message: 'Turno no encontrado' });

        if (status) appointment.status = status;
        if (notes) appointment.notes = notes;
        if (date) appointment.date = new Date(date + 'T12:00:00Z');
        if (time) appointment.time = time;

        const updated = await appointment.save();
        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE /api/appointments/:id - Soft delete (cancel) or hard delete
router.delete('/:id', async (req, res) => {
    try {
        await Appointment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Turno eliminado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
