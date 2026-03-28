const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const authModule = require('../middleware/auth');
const validation = require('../middleware/validation');
const { User, Report, Feedback } = require('../models/User');
const reportsRouter = require('../routes/reports');
const feedbackRouter = require('../routes/feedback');

const originalJwtVerify = jwt.verify;
const originalFindById = User.findById;
const originalReportSave = Report.prototype.save;
const originalFeedbackSave = Feedback.prototype.save;

function restoreStubs() {
    jwt.verify = originalJwtVerify;
    User.findById = originalFindById;
    Report.prototype.save = originalReportSave;
    Feedback.prototype.save = originalFeedbackSave;
}

test.afterEach(() => {
    restoreStubs();
});

function createApp(routePath, handlers, { socketio } = {}) {
    const app = express();
    app.use(express.json());
    app.set('socketio', socketio || { to: () => ({ emit: () => {} }) });
    app.post(routePath, ...handlers, (req, res) => {
        res.status(200).json({
            ok: true,
            userId: req.user ? String(req.user._id || req.user.id) : null,
        });
    });
    app.put(routePath, ...handlers, (req, res) => {
        res.status(200).json({ ok: true });
    });
    return app;
}

test('getTokenFromRequest prefers bearer token over cookie token', () => {
    const req = {
        header: () => 'Bearer bearer-token',
        cookies: { token: 'cookie-token' },
    };

    const token = authModule.getTokenFromRequest(req);

    assert.equal(token, 'bearer-token');
});

test('auth middleware rejects requests without a token', async () => {
    const app = createApp('/secure', [authModule.auth]);

    const res = await request(app).post('/secure').send({});

    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'No token, authorization denied');
});

test('auth middleware accepts a valid bearer token and attaches the user', async () => {
    jwt.verify = () => ({ id: '507f1f77bcf86cd799439011' });
    User.findById = async () => ({
        _id: '507f1f77bcf86cd799439011',
        isBanned: false,
        isAdmin: false,
    });

    const app = createApp('/secure', [authModule.auth]);
    const res = await request(app)
        .post('/secure')
        .set('Authorization', 'Bearer valid-token')
        .send({});

    assert.equal(res.status, 200);
    assert.equal(res.body.userId, '507f1f77bcf86cd799439011');
});

test('auth middleware rejects banned users even with a valid token', async () => {
    jwt.verify = () => ({ id: '507f1f77bcf86cd799439011' });
    User.findById = async () => ({
        _id: '507f1f77bcf86cd799439011',
        isBanned: true,
        isAdmin: false,
    });

    const app = createApp('/secure', [authModule.auth]);
    const res = await request(app)
        .post('/secure')
        .set('Authorization', 'Bearer valid-token')
        .send({});

    assert.equal(res.status, 403);
    assert.equal(res.body.message, 'Your account has been banned');
});

test('validateLeaderboardEntryEdit rejects empty edit payloads', async () => {
    const app = createApp('/edit', validation.validateLeaderboardEntryEdit);
    const res = await request(app).put('/edit').send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'Validation failed');
    assert.match(res.body.errors[0], /At least one editable field is required/);
});

test('validateLeaderboardEntryEdit rejects out-of-range CGPA values', async () => {
    const app = createApp('/edit', validation.validateLeaderboardEntryEdit);
    const res = await request(app).put('/edit').send({ cgpa: 12 });

    assert.equal(res.status, 400);
    assert.ok(res.body.errors.includes('CGPA must be between 0 and 10'));
});

test('validateLeaderboardEntryEdit accepts null marks for valid edits', async () => {
    const app = createApp('/edit', validation.validateLeaderboardEntryEdit);
    const res = await request(app).put('/edit').send({ name: 'Valid Name', marks: null });

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
});

test('reports route rejects invalid entry ids before persistence', async () => {
    jwt.verify = () => ({ id: '507f1f77bcf86cd799439011' });
    User.findById = async () => ({
        _id: '507f1f77bcf86cd799439011',
        displayName: 'Tester',
        isBanned: false,
    });

    let saved = false;
    Report.prototype.save = async function save() {
        saved = true;
    };

    const app = express();
    app.use(express.json());
    app.set('socketio', { to: () => ({ emit: () => {} }) });
    app.use('/api/reports', reportsRouter);

    const res = await request(app)
        .post('/api/reports/submit')
        .set('Authorization', 'Bearer valid-token')
        .send({ entryId: 'bad-id', reason: 'Fake Name' });

    assert.equal(res.status, 400);
    assert.equal(saved, false);
});

test('reports route accepts valid submissions and emits admin notification', async () => {
    jwt.verify = () => ({ id: '507f1f77bcf86cd799439011' });
    User.findById = async () => ({
        _id: '507f1f77bcf86cd799439011',
        displayName: 'Tester',
        isBanned: false,
    });

    let emitted = null;
    Report.prototype.save = async function save() {
        return this;
    };

    const app = express();
    app.use(express.json());
    app.set('socketio', {
        to: (room) => ({
            emit: (event, payload) => {
                emitted = { room, event, payload };
            },
        }),
    });
    app.use('/api/reports', reportsRouter);

    const res = await request(app)
        .post('/api/reports/submit')
        .set('Authorization', 'Bearer valid-token')
        .send({ entryId: '507f1f77bcf86cd799439012', reason: 'Fake Name' });

    assert.equal(res.status, 201);
    assert.equal(res.body.message, 'Report submitted successfully');
    assert.deepEqual(emitted, {
        room: 'admins',
        event: 'globalNotification',
        payload: {
            type: 'report',
            message: 'New report filed: Fake Name',
            target: '/admin?tab=reports',
        },
    });
});

test('feedback route rejects empty submissions before persistence', async () => {
    jwt.verify = () => ({ id: '507f1f77bcf86cd799439011' });
    User.findById = async () => ({
        _id: '507f1f77bcf86cd799439011',
        displayName: 'Tester',
        isBanned: false,
    });

    let saved = false;
    Feedback.prototype.save = async function save() {
        saved = true;
    };

    const app = express();
    app.use(express.json());
    app.set('socketio', { to: () => ({ emit: () => {} }) });
    app.use('/api/feedback', feedbackRouter);

    const res = await request(app)
        .post('/api/feedback/submit')
        .set('Authorization', 'Bearer valid-token')
        .send({ text: '   ' });

    assert.equal(res.status, 400);
    assert.equal(saved, false);
});

test('feedback route accepts valid submissions and emits admin notification', async () => {
    jwt.verify = () => ({ id: '507f1f77bcf86cd799439011' });
    User.findById = async () => ({
        _id: '507f1f77bcf86cd799439011',
        displayName: 'Tester',
        isBanned: false,
    });

    let emitted = null;
    Feedback.prototype.save = async function save() {
        return this;
    };

    const app = express();
    app.use(express.json());
    app.set('socketio', {
        to: (room) => ({
            emit: (event, payload) => {
                emitted = { room, event, payload };
            },
        }),
    });
    app.use('/api/feedback', feedbackRouter);

    const res = await request(app)
        .post('/api/feedback/submit')
        .set('Authorization', 'Bearer valid-token')
        .send({ text: 'Great platform' });

    assert.equal(res.status, 201);
    assert.equal(res.body.message, 'Feedback submitted successfully');
    assert.deepEqual(emitted, {
        room: 'admins',
        event: 'globalNotification',
        payload: {
            type: 'info',
            message: 'New feedback from Tester!',
            target: '/admin?tab=feedback',
        },
    });
});
