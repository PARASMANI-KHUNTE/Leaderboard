require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./models/User');
const LeaderboardEntry = require('./models/Leaderboard');

const repair = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/MCAleaderBoard';
        await mongoose.connect(uri);

        const users = await User.find({ profilePicture: /googleusercontent\.com/ });
        console.log(`Found ${users.length} Google-linked users.`);

        let userUpdates = 0;
        for (const user of users) {
            const originalPic = user.profilePicture;

            // Extract the base identifier: everything after /a/ but before any =s
            // Example: https://lh3.googleusercontent.com/a/ID=s96-c
            const match = originalPic.match(/\/a\/([a-zA-Z0-9_\-]+)/);
            if (match && match[1]) {
                const id = match[1];
                const newPic = `https://lh3.googleusercontent.com/a/${id}=s200-c`;

                if (newPic !== originalPic) {
                    console.log(`[REPAIR] ${user.displayName}:`);
                    console.log(`  OLD: ${originalPic}`);
                    console.log(`  NEW: ${newPic}`);
                    user.profilePicture = newPic;
                    await user.save();
                    userUpdates++;
                }
            } else {
                console.log(`[SKIP] Could not parse ID for ${user.displayName}: ${originalPic}`);
            }
        }
        console.log(`Updated ${userUpdates} user profiles.`);

        // Sync entries
        const entries = await LeaderboardEntry.find({ userId: { $in: users.map(u => u._id) } });
        let entryUpdates = 0;
        for (const entry of entries) {
            const user = await User.findById(entry.userId);
            if (user && user.profilePicture && entry.userPicture !== user.profilePicture) {
                entry.userPicture = user.profilePicture;
                await entry.save();
                entryUpdates++;
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
