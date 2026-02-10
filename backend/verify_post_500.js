const axios = require('axios');

async function check() {
    try {
        console.log('Testing POST /api/appointments...');
        const data = {
            date: '2026-03-01',
            time: '09:00',
            patientName: 'Test Patient',
            patientPhone: '123456789',
            patientDni: '123999',
            insurance: 'Particular',
            notes: 'Test from script'
        };
        const res = await axios.post('http://localhost:5000/api/appointments', data);
        console.log('Status:', res.status);
        console.log('Data:', res.data);
    } catch (error) {
        if (error.response) {
            console.log('Error Status:', error.response.status);
            console.log('Error Data:', error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

check();
