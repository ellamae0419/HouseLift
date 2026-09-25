const express = require('express');
const router = express.Router();
const { register, login, logout, refreshToken, forgotPassword, resetPassword } = require('../controllers/authController');
const { loginLimiter, forgotPasswordLimiter, resetPasswordLimiter } = require('../middlewares/rateLimiters');

router.post("/register", register);
router.post("/login", loginLimiter, login);
router.get('/logout', logout);
router.get('/refreshToken', refreshToken);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPassword);

module.exports = router;