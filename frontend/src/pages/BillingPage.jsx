import { useState, useEffect } from 'react';
import axios from 'axios';
import { UploadCloud, FileText, X, Loader2, Trash2, DollarSign, Wallet, BarChart3, TrendingUp, TrendingDown, Calendar, Plus, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Toast from '../components/Toast';
import PaymentModal from '../components/PaymentModal';
import ManualInvoiceModal from '../components/ManualInvoiceModal';
import { generatePDF, runAutoTable } from '../utils/pdfGenerator';

const BillingPage = () => {
    const [files, setFiles] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null); // { message, type }
    const [activeTab, setActiveTab] = useState('uploads'); // 'uploads' | 'payments'
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(8); // Fixed items per page
    const [showManualModal, setShowManualModal] = useState(false);

    // Reports State
    const [reportStartDate, setReportStartDate] = useState(
        new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0] // Start of current year
    );
    const [reportEndDate, setReportEndDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [selectedEntity, setSelectedEntity] = useState('');
    const [isDetailedView, setIsDetailedView] = useState(false);

    useEffect(() => {
        fetchInvoices();
    }, []);

    // Keep selectedInvoice in sync with updated invoices data
    useEffect(() => {
        if (selectedInvoice) {
            const updatedInvoice = invoices.find(inv => inv._id === selectedInvoice._id);
            if (updatedInvoice) {
                setSelectedInvoice(updatedInvoice);
            }
        }

        // Auto-set Report Start Date to earliest invoice date
        if (invoices.length > 0) {
            const dates = invoices.map(inv => new Date(inv.periodFrom || inv.date));
            const minDate = new Date(Math.min.apply(null, dates));
            // Adjust for timezone to get correct YYYY-MM-DD
            const userTimezoneOffset = minDate.getTimezoneOffset() * 60000;
            const adjustedDate = new Date(minDate.getTime() + userTimezoneOffset);
            setReportStartDate(adjustedDate.toISOString().split('T')[0]);
        }
    }, [invoices]);

    const fetchInvoices = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/invoices');
            // Sort by date descending
            const sortedInvoices = res.data.sort((a, b) => new Date(b.date) - new Date(a.date));
            setInvoices(sortedInvoices);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            setToast({ message: 'Error al cargar facturas', type: 'error' });
        }
    };

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    const formatPeriod = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        // Fix timezone offset to prevent day shift
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(date.getTime() + userTimezoneOffset);

        const month = adjustedDate.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
        const year = adjustedDate.getFullYear();
        // Capitalize first letter (dic -> Dic)
        const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
        return `${capitalizedMonth}-${year}`;
    };

    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const newFiles = Array.from(e.dataTransfer.files).filter(file => file.type === "application/pdf");
            if (newFiles.length > 0) {
                setFiles(prev => [...prev, ...newFiles]);
            } else {
                showToast("Solo se permiten archivos PDF", "error");
            }
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (files.length === 0) return;

        const formData = new FormData();
        files.forEach(file => {
            formData.append('invoices', file);
        });

        setLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/invoices/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const msg = response.data.message || 'Carga completa.';
            const stats = response.data.stats;
            if (stats && stats.errors > 0) {
                showToast(msg, 'error');
            } else if (stats && stats.duplicates > 0 && stats.success === 0) {
                showToast(msg, 'info');
            } else {
                showToast(msg, 'success');
            }

            fetchInvoices();
            setFiles([]);
            const fileInput = document.getElementById('fileInput');
            if (fileInput) fileInput.value = '';
        } catch (error) {
            console.error('Upload error:', error);
            const msg = error.response?.data?.message || 'Subida fallida';
            showToast(`Error: ${msg}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteInvoice = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar esta factura?')) return;

        try {
            await axios.delete(`http://localhost:5000/api/invoices/${id}`);
            showToast('Factura eliminada', 'success');
            fetchInvoices();
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Error al eliminar factura', 'error');
        }
    };

    // Filter logic
    const todaysInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.createdAt);
        const today = new Date();
        return invDate.getDate() === today.getDate() &&
            invDate.getMonth() === today.getMonth() &&
            invDate.getFullYear() === today.getFullYear();
    });

    // --- Search & Pagination Logic ---

    // 1. Filter
    const filteredInvoices = invoices.filter(inv => {
        const term = searchTerm.toLowerCase();
        const number = inv.invoiceNumber?.toLowerCase() || '';
        const client = inv.clientName?.toLowerCase() || '';
        const patient = inv.items?.[0]?.patientName?.toLowerCase() || '';

        return number.includes(term) || client.includes(term) || patient.includes(term);
    });

    // 2. Paginate
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentInvoices = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const renderStatusBadge = (status) => {
        const styles = {
            'Paid': 'bg-green-100 text-green-700 ring-green-600/20',
            'Partial': 'bg-orange-100 text-orange-700 ring-orange-600/20',
            'Pending': 'bg-red-50 text-red-700 ring-red-600/20'
        };
        const labels = {
            'Paid': 'Pagado',
            'Partial': 'Parcial',
            'Pending': 'Pendiente'
        };
        return (
            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${styles[status] || styles['Pending']}`}>
                {labels[status] || 'Pendiente'}
            </span>
        );
    };

    // --- Aging Logic ---
    const getDaysOverdue = (date) => {
        if (!date) return 0;
        const invoiceDate = new Date(date);
        const today = new Date();
        const diffTime = Math.abs(today - invoiceDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const renderAgingBadge = (invoice) => {
        if (invoice.paymentStatus === 'Paid') return null; // Don't show if paid

        const days = getDaysOverdue(invoice.date);

        if (days > 90) {
            return (
                <span className="inline-flex items-center rounded-sm bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-600/10 ml-2" title={`${days} días desde emisión`}>
                    +90d
                </span>
            );
        } else if (days > 60) {
            return (
                <span className="inline-flex items-center rounded-sm bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 ring-1 ring-inset ring-orange-600/10 ml-2" title={`${days} días desde emisión`}>
                    +60d
                </span>
            );
        } else if (days > 30) {
            return (
                <span className="inline-flex items-center rounded-sm bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20 ml-2" title={`${days} días desde emisión`}>
                    +30d
                </span>
            );
        }
        return null;
    };

    const getRowClass = (invoice) => {
        if (invoice.paymentStatus === 'Paid') return 'hover:bg-gray-50';

        const days = getDaysOverdue(invoice.date);

        if (days > 90) return 'bg-red-50 hover:bg-red-100 transition-colors';
        if (days > 60) return 'bg-orange-50 hover:bg-orange-100 transition-colors';
        if (days > 30) return 'bg-yellow-50 hover:bg-yellow-100 transition-colors';

        return 'hover:bg-gray-50 transition-colors';
    };

    // --- Reports Logic ---
    const getFilteredReportsData = () => {
        const start = new Date(reportStartDate);
        const end = new Date(reportEndDate);
        end.setHours(23, 59, 59, 999); // Include full end day

        return invoices.filter(inv => {
            // Use Period if available, otherwise fallback to Emission Date
            const date = new Date(inv.periodFrom || inv.date);

            // Adjust for user timezone offset for comparison
            const userTimezoneOffset = date.getTimezoneOffset() * 60000;
            const adjustedDate = new Date(date.getTime() + userTimezoneOffset);

            const entityMatch = selectedEntity
                ? (inv.clientName || 'Desconocido').trim().toUpperCase() === selectedEntity
                : true;
            return adjustedDate >= start && adjustedDate <= end && entityMatch;
        });
    };

    const reportData = getFilteredReportsData();

    // Unique Entities for Dropdown
    const uniqueEntities = [...new Set(invoices.map(inv =>
        (inv.clientName || 'Desconocido').trim().toUpperCase()
    ))].sort();

    // KPIs
    const totalInvoiced = reportData.reduce((sum, inv) => sum + inv.total, 0);
    const totalPending = reportData.reduce((sum, inv) => sum + (inv.balance ?? inv.total), 0);
    const totalCollected = totalInvoiced - totalPending;
    const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

    // Monthly Evolution Data
    // Monthly Evolution Data
    const monthlyData = Object.values(reportData.reduce((acc, inv) => {
        // Use Period if available
        const dateStr = inv.periodFrom || inv.date;
        if (!dateStr) return acc;

        const date = new Date(dateStr);
        // Fix timezone
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(date.getTime() + userTimezoneOffset);

        const key = `${adjustedDate.getFullYear()}-${String(adjustedDate.getMonth() + 1).padStart(2, '0')}`;
        const monthName = adjustedDate.toLocaleString('es-AR', { month: 'short', year: 'numeric' });

        if (!acc[key]) {
            acc[key] = { name: monthName, rawDate: key, Facturado: 0, Cobrado: 0, Pendiente: 0 };
        }

        const pending = inv.balance ?? inv.total;
        const collected = inv.total - pending;

        acc[key].Facturado += inv.total;
        acc[key].Cobrado += collected;
        acc[key].Pendiente += pending;

        return acc;
    }, {})).sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    // Entity Breakdown
    const entityStats = Object.values(reportData.reduce((acc, inv) => {
        // Normalize name group distinct variants (e.g. "Osde" == "OSDE")
        // Ensuring PARTICULAR is grouped as one entity
        const name = (inv.clientName || 'Desconocido').trim().toUpperCase();

        if (!acc[name]) {
            acc[name] = { name, total: 0, pending: 0, count: 0 };
        }
        acc[name].total += inv.total;
        acc[name].pending += (inv.balance ?? inv.total);
        acc[name].count += 1;
        return acc;
    }, {})).sort((a, b) => b.total - a.total);

    const handleExportEntityReport = () => {
        const formatMoney = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const userTimezoneOffset = date.getTimezoneOffset() * 60000;
            const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
            return adjustedDate.toLocaleDateString('es-AR');
        };

        // --- DETAILED VIEW LOGIC ---
        if (selectedEntity && isDetailedView) {
            const detailedColumns = [
                { header: 'Período', dataKey: 'date' },
                { header: 'Comprobante', dataKey: 'invoice' },
                { header: 'Paciente', dataKey: 'patient' },
                { header: 'Total', dataKey: 'total' },
                { header: 'Cobrado', dataKey: 'paid' },
                { header: 'Saldo', dataKey: 'pending' },
            ];

            const filteredDetails = reportData; // reportData is already filtered by entity & date

            const detailedData = filteredDetails.map(inv => ({
                date: formatPeriod(inv.periodFrom || inv.date),
                invoice: `${inv.invoiceNumber} (${inv.tipo})`,
                patient: (inv.items?.[0]?.patientName || '-').toUpperCase(),
                total: formatMoney(inv.total),
                paid: formatMoney(inv.payments?.reduce((s, p) => s + p.amount, 0) || 0),
                pending: formatMoney(inv.balance ?? inv.total)
            }));

            const detailedTotals = filteredDetails.reduce((acc, inv) => {
                const paid = inv.payments?.reduce((s, p) => s + p.amount, 0) || 0;
                return {
                    total: acc.total + inv.total,
                    paid: acc.paid + paid,
                    pending: acc.pending + (inv.balance ?? inv.total)
                };
            }, { total: 0, paid: 0, pending: 0 });

            const detailedFooter = [
                'TOTALES',
                '',
                '',
                formatMoney(detailedTotals.total),
                formatMoney(detailedTotals.paid),
                formatMoney(detailedTotals.pending)
            ];

            generatePDF(`Detalle_CtaCte_${selectedEntity.replace(/\s+/g, '_')}`, (doc, startY) => {
                doc.setFontSize(16);
                doc.setTextColor(41, 128, 185);
                doc.setFont('helvetica', 'bold');
                doc.text("DETALLE DE CUENTA CORRIENTE", doc.internal.pageSize.width / 2, startY + 5, { align: 'center' });

                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.setFont('helvetica', 'normal');
                doc.text(`Entidad: ${selectedEntity} | Período: ${formatDate(reportStartDate)} al ${formatDate(reportEndDate)}`, doc.internal.pageSize.width / 2, startY + 11, { align: 'center' });

                doc.setDrawColor(41, 128, 185);
                doc.setLineWidth(0.5);
                doc.line(doc.internal.pageSize.width / 2 - 50, startY + 14, doc.internal.pageSize.width / 2 + 50, startY + 14);

                runAutoTable(doc, {
                    startY: startY + 20,
                    head: [detailedColumns.map(c => c.header)],
                    body: detailedData.map(r => detailedColumns.map(c => r[c.dataKey])),
                    foot: [detailedFooter],
                    theme: 'striped',
                    headStyles: { fillColor: [41, 128, 185], valign: 'middle', halign: 'center', fontSize: 9 },
                    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'right' },
                    styles: { fontSize: 8, valign: 'middle', cellPadding: 2 },
                    columnStyles: {
                        0: { halign: 'center' },
                        1: { halign: 'center' },
                        2: { halign: 'left' },
                        3: { halign: 'right' },
                        4: { halign: 'right', textColor: [0, 128, 0] },
                        5: { halign: 'right', textColor: [200, 0, 0] },
                    },
                    didParseCell: (data) => {
                        if (data.section === 'foot') {
                            if (data.column.index < 3) data.cell.styles.halign = 'center';
                        }
                    }
                });
            });
            return;
        }

        // --- SUMMARY VIEW (Existing Logic) ---
        const columns = [
            { header: 'Entidad', dataKey: 'name' },
            { header: 'Facturas', dataKey: 'count' },
            { header: 'Total', dataKey: 'totalFormatted' },
            { header: 'Cobrado', dataKey: 'paidFormatted' },
            { header: 'Saldo', dataKey: 'pendingFormatted' },
        ];

        const data = entityStats.map(stat => ({
            name: stat.name,
            count: stat.count,
            totalFormatted: formatMoney(stat.total),
            paidFormatted: formatMoney(stat.total - stat.pending),
            pendingFormatted: formatMoney(stat.pending),
        }));

        // Calculate Totals
        const totals = entityStats.reduce((acc, curr) => ({
            count: acc.count + curr.count,
            total: acc.total + curr.total,
            paid: acc.paid + (curr.total - curr.pending),
            pending: acc.pending + curr.pending
        }), { count: 0, total: 0, paid: 0, pending: 0 });

        const footer = [
            'TOTALES',
            totals.count,
            formatMoney(totals.total),
            formatMoney(totals.paid),
            formatMoney(totals.pending)
        ];

        generatePDF('Reporte_Estado_Cuenta_Entidad', (doc, startY) => {
            // Creative Title
            doc.setFontSize(16);
            doc.setTextColor(41, 128, 185); // Professional Blue
            doc.setFont('helvetica', 'bold');
            doc.text("ESTADO DE CUENTA POR ENTIDAD", doc.internal.pageSize.width / 2, startY + 5, { align: 'center' });

            // Subtitle with Date Period and Entity
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.setFont('helvetica', 'normal');
            let periodStr = `Período: ${formatDate(reportStartDate)} al ${formatDate(reportEndDate)}`;
            if (selectedEntity) {
                periodStr += ` | Entidad: ${selectedEntity}`;
            }
            doc.text(periodStr, doc.internal.pageSize.width / 2, startY + 11, { align: 'center' });

            // Underline
            doc.setDrawColor(41, 128, 185);
            doc.setLineWidth(0.5);
            doc.line(doc.internal.pageSize.width / 2 - 45, startY + 14, doc.internal.pageSize.width / 2 + 45, startY + 14);

            runAutoTable(doc, {
                startY: startY + 20,
                head: [columns.map(col => col.header)],
                body: data.map(row => columns.map(col => row[col.dataKey])),
                foot: [footer], // Add Footer with Totals
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185], valign: 'middle', halign: 'center', fontSize: 10, fontStyle: 'bold' },
                footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'right' },
                styles: { fontSize: 9, valign: 'middle', cellPadding: 3 },
                columnStyles: {
                    0: { halign: 'left', fontStyle: 'bold' }, // Entity Name
                    1: { halign: 'center' }, // Count
                    2: { halign: 'right' }, // Total
                    3: { halign: 'right', textColor: [0, 128, 0] }, // Paid (Green text for clarity)
                    4: { halign: 'right', textColor: [200, 0, 0] }, // Pending (Red text for clarity)
                },
                // Custom alignment for footer columns to match body
                didParseCell: (data) => {
                    if (data.section === 'foot') {
                        if (data.column.index === 0) data.cell.styles.halign = 'left';
                        if (data.column.index === 1) data.cell.styles.halign = 'center';
                    }
                }
            });
        });
    };

    const handleExportPaymentHistory = () => {
        const columns = [
            { header: 'Emisión', dataKey: 'date' },
            { header: 'Paciente', dataKey: 'patient' },
            { header: 'Entidad', dataKey: 'entity' },
            { header: 'Comprobante', dataKey: 'invoice' },
            { header: 'Total', dataKey: 'total' },
            { header: 'Pagado', dataKey: 'paid' },
            { header: 'Saldo', dataKey: 'balance' },
            { header: 'Estado', dataKey: 'status' },
        ];

        const data = currentInvoices.map(inv => ({
            date: new Date(inv.date).toLocaleDateString(),
            patient: (inv.items?.[0]?.patientName || '-').toUpperCase(),
            entity: (inv.clientName || 'Desconocido').toUpperCase(),
            invoice: `${inv.invoiceNumber} (${inv.tipo})`,
            total: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(inv.total),
            paid: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(inv.payments?.reduce((sum, p) => sum + p.amount, 0) || 0),
            balance: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(inv.balance ?? inv.total),
            status: inv.paymentStatus === 'Paid' ? 'PAGADO' : (inv.paymentStatus === 'Partial' ? 'PARCIAL' : 'PENDIENTE')
        }));

        generatePDF('Reporte de Historial de Pagos', (doc, startY) => {
            runAutoTable(doc, {
                startY: startY,
                head: [columns.map(col => col.header)],
                body: data.map(row => columns.map(col => row[col.dataKey])),
                theme: 'striped',
                headStyles: { fillColor: [66, 139, 202], valign: 'middle', halign: 'center' },
                styles: { fontSize: 8, valign: 'middle', cellPadding: 2 }, // Smaller font for more columns
                columnStyles: {
                    0: { halign: 'center' }, // Date
                    1: { halign: 'left' },   // Patient
                    2: { halign: 'left' },   // Entity
                    3: { halign: 'center' }, // Invoice
                    4: { halign: 'right' },  // Total
                    5: { halign: 'right' },  // Paid
                    6: { halign: 'right' },  // Balance
                    7: { halign: 'center' }, // Status
                },
            });
        }, 'landscape'); // Landscape for better fit
    };

    return (
        <div className="p-6 w-full max-w-[95%] mx-auto">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {selectedInvoice && (
                <PaymentModal
                    invoice={selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                    onUpdate={fetchInvoices}
                />
            )}

            {showManualModal && (
                <ManualInvoiceModal
                    invoices={invoices}
                    onClose={() => setShowManualModal(false)}
                    onSuccess={() => {
                        fetchInvoices();
                        showToast('Factura creada manualmente', 'success');
                    }}
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Facturación</h1>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 rounded-xl bg-gray-100 p-1 mb-8 w-fit">
                <button
                    onClick={() => setActiveTab('uploads')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium leading-5 rounded-lg transition-all
                        ${activeTab === 'uploads'
                            ? 'bg-white text-blue-700 shadow'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/[0.12]'
                        }`}
                >
                    <UploadCloud className="w-4 h-4" />
                    Carga y Revisión
                </button>
                <button
                    onClick={() => setActiveTab('payments')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium leading-5 rounded-lg transition-all
                        ${activeTab === 'payments'
                            ? 'bg-white text-blue-700 shadow'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/[0.12]'
                        }`}
                >
                    <Wallet className="w-4 h-4" />
                    Seguimiento de Pagos
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium leading-5 rounded-lg transition-all
                        ${activeTab === 'reports'
                            ? 'bg-white text-blue-700 shadow'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/[0.12]'
                        }`}
                >
                    <BarChart3 className="w-4 h-4" />
                    Reportes y Estadísticas
                </button>
            </div>

            {activeTab === 'uploads' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Upload Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-10">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-700">Subir Nuevas Facturas</h2>
                            <button
                                onClick={() => setShowManualModal(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Carga Manual
                            </button>
                        </div>
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Dropzone Area */}
                            <div className="flex-1">
                                <label
                                    htmlFor="fileInput"
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors
                                        ${dragActive ? 'bg-blue-100 border-blue-500 scale-[1.02]' : loading ? 'bg-gray-50 border-gray-300' : 'border-blue-300 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400'}
                                    `}
                                >
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <div className="p-3 bg-blue-100 rounded-full mb-3 text-blue-600">
                                            <UploadCloud className="w-8 h-8" />
                                        </div>
                                        <p className="mb-2 text-sm text-gray-600 font-medium">
                                            <span className="font-semibold text-blue-600">Haz clic para subir</span> o arrastra y suelta
                                        </p>
                                        <p className="text-xs text-gray-400">PDF (Facturas Electrónicas)</p>
                                    </div>
                                    <input
                                        id="fileInput"
                                        type="file"
                                        accept=".pdf"
                                        multiple
                                        onChange={handleFileChange}
                                        className="hidden"
                                        disabled={loading}
                                    />
                                </label>
                            </div>

                            {/* File List & Action */}
                            <div className="flex-1 flex flex-col">
                                <div className="flex-1 bg-gray-50 rounded-xl p-4 mb-4 overflow-y-auto max-h-48 border border-gray-100">
                                    {files.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                                            <FileText className="w-8 h-8 mb-2 opacity-50" />
                                            <p>No hay archivos seleccionados</p>
                                        </div>
                                    ) : (
                                        <ul className="space-y-2">
                                            {files.map((file, index) => (
                                                <li key={index} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200 text-sm shadow-sm group">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="bg-red-50 p-1.5 rounded text-red-500">
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <span className="truncate text-gray-700 font-medium">{file.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => removeFile(index)}
                                                        className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                                                        disabled={loading}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <button
                                    onClick={handleUpload}
                                    disabled={files.length === 0 || loading}
                                    className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all shadow-sm
                                        ${files.length === 0 || loading
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-[0.98]'
                                        }
                                    `}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Procesando {files.length} archivo(s)...
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className="w-5 h-5" />
                                            Subir {files.length > 0 ? `${files.length} Facturas` : ''}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Today's Invoices List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-semibold text-gray-700">Cargadas Hoy</h3>
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                                Cantidad: {todaysInvoices.length}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr className="text-center">
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Emisión</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Comprobante</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Receptor</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Paciente</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {todaysInvoices.map((inv) => (
                                        <tr key={inv._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-center">
                                                {new Date(inv.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                                                {inv.invoiceNumber}
                                                <div className="text-xs text-blue-500 font-medium">{inv.tipo}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-medium text-gray-900">{inv.clientName.toUpperCase()}</span>
                                                    <span className="text-xs text-gray-400 font-mono mt-0.5">CUIT: {inv.clientCuit || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                                <div className="flex flex-col items-center">
                                                    {inv.items && inv.items.length > 0 && inv.items[0].patientName ? (
                                                        <>
                                                            <span className="font-medium text-gray-900">{inv.items[0].patientName.toUpperCase()}</span>
                                                            <span className="text-xs text-gray-500 font-mono mt-0.5">
                                                                DNI: {inv.items[0].patientDNI || '-'}
                                                                {inv.items[0].affiliateNumber ? ` - Af: ${inv.items[0].affiliateNumber}` : ''}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-900">
                                                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(inv.total)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                <button
                                                    onClick={() => handleDeleteInvoice(inv._id)}
                                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"
                                                    title="Eliminar Factura"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {todaysInvoices.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                                <div className="flex flex-col items-center">
                                                    <FileText className="w-12 h-12 mb-3 opacity-20" />
                                                    <p className="text-lg font-medium">No se han cargado facturas hoy</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'payments' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

                        {/* Header & Search */}
                        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50/50 gap-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <h3 className="font-semibold text-gray-700">Historial de Pagos</h3>
                                {/* Aging Legend */}
                                <div className="flex items-center gap-3 text-xs bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                    <span className="text-gray-400 font-medium mr-1">Referencias:</span>
                                    <div className="flex items-center gap-1.5" title="Mayor a 30 días">
                                        <div className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-200"></div>
                                        <span className="text-gray-600">+30d</span>
                                    </div>
                                    <div className="flex items-center gap-1.5" title="Mayor a 60 días">
                                        <div className="w-3 h-3 rounded-full bg-orange-100 border border-orange-200"></div>
                                        <span className="text-gray-600">+60d</span>
                                    </div>
                                    <div className="flex items-center gap-1.5" title="Mayor a 90 días">
                                        <div className="w-3 h-3 rounded-full bg-red-100 border border-red-200"></div>
                                        <span className="text-gray-600">+90d</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={handleExportPaymentHistory}
                                        className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium w-full sm:w-auto justify-center"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Exportar PDF
                                    </button>
                                    <div className="relative flex-1 sm:flex-none">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            className="block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                                            placeholder="Buscar (N°, Entidad, Paciente)..."
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                setCurrentPage(1); // Reset to page 1 on search
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr className="text-center">
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Período</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Paciente</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entidad</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Comprobante</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pagado</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Saldo</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {currentInvoices.length > 0 ? (
                                        currentInvoices.map((inv) => (
                                            <tr key={inv._id} className={getRowClass(inv)}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-medium capitalize">
                                                    {formatPeriod(inv.periodFrom || inv.date)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                                    <span className="font-medium text-gray-900 truncate max-w-[150px] block mx-auto">
                                                        {inv.items?.[0]?.patientName || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                    <span className="truncate max-w-[150px] block mx-auto">{inv.clientName}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                    {inv.invoiceNumber}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-900">
                                                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(inv.total)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-green-600">
                                                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(inv.total - (inv.balance ?? inv.total))}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-red-500">
                                                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(inv.balance ?? inv.total)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                    {renderStatusBadge(inv.paymentStatus || 'Pending')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                    {inv.paymentStatus === 'Paid' ? (
                                                        <button
                                                            onClick={() => setSelectedInvoice(inv)}
                                                            className="inline-flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            Ver Detalle
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setSelectedInvoice(inv)}
                                                            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                                        >
                                                            <DollarSign className="w-4 h-4" />
                                                            Pagar
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="9" className="px-6 py-10 text-center text-gray-400">
                                                No se encontraron facturas
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {filteredInvoices.length > itemsPerPage && (
                            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a <span className="font-medium">{Math.min(indexOfLastItem, filteredInvoices.length)}</span> de <span className="font-medium">{filteredInvoices.length}</span> resultados
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                            <button
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <span className="sr-only">Anterior</span>
                                                &larr;
                                            </button>
                                            {[...Array(totalPages)].map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handlePageChange(i + 1)}
                                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                                                    ${currentPage === i + 1
                                                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <span className="sr-only">Siguiente</span>
                                                &rarr;
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )
            }

            {
                activeTab === 'reports' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">

                        {/* Filters */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Período:</span>
                            </div>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="date"
                                    value={reportStartDate}
                                    onChange={(e) => setReportStartDate(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="date"
                                    value={reportEndDate}
                                    onChange={(e) => setReportEndDate(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="h-6 w-px bg-gray-200 mx-2"></div>
                                <select
                                    value={selectedEntity}
                                    onChange={(e) => setSelectedEntity(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value="">Todas las Entidades</option>
                                    {uniqueEntities.map((entity, idx) => (
                                        <option key={idx} value={entity}>{entity}</option>
                                    ))}
                                </select>
                                {selectedEntity && (
                                    <label className="flex items-center gap-2 ml-2 cursor-pointer bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200">
                                        <input
                                            type="checkbox"
                                            checked={isDetailedView}
                                            onChange={(e) => setIsDetailedView(e.target.checked)}
                                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                        />
                                        <span className="text-sm text-gray-700 font-medium">Vista Detallada</span>
                                    </label>
                                )}
                            </div>
                            <div className="ml-auto">
                                <button
                                    onClick={handleExportEntityReport}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium text-sm"
                                >
                                    <FileText className="w-4 h-4" />
                                    Exportar PDF
                                </button>
                            </div>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-gray-500 text-sm font-medium">Total Facturado</h3>
                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(totalInvoiced)}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{reportData.length} facturas en total</p>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-gray-500 text-sm font-medium">Cobrado</h3>
                                    <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-green-600">
                                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(totalCollected)}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {collectionRate.toFixed(1)}% del total facturado
                                </p>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-gray-500 text-sm font-medium">Pendiente de Cobro</h3>
                                    <div className="p-2 bg-red-50 rounded-lg text-red-600">
                                        <TrendingDown className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-red-600">
                                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(totalPending)}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {(100 - collectionRate).toFixed(1)}% pendiente
                                </p>
                            </div>
                        </div>

                        {/* Entity Breakdown Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="text-lg font-extrabold uppercase tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
                                    Estado de Cuenta por Entidad
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Entidad</th>
                                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Facturas</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Facturado</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cobrado</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Saldo Pendiente</th>
                                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Progreso</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {entityStats.length > 0 ? (
                                            entityStats.map((stat, idx) => {
                                                const paid = stat.total - stat.pending;
                                                const progress = stat.total > 0 ? (paid / stat.total) * 100 : 0;
                                                return (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stat.name}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{stat.count}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(stat.total)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">
                                                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(paid)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right font-bold">
                                                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(stat.pending)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-[100px] mx-auto overflow-hidden">
                                                                <div
                                                                    className={`h-2.5 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                                    style={{ width: `${progress}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-xs text-gray-500 mt-1 inline-block">{progress.toFixed(0)}%</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-10 text-center text-gray-400">
                                                    No hay datos para el período seleccionado
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Monthly Evolution Chart */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                            <h3 className="font-semibold text-gray-700 mb-6">Evolución Mensual (Facturado vs Cobrado)</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis // Modified
                                            dataKey="name"
                                            stroke="#9CA3AF"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#9CA3AF"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `$${value}`}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#F3F4F6' }}
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar dataKey="Facturado" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                        <Bar dataKey="Cobrado" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default BillingPage;
