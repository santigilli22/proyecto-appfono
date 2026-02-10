import { Link, useLocation } from 'react-router-dom';
import { Stethoscope, Users, PlusCircle, MessageSquare } from 'lucide-react';

const Layout = ({ children }) => {
    const location = useLocation();
    const isFullWidthObj = location.pathname === '/billing' || location.pathname === '/calendar';

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <nav className="bg-white shadow-sm border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <Link to="/" className="flex-shrink-0 flex items-center">
                                <Stethoscope className="h-8 w-8 text-teal-600" />
                                <span className="ml-2 text-xl font-bold text-slate-800">FonoApp</span>
                            </Link>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <Link to="/" className="border-transparent text-slate-500 hover:border-teal-500 hover:text-teal-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                    Inicio
                                </Link>
                                <Link to="/patients" className="border-transparent text-slate-500 hover:border-teal-500 hover:text-teal-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                    Pacientes
                                </Link>
                                <Link to="/calendar" className="border-transparent text-slate-500 hover:border-teal-500 hover:text-teal-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                    Turnero
                                </Link>
                                <Link to="/billing" className="border-transparent text-slate-500 hover:border-teal-500 hover:text-teal-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                    Facturación
                                </Link>
                                <Link to="/whatsapp" className="border-transparent text-slate-500 hover:border-teal-500 hover:text-teal-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                    WhatsApp
                                </Link>
                            </div>
                        </div>

                    </div>
                </div>
            </nav>

            <main className={`${isFullWidthObj ? 'w-full' : 'max-w-7xl'} mx-auto py-6 sm:px-6 lg:px-8`}>
                {children}
            </main>
        </div>
    );
};

export default Layout;
