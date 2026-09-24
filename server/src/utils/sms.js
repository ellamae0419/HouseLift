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

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(`Semaphore SMS failed (${response.status}): ${JSON.stringify(data)}`);
    }

    console.log('\x1b[32m%s\x1b[0m', `[sms] OTP sent to ${to}.`);
    return data;
};

module.exports = { sendOtpSms };
