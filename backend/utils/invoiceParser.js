const PDFParser = require("pdf2json");

/**
 * Extracts invoice data from a given text content.
 * @param {string} text - Raw text from PDF.
 * @param {string} filename - Original filename (optional).
 * @returns {object} Extracted data fields.
 */
function extractData(text, filename = '') {
    const lines = text.split(/\r\n|\n/);
    const fullText = text;

    let data = {
        filename: filename,
        fechaEmision: '',
        tipo: 'C',
        puntoVenta: '',
        numero: '',
        cuitEmisor: '',
        nombreEmisor: '',
        cuitReceptor: '',
        nombreReceptor: '',
        importeTotal: '',
        cae: '',
        periodFrom: null,
        periodTo: null
    };

    // 1. Punto de Venta y Numero
    const pvMatch = /Punto de Venta:\s*Comp\. Nro:(\d+)\s+(\d+)/.exec(fullText);
    if (pvMatch) {
        data.puntoVenta = pvMatch[1];
        data.numero = pvMatch[2];
    }

    // 2. CUIT Receptor & Emisor
    const cuitMatches = [...fullText.matchAll(/CUIT:\s*(\d{11})/g)];
    if (cuitMatches.length > 0) {
        const receptorCuit = cuitMatches.find(m => true);
        if (receptorCuit) data.cuitReceptor = receptorCuit[1];
    }

    // Fallback for Emisor CUIT
    const allNumbers = fullText.match(/\b(20|23|24|27|30|33|34)\d{9}\b/g);
    if (allNumbers && allNumbers.length > 0) {
        data.cuitEmisor = allNumbers[0];
        if (allNumbers.length > 1 && allNumbers[0] === data.cuitReceptor) {
            data.cuitEmisor = allNumbers[1];
        }
    }

    // 3. Importe Total
    // Use rigid "Importe Total" to avoid matching "VALOR TOTAL" in descriptions
    const totalMatch = /Importe Total[:\s]*\$\s*(\d+[,.]\d+)/i.exec(fullText);
    if (totalMatch) {
        data.importeTotal = totalMatch[1].replace(',', '.');
    } else {
        const totalLabelIndex = lines.findIndex(l => l.includes("Importe Total:"));
        if (totalLabelIndex !== -1) {
            for (let i = 1; i <= 5; i++) {
                if (totalLabelIndex - i >= 0) {
                    const candidate = lines[totalLabelIndex - i].trim();
                    if (/^\d+[,.]\d+$/.test(candidate)) {
                        data.importeTotal = candidate.replace(',', '.');
                        break;
                    }
                }
            }
        }
    }

    // 4. Nombre Emisor
    if (lines.length > 2) {
        data.nombreEmisor = lines[2].trim();
    }

    // 5. Nombre Receptor
    const emisorCuitIndex = lines.findIndex(l => l.trim().includes(data.cuitEmisor));
    let startIndex = -1;
    if (emisorCuitIndex !== -1) {
        startIndex = emisorCuitIndex + 1;
    } else {
        const dateLineIndex = lines.findIndex(l => /\d{2}\/\d{2}\/\d{4}/.test(l));
        if (dateLineIndex !== -1) {
            startIndex = dateLineIndex + 1;
            if (lines[startIndex] && /\d{11}/.test(lines[startIndex])) {
                startIndex++;
            }
        }
    }

    if (startIndex !== -1) {
        let nameParts = [];
        for (let i = 0; i < 5; i++) {
            if (startIndex + i >= lines.length) break;

            const line = lines[startIndex + i].trim();
            if (!line) continue;

            const isAddress = /\d{3,}/.test(line) || / - /.test(line) || line.toLowerCase().startsWith("domicilio");
            if (isAddress) break;
            if (line.includes("CUIT:") || line.includes("Condición")) break;

            nameParts.push(line);
        }

        if (nameParts.length > 0) {
            data.nombreReceptor = nameParts.join(" ");
        }
    }

    // 6. Service Period (Período Facturado)
    const periodLabelIndex = lines.findIndex(l => l.includes("Período Facturado Desde"));

    if (periodLabelIndex !== -1) {
        let collectedDates = [];
        for (let i = 0; i <= 10; i++) {
            if (periodLabelIndex + i >= lines.length) break;
            const line = lines[periodLabelIndex + i];

            // Skip activity start date
            if (line.includes("Inicio de Actividades")) continue;

            const dates = line.match(/(\d{2}\/\d{2}\/\d{4})/g);
            if (dates) {
                collectedDates.push(...dates);
            }
            if (collectedDates.length >= 2) break;
        }

        if (collectedDates.length >= 2) {
            data.periodFrom = collectedDates[0];
            data.periodTo = collectedDates[1];
        }
    }

    const allDates = fullText.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
    let emissionDate = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i > 50) break;

        const dates = line.match(/(\d{2}\/\d{2}\/\d{4})/g);
        if (dates) {
            let isPeriodLine = false;
            // Widen range to 10
            if (periodLabelIndex !== -1 && i >= periodLabelIndex && i <= periodLabelIndex + 10) {
                if (dates.length >= 2) isPeriodLine = true;
            }
            // Exclude activity start date
            if (line.includes("Inicio de Actividades") || (i > 0 && lines[i - 1].includes("Inicio de Actividades"))) {
                continue;
            }

            if (!isPeriodLine) {
                emissionDate = dates[0];
                break;
            }
        }
    }

    if (emissionDate) {
        data.fechaEmision = emissionDate;
    } else if (allDates.length > 0) {
        data.fechaEmision = allDates[0];
    }

    // NEW: Condición frente al IVA - Refined Strategy (Proximity)
    // The text layout often separates labels from values or interleaves Emisor/Receptor data.
    // Reliable method: Find all IVA status occurrences and pick the one closest to the Receptor's CUIT.

    const validIvaStatuses = [
        "IVA Responsable Inscripto",
        "Responsable Inscripto",
        "IVA Sujeto Exento",
        "Consumidor Final",
        "Responsable Monotributo",
        "Monotributista",
        "Exento"
    ];

    let statusOccurrences = [];

    // Scan more lines (e.g. first 80) to ensure we catch everything on the first page/header
    const scanLimit = Math.min(lines.length, 80);

    for (let i = 0; i < scanLimit; i++) {
        const line = lines[i];
        for (const status of validIvaStatuses) {
            if (line.includes(status)) {
                // Avoid duplicates on same line if multiple patterns match (e.g. "IVA Responsable Inscripto" contains "Responsable Inscripto")
                // We pick the longest match
                const existing = statusOccurrences.find(o => o.lineIndex === i);
                if (existing) {
                    if (status.length > existing.status.length) {
                        existing.status = status;
                    }
                } else {
                    statusOccurrences.push({ lineIndex: i, status: status, text: line });
                }
            }
        }
    }

    if (statusOccurrences.length > 0) {
        // Find Receptor CUIT Line Index
        let receptorCuitIndex = -1;
        if (data.cuitReceptor) {
            receptorCuitIndex = lines.findIndex((l, index) => index < scanLimit && l.includes(data.cuitReceptor));
        }

        if (receptorCuitIndex !== -1) {
            // Find closest status
            // We verify if the status is "Responsable" something. 
            // Usually Receptor status is "IVA Responsable Inscripto" vs Emisor "Responsable Monotributo".
            // We just pick the closest one.

            let closest = null;
            let minDistance = 9999;

            for (const occ of statusOccurrences) {
                const distance = Math.abs(occ.lineIndex - receptorCuitIndex);
                if (distance < minDistance) {
                    minDistance = distance;
                    closest = occ;
                }
            }

            if (closest) {
                data.condicionIva = closest.status;
            }
        } else {
            // Fallback: If we have multiple, usually the Receptor is the second one or the last one?
            // Or if we have "Responsable Inscripto" and "Monotributo", often the Emisor is Monotributo in these specific invoices?
            // Safe bet: The one that appeared last (usually bottom of header) or just take the first if only one.
            // Actually, looking at the text dump:
            // Line 29: Monotributo (Emisor)
            // Line 30: Inscripto (Receptor)
            // If we took the last one, it would be Inscripto.
            data.condicionIva = statusOccurrences[statusOccurrences.length - 1].status;
        }
    }

    // 7. CAE
    const caeLabelIndex = lines.findIndex(l => l.includes("CAE N°:"));
    if (caeLabelIndex !== -1) {
        for (let i = 0; i < 6; i++) {
            if (caeLabelIndex + i < lines.length) {
                const line = lines[caeLabelIndex + i];
                const match = line.match(/\b(\d{14})\b/);
                if (match) {
                    data.cae = match[1];
                    break;
                }
            }
        }
    }

    // 8. Line Items (Productos / Servicios)
    data.items = [];

    // Strategy: Look for the table header "Código" -> "Producto / Servicio" -> etc.
    // Then scan until we hit "Subtotal" or "Importe Otros Tributos" or "Importe Total"

    const headerIndex = lines.findIndex(l => l.includes("Producto / Servicio") || l.includes("Descripción"));
    console.log(`[Parser] Header Index found: ${headerIndex}`);

    if (headerIndex !== -1) {
        let currentIndex = headerIndex + 1;
        // Skip header continuation lines if any (naive check)
        if (lines[currentIndex] && lines[currentIndex].includes("Cantidad")) currentIndex++;

        // End markers
        const endMarkers = ["Subtotal:", "Importe Otros Tributos:", "Importe Total:", "Comprobante Autorizado"];

        let descriptionBuffer = [];

        while (currentIndex < lines.length) {
            const line = lines[currentIndex].trim();
            if (!line) {
                currentIndex++;
                continue;
            }

            // Stop if we hit an end marker or footer info
            if (endMarkers.some(marker => line.includes(marker))) {
                console.log(`[Parser] Hit end marker at line: "${line}"`);
                break;
            }
            if (line.startsWith("CAE N°:")) break;

            // Debug line
            console.log(`[Parser] Processing line: "${line}"`);

            // Check if this line is a "Transaction Row" (contains prices/totals)
            // Heuristic: looks for currency-like numbers.
            // Exclude CBU/DNI: numbers > 8 digits without decimals usually.
            // We look for patterns like "X,XX" or "X.XX".

            // Regex to find numbers at the end.
            // Requirement: Must have 2 decimals to be considered a price (avoids DNI/integers).
            // Matches: 150784,02 or 1.500,00
            // Regex to find numbers at the end.
            // Requirement: Must have 2 decimals.
            // Removed \b boundaries because pdf2json sometimes merges columns (e.g. "150784,020,00")
            // This is safe because DNI/CBU are usually integers.
            const moneyRegex = /\d+(?:[.,]\d{2})/g;
            const moneyMatches = line.match(moneyRegex);

            // Also check for "unidades" or specific unit keywords as a strong signal
            const isTransactionRow = (moneyMatches && moneyMatches.length >= 1) && (line.includes("unidades") || line.includes("cuota") || moneyMatches.length >= 2);

            if (isTransactionRow) {
                // This is the line with the money.
                // Flush buffer + current line (minus numbers/noise if possible, but keeping it simple for now).

                // Identify the subtotal.
                // Usually the largest number, or the one before the final tax rates.
                // Let's parse all matches to floats.
                const values = moneyMatches.map(m => parseFloat(m.replace(/\./g, '').replace(',', '.')));

                // Filter out likely non-currency values if any slipped through (though regex requires ,XX or .XX)
                const validValues = values.filter(v => v < 1000000000); // Filter out huge numbers if they accidentally matched

                // Find largest value as subtotal candidate
                const subtotal = validValues.length > 0 ? Math.max(...validValues) : 0;

                // Combine buffer
                descriptionBuffer.push(line.replace(moneyRegex, '').trim());

                let fullDescription = descriptionBuffer.join(" ").replace(/\s+/g, ' ').trim();

                // Cleanup trailing "unidades" and numbers that might be left over
                // Example: "... VALOR TOTAL$150784 unidades 16 150"
                fullDescription = fullDescription.replace(/\s*unidades.*$/i, '');

                // Extract Patient Name and DNI
                let patientName = '';
                let patientDNI = '';

                // Regex strategy:
                // Name: "CORRESPONDIENTES A (name)" or just "CORRESPONDIENTES (name)"
                // Matches "CORRESPONDIENTES A EZEQUIEL..." or "CORRESPONDIENTES AITANA..."
                const nameMatch = fullDescription.match(/CORRESPONDIENTES\s+(?:A\s+)?(.*?)(?:\.|,|\s+DNI|\s+AF)/i);
                if (nameMatch) {
                    patientName = nameMatch[1].trim();
                }

                // DNI: "DNI: (digits)" or just digits after DNI
                const dniMatch = fullDescription.match(/DNI[:\s]*(\d+)/i);
                if (dniMatch) {
                    patientDNI = dniMatch[1];
                }

                // Affiliate Number: "AF N°: (digits)" 
                // Matches "AF N°: 2017961752903"
                let affiliateNumber = '';
                const afMatch = fullDescription.match(/AF\s*N°[:\s]*(\d+)/i);
                if (afMatch) {
                    affiliateNumber = afMatch[1];
                }

                console.log(`[Parser] Finalized Item: "${fullDescription}" | Subtotal: ${subtotal} | Patient: ${patientName} | DNI: ${patientDNI} | AF: ${affiliateNumber}`);
                data.items.push({
                    description: fullDescription,
                    subtotal: subtotal,
                    patientName: patientName,
                    patientDNI: patientDNI,
                    affiliateNumber: affiliateNumber
                });

                // Clear buffer for next item
                descriptionBuffer = [];

            } else {
                // This is likely part of the description (e.g. "HONORARIOS", "DNI: ...")
                // Add to buffer in order.
                descriptionBuffer.push(line);
                console.log(`[Parser] Buffered text: "${line}"`);
            }

            currentIndex++;
        }
    } else {
        console.log('[Parser] Item header not found. Items will be empty.');
    }

    return data;
}

/**
 * Parses a PDF file and extracts invoice data.
 * @param {string} filePath - Path to the PDF file.
 * @returns {Promise<object>} Extracted data object.
 */
function parseInvoice(filePath) {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(this, 1);

        pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", pdfData => {
            try {
                const text = pdfParser.getRawTextContent();
                const filename = require('path').basename(filePath);
                const data = extractData(text, filename);
                resolve(data);
            } catch (err) {
                reject(err);
            }
        });

        pdfParser.loadPDF(filePath);
    });
}

module.exports = { parseInvoice };
