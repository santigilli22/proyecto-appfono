import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import PatientsPage from './pages/PatientsPage';

import EditPatientPage from './pages/EditPatientPage';
import BillingPage from './pages/BillingPage';
import CalendarPage from './pages/CalendarPage';
import EntitiesPage from './pages/EntitiesPage';
import WhatsAppPage from './pages/WhatsAppPage';

function App() {
  return (
    <SocketProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/patients/new" element={<EditPatientPage />} />
            <Route path="/patients/:id/edit" element={<EditPatientPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/entities" element={<EntitiesPage />} />
            <Route path="/whatsapp" element={<WhatsAppPage />} />
          </Routes>
        </Layout>
        <ToastContainer position="bottom-right" />
      </Router>
    </SocketProvider>
  );
}

export default App;
