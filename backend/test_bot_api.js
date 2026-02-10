const BASE_URL = 'http://localhost:5000/api';

async function testEndpoints() {
    try {
        console.log("--- 1. Testing Availability ---");
        // Test Availability
        const today = new Date().toISOString().split('T')[0];
        const resSlots = await fetch(`${BASE_URL}/appointments/available-slots?date=${today}`);
        const dataSlots = await resSlots.json();
        console.log(`Available slots for ${today}:`, dataSlots.availableSlots ? dataSlots.availableSlots.slice(0, 5) : dataSlots, "...");

        console.log("\n--- 2. Testing Patient Validation ---");
        // Test Validation (First get a patient to know a real DNI)
        const resPatients = await fetch(`${BASE_URL}/patients`);
        const patients = await resPatients.json();

        if (patients.length > 0) {
            const patient = patients[0];
            console.log(`Testing validation for DNI: ${patient.dni} (${patient.nombre})`);

            const resVal = await fetch(`${BASE_URL}/patients/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni: patient.dni })
            });
            const dataVal = await resVal.json();
            console.log("Validation Result:", dataVal);
        } else {
            console.log("No patients found to test validation.");
        }

        console.log("\n--- 3. Testing Invalid Patient ---");
        const resInv = await fetch(`${BASE_URL}/patients/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dni: '00000000' })
        });
        const dataInv = await resInv.json();
        console.log("Invalid DNI Result:", resInv.status, dataInv);

    } catch (error) {
        console.error("Test Failed:", error.message);
    }
}

testEndpoints();
