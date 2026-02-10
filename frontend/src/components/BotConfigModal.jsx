import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const BotConfigModal = ({ isOpen, onClose }) => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchConfig();
        }
    }, [isOpen]);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/bot-config');
            setConfig(res.data);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar la configuración');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.put('http://localhost:5000/api/bot-config', config);
            toast.success('Configuración guardada correctamente');
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    if (loading || !config) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-2xl shadow-xl">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            </div>
        );
    }

    // Group fields for better UX
    const groups = {
        'Saludo y Errores Básicos': ['greeting', 'dniNotFound', 'genericError'],
        'Menú y Opciones': ['menuOptions', 'invalidOption', 'cancelInfo'],
        'Selección de Fecha y Horarios': ['askDate', 'invalidDate', 'noSlots', 'slotsHeader', 'slotsFooter'],
        'Selección de Fecha y Horarios': ['askDate', 'askDateList', 'invalidDate', 'noSlots', 'slotsHeader', 'slotsFooter'],
        'Confirmación y Cancelación': ['confirmation', 'bookingError', 'cancellationMessage', 'cancellationHeader', 'cancellationSuccess', 'noAppointments'],
        'Registro de Pacientes': ['askName', 'askSurname', 'askBirthdate', 'registerSuccess']
    };

    const labels = {
        greeting: 'Saludo Inicial',
        dniNotFound: 'DNI No Encontrado',
        menuOptions: 'Opciones del Menú (Use ${name})',
        askLocation: 'Pregunta de Ubicación',
        sanFranciscoInfo: 'Info. San Francisco (Solo Viernes)',
        askDate: 'Pedir Fecha (Texto Manual)',
        askDateList: 'Encabezado Lista de Fechas',
        cancelInfo: 'Info. Cancelación',
        invalidOption: 'Opción Inválida',
        invalidDate: 'Fecha Inválida',
        noSlots: 'Sin Horarios',
        slotsHeader: 'Encabezado Horarios (Use ${date})',
        slotsFooter: 'Pie de Horarios',
        confirmation: 'Confirmación (Use ${date}, ${time}, ${name})',
        bookingError: 'Error al Reservar (Use ${error})',
        genericError: 'Error Genérico',
        cancellationMessage: 'Mensaje de Cancelación (Notificación)',
        cancellationHeader: 'Encabezado Lista Cancelación',
        cancellationSuccess: 'Éxito Cancelación',
        noAppointments: 'Sin Turnos Activos',
        askName: 'Pedir Nombre (Registro)',
        askSurname: 'Pedir Apellido (Registro)',
        askBirthdate: 'Pedir Fecha Nacimiento (Registro)',
        registerSuccess: 'Registro Exitoso (Use ${name})'
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Configurar Mensajes del Bot 🤖</h2>
                        <p className="text-indigo-100 text-sm mt-1">Personalizá las respuestas automáticas de WhatsApp</p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    <form id="bot-config-form" onSubmit={handleSubmit} className="space-y-8">

                        {Object.entries(groups).map(([groupName, fields]) => (
                            <div key={groupName} className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                                    {groupName}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {fields.map(field => (
                                        <div key={field} className={field === 'menuOptions' || field === 'confirmation' ? 'md:col-span-2' : ''}>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                {labels[field] || field}
                                            </label>
                                            <textarea
                                                name={field}
                                                value={config[field] || ''}
                                                onChange={handleChange}
                                                rows={field === 'menuOptions' || field === 'confirmation' ? 4 : 2}
                                                className="w-full px-4 py-3 rounded-lg border-slate-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
                                            />
                                            <p className="text-xs text-slate-400 mt-1">
                                                {config[field]?.includes('${') && 'Variables disponibles: ' + config[field].match(/\${\w+}/g)?.join(', ')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="bot-config-form"
                        disabled={saving}
                        className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Guardar Cambios
                            </>
                        )}
                    </button>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 20px;
                    border: 3px solid transparent;
                    background-clip: content-box;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #94a3b8;
                }
            `}</style>
        </div>
    );
};

export default BotConfigModal;
