require('dotenv').config()

const getAllUsers = async (req, res) => {
    const users = await global.db.query(`SELECT id, username, email, roles, isVerified, createdAt FROM users;`);
    if (!users[0]) return res.status(204).json({ 'message': 'No users found' });

    res.json(users);
};

const getAllHouses = async (req, res) => {
    try {
        const rows = await global.db.query(`
            SELECT u.id AS userId, u.username, u.isVerified, e.esp32_id, e.threshold
            FROM users u
            LEFT JOIN esp32 e ON e.userId = u.id
            WHERE u.roles NOT LIKE '%admin%'
            ORDER BY u.createdAt DESC
        `);
        res.json(rows);
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

const createUser = async (req, res) => {
    const { username, email, password, roles } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: 'username, email and password are required' });

    console.log(`[usersController] createUser called with username=${username}, email=${email}`);

    try {
        const existingUser = await global.db.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
        console.log('[usersController] existingUser query result:', existingUser && existingUser[0]);
        if (existingUser[0]) return res.status(409).json({ message: 'Username or email already exists' });

        const hashed = await bcrypt.hash(password, 10);
        const id = generateUserID(15);
        const roleStr = roles && Array.isArray(roles) ? roles.join(',') : (roles || 'user');

        // Accounts an admin creates directly are already vouched for — no separate approval step needed.
        await global.db.query('INSERT INTO users (id, username, email, password, roles, isVerified) VALUES (?,?,?,?,?,1)', [id, username, email, hashed, roleStr]);

        console.log(`[usersController] inserted user id=${id}`);

        res.status(201).json({ message: 'User created', id, username, email, roles: roleStr });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateUser = async (req, res) => {
    const id = req.params.id;
    const { username, email, roles } = req.body;

    if (!id) return res.status(400).json({ message: 'User id required' });

    try {
        const user = await global.db.query('SELECT * FROM users WHERE id = ?', [id]);
        if (!user[0]) return res.status(404).json({ message: 'User not found' });

        const roleStr = roles && Array.isArray(roles) ? roles.join(',') : roles;

        await global.db.query('UPDATE users SET username = ?, email = ?, roles = ? WHERE id = ?', [username || user[0].username, email || user[0].email, roleStr || user[0].roles, id]);

        res.json({ message: 'User updated' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const deleteUser = async (req, res) => {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: 'User id required' });

    try {
        await global.db.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getAllUsers, getAllHouses, createUser, updateUser, deleteUser, getOwnProfile, updateOwnProfile, approveUser };