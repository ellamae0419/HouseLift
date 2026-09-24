const SEMAPHORE_URL = 'https://api.semaphore.co/api/v4/messages';

const isConfigured = () => Boolean(process.env.SEMAPHORE_API_KEY);

const sendOtpSms = async ({ to, otp }) => {
    if (!isConfigured()) {
        console.log('\x1b[33m%s\x1b[0m', `[sms] SEMAPHORE_API_KEY not configured — skipping SMS.`);
        console.log('\x1b[36m%s\x1b[0m', `[sms] OTP for ${to} is ${otp} (printed here since SMS isn't configured).`);
        return;
    }

    const body = new URLSearchParams({
        apikey: process.env.SEMAPHORE_API_KEY,
        number: to,
        message: `Your HydroLift password reset code is ${otp}. It expires in 10 minutes. If you didn't request this, ignore this message.`,
    });
    if (process.env.SEMAPHORE_SENDER_NAME) {
        body.set('sendername', process.env.SEMAPHORE_SENDER_NAME);
    }

    const response = await fetch(SEMAPHORE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    // Semaphore returns JSON on success but plain text/HTML for some error
    // cases (e.g. an unapproved account) — read as text first so those
    // messages are never silently lost as "null".
    const rawText = await response.text();
    let data;
    try { data = JSON.parse(rawText); } catch { data = rawText; }

    if (!response.ok) {
        const detail = typeof data === 'string' ? data.trim() : JSON.stringify(data);
        throw new Error(`Semaphore SMS failed (${response.status}): ${detail}`);
    }

    console.log('\x1b[32m%s\x1b[0m', `[sms] OTP sent to ${to}.`);
    return data;
};

module.exports = { sendOtpSms };
