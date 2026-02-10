const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Appointment = require('./models/Appointment');

dotenv.config();

const createIndex = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        console.log("Creating Indexes...");
        await Appointment.createIndexes();
        console.log("Indexes Created.");

        const indexes = await Appointment.collection.indexes();
        console.log("Updated Indexes:", JSON.stringify(indexes, null, 2));

    } catch (err) {
        console.error("Error creating indexes:", err.message);
    }
    process.exit();
};

createIndex();
