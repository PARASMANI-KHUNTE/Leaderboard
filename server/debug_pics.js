require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./models/User');

const debug = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/MCAleaderBoard';
        await mongoose.connect(uri);
        const users = await User.find({}).limit(5);
        console.log('--- USER PROFILE DIAGNOSIS ---');
        users.forEach(u => {
            console.log(`User: ${u.displayName}`);
            console.log(`Email: ${u.email}`);
            console.log(`Pic URL: ${u.profilePicture || 'MISSING'}`);
            console.log('---');
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();
