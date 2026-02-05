import React from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, Activity } from 'lucide-react';

const HomePage = () => {
    return (
        <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Bienvenido a FonoApp</h1>
                <p className="mt-2 text-slate-600">Gestión integral de pacientes para fonoaudiología.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Link to="/patients" className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow p-6 border border-slate-100">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-teal-100 rounded-md p-3">
                            <Users className="h-6 w-6 text-teal-600" />
                        </div>
                        <div className="ml-4">
                            <h2 className="text-lg font-medium text-slate-900">Pacientes</h2>
                            <p className="text-sm text-slate-500">Ver y gestionar lista de pacientes</p>
                        </div>
                    </div>
                </Link>

                <div className="bg-white overflow-hidden shadow-sm rounded-lg p-6 border border-slate-100 opacity-60">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                            <FileText className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="ml-4">
                            <h2 className="text-lg font-medium text-slate-900">Historias Clínicas</h2>
                            <p className="text-sm text-slate-500">Próximamente</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow-sm rounded-lg p-6 border border-slate-100 opacity-60">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-rose-100 rounded-md p-3">
                            <Activity className="h-6 w-6 text-rose-600" />
                        </div>
                        <div className="ml-4">
                            <h2 className="text-lg font-medium text-slate-900">Turnos</h2>
                            <p className="text-sm text-slate-500">Próximamente</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
