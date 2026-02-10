const express = require('express');
const router = express.Router();
const BotConfig = require('../models/BotConfig');

// GET /api/bot-config
// Returns the current configuration. If none exists, creates a default one.
router.get('/', async (req, res) => {
    try {
        let config = await BotConfig.findOne();
        if (!config) {
            config = new BotConfig();
            await config.save();
        }
        res.json(config);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/bot-config
// Updates the configuration.
router.put('/', async (req, res) => {
    try {
        let config = await BotConfig.findOne();
        if (!config) {
            config = new BotConfig();
        }

        // Update fields
        Object.keys(req.body).forEach(key => {
            config[key] = req.body[key];
        });

        const updatedConfig = await config.save();

        // Emit socket event to notify whatsappService to reload config
        if (req.io) {
            req.io.emit('bot_config_updated', updatedConfig);
        }

        res.json(updatedConfig);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
