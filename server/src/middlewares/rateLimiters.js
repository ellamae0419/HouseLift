const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Hosting proxies can route each request through a varying number of internal
// hops, so a fixed `trust proxy` hop count may resolve req.ip to a different
// address request to request, splitting one client's traffic across several
// rate-limit buckets. Prefer x-real-ip (a stable, edge-assigned client IP)
// when the host sets it, and fall back to req.ip otherwise.
const keyGenerator = (req) => ipKeyGenerator(req.headers['x-real-ip'] || req.ip);

const makeLimiter = (max, message) => rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
    keyGenerator,
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

// Anyone can send an inquiry, so it is limited per connection to keep someone from
// filling the database with fake ones.
const inquiryLimiter = makeLimiter(8, 'Too many inquiries from this connection. Please try again later.');

// Guards guessing serial codes. Keyed on the signed-in user (not the IP) and
// counting only wrong tries, so a customer who enters the right code first time
// is never blocked, but anyone guessing is stopped after five misses.
const activateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many wrong codes. Please try again in a few minutes.' },
    keyGenerator: (req) => (req.username ? `activate:${req.username}` : ipKeyGenerator(req.headers['x-real-ip'] || req.ip)),
});

// Every test text costs the phone's load, so even an admin can only send a few in a short time.
const testSmsLimiter = makeLimiter(5, 'Too many test texts. Please wait a few minutes.');

module.exports = { loginLimiter, forgotPasswordLimiter, resetPasswordLimiter, inquiryLimiter, activateLimiter, testSmsLimiter };
