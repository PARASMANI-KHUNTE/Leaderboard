const cloudinary = require('cloudinary').v2;

let configured = false;

function isCloudinaryConfigured() {
    return Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
}

function getCloudinary() {
    if (!isCloudinaryConfigured()) {
        throw new Error('Cloudinary is not configured');
    }

    if (!configured) {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true,
        });
        configured = true;
    }

    return cloudinary;
}

module.exports = {
    getCloudinary,
    isCloudinaryConfigured,
};
