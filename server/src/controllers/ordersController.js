const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { generateUserID } = require('../utils/functions');
const {
    ID_TYPES, SIZES, productPrice, decodeIdImage,
    USERNAME_REGEX, EMAIL_REGEX, PASSWORD_REGEX, NAME_REGEX, MOBILE_REGEX,
} = require('./shopController');
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
            SELECT o.id, o.status, o.houseSize, o.price, o.rejectReason, o.paidAt, o.reviewedAt, o.createdAt,
                   u.id AS userId, u.username, u.fullName, u.email, u.mobileNumber, u.address,
                   v.idType, s.code AS serialCode, s.status AS serialStatus, e.esp32_id AS esp32Id
            FROM orders o
            JOIN users u ON u.id = o.userId
            LEFT JOIN id_verifications v ON v.orderId = o.id
            LEFT JOIN serial_codes s ON s.orderId = o.id
            LEFT JOIN esp32 e ON e.id = s.esp32Id
            ORDER BY o.createdAt DESC, o.id DESC
        `);
        res.json(rows.map((r) => ({ ...r, idTypeLabel: ID_TYPES[r.idType] || r.idType, sizeLabel: SIZES[r.houseSize] || null })));
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

// Ties an order to a device and creates its serial code, inside the caller's transaction. Picks
// the free unit the admin chose, or makes a fresh one whose id and key get flashed into the
// ESP32 (the key is shown once and never again). Throws an error with a status when the unit
// the admin picked has gone.
const createSerial = async (conn, { orderId, userId, requestedUnit }) => {
    let unit;
    let deviceKey = null;
    let code;

    if (requestedUnit) {
        const rows = await conn.query(
            `SELECT e.id, e.esp32_id FROM esp32 e
             WHERE e.id = ? AND e.userId IS NULL AND e.deviceSecret IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM serial_codes s WHERE s.esp32Id = e.id)`,
            [requestedUnit]
        );
        if (!rows[0]) {
            const err = new Error('That unit is no longer available. Pick another one.');
            err.status = 409;
            throw err;
        }
        unit = rows[0];
    } else {
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

    await conn.query('INSERT INTO serial_codes (code, orderId, userId, esp32Id) VALUES (?, ?, ?, ?)', [code, orderId, userId, unit.id]);
    await conn.query('UPDATE orders SET paidAt = COALESCE(paidAt, NOW()) WHERE id = ?', [orderId]);

    return { code, unit: { esp32_id: unit.esp32_id, deviceKey } };
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
        let result;
        try {
            await conn.beginTransaction();
            result = await createSerial(conn, { orderId: order.id, userId: order.userId, requestedUnit });
            await conn.commit();
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }

        res.status(201).json(result);
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
};

// A buyer who has just paid in person. The admin has met them and looked at their ID, so this
// makes the account (already verified), the paid order, the ID record and the serial code
// together, or none of them. The buyer then logs in and enters the serial code to activate.
const registerBuyer = async (req, res) => {
    const { fullName, username, email, mobileNumber, address, password, size, idType, idImage, esp32Id, inquiryId } = req.body || {};

    if (!NAME_REGEX.test(String(fullName || '').trim())) return res.status(400).json({ message: 'Enter the buyer\'s full name (letters only).' });
    if (!USERNAME_REGEX.test(username || '')) return res.status(400).json({ message: 'Username must be 4 to 19 characters, start with a letter, and use only letters, numbers, - or _.' });
    if (!EMAIL_REGEX.test(email || '') || email.length > 75) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (!MOBILE_REGEX.test(mobileNumber || '')) return res.status(400).json({ message: 'Mobile number must be 11 digits starting with 09.' });
    if (!String(address || '').trim() || String(address).length > 255) return res.status(400).json({ message: 'Enter the buyer\'s home address.' });
    if (!PASSWORD_REGEX.test(password || '')) return res.status(400).json({ message: 'Password must be 8 to 24 characters with an uppercase letter, a lowercase letter, a number and a special character (! * @ # $ %).' });
    if (!Object.prototype.hasOwnProperty.call(SIZES, size)) return res.status(400).json({ message: 'Choose a size: Small, Medium or Large.' });
    if (!ID_TYPES[idType]) return res.status(400).json({ message: 'Choose the type of ID you checked.' });

    const image = decodeIdImage(idImage);
    if (!image) return res.status(400).json({ message: 'Add a clear photo of the ID (JPG, PNG or WebP, up to 2 MB).' });

    try {
        const taken = await global.db.query('SELECT username, email FROM users WHERE username = ? OR email = ?', [username, email]);
        if (taken[0]) {
            return res.status(409).json({ message: taken[0].username === username ? 'This username is already taken.' : 'This email is already used by another account.' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const userId = generateUserID(15);

        const conn = await global.db.getConnection();
        let orderId;
        let result;
        try {
            await conn.beginTransaction();
            await conn.query(
                'INSERT INTO users (id, username, email, password, fullName, address, mobileNumber, isVerified, isActivated) VALUES (?,?,?,?,?,?,?,1,0)',
                [userId, username, email, hashed, String(fullName).trim(), String(address).trim(), mobileNumber]
            );
            const order = await conn.query(
                "INSERT INTO orders (userId, houseSize, price, status, reviewedAt, paidAt) VALUES (?, ?, ?, 'approved', NOW(), NOW())",
                [userId, size, productPrice(size)]
            );
            orderId = Number(order.insertId);
            await conn.query(
                'INSERT INTO id_verifications (orderId, idType, mimeType, image) VALUES (?,?,?,?)',
                [orderId, idType, image.mimeType, image.buffer]
            );
            result = await createSerial(conn, { orderId, userId, requestedUnit: esp32Id ? Number(esp32Id) : null });
            await conn.commit();
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }

        // The inquiry this buyer came from, if the admin started from one.
        if (inquiryId) {
            try {
                await global.db.query("UPDATE inquiries SET status = 'bought' WHERE id = ?", [Number(inquiryId)]);
            } catch (inqErr) {
                console.error('[registerBuyer] Failed to mark the inquiry as bought:', inqErr.message);
            }
        }

        res.status(201).json({ orderId, username, ...result });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'This username or email is already taken.' });
        console.error('[registerBuyer]', err.message);
        res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong registering the buyer. Please try again.' });
    }
};

module.exports = { listOrders, getIdImage, approveOrder, rejectOrder, listFreeUnits, issueSerial, registerBuyer };
