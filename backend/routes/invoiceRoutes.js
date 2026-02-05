const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Invoice = require('../models/Invoice');
const { parseInvoice } = require('../utils/invoiceParser');

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

// POST: Upload and Parse Key
router.post('/upload', upload.array('invoices'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const stats = {
            total: req.files.length,
            success: 0,
            duplicates: 0,
            errors: 0,
            details: []
        };

        const fs = require('fs'); // Import fs for deletion

        for (const file of req.files) {
            const filePath = file.path;
            console.log(`Processing file: ${filePath}`);

            try {
                // Parse PDF
                const parsedData = await parseInvoice(filePath);
                console.log('[Route] Parsed Data Items:', JSON.stringify(parsedData.items, null, 2));

                // Map to Schema
                // invoiceNumber = PV-Numero
                const fullInvoiceNumber = `${parsedData.puntoVenta}-${parsedData.numero}`;

                // Check for duplicates
                let exists = null;

                if (parsedData.cae) {
                    exists = await Invoice.findOne({ cae: parsedData.cae });
                }

                if (!exists) {
                    exists = await Invoice.findOne({
                        invoiceNumber: fullInvoiceNumber,
                        cuitEmisor: parsedData.cuitEmisor,
                        tipo: parsedData.tipo
                    });
                }

                if (exists) {
                    stats.duplicates++;
                    stats.details.push({ file: file.originalname, status: 'Duplicate', message: 'Invoice already exists' });
                    // Delete duplicate file
                    try { fs.unlinkSync(filePath); } catch (e) { console.error('Error deleting file:', e); }
                    continue;
                }

                // Parse date (DD/MM/YYYY to Date object)
                const [day, month, year] = parsedData.fechaEmision.split('/');
                const dateObj = new Date(`${year}-${month}-${day}`);

                let periodFromObj = null;
                let periodToObj = null;
                if (parsedData.periodFrom) {
                    const [pd, pm, py] = parsedData.periodFrom.split('/');
                    periodFromObj = new Date(`${py}-${pm}-${pd}`);
                }
                if (parsedData.periodTo) {
                    const [pd, pm, py] = parsedData.periodTo.split('/');
                    periodToObj = new Date(`${py}-${pm}-${pd}`);
                }

                // Save to DB
                const newInvoice = new Invoice({
                    invoiceNumber: fullInvoiceNumber,
                    date: dateObj,
                    periodFrom: periodFromObj,
                    periodTo: periodToObj,
                    clientName: parsedData.nombreReceptor,
                    clientCuit: parsedData.cuitReceptor,
                    total: parseFloat(parsedData.importeTotal),
                    subtotal: parseFloat(parsedData.importeTotal),
                    condicionIva: parsedData.condicionIva || 'Unknown',
                    cae: parsedData.cae,
                    tipo: parsedData.tipo,
                    puntoVenta: parsedData.puntoVenta,
                    cuitEmisor: parsedData.cuitEmisor,
                    nombreEmisor: parsedData.nombreEmisor,
                    items: parsedData.items || [],
                    // filePath: filePath, // User requested not to save file path
                    status: 'Processed'
                });

                await newInvoice.save();
                stats.success++;
                stats.details.push({ file: file.originalname, status: 'Success' });

            } catch (err) {
                console.error(`Error processing ${file.originalname}:`, err);
                stats.errors++;
                stats.details.push({ file: file.originalname, status: 'Error', error: err.message });
            } finally {
                // Always delete the file after processing (success or error)
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`Deleted temp file: ${filePath}`);
                    }
                } catch (cleanupErr) {
                    console.error(`Failed to delete temp file ${filePath}:`, cleanupErr);
                }
            }
        }

        console.log('Batch Result:', stats);

        // Construct message
        let msg = `Procesados: ${stats.success}. Duplicados: ${stats.duplicates}. Errores: ${stats.errors}.`;
        if (stats.success === 0 && stats.duplicates > 0) msg = "Todas las facturas ya existían.";
        if (stats.errors > 0) msg += " Revisa la consola para más detalles.";

        res.status(201).json({
            message: msg,
            stats: stats
        });

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: 'Failed to process invoices', error: error.message });
    }
});

// POST: Manual Invoice Creation
router.post('/manual', async (req, res) => {
    try {
        const { invoiceNumber, date, clientName, clientCuit, total, patientName, patientDNI } = req.body;

        // Validation
        if (!invoiceNumber || !date || !clientName || !total) {
            return res.status(400).json({ message: 'Missing required fields: invoiceNumber, date, clientName, total' });
        }

        // Check for duplicate
        const exists = await Invoice.findOne({ invoiceNumber, clientName });
        if (exists) {
            return res.status(409).json({ message: 'Invoice already exists' });
        }

        // Create Item for patient info if provided
        const items = [];
        if (patientName || patientDNI) {
            items.push({
                description: 'Honorarios Fonoaudiológicos', // Generic description
                patientName: patientName || '',
                patientDNI: patientDNI || '',
                subtotal: parseFloat(total),
                unitPrice: parseFloat(total),
                quantity: 1
            });
        }

        const newInvoice = new Invoice({
            invoiceNumber,
            date: new Date(date),
            clientName,
            clientCuit: clientCuit || '',
            total: parseFloat(total),
            subtotal: parseFloat(total), // Simplified
            items,
            status: 'Processed',
            condicionIva: 'Manual' // Marker for manual entry
        });

        await newInvoice.save();
        res.status(201).json({ message: 'Factura creada exitosamente', invoice: newInvoice });

    } catch (error) {
        console.error('Manual Create Error:', error);
        res.status(500).json({ message: 'Error creating invoice', error: error.message });
    }
});

// GET: List invoices
router.get('/', async (req, res) => {
    try {
        const invoices = await Invoice.find().sort({ date: -1 });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching invoices' });
    }
});

// DELETE: Delete invoice
router.delete('/:id', async (req, res) => {
    try {
        const result = await Invoice.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
        console.error('Delete Error:', error);
        res.status(500).json({ message: 'Error deleting invoice' });
    }
});

// POST: Add Payment
router.post('/:id/payment', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const { amount, date, method, note } = req.body;

        invoice.payments.push({
            amount: parseFloat(amount),
            date: date || new Date(),
            method: method || 'Cash',
            note: note || ''
        });

        await invoice.save(); // Triggers pre-save middleware for balance/status
        res.json(invoice);

    } catch (error) {
        console.error('Payment Error:', error);
        res.status(500).json({ message: 'Error adding payment' });
    }
});

module.exports = router;
