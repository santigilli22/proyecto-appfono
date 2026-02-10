const axios = require('axios');

async function check() {
    try {
        console.log('Testing POST /api/patients/validate...');
        const res = await axios.post('http://localhost:5000/api/patients/validate', { dni: '123' });
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
