require('dotenv').config()
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendOtpEmail } = require('../utils/mailer');

const OTP_TTL_MS = 20 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const isProduction = process.env.NODE_ENV === 'production';
const refreshCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax',
};

const login = async (req, res) => {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) return res.status(400).json({ 'message': 'Username (or email) and password are required.' });

    try {
        const searchUser = await global.db.query('SELECT * FROM users WHERE username = ? or email = ?', [usernameOrEmail, usernameOrEmail]);
        if (!searchUser[0]) return res.status(401).json({ 'message': 'The username (or email) is invalid.' });

        const match = await bcrypt.compare(password, searchUser[0].password);
        if (match) {
            if (!searchUser[0].isVerified) {
                const latest = await global.db.query('SELECT status, rejectReason FROM orders WHERE userId = ? ORDER BY id DESC LIMIT 1', [searchUser[0].id]);
                if (latest[0]?.status === 'rejected') {
                    return res.status(403).json({ 'message': `Your order could not be approved: ${latest[0].rejectReason}. Please contact HydroLift.` });
                }
                return res.status(403).json({ 'message': 'Your order is still being reviewed. We are checking your ID, and you can log in once it is approved.' });
            }

            const roles = searchUser[0].roles.split(',');

            const accessToken = jwt.sign(
                {"user": {
                    "username": searchUser[0].username,
                    "roles": roles,
                    // Customers who ordered online stay locked out of the app until
                    // they enter their serial code. Rows without the column count as
                    // activated, so a database that isn't migrated yet still works.
                    "activated": Number(searchUser[0].isActivated ?? 1) !== 0
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
                maxAge: 10 * 24 * 60 * 60 * 1000, // same lifetime as the refresh token itself
            });

            res.json({ username: searchUser[0].username, email: searchUser[0].email, accessToken });

        } else {
            res.status(401).json({ 'message': 'The password provided is incorrect.' });
        }
    } catch (err) {
        console.error('[login] Sign-in service error:', err.code || 'unknown');
        res.status(503).json({ message: 'The sign-in service is unavailable right now. Please try again later.' });
    }
};

const logout = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204);
    const refreshToken = cookies.jwt;

    const searchUser = await global.db.query('SELECT id,username FROM users WHERE refreshToken = ?', [refreshToken]);
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

    const searchUser = await global.db.query('SELECT * FROM users WHERE refreshToken = ?', [refreshToken]);
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
                    "roles": roles,
                    "activated": Number(searchUser[0].isActivated ?? 1) !== 0
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
    if (!usernameOrEmail) return res.status(400).json({ 'message': 'Username or email is required.' });

    try {
        const rows = await global.db.query(
            'SELECT id, username, email, resetOtpExpires FROM users WHERE username = ? OR email = ?',
            [usernameOrEmail, usernameOrEmail]
        );
        const user = rows[0];
        if (!user) return res.status(404).json({ 'message': 'No account found with that username or email.' });

        // An unexpired OTP already went out — resend the same one instead of
        // sending another email on every click.
        if (user.resetOtpExpires && new Date(user.resetOtpExpires) > new Date()) {
            return res.json({ 'message': 'A code was already sent to your email. Check your inbox, or wait for it to expire to request a new one.' });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const expires = new Date(Date.now() + OTP_TTL_MS);

        await global.db.query('UPDATE users SET resetOtp = ?, resetOtpExpires = ?, resetOtpAttempts = 0 WHERE id = ?', [otp, expires, user.id]);

        await sendOtpEmail({ to: user.email, otp });
        res.json({ 'message': `A verification code was sent to your registered email address.` });
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
};

const resetPassword = async (req, res) => {
    const { usernameOrEmail, otp, newPassword } = req.body;
    if (!usernameOrEmail || !otp || !newPassword) {
        return res.status(400).json({ 'message': 'Username/email, code, and new password are required.' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ 'message': 'New password must be at least 8 characters.' });
    }

    try {
        const rows = await global.db.query(
            'SELECT id, resetOtp, resetOtpExpires, resetOtpAttempts FROM users WHERE username = ? OR email = ?',
            [usernameOrEmail, usernameOrEmail]
        );
        const user = rows[0];
        if (!user) return res.status(404).json({ 'message': 'No account found with that username or email.' });

        const isExpired = !user.resetOtpExpires || new Date(user.resetOtpExpires) < new Date();

        // Too many wrong guesses burns the code, closing the brute-force
        // window instead of leaving it guessable for the rest of the 20 min.
        if (!isExpired && user.resetOtpAttempts >= MAX_OTP_ATTEMPTS) {
            await global.db.query(
                'UPDATE users SET resetOtp = NULL, resetOtpExpires = NULL, resetOtpAttempts = 0 WHERE id = ?',
                [user.id]
            );
            return res.status(400).json({ 'message': 'Too many incorrect attempts. Please request a new code.' });
        }

        if (!user.resetOtp || user.resetOtp !== otp || isExpired) {
            if (!isExpired) {
                await global.db.query('UPDATE users SET resetOtpAttempts = resetOtpAttempts + 1 WHERE id = ?', [user.id]);
            }
            return res.status(400).json({ 'message': 'Invalid or expired code.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await global.db.query(
            'UPDATE users SET password = ?, resetOtp = NULL, resetOtpExpires = NULL, resetOtpAttempts = 0, refreshToken = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );

        res.json({ 'message': 'Password reset. You can now log in with your new password.' });
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
};

module.exports = { login, logout, refreshToken, forgotPassword, resetPassword };
