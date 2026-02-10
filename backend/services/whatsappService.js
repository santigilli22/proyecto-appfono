const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const BotConfig = require('../models/BotConfig'); // [NEW]
const Patient = require('../models/Patient'); // [NEW]
const Appointment = require('../models/Appointment'); // [NEW]

const BASE_URL = 'http://localhost:5000/api';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

const parseDate = (input) => {
    input = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    const match = input.match(/^(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{4})$/);
    if (match) {
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    }
    return null;
};

const getNextBusinessDays = (daysCount, mode = 'ALL') => {
    const dates = [];
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1); // Start from tomorrow

    while (dates.length < daysCount) {
        const day = currentDate.getDay();
        let isIncluded = false;

        if (mode === 'FRIDAY') {
            if (day === 5) isIncluded = true;
        } else if (mode === 'MON_THU') {
            if (day >= 1 && day <= 4) isIncluded = true;
        } else {
            // ALL (Mon-Fri)
            if (day !== 0 && day !== 6) isIncluded = true;
        }

        if (isIncluded) {
            dates.push(currentDate.toISOString().split('T')[0]);
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
};

// Helper to emit status
const emitStatus = (io) => {
    if (!io) return;
    const state = client.info ? 'CONNECTED' : (qrCodeData ? 'QR_READY' : 'DISCONNECTED');
    io.emit('whatsapp_status', { status: state, qr: qrCodeData });
};

let qrCodeData = null;
let ioInstance = null;
let qrTimeout = null; // [NEW] Timeout for QR code
let isExplicitLogout = false; // [NEW] Flag to control auto-reinitialization

// ...

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });
    qrCodeData = qr;
    if (ioInstance) {
        ioInstance.emit('whatsapp_qr', qr);
        ioInstance.emit('whatsapp_status', { status: 'QR_READY', qr });
    }

    // [NEW] 20 seconds timeout to save resources
    if (qrTimeout) clearTimeout(qrTimeout);
    qrTimeout = setTimeout(async () => {
        console.log('QR Timeout (60s). Shutting down client to save resources.');
        if (ioInstance) ioInstance.emit('whatsapp_timeout'); // Notify frontend
        await shutdownWhatsApp();
        qrCodeData = null;
        qrTimeout = null;
    }, 60000); // 30 seconds
});

client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    if (qrTimeout) { clearTimeout(qrTimeout); qrTimeout = null; } // Clear timeout
    qrCodeData = null;
    if (ioInstance) {
        ioInstance.emit('whatsapp_ready');
        ioInstance.emit('whatsapp_status', { status: 'CONNECTED', qr: null });
    }
});

client.on('authenticated', () => {
    console.log('WhatsApp Client is authenticated!');
    if (qrTimeout) { clearTimeout(qrTimeout); qrTimeout = null; } // Clear timeout
    qrCodeData = null;
    if (ioInstance) {
        ioInstance.emit('whatsapp_authenticated');
    }
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp Client was disconnected', reason);
    qrCodeData = null;
    if (ioInstance) {
        ioInstance.emit('whatsapp_disconnected');
        ioInstance.emit('whatsapp_status', { status: 'DISCONNECTED', qr: null });
    }

    // If logout was explicit, do not auto-reinitialize here. 
    // logoutWhatsApp function will handle re-initialization after delay.
    if (isExplicitLogout) {
        console.log('Explicit logout detected. Skipping auto-reinitialization.');
        return;
    }

    client.initialize().catch(err => console.error('Error re-initializing after disconnect:', err));
});

// ... (message handler remains same) ...

const setSocketIO = (io) => {
    ioInstance = io;
};



const getWhatsAppStatus = () => {
    if (client.info) return { status: 'CONNECTED', user: client.info.wid.user };
    if (qrCodeData) return { status: 'QR_READY', qr: qrCodeData };
    return { status: 'DISCONNECTED' };
};

const logoutWhatsApp = async () => {
    console.log('--- Triggering Explicit Logout ---');
    isExplicitLogout = true; // Prevent auto-reinit loop from 'disconnected' event

    // 1. Notify Frontend immediately
    if (ioInstance) {
        ioInstance.emit('whatsapp_disconnected');
        emitStatus(ioInstance);
    }

    // 2. Try to Logout correctly
    try {
        if (client.info) {
            console.log('Logging out from WhatsApp Web...');
            await client.logout(); // This clears the session
        }
    } catch (e) {
        console.error('Error during client.logout() (might be already logged out):', e.message);
    }

    // 3. Destroy Client (close browser)
    try {
        console.log('Destroying puppeteer client...');
        await client.destroy();
    } catch (e) {
        console.error('Error destroying client:', e.message);
    }

    // 4. Clear State
    qrCodeData = null;
    userState = {};
    console.log('Client destroyed. State cleared.');

    // 5. DO NOT Re-initialize automatically. Wait for manual request.
    console.log('Client destroyed. Waiting for manual start request.');
    return true;
};

const startWhatsApp = async () => {
    if (client.info) {
        console.log('Client already connected');
        return;
    }

    console.log('Starting WhatsApp Client...');
    try {
        await client.initialize();
    } catch (error) {
        console.error('Error starting client:', error.message);
        // Retry logic could be here, or let the user try again
    }
};

client.on('message', async msg => {
    // [NEW] Ignore status updates
    if (msg.from === 'status@broadcast') return;

    const chat = await msg.getChat();
    const sender = msg.from;

    if (chat.isGroup) return;

    if (!userState[sender]) {
        userState[sender] = { step: 'IDLE', data: {} };
    }

    const currentState = userState[sender];
    const text = msg.body.trim();

    console.log(`Msg from ${sender}: ${text} [State: ${currentState.step}]`);



    try {
        // Load Config
        const config = await BotConfig.findOne() || new BotConfig();

        // [NEW] Direct Chat Logic (Pause Bot)
        if (currentState.step === 'DIRECT_CHAT') {
            const exitKeywords = ['menu', 'menú', 'salir', 'volver'];
            if (!exitKeywords.includes(text.toLowerCase())) {
                console.log(`[Direct Chat] Ignoring message from ${sender}: ${text}`);
                return; // Stop processing, let human reply
            }
            // If keyword found, resume bot
            await msg.reply('🤖 ¡Hola de nuevo! Reactivando asistente virtual...');
            currentState.step = 'IDLE';
            currentState.data = {};
        }

        if (text.toLowerCase() === 'hola' || text.toLowerCase() === 'inicio') {
            currentState.step = 'IDLE';
            currentState.data = {};
        }

        switch (currentState.step) {
            case 'IDLE':
                // Try to identify patients linked to this number
                const senderNum = sender.replace('@c.us', '').replace(/\D/g, '');
                // Use last 8 digits for fuzzy match (argentine numbers usually 10 digits w/o 0/15)
                const searchStr = senderNum.length > 8 ? senderNum.slice(-8) : senderNum;

                try {
                    const linkedPatients = await Patient.find({
                        $or: [
                            { telefono: { $regex: searchStr, $options: 'i' } },
                            { numerosAutorizados: { $elemMatch: { $regex: searchStr, $options: 'i' } } }
                        ]
                    });

                    if (linkedPatients.length > 0) {
                        currentState.data.foundPatients = linkedPatients;
                        let welcomeMsg = `👋 Hola! Encontré los siguientes pacientes asociados a tu número:\n\n`;

                        linkedPatients.forEach((p, i) => {
                            welcomeMsg += `${i + 1}. ${p.nombre} ${p.apellido} (DNI ${p.dni})\n`;
                        });

                        welcomeMsg += `${linkedPatients.length + 1}. 📝 Ingresar otro DNI\n`;
                        welcomeMsg += `\nPor favor, respondé con el número de la opción deseada.`;

                        await msg.reply(welcomeMsg);
                        currentState.step = 'WAITING_PATIENT_SELECTION';
                    } else {
                        await msg.reply(config.greeting);
                        currentState.step = 'WAITING_DNI';
                    }
                } catch (err) {
                    console.error('Error searching linked patients:', err);
                    await msg.reply(config.greeting);
                    currentState.step = 'WAITING_DNI';
                }
                break;

            case 'WAITING_PATIENT_SELECTION':
                const choice = parseInt(text) - 1;
                const patients = currentState.data.foundPatients || [];

                if (isNaN(choice)) {
                    await msg.reply(config.invalidOption);
                    return;
                }

                if (choice >= 0 && choice < patients.length) {
                    const selectedPatient = patients[choice];
                    currentState.data.patient = {
                        id: selectedPatient._id,
                        name: `${selectedPatient.nombre} ${selectedPatient.apellido}`,
                        phone: selectedPatient.telefono,
                        dni: selectedPatient.dni
                    };
                    currentState.step = 'MENU';
                    const menuMsg = config.menuOptions.replace('${name}', selectedPatient.nombre);
                    await msg.reply(menuMsg);
                } else if (choice === patients.length) {
                    // "Ingresar otro DNI" option
                    await msg.reply("Por favor, ingresá el DNI del paciente (sin puntos):");
                    currentState.step = 'WAITING_DNI';
                } else {
                    await msg.reply(config.invalidOption);
                }
                break;

            case 'WAITING_DNI':
                try {
                    let patientData = null;
                    try {
                        const res = await axios.post(`${BASE_URL}/patients/validate`, { dni: text });
                        if (res.data.exists) patientData = res.data;
                    } catch (err) {
                        if (err.response?.status !== 404) throw err;
                    }

                    if (patientData) {
                        // [NEW] Security Check: Phone Number Verification
                        const senderNumber = sender.replace('@c.us', '');
                        const normalize = (num) => num ? num.replace(/\D/g, '') : '';

                        const mainPhone = normalize(patientData.telefono);
                        const authPhones = (patientData.numerosAutorizados || []).map(normalize);

                        const allValidPhones = [mainPhone, ...authPhones];

                        // Check if numbers match (handling potential +54 or 9 prefix differences)
                        const isMatch = allValidPhones.some(phone =>
                            phone && (senderNumber.includes(phone) || phone.includes(senderNumber))
                        );

                        if (!isMatch) {
                            await msg.reply(`⛔ *Seguridad*\n\nEl DNI ${text} ya está registrado, pero no coincide con tu número de teléfono.\n\nPor seguridad, no podemos darte acceso a la información.\n\n📞 Si cambiaste de celular o sos un familiar, pedile a la secretaría que agregue tu número como autorizado.`);
                            currentState.step = 'IDLE';
                            return;
                        }

                        currentState.data.patient = {
                            id: patientData.id,
                            name: patientData.name,
                            phone: patientData.telefono, // Use main phone for contact info
                            dni: text
                        };
                        currentState.step = 'MENU';
                        const menuMsg = config.menuOptions.replace('${name}', patientData.name);
                        await msg.reply(menuMsg);
                    } else {
                        // Start Registration Flow
                        currentState.data.newPatient = { dni: text };
                        currentState.step = 'WAITING_NAME';
                        await msg.reply(config.askName);
                    }
                } catch (error) {
                    console.error("Validation error", error);
                    await msg.reply(config.genericError);
                }
                break;

            case 'WAITING_NAME':
                currentState.data.newPatient.nombre = text.toUpperCase();
                currentState.step = 'WAITING_SURNAME';
                await msg.reply(config.askSurname);
                break;

            case 'WAITING_SURNAME':
                currentState.data.newPatient.apellido = text.toUpperCase();
                currentState.step = 'WAITING_BIRTHDATE';
                await msg.reply(config.askBirthdate);
                break;

            case 'WAITING_BIRTHDATE':
                const parsedDate = parseDate(text);
                if (!parsedDate) {
                    await msg.reply(config.invalidDate); // Reuse invalidDate message for now
                    return;
                }

                try {
                    const payload = {
                        ...currentState.data.newPatient,
                        fechaNacimiento: parsedDate,
                        telefono: sender.replace('@c.us', ''),
                        obraSocial: 'PARTICULAR'
                    };

                    const res = await axios.post(`${BASE_URL}/patients`, payload);
                    const newPatient = res.data;

                    currentState.data.patient = {
                        id: newPatient._id,
                        name: `${newPatient.nombre} ${newPatient.apellido}`,
                        phone: newPatient.telefono,
                        dni: newPatient.dni
                    };
                    delete currentState.data.newPatient;

                    currentState.step = 'MENU';
                    const registerMsg = config.registerSuccess.replace('${name}', newPatient.nombre);
                    await msg.reply(registerMsg);
                } catch (createError) {
                    console.error("Registration error", createError);
                    await msg.reply(config.bookingError.replace('${error}', 'Error al registrar paciente.'));
                    currentState.step = 'IDLE';
                }
                break;

            case 'WAITING_LOCATION': {
                let daysCount = 15;
                let mode = 'ALL';

                if (text === '1') { // San Francisco
                    await msg.reply(config.sanFranciscoInfo);
                    daysCount = 2; // Next 2 Fridays
                    mode = 'FRIDAY';
                    currentState.data.location = 'San Francisco';
                } else if (text === '2') { // Freyre
                    daysCount = 15;
                    mode = 'MON_THU';
                    currentState.data.location = 'Freyre';
                } else {
                    await msg.reply(config.invalidOption);
                    return;
                }

                const availableDates = getNextBusinessDays(daysCount, mode);
                currentState.data.availableDates = availableDates;
                currentState.step = 'WAITING_DATE_SELECTION';

                let dateMsg = config.askDateList + '\n';
                availableDates.forEach((date, index) => {
                    const dateObj = new Date(date + 'T12:00:00');
                    const dayName = dateObj.toLocaleDateString('es-AR', { weekday: 'long' });
                    const dateStr = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
                    dateMsg += `${index + 1}. ${dayName} ${dateStr}\n`;
                });
                dateMsg += config.slotsFooter;
                await msg.reply(dateMsg);
                break;
            }

            case 'MENU':
                if (text === '1') {
                    currentState.step = 'WAITING_LOCATION';
                    await msg.reply(config.askLocation);

                } else if (text === '2') {
                    // Fetch active appointments
                    try {
                        const patientDni = currentState.data.patient.dni;
                        const res = await axios.get(`${BASE_URL}/appointments/by-dni/${patientDni}`);
                        const appointments = res.data;

                        if (appointments.length === 0) {
                            await msg.reply(config.noAppointments);
                            currentState.step = 'IDLE';
                        } else {
                            currentState.data.appointmentsToCancel = appointments;
                            currentState.step = 'WAITING_CANCELLATION_SELECTION';

                            let cancelMsg = config.cancellationHeader;
                            appointments.forEach((appt, index) => {
                                const dateObj = new Date(appt.date);
                                const dateStr = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                cancelMsg += `${index + 1}. ${dateStr} - ${appt.time} hs\n`;
                            });
                            cancelMsg += config.slotsFooter; // Reuse "write number" prompt
                            await msg.reply(cancelMsg);
                        }
                    } catch (error) {
                        console.error('Error fetching appointments', error);
                        await msg.reply('Error al buscar turms. Intenta más tarde.');
                        currentState.step = 'IDLE';
                    }
                } else if (text === '3') {
                    // [NEW] Option 3: Direct Contact
                    currentState.step = 'DIRECT_CHAT';
                    await msg.reply('👍 Entendido. Pausaré mi asistencia automática para que puedas hablar directamente con la Licenciada.\n\n💬 *Modo Chat Directo Activado*\nEscribí tu consulta y te responderemos a la brevedad.\n\n🤖 Si querés volver a usarme, escribí *"Menú"* o *"Salir"*.');
                } else {
                    await msg.reply(config.invalidOption);
                }
                break;

            case 'WAITING_DATE_SELECTION': {
                const dateSelection = parseInt(text) - 1;
                const availableDates = currentState.data.availableDates;

                if (isNaN(dateSelection) || dateSelection < 0 || dateSelection >= availableDates.length) {
                    await msg.reply(config.invalidOption);
                    return;
                }

                const selectedDateStr = availableDates[dateSelection];

                try {
                    await msg.reply(`Consultando disponibilidad para el ${selectedDateStr}...`);

                    // [NEW] Use Cache Helper
                    const slots = await getSlotsWithCache(selectedDateStr);

                    if (slots.length === 0) {
                        await msg.reply('😔 No hay horarios disponibles para esa fecha. Por favor elegí otra opción de la lista anterior.');
                        return;
                    }

                    currentState.data.date = selectedDateStr;
                    currentState.data.slots = slots;

                    let slotMsg = config.slotsHeader.replace('${date}', selectedDateStr);
                    slots.forEach((slot, index) => {
                        slotMsg += `${index + 1}. ${slot}\n`;
                    });
                    slotMsg += config.slotsFooter;

                    currentState.step = 'WAITING_SLOT';
                    await msg.reply(slotMsg);

                } catch (error) {
                    console.error("Error fetching slots", error);
                    await msg.reply('Hubo un error consultando disponibilidad. Intenta nuevamente.');
                }
                break;
            }

            case 'WAITING_CANCELLATION_SELECTION': {
                const selection = parseInt(text) - 1;
                const appointments = currentState.data.appointmentsToCancel;

                if (isNaN(selection) || selection < 0 || selection >= appointments.length) {
                    await msg.reply(config.invalidOption);
                    return;
                }

                const appointmentToCancel = appointments[selection];

                try {
                    await axios.delete(`${BASE_URL}/appointments/${appointmentToCancel._id}`);
                    await msg.reply(config.cancellationSuccess);
                } catch (error) {
                    console.error('Error cancelling appointment', error);
                    await msg.reply('Hubo un error al cancelar el turno. Por favor comunicate con la secretaría.');
                }
                currentState.step = 'IDLE';
                currentState.data = {};
                break;
            }
            case 'WAITING_SLOT': {
                const selection = parseInt(text) - 1;
                const available = currentState.data.slots;

                if (isNaN(selection) || selection < 0 || selection >= available.length) {
                    await msg.reply(config.invalidOption);
                    return;
                }

                const selectedTime = available[selection];
                const selectedDate = currentState.data.date;
                const patient = currentState.data.patient;

                try {
                    const apptData = {
                        date: selectedDate,
                        time: selectedTime,
                        patientName: patient.name,
                        patientPhone: patient.phone || sender.replace('@c.us', ''),
                        patientDni: patient.dni,
                        notes: 'Agendado vía WhatsApp Bot 🤖'
                    };

                    await axios.post(`${BASE_URL}/appointments`, apptData);

                    const confirmMsg = config.confirmation
                        .replace('${date}', selectedDate)
                        .replace('${time}', selectedTime)
                        .replace('${name}', patient.name);

                    await msg.reply(confirmMsg);

                    currentState.step = 'IDLE';
                    currentState.data = {};

                } catch (error) {
                    console.error("Booking error", error);
                    const errorMsg = config.bookingError.replace('${error}', error.response?.data?.message || "Error desconocido");
                    await msg.reply(errorMsg);
                }
            }
                break;

            default:
                currentState.step = 'IDLE';
                break;
        }

    } catch (e) {
        console.error("Bot Error", e);
        // Fallback generic error if config load fails
        try {
            await msg.reply("Ups, tuve un error interno. Escribí 'Hola' para reiniciar.");
        } catch (replyError) {
            console.error("Failed to send error reply:", replyError.message);
        }
    }
});



const getSlotsWithCache = async (dateStr) => {
    try {
        const queryDate = new Date(dateStr + 'T12:00:00Z');
        const day = queryDate.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat

        let possibleSlots = [];

        if (day === 5) { // Friday (San Francisco)
            // User Requested: 09:00 to 12:00 and 13:00 to 16:00
            // Morning
            possibleSlots.push('09:00', '09:30', '10:00', '10:30', '11:00', '11:30');
            // Afternoon
            possibleSlots.push('13:00', '13:30', '14:00', '14:30', '15:00', '15:30');
        } else if (day >= 1 && day <= 4) { // Mon-Thu (Freyre)
            // Default from appointmentRoutes.js (08:00-11:30, 14:00-18:30)
            const ranges = [{ start: 8, end: 11.5 }, { start: 14, end: 18.5 }];
            ranges.forEach(range => {
                let current = range.start;
                while (current <= range.end) {
                    const hour = Math.floor(current);
                    const minutes = (current % 1) === 0.5 ? '30' : '00';
                    possibleSlots.push(`${String(hour).padStart(2, '0')}:${minutes}`);
                    current += 0.5;
                }
            });
        }

        if (possibleSlots.length === 0) return [];

        const appointments = await Appointment.find({
            date: queryDate,
            status: { $nin: ['Cancelled', 'Cancelado'] },
            isActive: true
        });

        const bookedTimes = appointments.map(a => a.time);
        return possibleSlots.filter(slot => !bookedTimes.includes(slot));

    } catch (error) {
        console.error('Error getting slots:', error);
        return [];
    }
};

const sendMessage = async (to, message) => {
    try {
        if (!client.info) {
            console.log('WhatsApp client not ready. Message queued or failed.');
            return false;
        }

        // sanitize 'to' number - remove non-digits
        const number = to.replace(/\D/g, '');
        const chatId = `${number}@c.us`;

        // Check if number is registered on WhatsApp
        let isRegistered;
        try {
            isRegistered = await client.getNumberId(chatId);
        } catch (checkError) {
            console.warn(`Error checking number registration for ${to}:`, checkError.message);
            // Optional: Try to send anyway if check fails, or just return false. 
            // Often if this fails, sending will likely fail too, but let's return false to be safe.
            return false;
        }

        if (!isRegistered) {
            console.log(`Number ${to} is not registered on WhatsApp. Message skipped.`);
            return false;
        }

        await client.sendMessage(isRegistered._serialized, message);
        console.log(`Message sent to ${to} (${isRegistered._serialized})`);
        return true;
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        return false;
    }
};

const shutdownWhatsApp = async () => {
    try {
        console.log('Shutting down WhatsApp client...');
        await client.destroy();
    } catch (e) {
        console.error('Error shutting down WhatsApp client:', e.message);
    }
};

module.exports = { setSocketIO, client, getWhatsAppStatus, logoutWhatsApp, sendMessage, shutdownWhatsApp, startWhatsApp };
