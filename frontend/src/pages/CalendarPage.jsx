import React, { useState, useEffect, useMemo } from 'react';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import es from 'date-fns/locale/es';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import Toast from '../components/Toast';
import CustomAgenda from '../components/CustomAgenda';
import AppointmentForm from '../components/AppointmentForm';

const CalendarPage = () => {
    const [events, setEvents] = useState([]);
    const [toast, setToast] = useState(null);
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [modalData, setModalData] = useState(null); // { date: 'yyyy-MM-dd', time: 'HH:mm' }

    // Initial Fetch
    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/appointments');
            const formattedEvents = res.data.map(appt => {
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
            setEvents(formattedEvents);
        } catch (error) {
            console.error(error);
            setToast({ message: 'Error al cargar turnos', type: 'error' });
        }
    };

    // --- Time Slots Logic ---
    const generateTimeSlots = () => {
        const slots = [];
        const ranges = [{ start: 8, end: 11.5 }, { start: 14, end: 18.5 }];
        ranges.forEach(range => {
            let current = range.start;
            while (current <= range.end) {
                const hour = Math.floor(current);
                const minutes = (current % 1) === 0.5 ? '30' : '00';
                slots.push(`${String(hour).padStart(2, '0')}:${minutes}`);
                current += 0.5;
            }
        });
        return slots;
    };
    const timeSlots = useMemo(() => generateTimeSlots(), []);

    const getAvailableSlots = (dateString) => {
        if (!dateString) return timeSlots;
        const dayEvents = events.filter(evt => {
            const evtDate = format(evt.start, 'yyyy-MM-dd');
            return evtDate === dateString && evt.resource.status !== 'Cancelled';
        });
        const bookedTimes = dayEvents.map(evt => evt.resource.time);

        // Filter out booked times
        let available = timeSlots.filter(slot => !bookedTimes.includes(slot));

        // Filter out past times if it's today
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');

        if (dateString === todayStr) {
            const currentHour = today.getHours();
            const currentMinute = today.getMinutes();
            available = available.filter(slot => {
                const [slotHour, slotMinute] = slot.split(':').map(Number);
                if (slotHour < currentHour) return false;
                if (slotHour === currentHour && slotMinute <= currentMinute) return false;
                return true;
            });
        }
        return available;
    };

    // --- Navigation Logic ---
    const goToPreviousWeek = () => setCurrentWeekStart(prev => es.options.weekStartsOn === 1 ? new Date(prev.setDate(prev.getDate() - 7)) : startOfWeek(new Date(prev.setDate(prev.getDate() - 7)), { weekStartsOn: 1 }));
    // Fix: Date math is tricky with setDate modifying in place/returning timestamp.
    // Better to use date-fns addWeeks/subWeeks if imported, or careful manual math. 
    // Since I removed imports, I stick to standard valid JS or existing helpers. 
    // Actually, I should use the existing 'date-fns' imports or add 'addWeeks'.
    // Let's use simple math for now: sub 7 days.
    // Limit: Current Week + 3 weeks
    const limitDate = useMemo(() => {
        const today = startOfWeek(new Date(), { weekStartsOn: 1 });
        const limit = new Date(today);
        limit.setDate(limit.getDate() + (3 * 7)); // 3 weeks ahead
        return limit;
    }, []);

    const navigateWeek = (direction) => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + (direction * 7));

        // Prevent going beyond limit
        if (direction > 0 && newDate > limitDate) return;

        setCurrentWeekStart(newDate);
    };

    const goToToday = () => {
        setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    };

    // --- Handlers ---
    const handleCancelAppointment = async (appt) => {
        if (!window.confirm(`¿Seguro que querés cancelar el turno de ${appt.title}?`)) return;

        try {
            await axios.put(`http://localhost:5000/api/appointments/${appt.id}`, { status: 'Cancelled' });
            setToast({ message: 'Turno cancelado con éxito', type: 'success' });
            fetchAppointments();
        } catch (error) {
            setToast({ message: 'Error al cancelar', type: 'error' });
        }
    };

    const handleSlotClick = (dateStr, timeStr) => {
        setModalData({ date: dateStr, time: timeStr });
    };

    // --- Render Helpers ---
    // Generate 5 days (Mon-Fri)
    const weekDays = useMemo(() => {
        const days = [];
        let day = new Date(currentWeekStart);
        for (let i = 0; i < 5; i++) {
            days.push(new Date(day));
            day.setDate(day.getDate() + 1);
        }
        return days;
    }, [currentWeekStart]);

    // Format label "Semana del X al Y"
    const weekLabel = useMemo(() => {
        const start = weekDays[0];
        const end = weekDays[4];
        return `${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM', { locale: es })}`;
    }, [weekDays]);

    const isNextDisabled = currentWeekStart >= limitDate;

    return (
        <div className="py-6 px-4 w-[95%] mx-auto space-y-6 animate-in fade-in duration-500">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-800 capitalize">
                        {weekLabel}
                    </h1>
                    <span className="text-gray-400 font-medium text-sm border-l pl-4 border-gray-200">
                        {format(weekDays[0], 'MMMM yyyy', { locale: es })}
                    </span>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button onClick={goToToday} className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
                        Hoy
                    </button>
                    <button
                        onClick={() => navigateWeek(1)}
                        disabled={isNextDisabled}
                        className={`p-2 rounded-full transition-colors transform rotate-180 ${isNextDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600'}`}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* 5-Column Grid */}
            <div className="grid grid-cols-5 gap-4 h-full">
                {weekDays.map((dayDate, i) => {
                    const dateStr = format(dayDate, 'yyyy-MM-dd');
                    // Filter events for this specific day
                    const dayEvents = events.filter(evt => format(evt.start, 'yyyy-MM-dd') === dateStr);
                    const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

                    return (
                        <div key={dateStr} className={`flex flex-col min-w-0 ${isToday ? 'ring-2 ring-indigo-500 ring-offset-2 rounded-xl' : ''}`}>
                            <div className={`p-3 text-center border-b border-gray-100 rounded-t-xl
                                ${isToday ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}
                             `}>
                                <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                                    {format(dayDate, 'EEEE', { locale: es })}
                                </p>
                                <p className="text-2xl font-bold">
                                    {format(dayDate, 'd')}
                                </p>
                            </div>

                            <div className="bg-white border-x border-b border-gray-200 rounded-b-xl overflow-hidden shadow-sm flex-1">
                                <CustomAgenda
                                    events={dayEvents}
                                    timeSlots={timeSlots}
                                    compact={true}
                                    onCancel={handleCancelAppointment}
                                    onSlotClick={handleSlotClick}
                                    currentDate={dayDate}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create Modal */}
            {modalData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="w-full max-w-lg">
                        <AppointmentForm
                            selectedDate={modalData.date}
                            availableSlots={getAvailableSlots(modalData.date)}
                            timeSlots={timeSlots}
                            initialData={{ time: modalData.time }}
                            readOnlyDateTime={true}
                            onSuccess={() => {
                                fetchAppointments();
                                setModalData(null);
                            }}
                            onCancel={() => setModalData(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarPage;
