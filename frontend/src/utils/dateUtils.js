export const calculateAge = (dateString) => {
    if (!dateString) return '';
    const birthday = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const m = today.getMonth() - birthday.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
        age--;
    }
    return age;
};

export const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Use UTC methods to avoid timezone shifts if storing YYYY-MM-DD
    // But since input type=date usually stores YYYY-MM-DD, parsing it as local might be safer if we just want display.
    // However, if the backend sends ISO string (e.g. T00:00:00.000Z), local conversion might shift day.
    // Ideally we treat birthdates as UTC or purely string-based YYYY-MM-DD.

    // For simple display of YYYY-MM-DD string as DD/MM/YYYY:
    if (dateString.includes('T')) {
        return date.toLocaleDateString('es-AR', { timeZone: 'UTC' });
    }
    // If it's just YYYY-MM-DD strings
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};
