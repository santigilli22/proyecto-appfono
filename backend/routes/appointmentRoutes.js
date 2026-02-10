const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const BotConfig = require('../models/BotConfig'); // [NEW]
const { validate, appointmentValidation } = require('../middleware/validationMiddleware');

// GET /api/appointments/available-slots - Get free time slots for a specific date
router.get('/available-slots', async (req, res) => {
    try {
        const { date } = req.query; // Format: YYYY-MM-DD
        if (!date) return res.status(400).json({ message: 'Date is required' });

        // 1. Define Working Hours (Total slots)
        // Morning: 08:00 to 11:30 (Last slot starts at 11:30)
        // Afternoon: 14:00 to 18:30 (Last slot starts at 18:30)
        const generateSlots = () => {
            const slots = [];
            const queryDate = new Date(date + 'T12:00:00Z');
            const day = queryDate.getDay(); // 0=Sun...5=Fri...

            let ranges = [];
            if (day === 5) { // Friday
                // 09:00 - 12:00 (last slot 11:30) & 13:00 - 16:00 (last slot 15:30)
                ranges = [{ start: 9, end: 11.5 }, { start: 13, end: 15.5 }];
            } else {
                // Default Mon-Thu: 08:00 - 11:30 & 14:00 - 18:30
                ranges = [{ start: 8, end: 11.5 }, { start: 14, end: 18.5 }];
            }

            ranges.forEach(range => {
                let current = range.start;
                while (current <= range.end) {
                    const hour = Math.floor(current);
                    const minutes = (current % 1) === 0.5 ? '30' : '00';
                    slots.push(`${String(hour).padStart(2, '0')}:${minutes}`);
                    current += 0.5;
                }
            });
            return slots;
        };
        const allSlots = generateSlots();

        // 2. Fetch Existing Appointments
        // Date stored as T12:00:00Z in DB for that day
        const queryDate = new Date(date + 'T12:00:00Z');

        const appointments = await Appointment.find({
            date: queryDate,
            status: { $nin: ['Cancelled'] }
        }).select('time');

        const bookedTimes = appointments.map(appt => appt.time);

        // 3. Filter Available
        // Also filter past times if date is today?
        // For simplicity, let's just return what's "not booked" mostly. 
        // But preventing past booking is good.
        const todayStr = new Date().toISOString().split('T')[0];
        const isToday = date === todayStr;
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        const availableSlots = allSlots.filter(slot => {
            if (bookedTimes.includes(slot)) return false;

            if (isToday) {
                const [h, m] = slot.split(':').map(Number);
                if (h < currentHour) return false;
                if (h === currentHour && m < currentMinute) return false;
            }
            return true;
        });

        res.json({ date, availableSlots });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/appointments/by-dni/:dni - Get future appointments for a patient
router.get('/by-dni/:dni', async (req, res) => {
    try {
        const { dni } = req.params;
        const now = new Date();
        // Get appointments from today onwards
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const appointments = await Appointment.find({
            patientDni: dni,
            date: { $gte: startOfDay },
            status: { $nin: ['Cancelled', 'Cancelado'] }
        }).sort({ date: 1, time: 1 });

        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

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
router.post('/', validate(appointmentValidation), async (req, res) => {
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

        // Emit socket event
        if (req.io) {
            req.io.emit('appointment_change', { type: 'create', data: newAppointment });
        }

        // [NEW] Send WhatsApp Notification
        try {
            const config = await BotConfig.findOne() || new BotConfig();
            const dateObj = newAppointment.date;
            const dateStr = dateObj.toISOString().split('T')[0];

            const msg = config.confirmation
                .replace('${date}', dateStr)
                .replace('${time}', newAppointment.time)
                .replace('${name}', newAppointment.patientName);

            // 1. Send to main phone if exists
            if (newAppointment.patientPhone) {
                sendMessage(newAppointment.patientPhone, msg);
            }

            // 2. Send to authorized numbers if patient exists in DB
            if (newAppointment.patientDni) {
                const Patient = require('../models/Patient');
                const patientData = await Patient.findOne({ dni: newAppointment.patientDni });

                if (patientData && patientData.numerosAutorizados && patientData.numerosAutorizados.length > 0) {
                    patientData.numerosAutorizados.forEach(authPhone => {
                        // Avoid duplicate send if authPhone is same as main phone
                        if (authPhone !== newAppointment.patientPhone) {
                            sendMessage(authPhone, msg);
                        }
                    });
                }
            }
        } catch (notifyError) {
            console.error('Error sending WhatsApp notification:', notifyError);
            // Non-blocking: don't fail the request if notification fails
        }

        res.status(201).json(newAppointment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

const { sendMessage } = require('../services/whatsappService');

// ... (existing helper functions if any, or just start of Router)

// GET /api/appointments/available-slots ...
// ...

// PUT /api/appointments/:id - Update status or details
router.put('/:id', async (req, res) => {
    try {
        const { status, notes, date, time } = req.body;
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) return res.status(404).json({ message: 'Turno no encontrado' });

        // Check for cancellation status update
        if (status && (status === 'Cancelled' || status === 'Cancelado') && appointment.status !== status) {
            if (appointment.patientPhone) {
                const config = await BotConfig.findOne() || new BotConfig();
                const dateStr = appointment.date.toISOString().split('T')[0];
                const msg = config.cancellationMessage
                    .replace('${name}', appointment.patientName)
                    .replace('${date}', dateStr)
                    .replace('${time}', appointment.time);
                sendMessage(appointment.patientPhone, msg);
            }
        }

        if (status) {
            appointment.status = status;
            appointment.isActive = (status !== 'Cancelled' && status !== 'Cancelado');
        }
        if (notes) appointment.notes = notes;
        if (date) appointment.date = new Date(date + 'T12:00:00Z');
        if (time) appointment.time = time;

        const updated = await appointment.save();

        if (req.io) {
            req.io.emit('appointment_change', { type: 'update', data: updated });
        }

        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE /api/appointments/:id - Soft delete (cancel) or hard delete
router.delete('/:id', async (req, res) => {
    try {
        // Find first to get details for message
        const appointment = await Appointment.findById(req.params.id);

        if (appointment && appointment.patientPhone) {
            const config = await BotConfig.findOne() || new BotConfig();
            const dateStr = appointment.date.toISOString().split('T')[0];
            const msg = config.cancellationMessage
                .replace('${name}', appointment.patientName)
                .replace('${date}', dateStr)
                .replace('${time}', appointment.time);
            sendMessage(appointment.patientPhone, msg);
        }

        await Appointment.findByIdAndDelete(req.params.id);

        if (req.io) {
            req.io.emit('appointment_change', { type: 'delete', id: req.params.id });
        }

        res.json({ message: 'Turno eliminado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
