import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, Activity, DollarSign } from 'lucide-react';
import axios from 'axios';
import CustomAgenda from '../components/CustomAgenda';

const HomePage = () => {
    const [allEvents, setAllEvents] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const fetchEvents = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/appointments');

            const events = res.data
                .filter(appt => appt.status !== 'Cancelled')
                .map(appt => {
                    const start = new Date(appt.date);
                    const [hours, minutes] = appt.time.split(':');
                    start.setHours(parseInt(hours), parseInt(minutes));

                    const end = new Date(start);
                    end.setMinutes(end.getMinutes() + 30);

                    return {
                        id: appt._id,
                        title: `${appt.patientName} (${appt.time})`,
                        start,
                        end,
                        resource: appt
                    };
                });
            setAllEvents(events);
        } catch (error) {
            console.error("Error fetching events", error);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleCancelAppointment = async (appt) => {
        if (!window.confirm(`¿Seguro que querés cancelar el turno de ${appt.title}?`)) return;

        try {
            await axios.put(`http://localhost:5000/api/appointments/${appt.id}`, { status: 'Cancelled' });
            fetchEvents(); // Refresh list
        } catch (error) {
            console.error("Error cancelling appointment", error);
            alert("Error al cancelar el turno");
        }
    };

    // Navigation Limits
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 7);

    const handlePrevDay = () => {
        setSelectedDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() - 1);
            if (newDate < today) return prev;
            return newDate;
        });
    };

    const handleNextDay = () => {
        setSelectedDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + 1);
            if (newDate > maxDate) return prev;
            return newDate;
        });
    };

    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const displayedEvents = allEvents.filter(evt => evt.start.toISOString().split('T')[0] === selectedDateStr);

    const isPrevDisabled = selectedDate <= today;
    const isNextDisabled = selectedDate >= maxDate;

    return (
        <div className="px-4 py-6 sm:px-0">

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Dashboard Cards */}
                <div className="flex-1 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 auto-rows-min">
                    <Link to="/patients" className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow p-6 border border-slate-100 flex items-center h-32">
                        <div className="flex-shrink-0 bg-teal-100 rounded-md p-3">
                            <Users className="h-6 w-6 text-teal-600" />
                        </div>
                        <div className="ml-4">
                            <h2 className="text-lg font-medium text-slate-900">Pacientes</h2>
                            <p className="text-sm text-slate-500">Ver y gestionar lista</p>
                        </div>
                    </Link>

                    <Link to="/calendar" className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow p-6 border border-slate-100 flex items-center h-32">
                        <div className="flex-shrink-0 bg-rose-100 rounded-md p-3">
                            <Activity className="h-6 w-6 text-rose-600" />
                        </div>
                        <div className="ml-4">
                            <h2 className="text-lg font-medium text-slate-900">Turnos</h2>
                            <p className="text-sm text-slate-500">Ir al calendario completo</p>
                        </div>
                    </Link>

                    <div className="bg-white overflow-hidden shadow-sm rounded-lg p-6 border border-slate-100 opacity-60 flex items-center h-32">
                        <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                            <FileText className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="ml-4">
                            <h2 className="text-lg font-medium text-slate-900">Historias Clínicas</h2>
                            <p className="text-sm text-slate-500">Próximamente</p>
                        </div>
                    </div>

                    <Link to="/billing" className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow p-6 border border-slate-100 flex items-center h-32">
                        <div className="flex-shrink-0 bg-emerald-100 rounded-md p-3">
                            <DollarSign className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div className="ml-4">
                            <h2 className="text-lg font-medium text-slate-900">Facturación</h2>
                            <p className="text-sm text-slate-500">Pagos y comprobantes</p>
                        </div>
                    </Link>
                </div>

                {/* Right Sidebar: Agenda Widget */}
                <div className="lg:w-96 flex-shrink-0">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h2 className="font-bold text-gray-700">Agenda</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrevDay}
                                    disabled={isPrevDisabled}
                                    className={`p-1 rounded-full hover:bg-gray-200 transition-colors ${isPrevDisabled ? 'opacity-30 cursor-not-allowed' : 'text-gray-600'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                </button>
                                <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full min-w-[80px] text-center capitalize">
                                    {selectedDate.toDateString() === today.toDateString() ? 'Hoy' : selectedDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })}
                                </span>
                                <button
                                    onClick={handleNextDay}
                                    disabled={isNextDisabled}
                                    className={`p-1 rounded-full hover:bg-gray-200 transition-colors ${isNextDisabled ? 'opacity-30 cursor-not-allowed' : 'text-gray-600'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                </button>
                            </div>
                        </div>
                        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                            <CustomAgenda
                                events={displayedEvents}
                                compact={true}
                                onlyEvents={true}
                                onCancel={handleCancelAppointment}
                                currentDate={selectedDate}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
