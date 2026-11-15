const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { User, Feedback, Report } = require('../models/User');
const Leaderboard = require('../models/LeaderboardCollection');
const LeaderboardEntry = require('../models/Leaderboard');
const VerificationSubmission = require('../models/VerificationSubmission');
const AuthCode = require('../models/AuthCode');
const { buildEntryRankingPayload } = require('../utils/ranking');
const { computeCompositeScore } = require('../utils/redisRanking');

const sampleAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=face',
];

async function seed() {
    console.log('[seed] Connecting to MongoDB at:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
    });

    console.log('[seed] Clearing existing collections...');
    await Promise.all([
        User.deleteMany({}),
        Leaderboard.deleteMany({}),
        LeaderboardEntry.deleteMany({}),
        Feedback.deleteMany({}),
        Report.deleteMany({}),
        VerificationSubmission.deleteMany({}),
        AuthCode.deleteMany({}),
    ]);
    // Also clear sessions if collection exists
    try {
        await mongoose.connection.db.collection('sessions').deleteMany({});
    } catch {}

    console.log('[seed] Cleared collections.');

    // 1. Create Admin User (Preserving your exact Google Account link)
    const adminUser = await User.create({
        googleId: '101814522007996312970',
        displayName: 'PARASMANI KHUNTE',
        email: 'parasmanikhunte@gmail.com',
        isAdmin: true,
        isBanned: false,
        profilePicture: 'https://lh3.googleusercontent.com/a/ACg8ocKrCW_J39xfZA2_J6HBvmjPAENJqTOZ-EUWDdZC4ALxq_wQnNROyQ=s200-c',
        hasSubmitted: true,
    });
    console.log('[seed] Created Admin User:', adminUser.displayName);

    // 2. Create Student Users
    const studentData = [
        { name: 'Aarav Sharma', email: 'aarav.sharma@example.edu', avatar: sampleAvatars[0] },
        { name: 'Ananya Verma', email: 'ananya.verma@example.edu', avatar: sampleAvatars[1] },
        { name: 'Rohan Mehta', email: 'rohan.mehta@example.edu', avatar: sampleAvatars[2] },
        { name: 'Priya Patel', email: 'priya.patel@example.edu', avatar: sampleAvatars[3] },
        { name: 'Vikram Aditya', email: 'vikram.aditya@example.edu', avatar: sampleAvatars[4] },
        { name: 'Sneha Kulkarni', email: 'sneha.k@example.edu', avatar: sampleAvatars[5] },
        { name: 'Kabir Das', email: 'kabir.das@example.edu', avatar: sampleAvatars[6] },
        { name: 'Diya Sen', email: 'diya.sen@example.edu', avatar: sampleAvatars[7] },
        { name: 'Arjun Nair', email: 'arjun.nair@example.edu', avatar: sampleAvatars[8] },
        { name: 'Meera Iyer', email: 'meera.iyer@example.edu', avatar: sampleAvatars[9] },
        { name: 'Ishaan Gupta', email: 'ishaan.gupta@example.edu', avatar: sampleAvatars[10] },
        { name: 'Tanvi Joshi', email: 'tanvi.joshi@example.edu', avatar: sampleAvatars[11] },
    ];

    const studentUsers = [];
    for (let idx = 0; idx < studentData.length; idx++) {
        const s = studentData[idx];
        const u = await User.create({
            googleId: `mock_student_google_${idx + 1}`,
            displayName: s.name,
            email: s.email,
            profilePicture: s.avatar,
            isAdmin: false,
            isBanned: false,
            hasSubmitted: true,
        });
        studentUsers.push(u);
    }
    console.log(`[seed] Created ${studentUsers.length} student users.`);

    // 3. Create Leaderboards
    const lb1 = await Leaderboard.create({
        name: 'MCA 3rd Semester',
        slug: 'mca-3rd',
        createdBy: adminUser._id,
        isLive: true,
        entryMode: 'manual',
        entryCount: 0,
        fields: { cgpa: true, sgpa: true, marks: true },
        ranking: {
            mode: 'priority',
            primaryField: 'cgpa',
            secondaryField: 'marks',
        },
        verification: {
            level: 'none',
            requireIdCard: false,
            requireGradeCard: false,
        },
    });

    const lb2 = await Leaderboard.create({
        name: 'MCA 1st Semester (Verified)',
        slug: 'mca-1st-verified',
        createdBy: adminUser._id,
        isLive: true,
        entryMode: 'hybrid',
        entryCount: 0,
        fields: { cgpa: true, sgpa: true, marks: true },
        ranking: {
            mode: 'priority',
            primaryField: 'cgpa',
            secondaryField: 'marks',
        },
        verification: {
            level: 'document_verification',
            requireIdCard: true,
            requireGradeCard: true,
            autoAcceptOnIdentityMatch: true,
        },
    });

    const lb3 = await Leaderboard.create({
        name: 'B.Tech Computer Science 2026',
        slug: 'btech-cs-2026',
        createdBy: adminUser._id,
        isLive: true,
        entryMode: 'manual',
        entryCount: 0,
        fields: { cgpa: true, sgpa: false, marks: true },
        ranking: {
            mode: 'priority',
            primaryField: 'cgpa',
            secondaryField: 'marks',
        },
        verification: {
            level: 'none',
            requireIdCard: false,
            requireGradeCard: false,
        },
    });

    const lb4 = await Leaderboard.create({
        name: 'Hackathon Summer 2025 (Archived)',
        slug: 'hackathon-summer-2025',
        createdBy: adminUser._id,
        isLive: false,
        entryMode: 'manual',
        entryCount: 0,
        fields: { cgpa: false, sgpa: false, marks: true },
        ranking: {
            mode: 'priority',
            primaryField: 'marks',
            secondaryField: 'cgpa',
        },
        verification: {
            level: 'none',
        },
    });

    const allLeaderboards = [lb1, lb2, lb3, lb4];
    console.log(`[seed] Created ${allLeaderboards.length} leaderboards.`);

    // 4. Create Entries for MCA 3rd Semester (lb1)
    const mca3rdScores = [
        { user: adminUser, cgpa: 9.85, sgpa: 9.90, marks: 590, status: 'manual' },
        { user: studentUsers[0], cgpa: 9.72, sgpa: 9.60, marks: 582, status: 'manual' },
        { user: studentUsers[1], cgpa: 9.50, sgpa: 9.45, marks: 570, status: 'manual' },
        { user: studentUsers[2], cgpa: 9.25, sgpa: 9.30, marks: 555, status: 'manual' },
        { user: studentUsers[3], cgpa: 8.95, sgpa: 9.10, marks: 540, status: 'manual' },
        { user: studentUsers[4], cgpa: 8.80, sgpa: 8.75, marks: 532, status: 'manual' },
        { user: studentUsers[5], cgpa: 8.65, sgpa: 8.50, marks: 520, status: 'manual' },
        { user: studentUsers[6], cgpa: 8.40, sgpa: 8.35, marks: 508, status: 'manual' },
        { user: studentUsers[7], cgpa: 8.15, sgpa: 8.20, marks: 495, status: 'manual' },
        { user: studentUsers[8], cgpa: 7.90, sgpa: 7.80, marks: 480, status: 'manual' },
        { user: studentUsers[9], cgpa: 7.60, sgpa: 7.55, marks: 462, status: 'manual' },
        { user: studentUsers[10], cgpa: 7.25, sgpa: 7.30, marks: 445, status: 'manual' },
    ];

    let lb1Count = 0;
    for (const s of mca3rdScores) {
        const rankingPayload = buildEntryRankingPayload(lb1, {
            cgpa: s.cgpa,
            sgpa: s.sgpa,
            marks: s.marks,
        });

        // Give some initial likes to top entries
        const likedBy = s.cgpa >= 9.0 ? [studentUsers[4]._id, studentUsers[5]._id] : [];
        const dislikedBy = [];

        await LeaderboardEntry.create({
            leaderboardId: lb1._id,
            userId: s.user._id,
            name: s.user.displayName,
            cgpa: s.cgpa,
            sgpa: s.sgpa,
            marks: s.marks,
            userPicture: s.user.profilePicture,
            verificationStatus: s.status,
            likedBy,
            dislikedBy,
            ...rankingPayload,
        });
        lb1Count++;
    }
    await Leaderboard.findByIdAndUpdate(lb1._id, { entryCount: lb1Count });

    // 5. Create Entries for MCA 1st Semester (Verified) (lb2)
    const mca1stScores = [
        { user: studentUsers[1], cgpa: 9.60, sgpa: 9.60, marks: 575, status: 'verified' },
        { user: studentUsers[3], cgpa: 9.35, sgpa: 9.40, marks: 560, status: 'verified' },
        { user: studentUsers[5], cgpa: 9.10, sgpa: 9.15, marks: 548, status: 'verified' },
        { user: studentUsers[7], cgpa: 8.75, sgpa: 8.80, marks: 525, status: 'verified' },
        { user: studentUsers[9], cgpa: 8.30, sgpa: 8.40, marks: 500, status: 'verified' },
        { user: studentUsers[11], cgpa: 7.85, sgpa: 7.90, marks: 475, status: 'verified' },
    ];

    let lb2Count = 0;
    for (const s of mca1stScores) {
        const rankingPayload = buildEntryRankingPayload(lb2, {
            cgpa: s.cgpa,
            sgpa: s.sgpa,
            marks: s.marks,
        });

        await LeaderboardEntry.create({
            leaderboardId: lb2._id,
            userId: s.user._id,
            name: s.user.displayName,
            cgpa: s.cgpa,
            sgpa: s.sgpa,
            marks: s.marks,
            userPicture: s.user.profilePicture,
            verificationStatus: s.status,
            ...rankingPayload,
        });
        lb2Count++;
    }
    await Leaderboard.findByIdAndUpdate(lb2._id, { entryCount: lb2Count });

    // 6. Create Entries for B.Tech CS 2026 (lb3)
    const btechScores = [
        { user: studentUsers[0], cgpa: 9.90, marks: 595 },
        { user: studentUsers[2], cgpa: 9.65, marks: 580 },
        { user: studentUsers[4], cgpa: 9.40, marks: 565 },
        { user: studentUsers[6], cgpa: 9.15, marks: 550 },
        { user: studentUsers[8], cgpa: 8.90, marks: 535 },
    ];

    let lb3Count = 0;
    for (const s of btechScores) {
        const rankingPayload = buildEntryRankingPayload(lb3, {
            cgpa: s.cgpa,
            marks: s.marks,
        });

        await LeaderboardEntry.create({
            leaderboardId: lb3._id,
            userId: s.user._id,
            name: s.user.displayName,
            cgpa: s.cgpa,
            marks: s.marks,
            userPicture: s.user.profilePicture,
            verificationStatus: 'manual',
            ...rankingPayload,
        });
        lb3Count++;
    }
    await Leaderboard.findByIdAndUpdate(lb3._id, { entryCount: lb3Count });

    console.log('[seed] Seeded leaderboard entries.');

    // 7. Seed Sample Verification Submissions for Admin Review
    await VerificationSubmission.create({
        leaderboardId: lb2._id,
        userId: studentUsers[6]._id,
        status: 'needs_review',
        documents: {
            idCard: {
                type: 'id_card',
                originalName: 'id_card_kabir.jpg',
                mimeType: 'image/jpeg',
                bytes: 142300,
                fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                secureUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400',
            },
            gradeCard: {
                type: 'grade_card',
                originalName: 'grade_card_kabir.pdf',
                mimeType: 'application/pdf',
                bytes: 284500,
                fileHash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
                secureUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400',
            },
        },
        extracted: {
            idCard: {
                fullName: 'Kabir Das',
                studentId: 'GGV/22/15399',
                rollNumber: '22091015',
                universityName: 'Guru Ghasidas Vishwavidyalaya',
                confidence: 0.94,
            },
            gradeCard: {
                fullName: 'Kabir Das',
                rollNumber: '22091015',
                cgpa: 8.40,
                sgpa: 8.35,
                marks: 508,
                confidence: 0.96,
            },
        },
        comparison: {
            status: 'needs_review',
            acceptedBecause: ['Student name matched', 'Roll number verified'],
            warnings: ['Slight contrast difference on university seal'],
        },
    });

    // 8. Seed Feedback for Admin Dashboard
    await Feedback.create({
        userId: studentUsers[0]._id,
        userName: studentUsers[0].displayName,
        text: 'The new real-time rank updates are blazingly fast! Love the instant heart reactions.',
        isRead: false,
    });
    await Feedback.create({
        userId: studentUsers[2]._id,
        userName: studentUsers[2].displayName,
        text: 'Could we get dark mode toggle on the mobile app? The dark palette looks gorgeous on OLED.',
        isRead: true,
    });
    await Feedback.create({
        userId: studentUsers[5]._id,
        userName: studentUsers[5].displayName,
        text: 'Document OCR worked on my phone camera shot in 3 seconds. Very smooth experience.',
        isRead: false,
    });

    console.log('[seed] Seeded feedback and verification submissions for Admin.');

    console.log('\n===========================================');
    console.log('🎉 Database seeding completed successfully!');
    console.log('Admin User: parasmanikhunte@gmail.com (PARASMANI KHUNTE)');
    console.log(`Student Users: ${studentUsers.length}`);
    console.log(`Leaderboards: ${allLeaderboards.length} (${lb1Count + lb2Count + lb3Count} total entries)`);
    console.log('===========================================\n');

    await mongoose.disconnect();
}

seed().catch(err => {
    console.error('[seed] Fatal error:', err);
    process.exit(1);
});
