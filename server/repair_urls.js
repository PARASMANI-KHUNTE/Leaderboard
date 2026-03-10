require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./models/User');
const LeaderboardEntry = require('./models/Leaderboard');

const repair = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/MCAleaderBoard';
        await mongoose.connect(uri);

        const users = await User.find({ profilePicture: { $exists: true, $ne: null } });
        console.log(`Found ${users.length} users with pictures to check.`);

        let userUpdates = 0;
        for (const user of users) {
            if (user.profilePicture.includes('googleusercontent.com')) {
                const newPic = user.profilePicture.replace(/=s\d+(-[a-z0-9\-]+)*$/, '=s200-c');
                if (newPic !== user.profilePicture) {
                    user.profilePicture = newPic;
                    await user.save();
                    userUpdates++;
                }
            }
        }
        console.log(`Updated ${userUpdates} user profiles.`);

        // Now sync entries
        const entries = await LeaderboardEntry.find({});
        let entryUpdates = 0;
        for (const entry of entries) {
            if (entry.userId) {
                const user = await User.findById(entry.userId);
                if (user && user.profilePicture && entry.userPicture !== user.profilePicture) {
                    entry.userPicture = user.profilePicture;
                    await entry.save();
                    entryUpdates++;
                }
            }
        }
        console.log(`Updated ${entryUpdates} entries.`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

repair();
