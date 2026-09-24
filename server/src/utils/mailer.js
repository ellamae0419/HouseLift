// Sends via Resend's HTTP API instead of raw SMTP — Railway's network
// blocks outbound SMTP (port 587/465) silently, which made nodemailer hang
// or time out. HTTPS is not affected by that block.
const RESEND_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'HydroLift <onboarding@resend.dev>';

const isConfigured = () => Boolean(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
    const response = await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: process.env.EMAIL_FROM || DEFAULT_FROM,
            to: [to],
            subject,
            html,
        }),
        signal: AbortSignal.timeout(10000),
    });

    const rawText = await response.text();
    let data;
    try { data = JSON.parse(rawText); } catch { data = rawText; }

    if (!response.ok) {
        const detail = typeof data === 'string' ? data.trim() : JSON.stringify(data);
        throw new Error(`Resend email failed (${response.status}): ${detail}`);
    }

    return data;
};

const sendApprovalEmail = async ({ to, username }) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:1234';
    const loginLink = `${clientUrl}/login`;

    if (!isConfigured()) {
        console.log('\x1b[33m%s\x1b[0m', `[mailer] RESEND_API_KEY not configured — skipping approval email.`);
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

    console.log('\x1b[32m%s\x1b[0m', `[mailer] Approval email accepted for ${to}. id=${data?.id}`);
};

const sendOtpEmail = async ({ to, otp }) => {
    if (!isConfigured()) {
        console.log('\x1b[33m%s\x1b[0m', `[mailer] RESEND_API_KEY not configured — skipping OTP email.`);
        console.log('\x1b[36m%s\x1b[0m', `[mailer] OTP for ${to} is ${otp} (printed here since email isn't configured).`);
        return;
    }

    const data = await sendEmail({
        to,
        subject: 'Your HydroLift password reset code',
        html: `
            <p>Your HydroLift password reset code is:</p>
            <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
            <p>It expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        `,
    });

    console.log('\x1b[32m%s\x1b[0m', `[mailer] OTP email accepted for ${to}. id=${data?.id}`);
};

module.exports = { sendApprovalEmail, sendOtpEmail };
