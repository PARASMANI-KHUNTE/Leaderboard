require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./models/User');
const LeaderboardEntry = require('./models/Leaderboard');

const migrate = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        console.log(`Connecting to: ${uri}`);
        await mongoose.connect(uri);
        console.log('Connected successfully');

        const entries = await LeaderboardEntry.find({});
        console.log(`Found ${entries.length} total entries to process`);

        let updatedCount = 0;
        for (const entry of entries) {
            if (entry.userId) {
                const user = await User.findById(entry.userId);
                if (user && user.profilePicture && entry.userPicture !== user.profilePicture) {
                    entry.userPicture = user.profilePicture;
                    await entry.save();
                    updatedCount++;
                }
            }
        }

        console.log(`Migration complete. Updated ${updatedCount} entries.`);
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
