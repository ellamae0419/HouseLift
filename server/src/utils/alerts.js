const { sendAlertSms } = require('./sms');

// Saves an alert for a house owner and texts it to the mobile number they registered with.
// Every alert the system raises for an owner should come through here, so none of them is
// ever shown on the dashboard without also reaching the owner's phone.
//   sms         false for an alert that does not need a text
//   smsText     the text to send, or a function that is given the owner's first name
//   key         what kind of alert this is; a repeat of the same kind is held back
//   cooldownMs  how long a repeat of the same kind is held back from being texted
//   dedupeMs    if the owner already has this same alert (same title) newer than this, do nothing at
//               all: no new dashboard row and no text. Stops one flood from filling the list.
// Returns the new alert's id, or null when it was skipped as a repeat.
const createAlert = async ({ userId = null, title, description, sms = true, smsText, key, cooldownMs, dedupeMs = 0 }) => {
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

    // A notice with no owner (userId null) is admin-only, so there is nobody to text.
    if (userId && sms) {
        // Not awaited, and with its own catch, so a slow or failing text service
        // can never hold up the thing that raised the alert.
        global.db.query('SELECT fullName, mobileNumber FROM users WHERE id = ?', [userId])
            .then((rows) => {
                const owner = rows[0];
                if (!owner || !owner.mobileNumber) return null;

                const name = owner.fullName ? owner.fullName.split(' ')[0] : 'there';
                const message = typeof smsText === 'function' ? smsText(name) : (smsText || `HydroLift: ${title}. ${description}`);
                return sendAlertSms({ to: owner.mobileNumber, message, key: key || title, cooldownMs });
            })
            .catch((err) => console.log('[sms] Alert text failed:', err.message));
    }

    return Number(result.insertId);
};

module.exports = { createAlert };
