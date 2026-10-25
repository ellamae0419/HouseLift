// Sends text messages through Semaphore's HTTP API (a Philippine SMS service
// that accepts local 09XXXXXXXXX numbers directly). Like the mailer, it does
// nothing but log when no key is configured, so dev and tests never send a
// real (paid) text by accident.
const SEMAPHORE_URL = 'https://api.semaphore.co/api/v4/messages';

const isConfigured = () => Boolean(process.env.SMS_API_KEY);

const sendSms = async ({ to, message }) => {
    const body = new URLSearchParams({
        apikey: process.env.SMS_API_KEY,
        number: to,
        message,
    });
    // Without a sender name Semaphore uses its default one. A custom name has
    // to be approved in the Semaphore dashboard first, or the text is rejected.
    if (process.env.SMS_SENDER_NAME) body.set('sendername', process.env.SMS_SENDER_NAME);

    const response = await fetch(SEMAPHORE_URL, { method: 'POST', body });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(`Semaphore SMS failed (${response.status}): ${JSON.stringify(data)}`);
    }

    return data;
};

const sendFloodAlertSms = async ({ to, fullName }) => {
    if (!to) return;

    if (!isConfigured()) {
        console.log('\x1b[33m%s\x1b[0m', `[sms] SMS_API_KEY not configured — skipping flood alert for ${to}.`);
        return;
    }

    const name = fullName ? fullName.split(' ')[0] : 'there';
    const data = await sendSms({
        to,
        message: `HydroLift: Hi ${name}, water has reached the flood level at your house. Your platform was raised automatically.`,
    });

    console.log('\x1b[32m%s\x1b[0m', `[sms] Flood alert accepted for ${to}. id=${data?.[0]?.message_id}`);
};

module.exports = { sendFloodAlertSms };
