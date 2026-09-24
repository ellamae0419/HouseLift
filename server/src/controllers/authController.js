require('dotenv').config()
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateUserID } = require('../utils/functions');
const { sendOtpSms } = require('../utils/sms');
const { sendOtpEmail } = require('../utils/mailer');

const OTP_TTL_MS = 10 * 60 * 1000;

const maskMobileNumber = (mobileNumber) => mobileNumber.replace(/^(\d{4})\d{5}(\d{2})$/, '$1•••••$2');

const isProduction = process.env.NODE_ENV === 'production';
const refreshCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax',
};

const register = async (req, res) => {
    const { username, email, password, fullName, address, mobileNumber } = req.body;
    if (!username || !email || !password || !fullName || !address || !mobileNumber) {
        return res.status(400).json({ 'message': 'All the fields are required.' });
    }

    try {
        const searchUsername = await global.db.query('SELECT id,username FROM users WHERE username = ?', [username]);
        if (searchUsername[0]) return res.status(409).json({ 'message': "This username is already taken." });

        const searchEmail = await global.db.query('SELECT id,email FROM users WHERE email = ?', [email]);
        if (searchEmail[0]) return res.status(409).json({ 'message': "This email is already taken." });

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = generateUserID(15);

        await global.db.query(
            'INSERT INTO users (id,username,email,password,fullName,address,mobileNumber,isVerified) VALUES (?,?,?,?,?,?,?,?)',
            [userId, username, email, hashedPassword, fullName, address, mobileNumber, 0]
        );

        try {
            await global.db.query(
                'INSERT INTO notifications (title, description, isRead) VALUES (?, ?, 0)',
                ['New user registration', `${username} just signed up and is pending admin approval.`]
            );
        } catch (notifyErr) {
            console.error('[register] Failed to create signup notification:', notifyErr.message);
        }

        // Every user gets their own pet-house device slot right away, so
        // Flood Monitoring can list them immediately (shows "no data yet"
        // until a real ESP32 provisioned with this ID actually connects).
        try {
            await global.db.query(
                'INSERT INTO esp32 (esp32_id, threshold, wifi_ssid, wifi_pass, userId) VALUES (?, ?, ?, ?, ?)',
                [`esp32-${userId}`, 2, '', '', userId]
            );
        } catch (deviceErr) {
            console.error('[register] Failed to create placeholder device:', deviceErr.message);
        }

        res.status(201).json({ 'success': `Account created! An administrator will review and approve your account before you can log in.` });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 'message': 'This username or email is already taken.' });
        }
        res.status(500).json({ 'message': err.message });
    }
};

const login = async (req, res) => {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) return res.status(400).json({ 'message': 'Username (or email) and password are required.' });

    const searchUser = await global.db.query('SELECT * FROM users WHERE username = ? or email = ?', [usernameOrEmail, usernameOrEmail]);
    if (!searchUser[0]) return res.status(401).json({ 'message': 'The username (or email) is invalid.' });

    const match = await bcrypt.compare(password, searchUser[0].password);
    if (match) {
        if (!searchUser[0].isVerified) {
            return res.status(403).json({ 'message': 'Your account is pending admin approval. Please wait for an administrator to confirm your registration before logging in.' });
        }

        const roles = searchUser[0].roles.split(',');

        const accessToken = jwt.sign(
            {"user": {
                "username": searchUser[0].username,
                "roles": roles
            }},
            process.env.ACCESSTOKEN_SECRET,
            { expiresIn: '10s' }
        );
        const refreshToken = jwt.sign(
            { "username": searchUser[0].username },
            process.env.REFRESHTOKEN_SECRET,
            { expiresIn: '10d' }
        );
        await global.db.query('UPDATE users SET refreshToken = ? WHERE id = ?', [refreshToken, searchUser[0].id]);
        res.cookie('jwt', refreshToken, {
            ...refreshCookieOptions,
            maxAge: 24 * 60 * 60 * 1000,
        });

        res.json({ username: searchUser[0].username, email: searchUser[0].email, accessToken });

    } else {
        res.status(401).json({ 'message': 'The password provided is incorrect.' });
    }
};

const logout = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204);
    const refreshToken = cookies.jwt;

    const searchUser = await global.db.query(`SELECT id,username FROM users WHERE refreshToken = "${refreshToken}";`);
    if (!searchUser[0]) {
        res.clearCookie('jwt', refreshCookieOptions)
        return res.sendStatus(204);
    }

    await global.db.query('UPDATE users SET refreshToken = NULL WHERE id = ?', [searchUser[0].id]);

    res.clearCookie('jwt', refreshCookieOptions);
    res.sendStatus(204);
}

const refreshToken = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.status(401).json({ 'message': 'You must be logged in.' });
    const refreshToken = cookies.jwt;

    const searchUser = await global.db.query(`SELECT * FROM users WHERE refreshToken = "${refreshToken}";`);
    if (!searchUser[0]) return res.status(403).json({ 'message': 'Forbidden !' });
    
    jwt.verify(
        refreshToken,
        process.env.REFRESHTOKEN_SECRET,
        (err, decoded) => {
            if (err || searchUser[0].username !== decoded.username) return res.status(403).json({ 'message': 'Forbidden !' });
            const roles = searchUser[0].roles.split(',');

            const accessToken = jwt.sign(
                {"user": {
                    "username": decoded.username,
                    "roles": roles
                }},
                process.env.ACCESSTOKEN_SECRET,
                { expiresIn: '10s' }
            );
            res.json({ username: searchUser[0].username, email: searchUser[0].email, accessToken })
        }
    );
}

const forgotPassword = async (req, res) => {
    const { usernameOrEmail } = req.body;
    if (!usernameOrEmail) return res.status(400).json({ 'message': 'Username, email, or mobile number is required.' });

    try {
        const rows = await global.db.query(
            'SELECT id, username, email, mobileNumber, resetOtpExpires FROM users WHERE username = ? OR email = ? OR mobileNumber = ?',
            [usernameOrEmail, usernameOrEmail, usernameOrEmail]
        );
        const user = rows[0];
        if (!user) return res.status(404).json({ 'message': 'No account found with that username, email, or mobile number.' });

        // An unexpired OTP already went out — resend the same one instead of
        // burning another SMS credit / sending another email on every click.
        if (user.resetOtpExpires && new Date(user.resetOtpExpires) > new Date()) {
            return res.json({ 'message': 'A code was already sent. Check your phone or email, or wait for it to expire to request a new one.' });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const expires = new Date(Date.now() + OTP_TTL_MS);

        await global.db.query('UPDATE users SET resetOtp = ?, resetOtpExpires = ? WHERE id = ?', [otp, expires, user.id]);

        // Prefer SMS when a number is on file, but never leave the user
        // stuck if the SMS provider fails (e.g. not yet approved) — email
        // is always available since it's required at registration.
        if (user.mobileNumber) {
            try {
                await sendOtpSms({ to: user.mobileNumber, otp });
                return res.json({ 'message': `A verification code was sent to ${maskMobileNumber(user.mobileNumber)}.` });
            } catch (smsErr) {
                console.error('[forgotPassword] SMS failed, falling back to email:', smsErr.message);
            }
        }

        await sendOtpEmail({ to: user.email, otp });
        res.json({ 'message': `A verification code was sent to your registered email address.` });
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
};

const resetPassword = async (req, res) => {
    const { usernameOrEmail, otp, newPassword } = req.body;
    if (!usernameOrEmail || !otp || !newPassword) {
        return res.status(400).json({ 'message': 'Username/email/mobile number, code, and new password are required.' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ 'message': 'New password must be at least 8 characters.' });
    }

    try {
        const rows = await global.db.query(
            'SELECT id, resetOtp, resetOtpExpires FROM users WHERE username = ? OR email = ? OR mobileNumber = ?',
            [usernameOrEmail, usernameOrEmail, usernameOrEmail]
        );
        const user = rows[0];
        if (!user) return res.status(404).json({ 'message': 'No account found with that username, email, or mobile number.' });

        const isExpired = !user.resetOtpExpires || new Date(user.resetOtpExpires) < new Date();
        if (!user.resetOtp || user.resetOtp !== otp || isExpired) {
            return res.status(400).json({ 'message': 'Invalid or expired code.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await global.db.query(
            'UPDATE users SET password = ?, resetOtp = NULL, resetOtpExpires = NULL, refreshToken = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );

        res.json({ 'message': 'Password reset. You can now log in with your new password.' });
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
};

module.exports = { register, login, logout, refreshToken, forgotPassword, resetPassword };