const mongoose = require('mongoose');

const entitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    cuit: { type: String },
    notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Entity', entitySchema);
