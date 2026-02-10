const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const { validate, patientValidation } = require('../middleware/validationMiddleware');

// @desc    Get all patients
// @route   GET /api/patients
// @access  Public
router.get('/', async (req, res) => {
    try {
        const patients = await Patient.find({});
        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get single patient
// @route   GET /api/patients/:id
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (patient) {
            res.json(patient);
        } else {
            res.status(404).json({ message: 'Patient not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create a patient
// @route   POST /api/patients
// @access  Public
router.post('/', validate(patientValidation), async (req, res) => {
    const { nombre, apellido, dni, fechaNacimiento, obraSocial, numeroAfiliado, diagnosticoPrevio, telefono, email, contactoEmergencia, escolaridad, notas } = req.body;

    try {
        const patientExists = await Patient.findOne({ dni });

        if (patientExists) {
            return res.status(400).json({ message: 'Patient with this DNI already exists' });
        }

        const patient = await Patient.create({
            nombre,
            apellido,
            dni,
            fechaNacimiento,
            obraSocial,
            numeroAfiliado,
            diagnosticoPrevio,
            telefono,
            email,
            contactoEmergencia,
            escolaridad,
            notas
        });

        res.status(201).json(patient);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Update a patient
// @route   PUT /api/patients/:id
// @access  Public
router.put('/:id', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);

        if (patient) {
            patient.nombre = req.body.nombre || patient.nombre;
            patient.apellido = req.body.apellido || patient.apellido;
            patient.dni = req.body.dni || patient.dni;
            patient.fechaNacimiento = req.body.fechaNacimiento || patient.fechaNacimiento;
            patient.obraSocial = req.body.obraSocial || patient.obraSocial;
            patient.numeroAfiliado = req.body.numeroAfiliado || patient.numeroAfiliado;
            patient.diagnosticoPrevio = req.body.diagnosticoPrevio || patient.diagnosticoPrevio;
            patient.telefono = req.body.telefono || patient.telefono;
            patient.email = req.body.email || patient.email;
            patient.contactoEmergencia = req.body.contactoEmergencia || patient.contactoEmergencia;
            patient.escolaridad = req.body.escolaridad || patient.escolaridad;
            patient.notas = req.body.notas || patient.notas;

            const updatedPatient = await patient.save();
            res.json(updatedPatient);
        } else {
            res.status(404).json({ message: 'Patient not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Delete a patient
// @route   DELETE /api/patients/:id
// @access  Public
router.delete('/:id', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);

        if (patient) {
            await patient.deleteOne();
            res.json({ message: 'Patient removed' });
        } else {
            res.status(404).json({ message: 'Patient not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Validate if patient exists by DNI (for WhatsApp Bot)
// @route   POST /api/patients/validate
// @access  Public (Bot)
router.post('/validate', async (req, res) => {
    try {
        const { dni } = req.body;
        const patient = await Patient.findOne({ dni });

        if (patient) {
            return res.json({
                exists: true,
                id: patient._id,
                name: `${patient.nombre} ${patient.apellido}`,
                phone: patient.telefono
            });
        } else {
            return res.status(404).json({ exists: false, message: 'Paciente no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
