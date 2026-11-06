const { sendAlertEmail } = require('./mailer');

// Saves an alert for a house owner and emails it to the address they registered with.
// Every alert the system raises for an owner should come through here, so none of them is
// ever shown on the dashboard without also reaching the owner's inbox.
//   email       false for an alert that does not need an email
//   emailText   the message to send, or a function that is given the owner's first name
//   key         what kind of alert this is; a repeat of the same kind is held back
//   cooldownMs  how long a repeat of the same kind is held back from being emailed
//   dedupeMs    if the owner already has this same alert (same title) newer than this, do nothing at
//               all: no new dashboard row and no email. Stops one flood from filling the list.
// Returns the new alert's id, or null when it was skipped as a repeat.
const createAlert = async ({ userId = null, title, description, email = true, emailText, key, cooldownMs, dedupeMs = 0 }) => {
    if (userId && dedupeMs > 0) {
        const recent = await global.db.query(
            'SELECT id FROM notifications WHERE userId = ? AND title = ? AND createdAt > DATE_SUB(NOW(), INTERVAL ? SECOND) LIMIT 1',
            [userId, title, Math.ceil(dedupeMs / 1000)]
        );
        if (recent[0]) return null;
    }

    const result = await global.db.query(
        'INSERT INTO notifications (title, description, isRead, userId) VALUES (?, ?, 0, ?)',
        [title, description, userId]
    );

    // A notice with no owner (userId null) is admin-only, so there is nobody to email.
    if (userId && email) {
        // Not awaited, and with its own catch, so a slow or failing email service
        // can never hold up the thing that raised the alert.
        global.db.query('SELECT fullName, email FROM users WHERE id = ?', [userId])
            .then((rows) => {
                const owner = rows[0];
                if (!owner || !owner.email) return null;

                const name = owner.fullName ? owner.fullName.split(' ')[0] : 'there';
                const message = typeof emailText === 'function' ? emailText(name) : (emailText || `${title}. ${description}`);
                return sendAlertEmail({ to: owner.email, name, title, message, key: key || title, cooldownMs });
            })
            .catch((err) => console.log('[mailer] Alert email failed:', err.message));
    }

    return Number(result.insertId);
};

module.exports = { createAlert };
