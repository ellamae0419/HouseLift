const rateLimit = require('express-rate-limit');

const makeLimiter = (max, message) => rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
});

// Guards password-guessing against a known account.
const loginLimiter = makeLimiter(10, 'Too many login attempts. Please try again in a few minutes.');

// Guards OTP-request spam (and the email quota that comes with it) separately
// from OTP-guessing, which authController already rate-limits per account.
const forgotPasswordLimiter = makeLimiter(5, 'Too many password reset requests. Please try again in a few minutes.');

// A second, IP-scoped layer on top of authController's per-account attempt
// counter — that one stops guessing a single account, this stops one IP from
// spreading guesses across many accounts.
const resetPasswordLimiter = makeLimiter(10, 'Too many attempts. Please try again in a few minutes.');

module.exports = { loginLimiter, forgotPasswordLimiter, resetPasswordLimiter };
