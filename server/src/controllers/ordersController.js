const crypto = require('crypto');
const { ID_TYPES } = require('./shopController');
const { sendOrderApprovedEmail } = require('../utils/mailer');

// No 0/O, 1/I/L: a code read off a sticker or over the phone can't be misheard.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const makeSerialCode = () => {
    const pick = (n) => Array.from({ length: n }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');
    return `HL-${pick(4)}-${pick(4)}-${pick(4)}`;
};

const listOrders = async (req, res) => {
    try {
        const rows = await global.db.query(`
            SELECT o.id, o.status, o.price, o.rejectReason, o.paidAt, o.reviewedAt, o.createdAt,
                   u.id AS userId, u.username, u.fullName, u.email, u.mobileNumber, u.address,
                   v.idType, s.code AS serialCode, s.status AS serialStatus, e.esp32_id AS esp32Id
            FROM orders o
            JOIN users u ON u.id = o.userId
            LEFT JOIN id_verifications v ON v.orderId = o.id
            LEFT JOIN serial_codes s ON s.orderId = o.id
            LEFT JOIN esp32 e ON e.id = s.esp32Id
            ORDER BY o.createdAt DESC, o.id DESC
        `);
        res.json(rows.map((r) => ({ ...r, idTypeLabel: ID_TYPES[r.idType] || r.idType })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// The only place an ID photo ever leaves the database, and only to an admin.
const getIdImage = async (req, res) => {
    try {
        const rows = await global.db.query('SELECT mimeType, image FROM id_verifications WHERE orderId = ?', [req.params.id]);
        if (!rows[0]) return res.status(404).json({ message: 'No ID photo found for this order.' });

        res.set({
            'Content-Type': rows[0].mimeType,
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
        });
        res.send(rows[0].image);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const loadOrder = async (id) => {
    const rows = await global.db.query(
        'SELECT o.id, o.status, o.userId, o.paidAt, u.username, u.email FROM orders o JOIN users u ON u.id = o.userId WHERE o.id = ?',
        [id]
    );
    return rows[0];
};

const approveOrder = async (req, res) => {
    try {
        const order = await loadOrder(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found.' });
        if (order.status !== 'pending') return res.status(409).json({ message: `This order was already ${order.status}.` });

        await global.db.query("UPDATE orders SET status = 'approved', rejectReason = NULL, reviewedAt = NOW() WHERE id = ? AND status = 'pending'", [order.id]);
        await global.db.query('UPDATE users SET isVerified = 1 WHERE id = ?', [order.userId]);

        try {
            await sendOrderApprovedEmail({ to: order.email, username: order.username });
        } catch (mailErr) {
            console.error('[approveOrder] Failed to send approval email:', mailErr.message);
        }

        res.json({ message: `Order #${order.id} approved. ${order.username} can now log in.` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const rejectOrder = async (req, res) => {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'Give a short reason so the customer knows what to fix.' });
    if (reason.length > 255) return res.status(400).json({ message: 'Keep the reason under 255 characters.' });

    try {
        const order = await loadOrder(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found.' });
        if (order.status !== 'pending') return res.status(409).json({ message: `This order was already ${order.status}.` });

        await global.db.query("UPDATE orders SET status = 'rejected', rejectReason = ?, reviewedAt = NOW() WHERE id = ? AND status = 'pending'", [reason, order.id]);
        res.json({ message: `Order #${order.id} rejected.` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Units already provisioned (they have a device key) that no customer owns and
// no other order has claimed. An admin can pick one for the customer.
const listFreeUnits = async (req, res) => {
    try {
        const rows = await global.db.query(`
            SELECT e.id, e.esp32_id
            FROM esp32 e
            WHERE e.userId IS NULL
              AND e.deviceSecret IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM serial_codes s WHERE s.esp32Id = e.id)
            ORDER BY e.id
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Called when the customer pays in person and takes the unit. It records the
// payment, ties the order to a device and creates the serial code in one go.
const issueSerial = async (req, res) => {
    const requestedUnit = req.body?.esp32Id ? Number(req.body.esp32Id) : null;

    try {
        const order = await loadOrder(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found.' });
        if (order.status !== 'approved') return res.status(409).json({ message: 'Approve the customer\'s ID before issuing a serial code.' });

        const existing = await global.db.query('SELECT id FROM serial_codes WHERE orderId = ?', [order.id]);
        if (existing[0]) return res.status(409).json({ message: 'A serial code was already issued for this order.' });

        const conn = await global.db.getConnection();
        let unit;
        let deviceKey = null;
        let code;
        try {
            await conn.beginTransaction();

            if (requestedUnit) {
                const rows = await conn.query(
                    `SELECT e.id, e.esp32_id FROM esp32 e
                     WHERE e.id = ? AND e.userId IS NULL AND e.deviceSecret IS NOT NULL
                       AND NOT EXISTS (SELECT 1 FROM serial_codes s WHERE s.esp32Id = e.id)`,
                    [requestedUnit]
                );
                if (!rows[0]) {
                    await conn.rollback();
                    return res.status(409).json({ message: 'That unit is no longer available. Pick another one.' });
                }
                unit = rows[0];
            } else {
                // A fresh unit: its id and key are what gets flashed into the
                // ESP32. The key is shown once, here, and never again.
                const esp32Id = `esp32-${crypto.randomBytes(8).toString('hex')}`;
                deviceKey = crypto.randomBytes(32).toString('hex');
                const created = await conn.query(
                    'INSERT INTO esp32 (esp32_id, threshold, wifi_ssid, wifi_pass, deviceSecret) VALUES (?, 2, ?, ?, ?)',
                    [esp32Id, '', '', deviceKey]
                );
                unit = { id: Number(created.insertId), esp32_id: esp32Id };
            }

            for (let attempt = 0; attempt < 5 && !code; attempt++) {
                const candidate = makeSerialCode();
                const clash = await conn.query('SELECT id FROM serial_codes WHERE code = ?', [candidate]);
                if (!clash[0]) code = candidate;
            }
            if (!code) throw new Error('Could not generate a unique serial code. Try again.');

            await conn.query('INSERT INTO serial_codes (code, orderId, userId, esp32Id) VALUES (?, ?, ?, ?)', [code, order.id, order.userId, unit.id]);
            await conn.query('UPDATE orders SET paidAt = COALESCE(paidAt, NOW()) WHERE id = ?', [order.id]);
            await conn.commit();
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }

        res.status(201).json({ code, unit: { esp32_id: unit.esp32_id, deviceKey } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { listOrders, getIdImage, approveOrder, rejectOrder, listFreeUnits, issueSerial };
