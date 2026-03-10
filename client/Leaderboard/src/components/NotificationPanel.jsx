import React, { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../App';
import { useToast } from './Toast';
import API_URL from '../config';

const NotificationPanel = () => {
    const { user } = useAuth();
    const { addToast } = useToast();

    useEffect(() => {
        if (!user) return;

        const socket = io(API_URL);

        socket.emit('joinUser', user.id);

        // Listen for global notifications (real-time toasters)
        socket.on('globalNotification', (notif) => {
            addToast(notif.message, notif.type);
        });

        if (user.isAdmin) {
            socket.emit('joinAdmin');
            socket.on('newReport', ({ reason, entryName }) => {
                addToast(`New report: ${reason} on ${entryName}`, 'info');
            });
        }

        return () => socket.disconnect();
    }, [user, addToast]);

    return null; // Logic-only component now, Toast system handles UI
};

export default NotificationPanel;
