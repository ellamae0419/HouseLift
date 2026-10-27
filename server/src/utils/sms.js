// Sends text messages by one of two routes, picked by which env vars are set:
//   1. SMS_GATEWAY_USER + SMS_GATEWAY_PASSWORD — an Android phone running the
//      free "SMS Gateway for Android" app in Cloud Server mode. The text goes
//      out through that phone's own SIM, so it costs only the SIM's load.
//   2. SMS_API_KEY — Semaphore's paid HTTP API (Philippine SMS service).
// With neither set it only logs, so dev and tests never send a real text.
const DEFAULT_GATEWAY_URL = 'https://api.sms-gate.app/3rdparty/v1/message';
const SEMAPHORE_URL = 'https://api.semaphore.co/api/v4/messages';

// SMS_GATEWAY_URL exists only so tests can point at a fake gateway; leave it unset in real use.
const gatewayUrl = () => process.env.SMS_GATEWAY_URL || DEFAULT_GATEWAY_URL;

const useGateway = () => Boolean(process.env.SMS_GATEWAY_USER && process.env.SMS_GATEWAY_PASSWORD);
const isConfigured = () => useGateway() || Boolean(process.env.SMS_API_KEY);

// Which route is active, in words an admin can read. null means texts are not set up.
const smsRoute = () => {
    if (useGateway()) return 'phone gateway';
    if (process.env.SMS_API_KEY) return 'Semaphore';
    return null;
};

// Registration stores local numbers as 09XXXXXXXXX; the gateway wants +639XXXXXXXXX.
const toInternational = (number) => {
    const digits = String(number).replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) return digits;
    if (digits.startsWith('63')) return `+${digits}`;
    if (digits.startsWith('0')) return `+63${digits.slice(1)}`;
    return `+63${digits}`;
};

// Keeps one alert to a couple of text segments, so a long description can't turn into a costly chain.
const clip = (message) => (message.length > 300 ? `${message.slice(0, 297)}...` : message);

const sendViaGateway = async ({ to, message }) => {
    const auth = Buffer.from(`${process.env.SMS_GATEWAY_USER}:${process.env.SMS_GATEWAY_PASSWORD}`).toString('base64');

    const response = await fetch(gatewayUrl(), {
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

const send = ({ to, message }) => (useGateway() ? sendViaGateway({ to, message }) : sendViaSemaphore({ to, message }));

// The firmware raises the platform in small steps as water rises, and each step
// reports as an automatic lift. One flood would otherwise text the owner once
// per step, so each number gets at most one text per alert type per cooldown window.
const COOLDOWN_MS = 10 * 60 * 1000;
const lastSentAt = new Map();

// Texts one alert to one number. `key` names the kind of alert (for example "critical"),
// so a repeat of the same alert is held back while a different alert still goes out.
// `cooldownMs` is how long a repeat of the same kind is held back (10 minutes unless the
// alert says otherwise, e.g. the critical alert repeats every 5).
const sendAlertSms = async ({ to, message, key = 'alert', cooldownMs = COOLDOWN_MS }) => {
    if (!to) return;

    if (!isConfigured()) {
        console.log('\x1b[33m%s\x1b[0m', `[sms] No SMS gateway or SMS_API_KEY configured — skipping "${key}" text for ${to}.`);
        return;
    }

    const slot = `${to}|${key}`;
    if (Date.now() - (lastSentAt.get(slot) || 0) < cooldownMs) {
        console.log('\x1b[33m%s\x1b[0m', `[sms] "${key}" text for ${to} skipped — one was already sent recently.`);
        return;
    }
    // Claimed before sending so two alerts landing together can't both send.
    lastSentAt.set(slot, Date.now());

    let id;
    try {
        id = await send({ to, message: clip(message) });
    } catch (err) {
        // A failed send shouldn't silence the next attempt.
        lastSentAt.delete(slot);
        throw err;
    }

    console.log('\x1b[32m%s\x1b[0m', `[sms] "${key}" text accepted for ${to} via ${smsRoute()}. id=${id}`);
};

// For the admin "Send test text" button. Skips the cooldown, and fails loudly (instead of
// quietly logging) when texts are not set up, so the admin sees what is wrong.
const sendTestSms = async (to) => {
    if (!isConfigured()) {
        const err = new Error('Text sending is not set up.');
        err.code = 'NOT_CONFIGURED';
        throw err;
    }
    await send({ to, message: 'HydroLift: this is a test text from the admin dashboard. If you can read this, flood alerts can reach you.' });
    return smsRoute();
};

module.exports = { sendAlertSms, sendTestSms, smsRoute };
