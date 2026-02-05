import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus } from 'lucide-react';
import Toast from './Toast';

const AppointmentForm = ({
    selectedDate,
    timeSlots,
    availableSlots,
    onSuccess,
    onCancel,
    initialData = {},
    readOnlyDateTime = false
}) => {
    // Form States
    const [date, setDate] = useState(selectedDate || '');
    const [time, setTime] = useState(initialData.time || '');
    const [patientName, setPatientName] = useState(initialData.patientName || '');
    const [patientPhone, setPatientPhone] = useState(initialData.patientPhone || '');
    const [insurance, setInsurance] = useState(initialData.insurance || '');
    const [notes, setNotes] = useState(initialData.notes || '');
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (selectedDate) setDate(selectedDate);
    }, [selectedDate]);

    useEffect(() => {
        if (initialData.time) setTime(initialData.time);
    }, [initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const payload = {
                date,
                time,
                patientName,
                patientPhone,
                insurance,
                notes
            };

            await axios.post('http://localhost:5000/api/appointments', payload);
            setToast({ message: 'Turno creado con éxito', type: 'success' });
            if (onSuccess) onSuccess();

            // Reset form
            setTime('');
            setPatientName('');
            setPatientPhone('');
            setInsurance('');
            setNotes('');
        } catch (err) {
            setToast({ message: err.response?.data?.message || 'Error al crear turno', type: 'error' });
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Nuevo Turno
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                            disabled // Locked to selected day in this context
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm bg-gray-50 text-gray-500 sm:text-sm border p-2.5 cursor-not-allowed"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Hora</label>
                        <select
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            required
                            disabled={readOnlyDateTime}
                            className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm border p-2.5 appearance-none ${readOnlyDateTime ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50 focus:border-indigo-500 focus:ring-indigo-500'}`}
                        >
                            <option value="" disabled>Seleccionar hora</option>
                            {availableSlots && availableSlots.length > 0 ? (
                                availableSlots.map(slot => (
                                    <option key={slot} value={slot}>{slot}</option>
                                ))
                            ) : (
                                <option value="" disabled>No hay horarios</option>
                            )}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Paciente</label>
                    <input
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        required
                        placeholder="Nombre completo"
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2.5"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                        <input
                            type="tel"
                            value={patientPhone}
                            onChange={(e) => setPatientPhone(e.target.value)}
                            placeholder="Opcional"
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2.5"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Obra Social</label>
                        <input
                            type="text"
                            value={insurance}
                            onChange={(e) => setInsurance(e.target.value)}
                            placeholder="Opcional"
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2.5"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Notas</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows="2"
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2.5"
                    ></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                        >
                            Volver
                        </button>
                    )}
                    <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-colors"
                    >
                        Guardar Turno
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AppointmentForm;
