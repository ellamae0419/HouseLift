const { getUserIdByUsername } = require('../utils/devices');

const LIST_LIMIT_DEFAULT = 10;
const LIST_LIMIT_MAX = 50;

const isAdmin = (req) => Array.isArray(req.roles) && req.roles.includes('admin');

// Every notification has exactly one reader. A real userId means "this
// user's house alert"; NULL means an admin-only notice, like a pending
// signup. Admins see everything so they can monitor all houses; regular
// users see only their own rows and never the admin notices.
const buildScope = async (req) => {
    if (isAdmin(req)) return { where: '', params: [] };

    const userId = await getUserIdByUsername(req.username);
    // An unknown username should see nothing rather than everything.
    if (!userId) return { where: 'WHERE 1 = 0', params: [] };

    return { where: 'WHERE userId = ?', params: [userId] };
};

const listNotifications = async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const requestedLimit = parseInt(req.query.limit, 10) || LIST_LIMIT_DEFAULT;
    const limit = Math.min(Math.max(requestedLimit, 1), LIST_LIMIT_MAX);
    const offset = (page - 1) * limit;

    try {
        const { where, params } = await buildScope(req);

        const rows = await global.db.query(
            `SELECT id, title, description, isRead, createdAt FROM notifications ${where} ORDER BY createdAt DESC, id DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        const totalResult = await global.db.query(
            `SELECT COUNT(*) AS total FROM notifications ${where}`,
            params
        );
        const unreadResult = await global.db.query(
            `SELECT COUNT(*) AS unreadCount FROM notifications ${where}${where ? ' AND' : ' WHERE'} isRead = 0`,
            params
        );

        const total = Number(totalResult?.[0]?.total || 0);
        const unreadCount = Number(unreadResult?.[0]?.unreadCount || 0);

        res.status(200).json({
            data: rows,
            unreadCount,
            pagination: {
                page,
                limit,
                total,
                pageCount: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const createNotification = async (req, res) => {
    const title = req.body?.title?.trim();
    const description = req.body?.description?.trim();
    // Left out on purpose by existing callers (e.g. the signup notice), which
    // keeps those working as admin-only notices.
    const userId = req.body?.userId || null;

    if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required.' });
    }

    try {
        const result = await global.db.query(
            'INSERT INTO notifications (title, description, isRead, userId) VALUES (?, ?, 0, ?)',
            [title, description, userId]
        );

        const created = await global.db.query(
            'SELECT id, title, description, isRead, createdAt FROM notifications WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            message: 'Notification created.',
            notification: created?.[0] || null,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// A user clears only their own rows, an admin only the admin notices — so an
// admin reading a house alert never clears that user's unread badge.
const markAllNotificationsAsRead = async (req, res) => {
    try {
        if (isAdmin(req)) {
            await global.db.query('UPDATE notifications SET isRead = 1 WHERE isRead = 0 AND userId IS NULL');
        } else {
            const userId = await getUserIdByUsername(req.username);
            if (!userId) return res.status(404).json({ message: 'User not found' });
            await global.db.query('UPDATE notifications SET isRead = 1 WHERE isRead = 0 AND userId = ?', [userId]);
        }
        res.status(200).json({ message: 'All notifications marked as read.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    listNotifications,
    createNotification,
    markAllNotificationsAsRead,
};
