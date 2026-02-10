const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Appointment = require('./models/Appointment'); // Adjust path as needed

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const fixIndex = async () => {
    await connectDB();

    try {
        console.log("Dropping indexes...");
        await Appointment.collection.dropIndexes();
        console.log("Indexes dropped. Mongoose will recreate them on next app start.");
    } catch (error) {
        console.log("Error dropping indexes (maybe they didn't exist):", error.message);
    }

    process.exit();
};

fixIndex();
