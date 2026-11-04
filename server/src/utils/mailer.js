// Sends via Mailjet's HTTP API instead of raw SMTP — Free hosts like Render
// block outbound SMTP (port 587/465) silently, which made nodemailer hang
// or time out. HTTPS is not affected by that block. Mailjet only requires
// verifying a single sender address (not a whole domain), and once
// verified can send to any recipient — unlike some providers that restrict
// unverified accounts to only emailing the account owner.
const MAILJET_URL = 'https://api.mailjet.com/v3.1/send';
const DEFAULT_FROM_EMAIL = 'houselift18@gmail.com';
const DEFAULT_FROM_NAME = 'HydroLift';

const isConfigured = () => Boolean(process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY);

const sendEmail = async ({ to, subject, html, replyTo }) => {
    const auth = Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`).toString('base64');

    const response = await fetch(MAILJET_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            Messages: [{
                From: {
                    Email: process.env.EMAIL_FROM || DEFAULT_FROM_EMAIL,
                    Name: DEFAULT_FROM_NAME,
                },
                To: [{ Email: to }],
                ...(replyTo ? { ReplyTo: { Email: replyTo } } : {}),
                Subject: subject,
                HTMLPart: html,
            }],
        }),
        signal: AbortSignal.timeout(10000),
    });

    const rawText = await response.text();
    let data;
    try { data = JSON.parse(rawText); } catch { data = rawText; }

    if (!response.ok) {
        const detail = typeof data === 'string' ? data.trim() : JSON.stringify(data);
        throw new Error(`Mailjet email failed (${response.status}): ${detail}`);
    }

    // Mailjet returns 200 with a per-message Status even on some failures
    // (e.g. invalid recipient), so check that too, not just the HTTP status.
    const messageStatus = data?.Messages?.[0]?.Status;
    if (messageStatus && messageStatus !== 'success') {
        throw new Error(`Mailjet email failed: ${JSON.stringify(data.Messages[0])}`);
    }

    return data;
};

const sendApprovalEmail = async ({ to, username }) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:1234';
    const loginLink = `${clientUrl}/login`;

    if (!isConfigured()) {
        console.log('\x1b[33m%s\x1b[0m', `[mailer] MAILJET_API_KEY/MAILJET_SECRET_KEY not configured — skipping approval email.`);
        console.log('\x1b[36m%s\x1b[0m', `[mailer] ${username} <${to}> has been approved and can now log in.`);
        return;
    }

    const data = await sendEmail({
        to,
        subject: 'Your HydroLift account has been approved',
        html: `
            <p>Hi ${username},</p>
            <p>Good news — an administrator has reviewed and approved your HydroLift account. You can now log in.</p>
            <p><a href="${loginLink}">Log in to HydroLift</a></p>
        `,
    });

    console.log('\x1b[32m%s\x1b[0m', `[mailer] Approval email accepted for ${to}. id=${data?.Messages?.[0]?.To?.[0]?.MessageID}`);
};

const sendOrderApprovedEmail = async ({ to, username }) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:1234';
    const loginLink = `${clientUrl}/login`;

    if (!isConfigured()) {
        console.log('\x1b[33m%s\x1b[0m', `[mailer] MAILJET_API_KEY/MAILJET_SECRET_KEY not configured — skipping order approval email.`);
        console.log('\x1b[36m%s\x1b[0m', `[mailer] ${username} <${to}> had their ID approved and can now log in.`);
        return;
    }

    const data = await sendEmail({
        to,
        subject: 'Your HydroLift order has been approved',
        html: `
            <p>Hi ${username},</p>
            <p>We checked your ID and approved your HydroLift order. You can now log in.</p>
            <p>When you pay for and receive your HydroLift, we will give you a serial code. Enter it after you log in to link the unit to your account.</p>
            <p><a href="${loginLink}">Log in to HydroLift</a></p>
        `,
    });

    console.log('\x1b[32m%s\x1b[0m', `[mailer] Order approval email accepted for ${to}. id=${data?.Messages?.[0]?.To?.[0]?.MessageID}`);
};

const sendOtpEmail = async ({ to, otp }) => {
    if (!isConfigured()) {
        console.log('\x1b[33m%s\x1b[0m', `[mailer] MAILJET_API_KEY/MAILJET_SECRET_KEY not configured — skipping OTP email.`);
        console.log('\x1b[36m%s\x1b[0m', `[mailer] OTP for ${to} is ${otp} (printed here since email isn't configured).`);
        return;
    }

    const data = await sendEmail({
        to,
        subject: 'Your HydroLift password reset code',
        html: `
            <p>Your HydroLift password reset code is:</p>
            <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
            <p>It expires in 20 minutes. If you didn't request this, you can safely ignore this email.</p>
        `,
    });

    console.log('\x1b[32m%s\x1b[0m', `[mailer] OTP email accepted for ${to}. id=${data?.Messages?.[0]?.To?.[0]?.MessageID}`);
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Tells the shop's own inbox that someone used Contact us or Schedule a meeting on the website.
// It goes only to the shop (SHOP_NOTIFY_EMAIL, or the HydroLift Gmail), never to the visitor, so the form
// cannot be used to send mail to strangers. Replying to the email answers the visitor.
const sendShopMessageEmail = async ({ isMeeting, name, email, sizeLabel, when, message }) => {
    const to = process.env.SHOP_NOTIFY_EMAIL || DEFAULT_FROM_EMAIL;
    const who = name || email || 'A visitor';

    if (!isConfigured()) {
        console.log('\x1b[33m%s\x1b[0m', '[mailer] MAILJET_API_KEY/MAILJET_SECRET_KEY not configured — skipping the shop message email.');
        console.log('\x1b[36m%s\x1b[0m', `[mailer] ${isMeeting ? 'Meeting request' : 'Message'} from ${who} (${email}) would be emailed to ${to}.`);
        return;
    }

    const rows = [
        name && ['Name', name],
        email && ['Email', email],
        isMeeting && when && ['Wants to meet', when],
        sizeLabel && ['Size', sizeLabel],
        message && ['Message', message],
    ].filter(Boolean);

    const data = await sendEmail({
        to,
        replyTo: email || undefined,
        subject: isMeeting ? `HydroLift meeting request from ${who}` : `HydroLift website message from ${who}`,
        html: `
            <p>${isMeeting ? 'Someone asked to meet you' : 'Someone sent you a message'} through the HydroLift website.</p>
            <table cellpadding="6" style="border-collapse: collapse;">
                ${rows.map(([k, v]) => `<tr><td style="color:#555;vertical-align:top;"><b>${escapeHtml(k)}</b></td><td>${escapeHtml(v)}</td></tr>`).join('')}
            </table>
            <p>${email ? 'Press Reply to answer them. ' : ''}It is also saved in Inquiries on the dashboard.</p>
        `,
    });

    console.log('\x1b[32m%s\x1b[0m', `[mailer] Shop message email accepted for ${to}. id=${data?.Messages?.[0]?.To?.[0]?.MessageID}`);
};

module.exports = { sendApprovalEmail, sendOrderApprovedEmail, sendOtpEmail, sendShopMessageEmail };
