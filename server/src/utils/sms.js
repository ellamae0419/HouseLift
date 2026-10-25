// Sends text messages by one of two routes, picked by which env vars are set:
//   1. SMS_GATEWAY_USER + SMS_GATEWAY_PASSWORD — an Android phone running the
//      free "SMS Gateway for Android" app in Cloud Server mode. The text goes
//      out through that phone's own SIM, so it costs only the SIM's load.
//   2. SMS_API_KEY — Semaphore's paid HTTP API (Philippine SMS service).
// With neither set it only logs, so dev and tests never send a real text.
const GATEWAY_URL = 'https://api.sms-gate.app/3rdparty/v1/message';
const SEMAPHORE_URL = 'https://api.semaphore.co/api/v4/messages';

const useGateway = () => Boolean(process.env.SMS_GATEWAY_USER && process.env.SMS_GATEWAY_PASSWORD);
const isConfigured = () => useGateway() || Boolean(process.env.SMS_API_KEY);

// Registration stores local numbers as 09XXXXXXXXX; the gateway wants +639XXXXXXXXX.
const toInternational = (number) => {
    const digits = String(number).replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) return digits;
    if (digits.startsWith('63')) return `+${digits}`;
    if (digits.startsWith('0')) return `+63${digits.slice(1)}`;
    return `+63${digits}`;
};

const sendViaGateway = async ({ to, message }) => {
    const auth = Buffer.from(`${process.env.SMS_GATEWAY_USER}:${process.env.SMS_GATEWAY_PASSWORD}`).toString('base64');

    const response = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ textMessage: { text: message }, phoneNumbers: [toInternational(to)] }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(`SMS gateway failed (${response.status}): ${JSON.stringify(data)}`);
    }

    return data?.id;
};

const sendViaSemaphore = async ({ to, message }) => {
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

    return data?.[0]?.message_id;
};

// The firmware raises the platform in small steps as water rises, and each step
// reports as an automatic lift. One flood would otherwise text the owner once
// per step, so each number gets at most one flood text per cooldown window.
const COOLDOWN_MS = 10 * 60 * 1000;
const lastSentAt = new Map();

const sendFloodAlertSms = async ({ to, fullName }) => {
    if (!to) return;

    if (!isConfigured()) {
        console.log('\x1b[33m%s\x1b[0m', `[sms] No SMS gateway or SMS_API_KEY configured — skipping flood alert for ${to}.`);
        return;
    }

    if (Date.now() - (lastSentAt.get(to) || 0) < COOLDOWN_MS) {
        console.log('\x1b[33m%s\x1b[0m', `[sms] Flood alert for ${to} skipped — one was already sent in the last 10 minutes.`);
        return;
    }
    // Claimed before sending so two lifts landing together can't both send.
    lastSentAt.set(to, Date.now());

    const name = fullName ? fullName.split(' ')[0] : 'there';
    const message = `HydroLift: Hi ${name}, water has reached the flood level at your house. Your platform was raised automatically.`;

    let id;
    try {
        id = useGateway()
            ? await sendViaGateway({ to, message })
            : await sendViaSemaphore({ to, message });
    } catch (err) {
        // A failed send shouldn't silence the next attempt.
        lastSentAt.delete(to);
        throw err;
    }

    console.log('\x1b[32m%s\x1b[0m', `[sms] Flood alert accepted for ${to} via ${useGateway() ? 'phone gateway' : 'Semaphore'}. id=${id}`);
};

module.exports = { sendFloodAlertSms };
