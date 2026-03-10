const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../models/User');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails[0].value;
            const isAdmin = process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL;

            // Robust profile picture extraction
            let profilePic = null;
            if (profile.photos && profile.photos.length > 0) {
                profilePic = profile.photos[0].value;
            } else if (profile._json && profile._json.picture) {
                profilePic = profile._json.picture;
            } else if (profile._json && profile._json.image) {
                profilePic = profile._json.image.url;
            }

            // Ensure the URL is absolute and high-res if it's a Google URL
            if (profilePic && profilePic.includes('googleusercontent.com')) {
                profilePic = profilePic.replace(/=s\d+([-a-zA-Z0-9_\-]+)*$/, '=s200-c');
            }

            console.log(`[OAuth] Extracting profile for ${email}: ${profilePic ? 'Success' : 'No image'}`);

            let user = await User.findOne({ googleId: profile.id });
            if (!user) {
                user = await User.create({
                    googleId: profile.id,
                    displayName: profile.displayName,
                    email: email,
                    profilePicture: profilePic,
                    isAdmin: !!isAdmin
                });
            } else {
                // Keep profile fresh
                const oldPic = user.profilePicture;
                user.displayName = profile.displayName;

                // Only update picture if we actually got one from Google
                if (profilePic) {
                    user.profilePicture = profilePic;
                }

                if (isAdmin && !user.isAdmin) user.isAdmin = true;
                await user.save();

                // If we got a NEW valid picture, sync all their leaderboard entries
                if (profilePic && oldPic !== profilePic) {
                    const LeaderboardEntry = require('../models/Leaderboard');
                    await LeaderboardEntry.updateMany(
                        { userId: user._id },
                        { $set: { userPicture: profilePic } }
                    );
                    console.log(`[OAuth] Synced entries for ${email} with new profile picture`);
                }
            }
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});
