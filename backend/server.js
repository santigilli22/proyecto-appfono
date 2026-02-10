const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const patientRoutes = require('./routes/patientRoutes');

dotenv.config();

const { setSocketIO, shutdownWhatsApp } = require('./services/whatsappService');

const http = require('http');
const { Server } = require('socket.io');

connectDB();

// Initialize WhatsApp Bot with IO (after io is created)
const app = express();
app.use(cors()); // Restore CORS
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Initialize WhatsApp Bot with IO (after io is created)
// Initialize WhatsApp Bot with IO (but DO NOT start client automatically)
// Initialize WhatsApp Bot with IO (but DO NOT start client automatically)
setSocketIO(io);

// Middleware to attach io to req (so routes can emit)
app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use(express.json());

app.use('/api/patients', patientRoutes);
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/whatsapp', require('./routes/whatsappRoutes'));
app.use('/api/entities', require('./routes/entityRoutes'));
app.use('/api/bot-config', require('./routes/botConfigRoutes')); // [NEW]

// Global Error Handler
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful Shutdown
const shutdown = async () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('HTTP server closed.');
  });
  await shutdownWhatsApp();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
