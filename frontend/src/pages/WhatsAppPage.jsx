import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import BotConfigModal from '../components/BotConfigModal'; // [NEW]
import { MessageSquare, LogOut, Loader2, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const WhatsAppPage = () => {
    const [status, setStatus] = useState('LOADING'); // LOADING, CONNECTED, QR_READY, DISCONNECTED
    const [qrCode, setQrCode] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isConfigOpen, setIsConfigOpen] = useState(false); // [NEW]
    const socket = useSocket();

    // Initial Status Check
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/whatsapp/status');
                setStatus(res.data.status);
                if (res.data.qr) setQrCode(res.data.qr);
                if (res.data.user) setUserData(res.data.user);
            } catch (error) {
                console.error("Error checking status", error);
                setStatus('DISCONNECTED');
            }
        };
        checkStatus();
    }, []);

    // Socket Listeners
    useEffect(() => {
        if (!socket) return;

        socket.on('whatsapp_qr', (qr) => {
            setStatus('QR_READY');
            setQrCode(qr);
        });

        socket.on('whatsapp_ready', () => {
            setStatus('CONNECTED');
            setQrCode(null);
            toast.success("WhatsApp conectado correctamente!");
        });

        socket.on('whatsapp_authenticated', () => {
            // Usually valid immediately, wait for ready
        });

        socket.on('whatsapp_disconnected', () => {
            setStatus('DISCONNECTED');
            setQrCode(null);
            setUserData(null);
            toast.info("WhatsApp desconectado.");
        });

        // Specific status event
        socket.on('whatsapp_status', (data) => {
            setStatus(data.status);
            if (data.qr) setQrCode(data.qr);
        });

        // [NEW] Handle Timeout
        socket.on('whatsapp_timeout', () => {
            setStatus('DISCONNECTED');
            setQrCode(null);
            toast.info("El QR expiró por inactividad (para ahorrar recursos).");
        });

        return () => {
            socket.off('whatsapp_qr');
            socket.off('whatsapp_ready');
            socket.off('whatsapp_authenticated');
            socket.off('whatsapp_disconnected');
            socket.off('whatsapp_status');
            socket.off('whatsapp_timeout');
        };
    }, [socket]);

    const handleLogout = async () => {
        if (!window.confirm("¿Seguro que querés desconectar WhatsApp? El bot dejará de funcionar.")) return;

        try {
            await axios.post('http://localhost:5000/api/whatsapp/logout');
            setStatus('DISCONNECTED'); // Optimistic update
        } catch (error) {
            console.error(error);
            toast.error("Error al desconectar");
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">WhatsApp Bot 🤖</h1>
                <button
                    onClick={() => setIsConfigOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-colors font-medium text-sm"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Configurar Mensajes
                </button>
            </div>

            <BotConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col md:flex-row min-h-[500px]">

                {/* Left Side: Info */}
                <div className="bg-teal-600 p-8 text-white md:w-1/2 flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                            <MessageSquare className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">WhatsApp Bot</h1>
                        <p className="text-teal-100 text-lg">
                            Conectá tu cuenta para habilitar el agendamiento automático y respuestas inteligentes.
                        </p>
                    </div>

                    <div className="space-y-4 relative z-10 mt-8">
                        <div className="flex items-center gap-3 bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                            <CheckCircle2 className="w-5 h-5 text-teal-200" />
                            <p className="font-medium text-sm">Respuestas automáticas 24/7</p>
                        </div>
                        <div className="flex items-center gap-3 bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                            <CheckCircle2 className="w-5 h-5 text-teal-200" />
                            <p className="font-medium text-sm">Validación de DNI de pacientes</p>
                        </div>
                        <div className="flex items-center gap-3 bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                            <CheckCircle2 className="w-5 h-5 text-teal-200" />
                            <p className="font-medium text-sm">Reserva de turnos en tiempo real</p>
                        </div>
                    </div>

                    {/* Decorative circles */}
                    <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-teal-500 rounded-full opacity-50 blur-3xl"></div>
                    <div className="absolute top-10 -left-10 w-32 h-32 bg-teal-400 rounded-full opacity-30 blur-2xl"></div>
                </div>

                {/* Right Side: Action Area */}
                <div className="md:w-1/2 p-8 flex flex-col items-center justify-center bg-slate-50">

                    {status === 'LOADING' && (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in">
                            <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
                            <p className="text-slate-500 font-medium">Verificando estado...</p>
                        </div>
                    )}

                    {status === 'QR_READY' && qrCode && (
                        <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-300">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                                <QRCodeSVG value={qrCode} size={256} level={"L"} />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-bold text-slate-800">Escaneá el código QR</h3>
                                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                    Abrí WhatsApp en tu teléfono, andá a <span className="font-bold">Dispositivos vinculados</span> y escaneá este código.
                                </p>
                            </div>
                        </div>
                    )}

                    {status === 'CONNECTED' && (
                        <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-5 duration-500">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center shadow-inner">
                                <CheckCircle2 className="w-12 h-12 text-green-600" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-slate-800">¡Conectado!</h3>
                                <p className="text-slate-500 mt-2">El bot está activo y respondiendo mensajes.</p>
                                {userData && <p className="text-xs text-slate-400 mt-1 font-mono">{userData}</p>}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="mt-4 flex items-center gap-2 px-6 py-3 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all font-semibold"
                            >
                                <LogOut className="w-4 h-4" />
                                Desconectar sesión
                            </button>
                        </div>
                    )}

                    {status === 'DISCONNECTED' && !qrCode && (
                        <div className="flex flex-col items-center gap-6 text-center animate-in fade-in">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                                <Smartphone className="w-10 h-10 text-slate-400" />
                            </div>
                            <div className="space-y-4 text-center">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-700">Desconectado</h3>
                                    <p className="text-slate-500 text-sm max-w-xs mx-auto mt-1">
                                        Para ahorrar recursos, el bot está en reposo.
                                    </p>
                                </div>

                                <button
                                    onClick={async () => {
                                        setStatus('LOADING');
                                        try {
                                            await axios.post('http://localhost:5000/api/whatsapp/start');
                                            toast.info("Iniciando WhatsApp...");
                                        } catch (e) {
                                            console.error(e);
                                            toast.error("Error al iniciar");
                                            setStatus('DISCONNECTED');
                                        }
                                    }}
                                    className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition shadow-md font-medium"
                                >
                                    Generar Código QR
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WhatsAppPage;
