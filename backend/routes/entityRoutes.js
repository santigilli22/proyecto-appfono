const express = require('express');
const router = express.Router();
const Entity = require('../models/Entity');

// GET /api/entities - Get all entities
router.get('/', async (req, res) => {
    try {
        const entities = await Entity.find().sort({ name: 1 });
        res.json(entities);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/entities - Create a new entity
router.post('/', async (req, res) => {
    try {
        const { name, cuit, notes } = req.body;
        const newEntity = new Entity({ name, cuit, notes });
        await newEntity.save();
        res.status(201).json(newEntity);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT /api/entities/:id - Update an entity
router.put('/:id', async (req, res) => {
    try {
        const { name, cuit, notes } = req.body;
        const updatedEntity = await Entity.findByIdAndUpdate(
            req.params.id,
            { name, cuit, notes },
            { new: true }
        );
        res.json(updatedEntity);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE /api/entities/:id - Delete an entity
router.delete('/:id', async (req, res) => {
    try {
        await Entity.findByIdAndDelete(req.params.id);
        res.json({ message: 'Entity deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
