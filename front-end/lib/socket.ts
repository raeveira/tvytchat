import {io} from 'socket.io-client';

export const connect = () => {
    console.log('Connecting to the server...');

     const socket = io('http://localhost:3000', {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        transports: ['websocket']
    });

    socket.on('connect', () => {
        console.log('Client connected to the server.');
    });

    socket.on('connect_error', (error) => {
        console.error('Connection failed:', error);
    });

    return socket;
}