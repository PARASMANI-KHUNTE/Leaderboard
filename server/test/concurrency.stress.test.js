const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'stress-secret';

const leaderboardRouter = require('../routes/leaderboard');
const { User } = require('../models/User');
const Leaderboard = require('../models/LeaderboardCollection');
const LeaderboardEntry = require('../models/Leaderboard');

function createMockQuery(doc) {
    return {
        select: () => createMockQuery(doc),
        lean: () => Promise.resolve(doc),
        then: (onFulfilled, onRejected) => Promise.resolve(doc).then(onFulfilled, onRejected),
        catch: (onRejected) => Promise.resolve(doc).catch(onRejected),
    };
}

test('High-concurrency stress test: 20 simultaneous submissions for same user allows only 1 creation', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const lbId = '507f1f77bcf86cd799439022';

    jwt.verify = () => ({ id: userId });

    const userDoc = {
        _id: userId,
        id: userId,
        displayName: 'ConcurrentTester',
        isBanned: false,
        profilePicture: 'https://example.com/pic.png',
    };
    User.findById = () => createMockQuery(userDoc);
    Leaderboard.findById = () => createMockQuery({ _id: lbId, isLive: true });

    let activeEntriesCount = 0;
    const existingEntries = new Set();

    LeaderboardEntry.findOne = () => {
        const hasExisting = existingEntries.has(userId);
        return createMockQuery(hasExisting ? { _id: 'existing-id' } : null);
    };

    LeaderboardEntry.prototype.save = async function save() {
        if (existingEntries.has(userId)) {
            const err = new Error('E11000 duplicate key error');
            err.code = 11000;
            throw err;
        }
        existingEntries.add(userId);
        activeEntriesCount++;
        return this;
    };

    const app = express();
    app.use(express.json());
    app.set('socketio', { to: () => ({ emit: () => {} }) });
    app.use('/api/leaderboard', leaderboardRouter);

    // Dispatch 20 simultaneous submissions
    const requests = Array.from({ length: 20 }, (_, i) =>
        request(app)
            .post('/api/leaderboard/submit')
            .set('Authorization', 'Bearer stress-token')
            .send({
                name: `Tester-${i}`,
                cgpa: 9.0,
                marks: 600,
                leaderboardId: lbId,
            })
    );

    const responses = await Promise.all(requests);

    const createdResponses = responses.filter(r => r.status === 201);
    const rejectedResponses = responses.filter(r => r.status === 409 || r.status === 400 || r.status === 429);

    assert.equal(createdResponses.length, 1, 'Exactly one submission must succeed (201)');
    assert.equal(rejectedResponses.length, 19, 'All other 19 parallel requests must be rejected without creating duplicates');
    assert.equal(activeEntriesCount, 1, 'Final saved count in store must be exactly 1');
});

test('High-concurrency stress test: 50 concurrent reactions on same card maintain exact set integrity', async () => {
    const targetEntryId = '507f1f77bcf86cd799439099';
    const lbId = '507f1f77bcf86cd799439022';

    // Simulated atomic document state in MongoDB
    const simulatedDoc = {
        _id: targetEntryId,
        leaderboardId: lbId,
        userId: 'owner-id',
        likedBy: new Set(),
        dislikedBy: new Set(),
    };

    LeaderboardEntry.findById = () => createMockQuery({
        _id: targetEntryId,
        leaderboardId: lbId,
        userId: 'owner-id',
        likedBy: Array.from(simulatedDoc.likedBy),
        dislikedBy: Array.from(simulatedDoc.dislikedBy),
    });

    LeaderboardEntry.findByIdAndUpdate = async (id, update) => {
        if (update.$addToSet?.likedBy) {
            simulatedDoc.likedBy.add(update.$addToSet.likedBy);
        }
        if (update.$pull?.likedBy) {
            simulatedDoc.likedBy.delete(update.$pull.likedBy);
        }
        if (update.$addToSet?.dislikedBy) {
            simulatedDoc.dislikedBy.add(update.$addToSet.dislikedBy);
        }
        if (update.$pull?.dislikedBy) {
            simulatedDoc.dislikedBy.delete(update.$pull.dislikedBy);
        }

        return {
            _id: targetEntryId,
            leaderboardId: lbId,
            userId: 'owner-id',
            likedBy: Array.from(simulatedDoc.likedBy),
            dislikedBy: Array.from(simulatedDoc.dislikedBy),
        };
    };

    Leaderboard.findById = () => createMockQuery({ _id: lbId, isLive: true, slug: 'test-board' });

    const app = express();
    app.use(express.json());
    app.set('socketio', { to: () => ({ emit: () => {} }) });
    app.use('/api/leaderboard', leaderboardRouter);

    // Simulate 50 distinct users liking the card simultaneously
    const distinctUsers = Array.from({ length: 50 }, (_, i) => `user-${i + 1}`);

    // Dynamically decode user from token so concurrent requests don't clobber each other
    jwt.verify = (token) => {
        const id = String(token || '').replace('Bearer ', '').replace('token-', '');
        return { id };
    };

    User.findById = (id) => createMockQuery({
        _id: id,
        id: id,
        displayName: `User-${id}`,
        isBanned: false,
    });

    const likeRequests = distinctUsers.map((uId) =>
        request(app)
            .post(`/api/leaderboard/react/${targetEntryId}`)
            .set('Authorization', `Bearer token-${uId}`)
            .send({})
    );

    const responses = await Promise.all(likeRequests);

    // Verify all 50 parallel requests were processed without lost updates or 500 errors
    assert.ok(responses.every(r => r.status === 200), 'All concurrent like requests must return 200');
    assert.equal(simulatedDoc.likedBy.size, 50, 'Atomic operators must record all 50 distinct likes without lost updates');
    assert.equal(simulatedDoc.dislikedBy.size, 0, 'Disliked set must remain empty');
});
