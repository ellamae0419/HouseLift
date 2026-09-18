const LIST_LIMIT_DEFAULT = 10;
const LIST_LIMIT_MAX = 50;

const listNotifications = async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const requestedLimit = parseInt(req.query.limit, 10) || LIST_LIMIT_DEFAULT;
    const limit = Math.min(Math.max(requestedLimit, 1), LIST_LIMIT_MAX);
    const offset = (page - 1) * limit;

    try {
        const rows = await global.db.query(
            'SELECT id, title, description, isRead, createdAt FROM notifications ORDER BY createdAt DESC, id DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );
        const totalResult = await global.db.query('SELECT COUNT(*) AS total FROM notifications');
        const unreadResult = await global.db.query('SELECT COUNT(*) AS unreadCount FROM notifications WHERE isRead = 0');

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

    if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required.' });
    }

    try {
        const result = await global.db.query(
            'INSERT INTO notifications (title, description, isRead) VALUES (?, ?, 0)',
            [title, description]
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

const markAllNotificationsAsRead = async (_req, res) => {
    try {
        await global.db.query('UPDATE notifications SET isRead = 1 WHERE isRead = 0');
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
