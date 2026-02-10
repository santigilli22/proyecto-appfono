const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Appointment = require('./models/Appointment');

dotenv.config();

const checkIndexes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const indexes = await Appointment.collection.indexes();
        console.log("Current Indexes:", JSON.stringify(indexes, null, 2));

    } catch (err) {
        console.error("Error:", err.message);
    }
    process.exit();
};

checkIndexes();
