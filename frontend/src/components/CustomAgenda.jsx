import React, { useState } from 'react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, User, Phone, FileText, Clock, CheckCircle, XCircle, Calendar as CalendarIcon, MapPin, Trash2, PlusCircle } from 'lucide-react';
// ...


const CustomAgenda = ({ events, timeSlots, compact = false, onlyEvents = false, onCancel, onSlotClick, currentDate }) => {
    const [selectedEvent, setSelectedEvent] = useState(null);

    // If timeSlots not provided, fallback to default generation (safety)
    const allTimeSlots = timeSlots || (() => {
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
    })();

    // Sort events by date
    const sortedEvents = [...events].sort((a, b) => a.start - b.start);

    // Group events by date
    const groupedEvents = sortedEvents.reduce((acc, event) => {
        const dateKey = format(event.start, 'yyyy-MM-dd');
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(event);
        return acc;
    }, {});

    // If currentDate provided, force render that date. Otherwise render all dates with events.
    const datesToRender = currentDate
        ? [format(currentDate, 'yyyy-MM-dd')]
        : Object.keys(groupedEvents).sort();

    // Helper to determine status including "past" logic
    const getEventStatus = (event) => {
        if (event.resource.status === 'Cancelled') return 'canceled';
        const isPast = event.end < new Date();
        if (event.resource.status === 'Completed' || (event.resource.status === 'Confirmed' && isPast)) return 'completed';
        return 'pending';
    };

    return (
        <div className={`rbc-agenda-view ${compact ? '' : 'p-4 bg-gray-50/50 min-h-screen'}`}>
            <div className={`bg-white ${compact ? '' : 'rounded-xl shadow-sm border border-gray-200'} overflow-hidden`}>
                <table className="w-full text-sm text-left">
                    {!compact && (
                        <thead className="bg-gray-800 text-white uppercase text-xs tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-40 text-center border-r border-gray-700">Fecha</th>
                                <th className="px-6 py-4 w-28 text-center border-r border-gray-700">Hora</th>
                                <th className="px-6 py-4">Estado / Paciente</th>
                            </tr>
                        </thead>
                    )}
                    <tbody className="divide-y divide-gray-100">
                        {datesToRender.map(dateKey => {
                            const dateObj = parse(dateKey, 'yyyy-MM-dd', new Date());
                            const dayEvents = groupedEvents[dateKey] || [];

                            const eventsByTime = {};
                            dayEvents.forEach(evt => {
                                const existing = eventsByTime[evt.resource.time];
                                if (!existing) {
                                    eventsByTime[evt.resource.time] = evt;
                                } else if (existing.resource.status === 'Cancelled' && evt.resource.status !== 'Cancelled') {
                                    eventsByTime[evt.resource.time] = evt;
                                }
                            });

                            let rows = allTimeSlots.map(time => {
                                const event = eventsByTime[time];
                                return { time, event, type: event ? 'event' : 'free' };
                            });

                            // FILTER: If onlyEvents is true, remove free slots
                            if (onlyEvents) {
                                rows = rows.filter(r => r.type === 'event');
                            }

                            // If filtering resulted in no rows for this date, and we are iterating dates from events, 
                            // we might still want to show something? 
                            // But usually groupedEvents only has dates WITH events.
                            // Exception: "Today" might be forced.

                            if (rows.length === 0) {
                                // If force-showing a date but it has no events (after filtering free slots), show empty message row for this date?
                                // Or simply render nothing for this date?
                                // Let's render nothing for this date loop so the global "Empty State" below catches it 
                                // if ALL dates end up empty.
                                return null;
                            }

                            return rows.map((row, index) => {
                                const isEvent = row.type === 'event';
                                let status = 'free';
                                let isPastSlot = false;

                                if (isEvent) {
                                    status = getEventStatus(row.event);
                                } else {
                                    const [h, m] = row.time.split(':').map(Number);
                                    const slotDate = new Date(dateObj);
                                    slotDate.setHours(h, m, 0, 0);
                                    isPastSlot = slotDate < new Date();
                                }

                                return (
                                    <tr
                                        key={`${dateKey}-${row.time}`}
                                        onClick={() => {
                                            if (isEvent) {
                                                setSelectedEvent({ ...row.event, computedStatus: status });
                                            } else if (!isPastSlot && onSlotClick) {
                                                onSlotClick(dateKey, row.time);
                                            }
                                        }}
                                        className={`transition-colors cursor-pointer group/row
                                    ${compact ? 'h-[40px]' : ''}
                                    ${row.type === 'free' ?
                                                (isPastSlot ? 'bg-gray-50 cursor-not-allowed opacity-60' : 'hover:bg-green-50 cursor-pointer') :
                                                status === 'completed' ? 'bg-green-50 hover:bg-green-100 border-l-4 border-l-green-500' :
                                                    status === 'canceled' ? 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500' :
                                                        'hover:bg-indigo-50 border-l-4 border-l-indigo-500'}`}
                                    >
                                        {/* ... render cells ... */}
                                        {!compact && index === 0 && (
                                            <td rowSpan={rows.length} className="px-6 py-6 font-bold text-gray-800 text-center align-top border-r border-gray-200 bg-white">
                                                {/* Date Cell Content */}
                                                <div className="sticky top-4 flex flex-col items-center gap-1">
                                                    <span className="text-4xl font-extrabold text-indigo-600">{format(dateObj, 'dd')}</span>
                                                    <span className="text-sm font-bold uppercase tracking-widest text-gray-400">{format(dateObj, 'MMM', { locale: es })}</span>
                                                    <span className="text-xs font-medium text-gray-300 capitalize">{format(dateObj, 'EEEE', { locale: es })}</span>
                                                </div>
                                            </td>
                                        )}
                                        {/* ... cell rendering continues same as before ... */}
                                        {compact && row.type === 'free' ? (
                                            <td colSpan={2} className="px-3 py-1.5 text-xs text-center font-mono opacity-50 text-gray-500 align-middle">
                                                {row.time}
                                            </td>
                                        ) : (
                                            <>
                                                <td className={`${compact ? 'px-3 py-1.5 text-xs w-20 min-w-[80px]' : 'px-6 py-3 w-28'} text-center border-r border-gray-100 font-mono align-middle
                                                ${row.type === 'free' ? 'opacity-50 text-gray-500' :
                                                        status === 'completed' ? 'font-bold text-green-700' :
                                                            status === 'canceled' ? 'font-bold text-red-500 line-through' :
                                                                'font-bold text-indigo-700'}`}>
                                                    {row.time}
                                                </td>
                                                <td className={`${compact ? 'px-3 py-1.5 w-full max-w-0 overflow-hidden' : 'px-6 py-3'} align-middle`}>
                                                    {/* Event Content */}
                                                    {row.type === 'event' ? (
                                                        <div className="flex justify-between items-center h-full">
                                                            <div className="flex flex-col gap-1 overflow-hidden justify-center">
                                                                <div className="flex items-center gap-2">
                                                                    {!compact && (
                                                                        <div className={`w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white flex-shrink-0 ${status === 'completed' ? 'bg-green-500' :
                                                                            status === 'canceled' ? 'bg-red-500' :
                                                                                'bg-indigo-500'
                                                                            }`} />
                                                                    )}
                                                                    <span className={`font-semibold truncate ${compact ? 'text-xs' : ''} ${status === 'canceled' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                                                        {row.event.title.split(' (')[0]}
                                                                    </span>
                                                                    {status === 'completed' && compact && (
                                                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                                                    )}
                                                                </div>
                                                                {!compact && row.event.resource.notes && (
                                                                    <p className="text-xs text-gray-500 ml-5 pl-3 border-l-2 border-gray-100">{row.event.resource.notes}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // Free slot content (only reachable if !onlyEvents)
                                                        isPastSlot ? (
                                                            <span className="text-gray-300 text-xs">-</span>
                                                        ) : (
                                                            <div className="flex items-center gap-2 opacity-30 group hover:opacity-100 transition-opacity h-full">
                                                                {!compact && <div className="w-2 h-2 rounded-full bg-gray-300 group-hover:bg-green-400" />}
                                                                <span className={`text-gray-400 italic font-medium group-hover:text-green-600 ${compact ? 'text-[10px]' : 'text-sm'}`}>
                                                                    {compact ? '-' : 'Disponible'}
                                                                </span>
                                                            </div>
                                                        )
                                                    )}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                );
                            });
                        })}

                        {/* Improved Empty State - Only show if we are in "Only Events" mode (Home) */}
                        {(events.length === 0 && onlyEvents) && (
                            <tr>
                                <td colSpan={compact ? 2 : 3} className="px-6 py-16 text-center text-gray-400 bg-gray-50/50">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className={`${compact ? 'w-10 h-10' : 'w-16 h-16'} bg-green-50 rounded-full flex items-center justify-center mb-1`}>
                                            <CheckCircle className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-green-400`} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className={`text-gray-400 font-medium ${compact ? 'text-xs uppercase tracking-wide' : 'text-sm'}`}>
                                                {compact ? 'Libre' : 'No hay turnos programados'}
                                            </p>
                                            {!compact && (
                                                <p className="text-xs text-gray-400 max-w-[200px] mx-auto">
                                                    No tenés pacientes agendados para este período. ¡Aprovechá para descansar!
                                                </p>
                                            )}
                                        </div>
                                        {/* Optional Call to Action */}
                                        {!compact && (
                                            <button className="mt-2 text-indigo-600 text-xs font-bold hover:underline">
                                                + Agendar Nuevo Turno
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>


            {/* Event Detail Modal (Redesigned) */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border-t-8 
                        ${selectedEvent.computedStatus === 'completed' ? 'border-green-500' :
                            selectedEvent.computedStatus === 'canceled' ? 'border-red-500' :
                                'border-indigo-500'}`}>

                        {/* Header Status */}
                        <div className={`px-6 py-6 text-center 
                            ${selectedEvent.computedStatus === 'completed' ? 'bg-green-50 text-green-900' :
                                selectedEvent.computedStatus === 'canceled' ? 'bg-red-50 text-red-900' :
                                    'bg-indigo-50 text-indigo-900'}`}>

                            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 text-white shadow-sm
                                ${selectedEvent.computedStatus === 'completed' ? 'bg-green-500' :
                                    selectedEvent.computedStatus === 'canceled' ? 'bg-red-500' :
                                        'bg-indigo-500'}`}>
                                {selectedEvent.computedStatus === 'completed' ? <CheckCircle className="w-7 h-7" /> :
                                    selectedEvent.computedStatus === 'canceled' ? <XCircle className="w-7 h-7" /> :
                                        <CalendarIcon className="w-6 h-6" />}
                            </div>

                            <h3 className="font-bold text-xl">
                                {selectedEvent.computedStatus === 'completed' ? '¡Turno Completado!' :
                                    selectedEvent.computedStatus === 'canceled' ? 'Turno Cancelado' :
                                        'Turno Programado'}
                            </h3>
                            <p className="text-sm opacity-80 mt-1 font-medium">
                                {selectedEvent.computedStatus === 'completed' ? 'El paciente asistió correctamente.' :
                                    selectedEvent.computedStatus === 'canceled' ? 'Este turno fue dado de baja.' :
                                        'Pendiente de realización.'}
                            </p>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Time & Date Card */}
                            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-100">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Fecha</p>
                                    <p className="font-semibold text-gray-900 capitalize">
                                        {format(selectedEvent.start, 'EEEE d MMM', { locale: es })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Horario</p>
                                    <p className="text-2xl font-bold text-gray-800">{selectedEvent.resource.time}</p>
                                </div>
                            </div>

                            {/* Patient Info */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-50 p-2.5 rounded-full">
                                        <User className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide font-bold">Paciente</p>
                                        <p className="font-bold text-gray-800 text-lg">{selectedEvent.resource.patientName}</p>
                                    </div>
                                </div>

                                {selectedEvent.resource.patientPhone && (
                                    <div className="flex items-center gap-4">
                                        <div className="bg-green-50 p-2.5 rounded-full">
                                            <Phone className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide font-bold">Teléfono</p>
                                            <p className="font-medium text-gray-700">{selectedEvent.resource.patientPhone}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedEvent.resource.notes && (
                                    <div className="flex items-start gap-4">
                                        <div className="bg-yellow-50 p-2.5 rounded-full">
                                            <FileText className="w-5 h-5 text-yellow-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-400 uppercase tracking-wide font-bold">Notas</p>
                                            <div className="bg-yellow-50/50 p-3 rounded-lg border border-yellow-100 mt-1">
                                                <p className="text-sm text-gray-700 italic">
                                                    "{selectedEvent.resource.notes}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-center gap-4">
                            {selectedEvent.computedStatus === 'canceled' && onSlotClick && (
                                <button
                                    onClick={() => {
                                        const eventDateStr = format(selectedEvent.start, 'yyyy-MM-dd');
                                        const now = new Date();
                                        if (selectedEvent.start > now) {
                                            onSlotClick(eventDateStr, selectedEvent.resource.time);
                                            setSelectedEvent(null);
                                        } else {
                                            alert("No se puede reutilizar un turno pasado.");
                                        }
                                    }}
                                    className="flex-1 py-3 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    Reutilizar Horario
                                </button>
                            )}

                            {selectedEvent.computedStatus !== 'canceled' && selectedEvent.computedStatus !== 'completed' && onCancel && (
                                <button
                                    onClick={() => {
                                        if (window.confirm(`¿Seguro que querés cancelar el turno de ${selectedEvent.resource.patientName}?`)) {
                                            onCancel(selectedEvent);
                                            setSelectedEvent(null);
                                        }
                                    }}
                                    className="flex-1 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Cancelar Turno
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

CustomAgenda.range = (start, end) => {
    return { start, end };
}

CustomAgenda.navigate = (date, action) => {
    return date;
}

CustomAgenda.title = (start) => {
    return `Agenda`;
}

export default CustomAgenda;
