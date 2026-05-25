const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// GET /api/notifications — liste des notifications de l'utilisateur
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/notifications/mark-read — marquer toutes comme lues
router.put('/mark-read', protect, async (req, res) => {
    try {
        await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
        res.json({ message: 'Notifications marquées comme lues' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
