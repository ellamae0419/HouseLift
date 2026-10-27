require('dotenv').config()

const getAllUsers = async (req, res) => {
    const users = await global.db.query(`
        SELECT u.id, u.username, u.email, u.roles, u.fullName, u.address, u.mobileNumber, u.isVerified, u.createdAt,
               (SELECT COUNT(*) FROM orders o WHERE o.userId = u.id AND o.status = 'pending') AS pendingOrders,
               (SELECT s.code FROM serial_codes s WHERE s.userId = u.id ORDER BY s.id DESC LIMIT 1) AS serialCode,
               (SELECT s.status FROM serial_codes s WHERE s.userId = u.id ORDER BY s.id DESC LIMIT 1) AS serialStatus
        FROM users u;
    `);
    if (!users[0]) return res.status(204).json({ 'message': 'No users found' });

    // COUNT(*) comes back as a BigInt, which res.json() refuses to serialize.
    res.json(users.map(({ pendingOrders, ...user }) => ({ ...user, hasPendingOrder: Number(pendingOrders) > 0 })));
};

const getAllHouses = async (req, res) => {
    try {
        // lastSeenAt lets the caller work out online/offline per house in one
        // request, instead of asking for each device's status separately.
        const rows = await global.db.query(`
            SELECT u.id AS userId, u.username, u.isVerified, e.esp32_id, e.threshold,
                   e.lastSeenAt,
                   (e.lastSeenAt IS NOT NULL AND e.lastSeenAt >= DATE_SUB(NOW(), INTERVAL 30 SECOND)) AS online
            FROM users u
            LEFT JOIN esp32 e ON e.userId = u.id
            WHERE u.roles NOT LIKE '%admin%' AND u.isActivated = 1
            ORDER BY u.createdAt DESC
        `);
        // The driver returns the boolean expression as a BigInt, which
        // res.json() refuses to serialize — coerce it before sending.
        res.json(rows.map((r) => ({ ...r, online: Number(r.online) === 1 })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const bcrypt = require('bcrypt');
const { generateUserID } = require('../utils/functions');
const { sendApprovalEmail } = require('../utils/mailer');

const approveUser = async (req, res) => {
    const id = req.params.id;

    try {
        const rows = await global.db.query('SELECT id, username, email, isVerified FROM users WHERE id = ?', [id]);
        if (!rows[0]) return res.status(404).json({ message: 'User not found' });

        const user = rows[0];
        if (user.isVerified) return res.json({ message: 'This user is already approved.' });

        // A customer who ordered online is approved by checking their ID in
        // Orders. Approving here would skip that check.
        const pendingOrder = await global.db.query("SELECT id FROM orders WHERE userId = ? AND status = 'pending' LIMIT 1", [id]);
        if (pendingOrder[0]) return res.status(409).json({ message: 'This person has an order waiting. Check their ID in Orders to approve them.' });

        await global.db.query('UPDATE users SET isVerified = 1 WHERE id = ?', [id]);

        try {
            await sendApprovalEmail({ to: user.email, username: user.username });
        } catch (mailErr) {
            console.error('[approveUser] Failed to send approval email:', mailErr.message);
        }

        res.json({ message: `${user.username} has been approved.` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getOwnProfile = async (req, res) => {
    try {
        const rows = await global.db.query(
            'SELECT id, username, email, fullName, address, mobileNumber, roles, createdAt FROM users WHERE username = ?',
            [req.username]
        );
        if (!rows[0]) return res.status(404).json({ message: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateOwnProfile = async (req, res) => {
    const { username, email, fullName, address, mobileNumber, password } = req.body;

    try {
        const rows = await global.db.query('SELECT * FROM users WHERE username = ?', [req.username]);
        if (!rows[0]) return res.status(404).json({ message: 'User not found' });
        const current = rows[0];

        if (username && username !== current.username) {
            const existing = await global.db.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, current.id]);
            if (existing[0]) return res.status(409).json({ message: 'This username is already taken.' });
        }
        if (email && email !== current.email) {
            const existing = await global.db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, current.id]);
            if (existing[0]) return res.status(409).json({ message: 'This email is already taken.' });
        }

        const nextPasswordHash = password ? await bcrypt.hash(password, 10) : current.password;

        await global.db.query(
            'UPDATE users SET username = ?, email = ?, fullName = ?, address = ?, mobileNumber = ?, password = ? WHERE id = ?',
            [
                username || current.username,
                email || current.email,
                fullName ?? current.fullName,
                address ?? current.address,
                mobileNumber ?? current.mobileNumber,
                nextPasswordHash,
                current.id,
            ]
        );

        res.json({ message: 'Profile updated', username: username || current.username, email: email || current.email });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'This username or email is already taken.' });
        }
        res.status(500).json({ message: err.message });
    }
};

const MOBILE_REGEX = /^09\d{9}$/;

// Accounts are only ever created here, by an admin, who then gives the login
// to the house owner. The full name and mobile number matter: they are who
// the flood text goes to.
const createUser = async (req, res) => {
    const { username, email, password, roles, fullName, address, mobileNumber } = req.body;
    if (!username || !email || !password || !fullName?.trim() || !address?.trim() || !mobileNumber) {
        return res.status(400).json({ message: 'Full name, username, email, password, address and mobile number are required' });
    }
    if (!MOBILE_REGEX.test(mobileNumber)) {
        return res.status(400).json({ message: 'Mobile number must be 11 digits starting with 09.' });
    }

    console.log(`[usersController] createUser called with username=${username}, email=${email}`);

    try {
        const existingUser = await global.db.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
        console.log('[usersController] existingUser query result:', existingUser && existingUser[0]);
        if (existingUser[0]) return res.status(409).json({ message: 'Username or email already exists' });

        const hashed = await bcrypt.hash(password, 10);
        const id = generateUserID(15);
        const roleStr = roles && Array.isArray(roles) ? roles.join(',') : (roles || 'user');

        // Accounts an admin creates directly are already vouched for — no separate approval step needed.
        await global.db.query(
            'INSERT INTO users (id, username, email, password, roles, fullName, address, mobileNumber, isVerified) VALUES (?,?,?,?,?,?,?,?,1)',
            [id, username, email, hashed, roleStr, fullName.trim(), address.trim(), mobileNumber]
        );

        console.log(`[usersController] inserted user id=${id}`);

        // Every house owner gets their own pet-house device slot right away, so
        // Flood Monitoring can list them immediately (shows "no data yet" until
        // a real ESP32 provisioned with this ID actually connects).
        if (!roleStr.includes('admin')) {
            try {
                await global.db.query(
                    'INSERT INTO esp32 (esp32_id, threshold, wifi_ssid, wifi_pass, userId) VALUES (?, ?, ?, ?, ?)',
                    [`esp32-${id}`, 2, '', '', id]
                );
            } catch (deviceErr) {
                // Don't leave an account behind that has no house attached.
                await global.db.query('DELETE FROM users WHERE id = ?', [id]);
                throw deviceErr;
            }
        }

        res.status(201).json({ message: 'User created', id, username, email, roles: roleStr });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateUser = async (req, res) => {
    const id = req.params.id;
    const { username, email, roles, fullName, address, mobileNumber } = req.body;

    if (!id) return res.status(400).json({ message: 'User id required' });
    if (mobileNumber && !MOBILE_REGEX.test(mobileNumber)) {
        return res.status(400).json({ message: 'Mobile number must be 11 digits starting with 09.' });
    }

    try {
        const user = await global.db.query('SELECT * FROM users WHERE id = ?', [id]);
        if (!user[0]) return res.status(404).json({ message: 'User not found' });

        const roleStr = roles && Array.isArray(roles) ? roles.join(',') : roles;

        await global.db.query(
            'UPDATE users SET username = ?, email = ?, roles = ?, fullName = ?, address = ?, mobileNumber = ? WHERE id = ?',
            [
                username || user[0].username,
                email || user[0].email,
                roleStr || user[0].roles,
                fullName?.trim() || user[0].fullName,
                address?.trim() || user[0].address,
                mobileNumber || user[0].mobileNumber,
                id,
            ]
        );

        res.json({ message: 'User updated' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Username or email already exists' });
        }
        res.status(500).json({ message: err.message });
    }
};

const deleteUser = async (req, res) => {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: 'User id required' });

    try {
        // The device row isn't cascaded from users, so without this it would
        // be left orphaned. Its readings and lift events do cascade from the
        // device, so they go with it.
        await global.db.query('DELETE FROM esp32 WHERE userId = ?', [id]);
        await global.db.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Turns a code typed in any casing, with or without dashes or spaces, into the
// stored HL-XXXX-XXXX-XXXX form. Anything else can't be a real code.
const normalizeSerial = (input) => {
    const clean = String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length !== 14 || !clean.startsWith('HL')) return null;
    return `HL-${clean.slice(2, 6)}-${clean.slice(6, 10)}-${clean.slice(10, 14)}`;
};

// The customer enters the serial code they were given with the unit. It only
// works for the account the code was issued to, and it links that account to
// the device the code belongs to.
const activateDevice = async (req, res) => {
    const code = normalizeSerial(req.body?.serial);
    if (!code) return res.status(400).json({ message: 'That is not a valid serial code. It looks like HL-XXXX-XXXX-XXXX.' });

    try {
        const users = await global.db.query('SELECT id, isActivated FROM users WHERE username = ?', [req.username]);
        const user = users[0];
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.isActivated) return res.status(409).json({ message: 'Your HydroLift is already activated.' });

        const serials = await global.db.query('SELECT id, userId, esp32Id, status FROM serial_codes WHERE code = ?', [code]);
        const serial = serials[0];
        // The same answer for "no such code" and "someone else's code", so a
        // guess never reveals that a code exists.
        if (!serial || serial.userId !== user.id) return res.status(404).json({ message: 'That serial code is not valid for your account.' });
        if (serial.status !== 'issued') return res.status(409).json({ message: 'This serial code was already used.' });

        // Claim the code first. If two requests race, only one gets a changed row.
        const claim = await global.db.query("UPDATE serial_codes SET status = 'redeemed', redeemedAt = NOW() WHERE id = ? AND status = 'issued'", [serial.id]);
        if (Number(claim.affectedRows) !== 1) return res.status(409).json({ message: 'This serial code was already used.' });

        const link = await global.db.query('UPDATE esp32 SET userId = ? WHERE id = ? AND userId IS NULL', [user.id, serial.esp32Id]);
        if (Number(link.affectedRows) !== 1) {
            await global.db.query("UPDATE serial_codes SET status = 'issued', redeemedAt = NULL WHERE id = ?", [serial.id]);
            return res.status(409).json({ message: 'This unit is already linked to another account. Please contact HydroLift.' });
        }

        await global.db.query('UPDATE users SET isActivated = 1 WHERE id = ?', [user.id]);

        try {
            await global.db.query(
                'INSERT INTO notifications (title, description, isRead, userId) VALUES (?, ?, 0, ?)',
                ['HydroLift activated', 'Your HydroLift is linked to your account. Water level and lift activity will appear once the unit is online.', user.id]
            );
        } catch (notifyErr) {
            console.error('[activateDevice] Failed to create activation notification:', notifyErr.message);
        }

        res.json({ message: 'Your HydroLift is activated.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getAllUsers, getAllHouses, createUser, updateUser, deleteUser, getOwnProfile, updateOwnProfile, approveUser, activateDevice };