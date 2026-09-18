require('dotenv').config()

const getAllUsers = async (req, res) => {
    const users = await global.db.query(`SELECT id, username, email, roles, createdAt FROM users;`);
    if (!users[0]) return res.status(204).json({ 'message': 'No users found' });

    res.json(users);
};

const bcrypt = require('bcrypt');
const { generateUserID } = require('../utils/functions');

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

        await global.db.query('INSERT INTO users (id, username, email, password, roles) VALUES (?,?,?,?,?)', [id, username, email, hashed, roleStr]);

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

module.exports = { getAllUsers, createUser, updateUser, deleteUser };