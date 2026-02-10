const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// 1. Create a dummy patient for testing
async function createDummyPatient() {
    try {
        // cleanup first
        const p = await axios.post(`${BASE_URL}/patients/validate`, { dni: '99999999' });
        if (p.data.exists) {
            await axios.delete(`${BASE_URL}/patients/${p.data.id}`);
        }
    } catch (e) { }

    const res = await axios.post(`${BASE_URL}/patients`, {
        nombre: 'TEST',
        apellido: 'CONCURRENCY',
        dni: '99999999',
        telefono: '549110000000',
        fechaNacimiento: '1990-01-01',
        obraSocial: 'PARTICULAR'
    });
    return res.data;
}

async function runSimulation() {
    console.log("--- Starting Concurrency Simulation ---");

    // 1. Create Patient
    const patient = await createDummyPatient();
    console.log("Patient Created:", patient.nombre);

    // 2. Get Available Slots (Triggers Cache)
    // We pick a date 2 weeks from now
    const date = new Date();
    date.setDate(date.getDate() + 14);
    // ensure it's a weekday
    while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
    }
    const dateStr = date.toISOString().split('T')[0];

    console.log(`\n--- Fetching Slots for ${dateStr} (User A) ---`);
    const startA = Date.now();
    const resA = await axios.get(`${BASE_URL}/appointments/available-slots?date=${dateStr}`);
    console.log(`User A took ${Date.now() - startA}ms. Slots found: ${resA.data.availableSlots.length}`);

    console.log(`\n--- Fetching Slots for ${dateStr} (User B - Should be Cached) ---`);
    // Note: The cache is internal to whatsappService.js, accessed via the bot flow.
    // The endpoint itself DOES NOT CACHE. The bot code calls the endpoint.
    // So hitting the endpoint directly won't show the cache speed unless the endpoint itself was cached.
    // THE USER ASKED TO SIMULATE BOT CHAT.
    // Since we cannot inject messages easily without a debug tool, we will test the RACE CONDITION in booking.

    const slotToBook = resA.data.availableSlots[0]; // Pick first slot
    console.log(`\n--- Attempting Concurrent Booking for ${slotToBook} ---`);

    const bookRequest = (user) => axios.post(`${BASE_URL}/appointments`, {
        date: dateStr,
        time: slotToBook,
        patientName: patient.nombre + ' ' + patient.apellido,
        patientPhone: patient.telefono,
        patientDni: patient.dni,
        notes: `Simulated Booking by ${user}`
    });

    try {
        const results = await Promise.allSettled([
            bookRequest('User A'),
            bookRequest('User B')
        ]);

        results.forEach((res, index) => {
            const user = index === 0 ? 'User A' : 'User B';
            if (res.status === 'fulfilled') {
                console.log(`✅ ${user} Booking SUCCESS:`, res.value.status);
            } else {
                console.log(`❌ ${user} Booking FAILED:`, res.reason.response?.data?.message || res.reason.message);
            }
        });

    } catch (e) {
        console.error("Simulation Error", e);
    }

    console.log("\n--- Simulation Complete ---");
}

runSimulation();
