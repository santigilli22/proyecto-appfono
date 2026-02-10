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
    readOnlyDateTime = false,
    allowDateSelection = false // [NEW]
}) => {
    // Form States
    const [date, setDate] = useState(selectedDate || '');
    const [time, setTime] = useState(initialData.time || '');
    const [patientName, setPatientName] = useState(initialData.patientName || '');
    const [patientPhone, setPatientPhone] = useState(initialData.patientPhone || '');
    const [patientDni, setPatientDni] = useState(initialData.patientDni || ''); // [NEW]
    const [insurance, setInsurance] = useState(initialData.insurance || '');
    const [notes, setNotes] = useState(initialData.notes || '');

    // Autocomplete States
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [toast, setToast] = useState(null);

    // Fetch Patients for Autocomplete
    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/patients');
                setPatients(res.data);
            } catch (err) {
                console.error("Error fetching patients", err);
            }
        };
        fetchPatients();
    }, []);

    // Generate Slots based on Day (Manual Mode)
    const [manualSlots, setManualSlots] = useState([]);

    useEffect(() => {
        if (selectedDate) setDate(selectedDate);
    }, [selectedDate]);

    // Update slots and validate when date changes (Manual Mode)
    useEffect(() => {
        const fetchManualSlots = async () => {
            if (allowDateSelection && date) {
                // Fix timezone issue by appending time
                const dateObj = new Date(date + 'T12:00:00');
                const day = dateObj.getDay(); // 0=Sun, 6=Sat

                // 0. Validate Past Dates
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Start of today

                if (dateObj < today) {
                    setToast({ message: '⚠️ No se pueden asignar turnos en el pasado.', type: 'error' });
                    setDate('');
                    setManualSlots([]);
                    return;
                }

                // 1. Validate Weekends
                if (day === 0 || day === 6) {
                    setToast({ message: '⚠️ No atendemos los fines de semana. Por favor elegí de Lunes a Viernes.', type: 'error' });
                    setDate('');
                    setManualSlots([]);
                    return;
                }

                // 2. Fetch Available Slots from API
                try {
                    const res = await axios.get(`http://localhost:5000/api/appointments/available-slots?date=${date}`);
                    let slots = res.data.availableSlots;

                    // 3. Filter for Today (Min 2 hours advance) - API does past check but let's enforce 2h buffer
                    const dateStr = dateObj.toISOString().split('T')[0];
                    const todayStr = new Date().toISOString().split('T')[0];

                    if (dateStr === todayStr) {
                        const now = new Date();
                        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

                        slots = slots.filter(slot => {
                            const [h, m] = slot.split(':').map(Number);
                            const slotDate = new Date(now);
                            slotDate.setHours(h, m, 0, 0);
                            return slotDate > twoHoursLater;
                        });

                        if (slots.length === 0) {
                            setToast({ message: '⚠️ Ya no hay turnos disponibles para hoy con 2hs de antelación.', type: 'warning' });
                        }
                    }

                    setManualSlots(slots);
                } catch (err) {
                    console.error("Error fetching slots:", err);
                    setToast({ message: 'Error al consultar horarios disponibles', type: 'error' });
                    setManualSlots([]);
                }
            } else if (!allowDateSelection) {
                // If not manual, we don't control slots here (parent does)
                setManualSlots([]);
            }
        };

        fetchManualSlots();
    }, [date, allowDateSelection]);


    useEffect(() => {
        if (initialData.time) setTime(initialData.time);
    }, [initialData]);

    // Handle Patient Search
    const handleNameChange = (e) => {
        const input = e.target.value;
        setPatientName(input);

        if (input.length > 1) {
            const matches = patients.filter(p =>
                `${p.nombre} ${p.apellido}`.toLowerCase().includes(input.toLowerCase()) ||
                p.dni.includes(input)
            );
            setFilteredPatients(matches);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectPatient = (patient) => {
        setPatientName(`${patient.nombre} ${patient.apellido}`);
        setPatientPhone(patient.telefono || '');
        setPatientDni(patient.dni);
        setInsurance(patient.obraSocial || '');
        setShowSuggestions(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const payload = {
                date,
                time,
                patientName,
                patientPhone,
                patientDni, // [NEW] Send DNI for notifications
                insurance,
                notes
            };

            await axios.post('http://localhost:5000/api/appointments', payload);
            setToast({ message: 'Turno creado con éxito', type: 'success' });
            if (onSuccess) onSuccess();

            // Reset form
            if (!selectedDate) setDate(''); // Reset date only if manual
            setTime('');
            setPatientName('');
            setPatientPhone('');
            setPatientDni('');
            setInsurance('');
            setNotes('');
        } catch (err) {
            setToast({ message: err.response?.data?.message || 'Error al crear turno', type: 'error' });
        }
    };

    // Determine slots to show: 
    // If manual mode: use manualSlots
    // If auto mode: use availableSlots (filtered) or timeSlots (fallback)
    const slotsToShow = allowDateSelection ? manualSlots : ((availableSlots && availableSlots.length > 0) ? availableSlots : timeSlots);

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
                            disabled={!allowDateSelection} // Unlock if allowed
                            className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm border p-2.5 ${!allowDateSelection ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'focus:border-indigo-500 focus:ring-indigo-500'}`}
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
                            {slotsToShow && slotsToShow.length > 0 ? (
                                slotsToShow.map(slot => (
                                    <option key={slot} value={slot}>{slot}</option>
                                ))
                            ) : (
                                <option value="" disabled>No hay horarios</option>
                            )}
                        </select>
                    </div>
                </div>

                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700">Paciente (Buscar por Nombre o DNI)</label>
                    <input
                        type="text"
                        value={patientName}
                        onChange={handleNameChange}
                        onFocus={() => patientName.length > 1 && setShowSuggestions(true)}
                        // Delay blur to allow click on suggestion
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        required
                        placeholder="Escribí para buscar..."
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2.5"
                    />

                    {/* Autocomplete Dropdown */}
                    {showSuggestions && filteredPatients.length > 0 && (
                        <ul className="absolute z-10 w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredPatients.map(p => (
                                <li
                                    key={p._id}
                                    onClick={() => selectPatient(p)}
                                    className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0"
                                >
                                    <div className="font-bold">{p.nombre} {p.apellido}</div>
                                    <div className="text-xs text-gray-500">DNI: {p.dni}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                        <input
                            type="tel"
                            value={patientPhone}
                            onChange={(e) => setPatientPhone(e.target.value)}
                            placeholder="Se autocompleta..."
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2.5 bg-gray-50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Obra Social</label>
                        <input
                            type="text"
                            value={insurance}
                            onChange={(e) => setInsurance(e.target.value)}
                            placeholder="Se autocompleta..."
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2.5 bg-gray-50"
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
