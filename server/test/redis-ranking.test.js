const test = require('node:test');
const assert = require('node:assert/strict');
const {
    computeCompositeScore,
    syncEntryToZSet,
    removeEntryFromZSet,
    getEntryRankFromZSet,
    getTopEntryIdsFromZSet,
    hydrateZSet,
} = require('../utils/redisRanking');

test('computeCompositeScore prioritizes CGPA over marks', () => {
    const studentA = computeCompositeScore(9.8, 500, new Date('2026-01-01T10:00:00Z'));
    const studentB = computeCompositeScore(9.5, 700, new Date('2026-01-01T10:00:00Z'));

    assert.ok(studentA > studentB, 'Higher CGPA must produce higher score regardless of marks');
});

test('computeCompositeScore breaks CGPA ties using marks', () => {
    const studentA = computeCompositeScore(9.5, 680, new Date('2026-01-01T10:00:00Z'));
    const studentB = computeCompositeScore(9.5, 650, new Date('2026-01-01T10:00:00Z'));

    assert.ok(studentA > studentB, 'On identical CGPA, higher marks must win');
});

test('computeCompositeScore breaks identical CGPA and marks ties using earlier timestamp', () => {
    const earlier = new Date('2026-01-01T10:00:00Z');
    const later = new Date('2026-01-01T10:05:00Z');

    const firstStudent = computeCompositeScore(9.5, 600, earlier);
    const secondStudent = computeCompositeScore(9.5, 600, later);

    assert.ok(firstStudent > secondStudent, 'Earlier submission timestamp must win on exact ties');
});

test('syncEntryToZSet executes zAdd on Redis client', async () => {
    let capturedKey = null;
    let capturedMembers = null;

    const mockRedisClient = {
        zAdd: async (key, members) => {
            capturedKey = key;
            capturedMembers = members;
            return 1;
        },
    };

    const entry = {
        _id: 'entry-123',
        cgpa: 9.2,
        marks: 580,
        createdAt: new Date(),
    };

    const res = await syncEntryToZSet(mockRedisClient, 'lb-abc', entry);
    assert.equal(res, true);
    assert.equal(capturedKey, 'lb:lb-abc:zset');
    assert.equal(capturedMembers.length, 1);
    assert.equal(capturedMembers[0].value, 'entry-123');
    assert.ok(capturedMembers[0].score > 92000000);
});

test('getEntryRankFromZSet returns 1-based rank', async () => {
    const mockRedisClient = {
        zRevRank: async (key, member) => {
            if (member === 'entry-top') return 0; // 0-indexed in Redis
            if (member === 'entry-second') return 1;
            return null;
        },
    };

    const rankTop = await getEntryRankFromZSet(mockRedisClient, 'lb-abc', 'entry-top');
    const rankSecond = await getEntryRankFromZSet(mockRedisClient, 'lb-abc', 'entry-second');
    const rankNotFound = await getEntryRankFromZSet(mockRedisClient, 'lb-abc', 'entry-unknown');

    assert.equal(rankTop, 1);
    assert.equal(rankSecond, 2);
    assert.equal(rankNotFound, null);
});

test('hydrateZSet populates Redis sorted set with multiple entries', async () => {
    let hydratedKey = null;
    let hydratedCount = 0;

    const mockRedisClient = {
        zAdd: async (key, members) => {
            hydratedKey = key;
            hydratedCount = members.length;
            return members.length;
        },
        expire: async () => 1,
    };

    const entries = [
        { _id: '1', cgpa: 9.0, marks: 500, createdAt: new Date() },
        { _id: '2', cgpa: 8.5, marks: 600, createdAt: new Date() },
        { _id: '3', cgpa: 9.5, marks: 550, createdAt: new Date() },
    ];

    const success = await hydrateZSet(mockRedisClient, 'lb-hydrate', entries);
    assert.equal(success, true);
    assert.equal(hydratedKey, 'lb:lb-hydrate:zset');
    assert.equal(hydratedCount, 3);
});
