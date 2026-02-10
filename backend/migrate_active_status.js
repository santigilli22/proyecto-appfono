const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Appointment = require('./models/Appointment');

dotenv.config();

const migrateData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        console.log("1. Dropping existing indexes to prevent conflicts during update...");
        try {
            await Appointment.collection.dropIndexes();
            console.log("Indexes dropped.");
        } catch (e) {
            console.log("Drop indexes failed (might not exist):", e.message);
        }

        console.log("2. Migrating Status (isActive)...");
        // Set isActive = false where status is Cancelled
        await Appointment.updateMany(
            { status: 'Cancelled' },
            { $set: { isActive: false } }
        );

        // Set isActive = true where status is NOT Cancelled
        // Note: We update all non-cancelled to be sure
        await Appointment.updateMany(
            { status: { $ne: 'Cancelled' } },
            { $set: { isActive: true } }
        );
        console.log("Status migration done.");

        console.log("3. Removing duplicates...");
        // Find duplicates on { date, time, isActive: true }
        const duplicates = await Appointment.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: { date: "$date", time: "$time" },
                    ids: { $push: "$_id" },
                    count: { $sum: 1 }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]);

        let deletedCount = 0;
        if (duplicates.length > 0) {
            console.log(`Found ${duplicates.length} sets of duplicates.`);
            for (const doc of duplicates) {
                // Keep the first one, delete the rest
                // We convert ObjectIds to strings for filtering/logging if needed, but passing to deleteMany works with Objects
                const [keep, ...remove] = doc.ids;
                await Appointment.deleteMany({ _id: { $in: remove } });
                deletedCount += remove.length;
            }
        }
        console.log(`Removed ${deletedCount} duplicate appointments.`);

        console.log("4. Creating new indexes...");
        await Appointment.createIndexes();
        console.log("Migration Complete.");

    } catch (err) {
        console.error("Migration Error:", err);
    }
    process.exit();
};

migrateData();
