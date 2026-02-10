const { body, validationResult } = require('express-validator');

const validate = (validations) => {
    return async (req, res, next) => {
        for (let validation of validations) {
            await validation.run(req);
        }

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        res.status(400).json({
            message: 'Error de validación',
            errors: errors.array()
        });
    };
};

const patientValidation = [
    body('dni').isNumeric().withMessage('El DNI debe contener solo números').isLength({ min: 7, max: 8 }).withMessage('El DNI debe tener entre 7 y 8 dígitos'),
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('apellido').notEmpty().withMessage('El apellido es obligatorio'),
    body('fechaNacimiento').isISO8601().withMessage('Fecha de nacimiento inválida (YYYY-MM-DD)')
];

const appointmentValidation = [
    body('date').isISO8601().withMessage('Fecha inválida (YYYY-MM-DD)'),
    body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora inválida (HH:MM)'),
    body('patientDni').isNumeric().withMessage('El DNI del paciente es obligatorio'),
    body('patientName').notEmpty().withMessage('El nombre del paciente es obligatorio')
];

module.exports = { validate, patientValidation, appointmentValidation };
