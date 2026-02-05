import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import axios from 'axios';

const ManualInvoiceModal = ({ onClose, onSuccess, invoices = [] }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        clientName: '',
        clientCuit: '',
        patientName: '',
        patientDNI: '',
        total: ''
    });

    const [suggestions, setSuggestions] = useState([]);

    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeField, setActiveField] = useState(null);

    // Extract unique entities and their CUITs
    const uniqueEntities = [...new Map(invoices.map(inv =>
        [inv.clientName.trim().toUpperCase(), { name: inv.clientName.trim().toUpperCase(), cuit: inv.clientCuit }]
    )).values()].filter(e => e.name !== 'PARTICULAR' && e.name !== 'UNKNOWN');

    // Extract unique patients and their DNIs
    const uniquePatients = [...new Map(invoices.flatMap(inv => inv.items || []).filter(item => item.patientName).map(item =>
        [item.patientName.trim().toUpperCase(), { name: item.patientName.trim().toUpperCase(), dni: item.patientDNI }]
    )).values()];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Reset suggestions if field changes
        if (name !== activeField) {
            setActiveField(name);
        }

        if (name === 'clientName') {
            if (value.length > 0) {
                const matches = uniqueEntities.filter(entity =>
                    entity.name.includes(value.toUpperCase())
                );
                setSuggestions(matches);
                setShowSuggestions(true);
                setActiveField('clientName');
            } else {
                setShowSuggestions(false);
            }
        }

        if (name === 'patientName') {
            if (value.length > 0) {
                const matches = uniquePatients.filter(patient =>
                    patient.name.includes(value.toUpperCase())
                );
                setSuggestions(matches);
                setShowSuggestions(true);
                setActiveField('patientName');
            } else {
                setShowSuggestions(false);
            }
        }
    };

    const selectEntity = (entity) => {
        setFormData(prev => ({
            ...prev,
            clientName: entity.name,
            clientCuit: entity.cuit || prev.clientCuit
        }));
        setShowSuggestions(false);
    };

    const selectPatient = (patient) => {
        setFormData(prev => ({
            ...prev,
            patientName: patient.name,
            patientDNI: patient.dni || prev.patientDNI
        }));
        setShowSuggestions(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check for duplicates (local check)
        const exists = invoices.some(inv =>
            inv.invoiceNumber.trim() === formData.invoiceNumber.trim()
        );

        if (exists) {
            alert('¡Error! Ya existe una factura con este N° de Comprobante.');
            return;
        }

        setLoading(true);

        try {
            await axios.post('http://localhost:5000/api/invoices/manual', formData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating invoice:', error);
            alert(error.response?.data?.message || 'Error al crear la factura');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={() => setShowSuggestions(false)}>
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 text-lg">Carga Manual de Factura</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase">N° Comprobante *</label>
                            <input
                                type="text"
                                name="invoiceNumber"
                                required
                                value={formData.invoiceNumber}
                                onChange={handleChange}
                                placeholder="ej. 0001-00001234"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Fecha *</label>
                            <input
                                type="date"
                                name="date"
                                required
                                value={formData.date}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2 bg-blue-50 p-2 rounded-lg border border-blue-100">
                        <input
                            type="checkbox"
                            id="isParticular"
                            checked={formData.clientName === 'PARTICULAR'}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setFormData(prev => ({ ...prev, clientName: 'PARTICULAR', clientCuit: '' }));
                                } else {
                                    setFormData(prev => ({ ...prev, clientName: '' }));
                                }
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="isParticular" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                            Paciente Particular (Sin Obra Social)
                        </label>
                    </div>

                    <div className="space-y-1 relative">
                        <label className="text-xs font-semibold text-gray-500 uppercase">
                            {formData.clientName === 'PARTICULAR' ? 'Entidad (Automático)' : 'Entidad / Cliente *'}
                        </label>
                        <input
                            type="text"
                            name="clientName"
                            required
                            value={formData.clientName}
                            onChange={handleChange}
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => {
                                if (e.target.value && !showSuggestions) {
                                    const matches = uniqueEntities.filter(entity =>
                                        entity.name.includes(e.target.value.toUpperCase())
                                    );
                                    if (matches.length > 0) {
                                        setSuggestions(matches);
                                        setShowSuggestions(true);
                                    }
                                }
                            }}
                            autoComplete="off"
                            placeholder="ej. OSDE, SWISS MEDICAL"
                            disabled={formData.clientName === 'PARTICULAR'} // Disable if Particular
                            className={`w-full px-3 py-2 border rounded-lg outline-none transition-shadow ${formData.clientName === 'PARTICULAR'
                                ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                                : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                }`}
                        />
                        {showSuggestions && activeField === 'clientName' && formData.clientName !== 'PARTICULAR' && (
                            <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                                {suggestions.map((entity, idx) => (
                                    <li
                                        key={idx}
                                        onClick={() => selectEntity(entity)}
                                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 flex justify-between items-center"
                                    >
                                        <span className="font-medium">{entity.name}</span>
                                        {entity.cuit && <span className="text-xs text-gray-400 font-mono">{entity.cuit}</span>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {!formData.clientName === 'PARTICULAR' && (
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase">CUIT Entidad (Opcional)</label>
                            <input
                                type="text"
                                name="clientCuit"
                                value={formData.clientCuit}
                                onChange={handleChange}
                                placeholder="ej. 30-12345678-9"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 relative">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Paciente (Opcional)</label>
                            <input
                                type="text"
                                name="patientName"
                                value={formData.patientName}
                                onChange={handleChange}
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => {
                                    if (e.target.value && !showSuggestions) {
                                        const matches = uniquePatients.filter(patient =>
                                            patient.name.includes(e.target.value.toUpperCase())
                                        );
                                        if (matches.length > 0) {
                                            setSuggestions(matches);
                                            setShowSuggestions(true);
                                        }
                                    }
                                }}
                                autoComplete="off"
                                placeholder="Nombre Completo"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                            />
                            {showSuggestions && activeField === 'patientName' && formData.patientName && suggestions.length > 0 && (
                                <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                                    {suggestions.map((item, idx) => (
                                        <li
                                            key={idx}
                                            onClick={() => selectPatient(item)}
                                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 flex justify-between items-center"
                                        >
                                            <span className="font-medium">{item.name}</span>
                                            {item.dni && <span className="text-xs text-gray-400 font-mono">DNI: {item.dni}</span>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase">DNI Paciente</label>
                            <input
                                type="text"
                                name="patientDNI"
                                value={formData.patientDNI}
                                onChange={handleChange}
                                placeholder="Número DNI"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                            />
                        </div>
                    </div>

                    <div className="space-y-1 pt-2">
                        <label className="text-xs font-bold text-gray-700 uppercase">Importe Total *</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500">$</span>
                            <input
                                type="number"
                                name="total"
                                required
                                step="0.01"
                                min="0"
                                value={formData.total}
                                onChange={handleChange}
                                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow font-mono font-medium"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Guardar Factura
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ManualInvoiceModal;
