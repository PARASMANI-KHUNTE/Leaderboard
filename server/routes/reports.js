const express = require('express');
const router = express.Router();
const { Report } = require('../models/User');
const { auth } = require('../middleware/auth');
const { validateReportSubmit } = require('../middleware/validation');

// Submit a report
router.post('/submit', auth, validateReportSubmit, async (req, res) => {
    const { entryId, reason } = req.body;

    try {
        const report = new Report({
            entryId,
            reporterId: req.user._id,
            reason
        });
        await report.save();

        const io = req.app.get('socketio');
        io.to('admins').emit('globalNotification', {
            type: 'report',
            message: `New report filed: ${reason}`,
            target: '/admin?tab=reports'
        });

        res.status(201).json({ message: 'Report submitted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
