import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import PatientsPage from './pages/PatientsPage';
import AddPatientPage from './pages/AddPatientPage';
import BillingPage from './pages/BillingPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/new" element={<AddPatientPage />} />
          <Route path="billing" element={<BillingPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
