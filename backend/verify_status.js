const axios = require('axios');

async function checkStatus() {
    try {
        const res = await axios.get('http://localhost:5000/api/whatsapp/status');
        console.log('Status Response:', res.data);
    } catch (error) {
        console.error('Error fetching status:', error.message);
    }
}

checkStatus();
