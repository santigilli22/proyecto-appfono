const axios = require('axios');

async function check() {
    try {
        console.log('Testing GET /api/appointments...');
        const res = await axios.get('http://localhost:5000/api/appointments');
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
