require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./models/User');
const LeaderboardEntry = require('./models/Leaderboard');

const surgicalRepair = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/MCAleaderBoard';
        await mongoose.connect(uri);

        const users = await User.find({ profilePicture: /googleusercontent\.com/ });
        console.log(`Checking ${users.length} Google-linked users...`);

        for (const user of users) {
            const original = user.profilePicture;
            if (!original) continue;

            // Extract ID surgically
            // Format: https://lh3.googleusercontent.com/a/IDENTIFIER=s...
            const parts = original.split('/a/');
            if (parts.length < 2) continue;

            const idPart = parts[1].split('=')[0]; // Take everything up to the first EQUALS
            const cleanPic = `https://lh3.googleusercontent.com/a/${idPart}=s200-c`;

            if (cleanPic !== original) {
                console.log(`Fixing User ${user.displayName}:`);
                console.log(`  From: ${original}`);
                console.log(`  To:   ${cleanPic}`);
                user.profilePicture = cleanPic;
                await user.save();
            }
        }

        const entries = await LeaderboardEntry.find({ userPicture: /googleusercontent\.com/ });
        console.log(`Checking ${entries.length} Google-linked entries...`);

        for (const entry of entries) {
            const original = entry.userPicture;
            if (!original) continue;

            const parts = original.split('/a/');
            if (parts.length < 2) continue;

            const idPart = parts[1].split('=')[0];
            const cleanPic = `https://lh3.googleusercontent.com/a/${idPart}=s200-c`;

            if (cleanPic !== original) {
                console.log(`Fixing Entry ${entry.name}:`);
                console.log(`  From: ${original}`);
                console.log(`  To:   ${cleanPic}`);
                entry.userPicture = cleanPic;
                await entry.save();
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

surgicalRepair();
