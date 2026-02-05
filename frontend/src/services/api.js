import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
});

// Patient API
export const getPatients = () => api.get('/patients');
export const getPatient = (id) => api.get(`/patients/${id}`);
export const createPatient = (patientData) => api.post('/patients', patientData);
export const updatePatient = (id, patientData) => api.put(`/patients/${id}`, patientData);
export const deletePatient = (id) => api.delete(`/patients/${id}`);

// Invoice API
export const uploadInvoice = (formData) => api.post('/invoices/upload', formData, {
    headers: {
        'Content-Type': 'multipart/form-data'
    }
});
export const getInvoices = () => api.get('/invoices');

export default api;
