const express = require('express');
const router = express.Router();
const { getWhatsAppStatus, logoutWhatsApp, startWhatsApp } = require('../services/whatsappService');

// GET /api/whatsapp/status
router.get('/status', (req, res) => {
    try {
        const status = getWhatsAppStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/whatsapp/start
router.post('/start', async (req, res) => {
    try {
        await startWhatsApp();
        res.json({ message: 'WhatsApp client starting...' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/whatsapp/logout
router.post('/logout', async (req, res) => {
    try {
        const success = await logoutWhatsApp();
        if (success) {
            res.json({ message: 'Logged out successfully' });
        } else {
            res.status(500).json({ message: 'Failed to logout' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
