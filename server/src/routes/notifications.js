const express = require('express');
const router = express.Router();
const checkRoles = require('../middlewares/checkRoles');
const {
    listNotifications,
    createNotification,
    markAllNotificationsAsRead,
} = require('../controllers/notificationsController');

router.get('/', checkRoles('user', 'admin'), listNotifications);
router.post('/', checkRoles('user', 'admin'), createNotification);
router.patch('/read-all', checkRoles('user', 'admin'), markAllNotificationsAsRead);

module.exports = router;
