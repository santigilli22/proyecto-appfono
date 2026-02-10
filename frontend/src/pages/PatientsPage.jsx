import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserPlus, FileText, Phone, Edit, Trash2 } from 'lucide-react';
import { getPatients, deletePatient } from '../services/api';
import { calculateAge } from '../utils/dateUtils';
import usePageTitle from '../hooks/usePageTitle';
import Skeleton from '../components/Skeleton';

const PatientsPage = () => {
    usePageTitle('Pacientes');
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            const response = await getPatients();
            setPatients(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching patients:', error);
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este paciente? Esta acción no se puede deshacer.')) return;
        try {
            await deletePatient(id);
            setPatients(patients.filter(p => p._id !== id));
        } catch (error) {
            console.error('Error deleting patient:', error);
            alert('Error al eliminar paciente');
        }
    };

    const filteredPatients = patients.filter(patient =>
        `${patient.nombre} ${patient.apellido} ${patient.dni}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 leading-7 sm:truncate sm:text-3xl sm:tracking-tight">
                        Pacientes
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Lista completa de pacientes registrados.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <Link
                        to="/patients/new"
                        className="inline-flex items-center rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 transition-colors"
                    >
                        <UserPlus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                        Nuevo Paciente
                    </Link>
                </div>
            </div>

            <div className="relative rounded-md shadow-sm max-w-md">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
                <input
                    type="text"
                    className="block w-full rounded-md border-0 py-1.5 pl-10 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6"
                    placeholder="Buscar por nombre o DNI"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Nombre Completo</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">DNI</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Edad</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Cobertura</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Contacto</th>
                                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                    <span className="sr-only">Acciones</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {loading ? (
                                // Skeleton Rows
                                [...Array(5)].map((_, index) => (
                                    <tr key={index}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                                            <Skeleton className="h-4 w-48" />
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4">
                                            <Skeleton className="h-4 w-24" />
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4">
                                            <Skeleton className="h-4 w-12" />
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4">
                                            <Skeleton className="h-4 w-32" />
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4">
                                            <Skeleton className="h-4 w-24" />
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Skeleton className="h-8 w-8 rounded-lg" />
                                                <Skeleton className="h-8 w-8 rounded-lg" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredPatients.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-4 text-slate-500">No se encontraron pacientes.</td>
                                </tr>
                            ) : filteredPatients.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-4 text-slate-500">No se encontraron pacientes.</td>
                                </tr>
                            ) : (
                                filteredPatients.map((patient) => (
                                    <tr key={patient._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">
                                            {patient.nombre} {patient.apellido}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{patient.dni}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                                            {calculateAge(patient.fechaNacimiento)} años
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                                            {patient.obraSocial}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                                            <div className="flex items-center">
                                                <Phone className="h-4 w-4 mr-1 text-slate-400" />
                                                {patient.telefono}
                                            </div>
                                        </td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    to={`/patients/${patient._id}/edit`}
                                                    className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(patient._id)}
                                                    className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PatientsPage;
