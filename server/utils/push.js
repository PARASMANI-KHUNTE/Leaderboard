const webPush = require('web-push');

// Use environment variables for VAPID keys
webPush.setVapidDetails(
    'mailto:parasmanikhunte@gmail.com', // Contact email
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

/**
 * Send a push notification to a specific user's registered browsers.
 * @param {Object} user - The user document from MongoDB.
 * @param {Object} payload - The notification payload (title, body, etc.).
 */
const sendPushNotification = async (user, payload) => {
    if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) {
        return;
    }

    const payloadString = JSON.stringify(payload);

    const notifications = user.pushSubscriptions.map(async (subscription) => {
        try {
            await webPush.sendNotification(subscription, payloadString);
        } catch (error) {
            console.error('Error sending push notification:', error.endpoint, error.statusCode);
            // If the subscription is no longer valid (410 or 404), we should remove it.
            if (error.statusCode === 410 || error.statusCode === 404) {
                // We'll handle removal in the calling function or via a cleanup task
                return { invalidEndpoint: subscription.endpoint };
            }
        }
    });

    const results = await Promise.all(notifications);
    
    // Cleanup invalid subscriptions if any
    const invalidEndpoints = results
        .filter(r => r && r.invalidEndpoint)
        .map(r => r.invalidEndpoint);

    if (invalidEndpoints.length > 0) {
        const { User } = require('../models/User');
        await User.updateOne(
            { _id: user._id },
            { $pull: { pushSubscriptions: { endpoint: { $in: invalidEndpoints } } } }
        );
    }
};

module.exports = { sendPushNotification };
