import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save } from 'lucide-react';

const EditPatientPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        dni: '',
        telefono: '',
        email: '',
        obraSocial: '',
        numeroAfiliado: '',
        fechaNacimiento: '',
        diagnosticoPrevio: '',
        contactoEmergencia: '',
        escolaridad: '',
        notas: '',
        numerosAutorizados: '' // Manage as string in form
    });
    const [loading, setLoading] = useState(isEditMode);

    useEffect(() => {
        if (!isEditMode) return;

        const fetchPatient = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/patients/${id}`);
                const p = res.data;
                setFormData({
                    nombre: p.nombre || '',
                    apellido: p.apellido || '',
                    dni: p.dni || '',
                    telefono: p.telefono || '',
                    email: p.email || '',
                    obraSocial: p.obraSocial || '',
                    numeroAfiliado: p.numeroAfiliado || '',
                    fechaNacimiento: p.fechaNacimiento ? p.fechaNacimiento.split('T')[0] : '',
                    diagnosticoPrevio: p.diagnosticoPrevio || '',
                    contactoEmergencia: p.contactoEmergencia || '',
                    escolaridad: p.escolaridad || '',
                    notas: p.notas || '',
                    numerosAutorizados: p.numerosAutorizados && Array.isArray(p.numerosAutorizados) ? p.numerosAutorizados.join(', ') : ''
                });
            } catch (error) {
                console.error("Error fetching patient", error);
                alert("Error al cargar paciente");
                navigate('/patients');
            } finally {
                setLoading(false);
            }
        };
        fetchPatient();
    }, [id, navigate, isEditMode]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Process authorized numbers
            const payload = { ...formData };
            if (payload.numerosAutorizados) {
                payload.numerosAutorizados = payload.numerosAutorizados.split(',').map(n => n.trim()).filter(Boolean);
            } else {
                payload.numerosAutorizados = [];
            }

            if (isEditMode) {
                await axios.put(`http://localhost:5000/api/patients/${id}`, payload);
            } else {
                await axios.post(`http://localhost:5000/api/patients`, payload);
            }
            navigate('/patients');
        } catch (error) {
            console.error("Error saving patient", error);
            alert(`Error al ${isEditMode ? 'actualizar' : 'crear'} paciente`);
        }
    };

    if (loading) return <div className="p-6">Cargando...</div>;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-6">
                <button
                    onClick={() => navigate('/patients')}
                    className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Volver a la lista
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h1 className="text-2xl font-bold text-gray-800">
                        {isEditMode ? 'Editar Paciente' : 'Nuevo Paciente'}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {isEditMode ? 'Modificá los datos del paciente' : 'Ingresá los datos del nuevo paciente'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Nombre</label>
                            <input
                                type="text"
                                name="nombre"
                                value={formData.nombre}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Apellido</label>
                            <input
                                type="text"
                                name="apellido"
                                value={formData.apellido}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">DNI</label>
                            <input
                                type="text"
                                name="dni"
                                value={formData.dni}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Fecha de Nacimiento</label>
                            <input
                                type="date"
                                name="fechaNacimiento"
                                value={formData.fechaNacimiento}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Teléfono</label>
                            <input
                                type="tel"
                                name="telefono"
                                value={formData.telefono}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                                required
                            />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfonos Autorizados (Padres/Tutores)</label>
                            <input
                                type="text"
                                name="numerosAutorizados"
                                value={formData.numerosAutorizados}
                                onChange={handleChange}
                                placeholder="Ej: 3564123456, 3564987654 (Separados por coma)"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                            />
                            <p className="text-xs text-slate-500 mt-1">Estos números también podrán gestionar los turnos desde WhatsApp.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Obra Social</label>
                            <input
                                type="text"
                                name="obraSocial"
                                value={formData.obraSocial}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Número de Afiliado</label>
                            <input
                                type="text"
                                name="numeroAfiliado"
                                value={formData.numeroAfiliado || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Contacto Emergencia</label>
                            <input
                                type="text"
                                name="contactoEmergencia"
                                value={formData.contactoEmergencia || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Escolaridad</label>
                            <input
                                type="text"
                                name="escolaridad"
                                value={formData.escolaridad || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Diagnóstico Previo</label>
                        <textarea
                            name="diagnosticoPrevio"
                            value={formData.diagnosticoPrevio || ''}
                            onChange={handleChange}
                            rows="2"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        ></textarea>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Notas Adicionales</label>
                        <textarea
                            name="notas"
                            value={formData.notas}
                            onChange={handleChange}
                            rows="4"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        ></textarea>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm flex items-center"
                        >
                            <Save className="w-5 h-5 mr-2" />
                            {isEditMode ? 'Guardar Cambios' : 'Crear Paciente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPatientPage;
