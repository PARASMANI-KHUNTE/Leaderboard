require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./models/User');
const LeaderboardEntry = require('./models/Leaderboard');

const inspect = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        await mongoose.connect(uri);

        console.log('--- USERS MATCHING PARASMANI ---');
        const users = await User.find({ displayName: /Parasmani/i });
        users.forEach(u => {
            console.log(`ID: ${u._id}`);
            console.log(`Name: ${u.displayName}`);
            console.log(`Email: ${u.email}`);
            console.log(`Pic: ${u.profilePicture}`);
            console.log('---');
        });

        console.log('\n--- ENTRIES MATCHING PARASMANI ---');
        const entries = await LeaderboardEntry.find({ name: /Parasmani/i });
        entries.forEach(e => {
            console.log(`ID: ${e._id}`);
            console.log(`Name: ${e.name}`);
            console.log(`UserID: ${e.userId}`);
            console.log(`EntryPic: ${e.userPicture}`);
            console.log('---');
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

inspect();
