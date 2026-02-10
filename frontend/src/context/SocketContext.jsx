import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // Connect to backend
        const newSocket = io('http://localhost:5000');
        setSocket(newSocket);

        // Global Listeners for Notifications
        newSocket.on('appointment_change', (payload) => {
            console.log('Socket Event Received:', payload);

            let message = '';
            if (payload.type === 'create') {
                const { patientName, date, time } = payload.data;
                const dateStr = new Date(date).toLocaleDateString();
                message = `📅 Nuevo Turno: ${patientName} - ${dateStr} ${time}`;
                toast.success(message);
            } else if (payload.type === 'update') {
                message = '✏️ Un turno ha sido modificado.';
                toast.info(message);
            } else if (payload.type === 'delete') {
                message = '❌ Un turno ha sido cancelado.';
                toast.warning(message);
            }
        });

        return () => newSocket.close();
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
