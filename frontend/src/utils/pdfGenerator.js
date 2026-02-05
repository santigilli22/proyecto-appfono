import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Ensure plugin is applied
// Depending on version, autoTable might be the plugin function itself or include applyPlugin
try {
    if (typeof autoTable === 'function') {
        // Some versions export the function directly
    }
} catch (e) {
    console.error(e);
}

// Explicit usage helper if doc.autoTable fails
export const runAutoTable = (doc, options) => {
    if (doc.autoTable) {
        doc.autoTable(options);
    } else {
        autoTable(doc, options);
    }
};

// --- Configuration Data ---
const config = {
    professionalName: "Lic. Gaviglio Lucía Vanesa",
    professionalTitle: "Fonoaudióloga",
    licenseNumber: "M.P. 9309",
    telephone: "Tel: (3564) 588638",
    email: "Email: fga.gavigliolucia@gmail.com",
    logoUrl: "/logo.webp" || "/logo.png",
    colors: {
        primaryDark: [80, 60, 60],
        accentPink: [225, 150, 150],
        textGray: [100, 100, 100]
    }
};

/**
 * Renders the header on the current page
 */
const drawHeader = (doc, width, height, margin) => {
    // Logo (Left side)
    const logoWidth = 60;
    const logoHeight = 35;

    try {
        // Draw white background for logo area
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, 10, logoWidth, logoHeight, 'F');
        doc.addImage(config.logoUrl, 'WEBP', margin, 12, logoWidth, logoHeight, undefined, 'FAST');
    } catch (e) {
        console.warn("Logo lookup failed", e);
    }

    // Professional Info (Right side)
    const infoStartX = margin + logoWidth + 5;
    const infoEndX = width - margin;
    const infoWidth = infoEndX - infoStartX;
    const infoCenter = infoStartX + (infoWidth / 2);

    // Name (Centered in the info text area)
    doc.setTextColor(...config.colors.primaryDark);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(config.professionalName.toUpperCase(), infoCenter, 20, { align: 'center' });

    // Decorative Accent Line under Name
    doc.setDrawColor(...config.colors.accentPink);
    doc.setLineWidth(0.5);
    doc.line(infoCenter - 30, 23, infoCenter + 30, 23);

    // Columns Configuration
    const col1X = infoStartX + 15;
    const col2X = infoCenter - 5;

    const contentY = 30;

    // --- Column 1: Professional Details ---
    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...config.colors.accentPink);
    doc.text(config.professionalTitle, col1X, contentY);

    // License (Pill effect)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...config.colors.textGray);

    const licenseWidth = doc.getTextWidth(config.licenseNumber) + 6;
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(col1X, contentY + 2, licenseWidth, 5, 1, 1, 'FD');
    doc.text(config.licenseNumber, col1X + 3, contentY + 5.5);

    // --- Column 2: Contact Info ---
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);

    // Telephone
    doc.setFillColor(...config.colors.accentPink);
    doc.circle(col2X, contentY - 1, 1, 'F');
    doc.text(config.telephone, col2X + 3, contentY);

    // Email
    doc.circle(col2X, contentY + 5, 1, 'F');
    doc.text(config.email, col2X + 3, contentY + 6);

    // Date
    const dateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...config.colors.textGray);
    doc.text(`Generado: ${dateStr}`, width - margin, 50, { align: 'right' });

    // Main Divider Line (Bottom of header)
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, 55, width - margin, 55);
};

/**
 * Renders the footer on all pages
 */
const drawFooter = (doc, width, height) => {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, width / 2, height - 10, { align: 'center' });
    }
};

/**
 * Generates a PDF document with a standardized header.
 * 
 * @param {string} title - The title of the report (e.g., "Reporte de Deudas").
 * @param {Function} contentCallback - Function to render the main content (tables, text, etc.).
 * @param {string} orientation - 'portrait' or 'landscape'.
 */
export const generatePDF = (title, contentCallback, orientation = 'portrait') => {
    const doc = new jsPDF(orientation, 'mm', 'a4');

    // --- Configuration ---
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;

    // Initialize Header on First Page
    drawHeader(doc, pageWidth, pageHeight, margin);

    // --- Main Content ---
    if (contentCallback) {
        // Start content below header (approx Y=60)
        contentCallback(doc, 60);
    }

    // --- Footer (Simple Page Number) ---
    drawFooter(doc, pageWidth, pageHeight);

    // Output
    doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
};
