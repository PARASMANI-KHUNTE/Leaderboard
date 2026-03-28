import { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config';

const usePushNotifications = (user) => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscription, setSubscription] = useState(null);
    const [registration, setRegistration] = useState(null);

    const syncSubscriptionWithBackend = async (sub) => {
        try {
            await axios.post(`${API_URL}/api/notifications/subscribe`, sub, {
                withCredentials: true
            });
        } catch (err) {
            console.error('Error syncing push subscription:', err);
        }
    };

    useEffect(() => {
        if (!user) return;

        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.register('/sw.js')
                .then((reg) => {
                    setRegistration(reg);
                    return reg.pushManager.getSubscription();
                })
                .then((sub) => {
                    if (sub) {
                        setSubscription(sub);
                        setIsSubscribed(true);
                        // Sync with backend in case it's missing
                        syncSubscriptionWithBackend(sub);
                    }
                })
                .catch((err) => console.error('Service Worker Error', err));
        }
    }, [user]);

    const subscribeToPush = async () => {
        if (!registration) return;

        try {
            const response = await axios.get(`${API_URL}/api/notifications/vapid-public-key`);
            const { publicKey } = response.data;

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });

            setSubscription(sub);
            setIsSubscribed(true);
            await syncSubscriptionWithBackend(sub);
            return true;
        } catch (err) {
            console.error('Failed to subscribe to push notifications', err);
            return false;
        }
    };

    const unsubscribeFromPush = async () => {
        if (!subscription) return;

        try {
            await subscription.unsubscribe();
            await axios.post(`${API_URL}/api/notifications/unsubscribe`, {
                endpoint: subscription.endpoint
            }, { withCredentials: true });
            
            setSubscription(null);
            setIsSubscribed(false);
            return true;
        } catch (err) {
            console.error('Failed to unsubscribe', err);
            return false;
        }
    };

    return { isSubscribed, subscribeToPush, unsubscribeFromPush };
};

// Helper function
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default usePushNotifications;
