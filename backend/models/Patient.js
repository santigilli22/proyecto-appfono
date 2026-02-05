const mongoose = require('mongoose');

const patientSchema = mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    apellido: {
        type: String,
        required: true
    },
    dni: {
        type: String,
        required: true,
        unique: true
    },
    fechaNacimiento: {
        type: Date,
        required: true
    },
    obraSocial: {
        type: String,
        default: 'Particular'
    },
    numeroAfiliado: {
        type: String
    },
    diagnosticoPrevio: {
        type: String
    },
    telefono: {
        type: String,
        required: true
    },
    email: {
        type: String
    },
    contactoEmergencia: {
        type: String
    },
    escolaridad: {
        type: String
    },
    notas: {
        type: String
    }
}, {
    timestamps: true
});

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
