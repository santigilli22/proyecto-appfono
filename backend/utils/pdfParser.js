const pdf = require('pdf-parse');
const fs = require('fs');

const parseAfipInvoice = async (filePath) => {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        const text = data.text;

        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

        const findLineIndex = (keywords) => {
            const regex = new RegExp(keywords, 'i');
            return lines.findIndex(l => regex.test(l));
        };

        const scanForValue = (startIndex, lineCount, regex) => {
            if (startIndex === -1) return null;
            const end = Math.min(startIndex + lineCount, lines.length);
            for (let i = startIndex; i < end; i++) {
                const match = lines[i].match(regex);
                if (match) return match[1];
            }
            return null;
        };

        // 1. Date
        const dateRegex = /(\d{2}\/\d{2}\/\d{4})/;
        let dateStr = null;
        for (const line of lines) {
            const m = line.match(dateRegex);
            if (m) {
                dateStr = m[1];
                break;
            }
        }
        const parseDate = (d) => {
            const [day, month, year] = d.split('/');
            return new Date(year, month - 1, day);
        };
        const date = dateStr ? parseDate(dateStr) : new Date();

        // 2. Invoice Number
        const invoiceRegex = /(\d{4,5}-\d{8})/;
        let invoiceNumber = 'Unknown';
        for (const line of lines) {
            const m = line.match(invoiceRegex);
            if (m) {
                invoiceNumber = m[1];
                break;
            }
        }
        if (invoiceNumber === 'Unknown') {
            const ptoVentaIdx = findLineIndex('Punto de Venta');
            const compNroIdx = findLineIndex('Comp\\. Nro');
            const ptoVal = scanForValue(ptoVentaIdx, 3, /(\d+)(?!.*\d{4}\/)/);
            const compVal = scanForValue(compNroIdx, 3, /(\d+)(?!.*\d{4}\/)/);
            if (ptoVal && compVal) {
                invoiceNumber = `${ptoVal.padStart(5, '0')}-${compVal.padStart(8, '0')}`;
            }
        }

        // 3. CUIT
        const cuitRegex = /(\d{2}-\d{8}-\d{1})/;
        const allCuits = [];
        lines.forEach(l => {
            const matches = [...l.matchAll(new RegExp(cuitRegex, 'g'))];
            matches.forEach(m => allCuits.push(m[1]));
        });
        const startCuit = '27426394923';
        const validCuits = allCuits.filter(c => c.replace(/-/g, '') !== startCuit && c !== startCuit);
        const clientCuit = validCuits.length > 0 ? validCuits[0] : '';


        // 4. Client Name (Refined)
        // Match line with "Razon Social" or "Apellido y Nombre"
        let clientIndex = findLineIndex('Apellido y Nombre|Raz.n Social|Se.or');
        let clientName = '';
        if (clientIndex !== -1) {
            let line = lines[clientIndex];
            // Aggressive replace of the label block
            // e.g. "Apellido y Nombre / Razón Social: Juan" -> "Juan"
            line = line.replace(/^(.*?)(Apellido|Nombre|Raz.n Social|Se.or|Cliente)+.*[:\.\s]/i, '').trim();

            if (line.length > 2) {
                clientName = line;
            } else if (lines[clientIndex + 1]) {
                clientName = lines[clientIndex + 1];
            }
            clientName = clientName.split(/Condic|Domici|CUIT|IVA|Dni/i)[0].trim();
        }
        if (clientName.match(/^\d/) || clientName.length < 2) clientName = 'Unknown';


        // 5. Condición IVA
        let ivaIndex = findLineIndex('Condici.n frente al IVA');
        let condicionIva = 'Unknown';
        if (ivaIndex !== -1) {
            let line = lines[ivaIndex].replace(/Condici.n frente al IVA[:\.\s]*/i, '').trim();
            if (line.length > 3) {
                condicionIva = line;
            } else if (lines[ivaIndex + 1]) {
                condicionIva = lines[ivaIndex + 1];
            }
            condicionIva = condicionIva.split(/Domin|CUIT|Nota/i)[0].trim();
        }


        // 6. Importe Total (Max Value Heuristic)
        let total = 0;

        // Strategy A: Context Scan
        let totalIndex = findLineIndex('Importe Total|Total Facturado');
        if (totalIndex === -1) totalIndex = findLineIndex('Total');

        if (totalIndex !== -1) {
            const endScan = Math.min(totalIndex + 10, lines.length);
            for (let i = totalIndex; i < endScan; i++) {
                const line = lines[i];
                if (line.includes('/')) continue;
                // Matches currency X.XXX,XX or X,XX
                const strictMatch = line.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
                if (strictMatch) {
                    const clean = strictMatch[1].replace(/\./g, '').replace(',', '.');
                    const val = parseFloat(clean);
                    if (!isNaN(val) && val > 0) {
                        total = val;
                        break;
                    }
                }
            }
        }

        // Strategy B: Largest Number in Last 20 lines (Backup)
        if (total === 0) {
            const endLines = lines.slice(-20);
            let maxVal = 0;
            endLines.forEach(l => {
                if (l.includes('/')) return; // ignore dates
                // Find all currency-like matches in line
                const matches = [...l.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2})/g)];
                matches.forEach(m => {
                    const clean = m[1].replace(/\./g, '').replace(',', '.');
                    const val = parseFloat(clean);
                    if (val > maxVal) maxVal = val;
                });
            });
            // Also check for "100.00" format just in case (dots as decimal)
            // But usually AFIP is comma. stick to comma.
            if (maxVal > 0) total = maxVal;
        }


        // 7. CAE
        const caeRegex = /(\d{14})/;
        let cae = '';
        for (const line of lines) {
            const m = line.match(caeRegex);
            if (m) {
                cae = m[1];
                break;
            }
        }

        // Subtotal
        let subIndex = findLineIndex('Importe Neto Gravado|Subtotal');
        let subtotal = 0;
        if (subIndex !== -1) {
            const foundStr = scanForValue(subIndex, 5, /(\d{1,3}(?:\.\d{3})*,\d{2})/);
            if (foundStr) {
                const clean = foundStr.replace(/\./g, '').replace(',', '.');
                subtotal = parseFloat(clean);
            }
        }
        if (subtotal === 0 && total > 0) subtotal = total;

        console.log("Parsed Data:", { invoiceNumber, date, clientName, total, subtotal, condicionIva, cae });

        return {
            invoiceNumber,
            date,
            clientName,
            clientCuit,
            total,
            subtotal,
            condicionIva,
            cae
        };

    } catch (error) {
        console.error("Error parsing PDF:", error);
        throw new Error("Failed to parse PDF invoice");
    }
};

module.exports = { parseAfipInvoice };
