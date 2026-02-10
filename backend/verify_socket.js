const io = require('socket.io-client');

const socket = io('http://localhost:5000', {
    reconnection: false,
    timeout: 5000
});

console.log('Attempting socket connection...');

socket.on('connect', () => {
    console.log('Socket Connected Successfully!', socket.id);
    socket.disconnect();
});

socket.on('connect_error', (err) => {
    console.log('Socket Connection Error:', err.message);
    // console.log(err); // Full error object might be huge
});

socket.on('disconnect', () => {
    console.log('Socket Disconnected');
});
