import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPatient } from '../services/api';
import { Save, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const AddPatientPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        dni: '',
        fechaNacimiento: '',
        obraSocial: 'Particular',
        numeroAfiliado: '',
        diagnosticoPrevio: '',
        telefono: '',
        email: '',
        contactoEmergencia: '',
        escolaridad: '',
        notas: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createPatient(formData);
            navigate('/patients');
        } catch (error) {
            console.error('Error creating patient:', error);
            alert('Error al crear el paciente. Por favor verifique los datos.');
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-6 flex items-center">
                <Link to="/patients" className="mr-4 text-slate-500 hover:text-slate-700">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">Nuevo Paciente</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl md:col-span-2">
                <div className="px-4 py-6 sm:p-8">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                        {/* Datos Personales */}
                        <div className="col-span-full">
                            <h2 className="text-base font-semibold leading-7 text-slate-900">Información Personal</h2>
                            <p className="mt-1 text-sm leading-6 text-slate-600">Datos principales del paciente.</p>
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="nombre" className="block text-sm font-medium leading-6 text-slate-900">Nombre</label>
                            <div className="mt-2">
                                <input required type="text" name="nombre" id="nombre" value={formData.nombre} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6" />
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="apellido" className="block text-sm font-medium leading-6 text-slate-900">Apellido</label>
                            <div className="mt-2">
                                <input required type="text" name="apellido" id="apellido" value={formData.apellido} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6" />
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="dni" className="block text-sm font-medium leading-6 text-slate-900">DNI</label>
                            <div className="mt-2">
                                <input required type="text" name="dni" id="dni" value={formData.dni} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6" />
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="fechaNacimiento" className="block text-sm font-medium leading-6 text-slate-900">Fecha de Nacimiento</label>
                            <div className="mt-2">
                                <input required type="date" name="fechaNacimiento" id="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6" />
                            </div>
                        </div>

                        {/* Cobertura */}
                        <div className="col-span-full border-t border-slate-900/10 pt-8 mt-4">
                            <h2 className="text-base font-semibold leading-7 text-slate-900">Cobertura Médica</h2>
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="obraSocial" className="block text-sm font-medium leading-6 text-slate-900">Obra Social / Prepaga</label>
                            <div className="mt-2">
                                <input type="text" name="obraSocial" id="obraSocial" value={formData.obraSocial} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6" />
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="numeroAfiliado" className="block text-sm font-medium leading-6 text-slate-900">N° Afiliado</label>
                            <div className="mt-2">
                                <input type="text" name="numeroAfiliado" id="numeroAfiliado" value={formData.numeroAfiliado} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6" />
                            </div>
                        </div>

                        {/* Contacto y Otros */}
                        <div className="col-span-full border-t border-slate-900/10 pt-8 mt-4">
                            <h2 className="text-base font-semibold leading-7 text-slate-900">Información Adicional</h2>
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="telefono" className="block text-sm font-medium leading-6 text-slate-900">Teléfono</label>
                            <div className="mt-2">
                                <input required type="tel" name="telefono" id="telefono" value={formData.telefono} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6" />
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="email" className="block text-sm font-medium leading-6 text-slate-900">Email</label>
                            <div className="mt-2">
                                <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6" />
                            </div>
                        </div>

                        <div className="col-span-full">
                            <label htmlFor="diagnosticoPrevio" className="block text-sm font-medium leading-6 text-slate-900">Diagnóstico Previo</label>
                            <div className="mt-2">
                                <textarea name="diagnosticoPrevio" id="diagnosticoPrevio" rows="3" value={formData.diagnosticoPrevio} onChange={handleChange} className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6"></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-x-6 border-t border-slate-900/10 px-4 py-4 sm:px-8">
                    <Link to="/patients" className="text-sm font-semibold leading-6 text-slate-900">Cancelar</Link>
                    <button type="submit" className="rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 flex items-center">
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Paciente
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddPatientPage;
