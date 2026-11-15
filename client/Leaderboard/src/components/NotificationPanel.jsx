import React, { useEffect } from 'react';
import { getSocket } from '../utils/socketSingleton';
import { useAuth } from '../App';
import { useToast } from './Toast';

const NotificationPanel = () => {
    const { user } = useAuth();
    const { addToast } = useToast();

    useEffect(() => {
        if (!user) return;

        const socket = getSocket();

        socket.emit('joinUser', user.id);

        const handleGlobalNotification = (notif) => {
            addToast(notif.message, notif.type);
        };

        const handleNewReport = ({ reason, entryName }) => {
            addToast(`New report: ${reason} on ${entryName}`, 'info');
        };

        socket.on('globalNotification', handleGlobalNotification);

        if (user.isAdmin) {
            socket.emit('joinAdmin');
            socket.on('newReport', handleNewReport);
        }

        return () => {
            socket.off('globalNotification', handleGlobalNotification);
            if (user.isAdmin) {
                socket.off('newReport', handleNewReport);
            }
        };
    }, [user, addToast]);

    return null;
};

export default NotificationPanel;
