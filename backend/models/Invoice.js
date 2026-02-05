const mongoose = require('mongoose');

const invoiceSchema = mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    periodFrom: {
        type: Date
    },
    periodTo: {
        type: Date
    },
    clientName: {
        type: String,
        required: true,
        default: 'Unknown'
    },
    clientCuit: {
        type: String,
    },
    subtotal: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
    condicionIva: {
        type: String,
        default: 'Unknown'
    },
    cae: {
        type: String,
    },
    tipo: {
        type: String,
    },
    puntoVenta: {
        type: String,
    },
    cuitEmisor: {
        type: String,
    },
    nombreEmisor: {
        type: String,
    },
    items: [{
        description: String,
        quantity: Number,
        uom: String,
        unitPrice: Number,
        subtotal: Number,
        patientName: String,
        patientDNI: String,
        affiliateNumber: String
    }],
    filePath: {
        type: String,
    },
    status: {
        type: String,
        default: 'Processed'
    },
    payments: [{
        date: {
            type: Date,
            default: Date.now
        },
        amount: Number,
        method: String,
        note: String
    }],
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Partial', 'Paid'],
        default: 'Pending'
    },
    balance: {
        type: Number,
        default: function () { return this.total; } // Default balance is total
    }
}, {
    timestamps: true
});

// Middleware to calculate balance and status before saving
invoiceSchema.pre('save', function () {
    if (this.payments) {
        const totalPaid = this.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        this.balance = this.total - totalPaid;

        if (this.balance <= 0.01) { // Tolerance for float errors
            this.paymentStatus = 'Paid';
            this.balance = 0;
        } else if (totalPaid > 0) {
            this.paymentStatus = 'Partial';
        } else {
            this.paymentStatus = 'Pending';
        }
    } else {
        this.balance = this.total;
        this.paymentStatus = 'Pending';
    }
});

module.exports = mongoose.model('Invoice', invoiceSchema);
