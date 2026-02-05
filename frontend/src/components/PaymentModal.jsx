import React, { useState } from 'react';
import { X, DollarSign, Calendar, CreditCard } from 'lucide-react';
import axios from 'axios';

const PaymentModal = ({ invoice, onClose, onUpdate }) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState('Efectivo');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`http://localhost:5000/api/invoices/${invoice._id}/payment`, {
                amount,
                date,
                method,
                note
            });
            onUpdate(); // Refresh parent data
            onClose();
        } catch (error) {
            console.error('Error registering payment', error);
            alert('Error al registrar el pago');
        } finally {
            setLoading(false);
        }
    };

    if (!invoice) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                    <h2 className="text-lg font-bold">Registrar Pago</h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Invoice Summary */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-500">Factura</span>
                            <span className="font-mono font-medium text-gray-900">{invoice.invoiceNumber}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-500">Entidad</span>
                            <span className="font-xs text-gray-900 truncate max-w-[200px]">{invoice.clientName}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-500">CUIT Entidad</span>
                            <span className="font-mono text-gray-700 text-sm">{invoice.clientCuit || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-500">Paciente</span>
                            <span className="font-medium text-gray-900 truncate max-w-[200px]">
                                {invoice.items?.[0]?.patientName || '-'}
                            </span>
                        </div>
                        <div className="border-t border-gray-200 my-3"></div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-xs text-gray-500 uppercase">Total</div>
                                <div className="font-bold text-gray-900 text-lg">
                                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(invoice.total)}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 uppercase">Pagado</div>
                                <div className="font-bold text-green-600 text-lg">
                                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(invoice.total - (invoice.balance ?? invoice.total))}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 uppercase">Saldo</div>
                                <div className="font-bold text-red-500 text-lg">
                                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(invoice.balance ?? invoice.total)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Add Payment Form - Only if Pending or Partial */}
                    {(invoice.balance ?? invoice.total) > 0.01 ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Monto a Pagar</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        max={Number((invoice.balance ?? invoice.total).toFixed(2))}
                                        required
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="payFull"
                                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setAmount(Number((invoice.balance ?? invoice.total).toFixed(2)).toString());
                                                } else {
                                                    setAmount('');
                                                }
                                            }}
                                            checked={amount === Number((invoice.balance ?? invoice.total).toFixed(2)).toString()}
                                        />
                                        <label htmlFor="payFull" className="text-sm text-gray-600 cursor-pointer select-none">
                                            Pagar saldo restante
                                        </label>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        Máximo: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number((invoice.balance ?? invoice.total).toFixed(2)))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="date"
                                            required
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <select
                                            value={method}
                                            onChange={(e) => setMethod(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
                                        >
                                            <option value="Efectivo">Efectivo</option>
                                            <option value="Transferencia">Transferencia</option>
                                            <option value="Tarjeta">Tarjeta</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {loading ? 'Registrando...' : 'Confirmar Pago'}
                            </button>
                        </form>
                    ) : (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                            <div className="flex justify-center mb-2">
                                <div className="bg-green-100 p-2 rounded-full">
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                            <h3 className="text-green-800 font-bold text-lg mb-1">¡Factura Pagada!</h3>
                            <p className="text-green-600 text-sm">Esta factura ha sido saldada completamente.</p>
                        </div>
                    )}

                    {/* History */}
                    {invoice.payments && invoice.payments.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Historial</h3>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                {invoice.payments.slice().reverse().map((pay, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-700">{new Date(pay.date).toLocaleDateString()}</span>
                                            <span className="text-xs text-gray-400">{pay.method}</span>
                                        </div>
                                        <span className="font-bold text-green-600">
                                            + {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(pay.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
