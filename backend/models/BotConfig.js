const mongoose = require('mongoose');

const botConfigSchema = new mongoose.Schema({
    greeting: { type: String, default: 'Hola! Soy el asistente virtual de FonoApp. 👋\nPor favor, ingresá tu DNI para indentificarte (sin puntos).' },
    dniNotFound: { type: String, default: '❌ No encontré ese DNI en mi sistema. Por favor, verificalo y escribilo nuevamente.' },
    menuOptions: { type: String, default: 'Hola ${name}! Un gusto saludarte.\n\n¿Qué te gustaría hacer?\n1. Agendar Nuevo Turno 📅\n2. Cancelar Turno ❌\n3. Contactar Profesional 💬' },
    askLocation: { type: String, default: '¿En qué consultorio te gustaría atenderte?\n1. San Francisco 🏢\n2. Freyre 🏠\n\nResponded con el número de la opción.' },
    sanFranciscoInfo: { type: String, default: '⚠️ *Atención*: En San Francisco solo atendemos los días *Viernes*.' },
    askDate: { type: String, default: 'Perfecto. Por favor, escribí la fecha que buscás con formato *AAAA-MM-DD* (Ej: 2026-02-10).' },
    askDateList: { type: String, default: 'Perfecto. Seleccioná una fecha de la lista escribiendo su número:' },
    cancelInfo: { type: String, default: 'Para cancelar turnos, por favor comunicate con la secretaría. Escribí "Hola" para volver al inicio.' },
    invalidOption: { type: String, default: 'Opción no válida. Escribí 1 o 2.' },
    invalidDate: { type: String, default: 'Formato incorrecto. Por favor usá AAAA-MM-DD (Ej: 2026-02-10).' },
    noSlots: { type: String, default: '😔 No hay horarios disponibles para esa fecha. Por favor escribí otra fecha (AAAA-MM-DD).' },
    slotsHeader: { type: String, default: '📅 Horarios disponibles para el ${date}:\n' },
    slotsFooter: { type: String, default: '\nEscribí el *NÚMERO* de la opción que querés reservar (Ej: 1).' },
    confirmation: { type: String, default: '✅ *¡Turno Confirmado!* 🎉\n\n🗓 Fecha: ${date}\n⏰ Hora: ${time}\n👤 Paciente: ${name}\n\nTe esperamos!' },
    bookingError: { type: String, default: '❌ Hubo un error al reservar: ${error}' },
    genericError: { type: String, default: 'Ups, tuve un error interno. Escribí "Hola" para reiniciar.' },
    cancellationMessage: { type: String, default: 'Hola ${name}, te informamos que tu turno para el día ${date} a las ${time} hs ha sido cancelado.' },
    cancellationHeader: { type: String, default: 'Tus turnos activos son:\n' },
    cancellationSuccess: { type: String, default: '✅ Turno cancelado correctamente. Lamento que no puedas venir, espero verte pronto.' },
    noAppointments: { type: String, default: 'ℹ️ No tenés turnos activos registrados con este DNI.' },
    // Registration Flow
    askName: { type: String, default: '¡Bienvenido! 👋 Vemos que es tu primera vez. Para registrarte, por favor decime tu *Nombre/s*.' },
    askSurname: { type: String, default: 'Gracias. Ahora por favor escribí tu *Apellido*.' },
    askBirthdate: { type: String, default: 'Último paso: Ingresá tu fecha de nacimiento (Ej: 15/05/1990 o 15-05-1990).' },
    registerSuccess: { type: String, default: '¡Perfecto ${name}! Te hemos registrado correctamente. 🎉\n\n¿Qué te gustaría hacer?\n1. Agendar Nuevo Turno 📅\n2. Cancelar Turno ❌' }
}, { timestamps: true });

module.exports = mongoose.model('BotConfig', botConfigSchema);
