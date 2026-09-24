const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
    if (transporter !== undefined) return transporter;

    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT) || 587,
            secure: Number(process.env.EMAIL_PORT) === 465,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            // Some hosts silently drop outbound SMTP instead of refusing it
            // outright — without these, a blocked connection hangs instead
            // of failing fast.
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000,
        });
    } else {
        transporter = null;
    }

    return transporter;
};

const sendApprovalEmail = async ({ to, username }) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:1234';
    const loginLink = `${clientUrl}/login`;
    const activeTransporter = getTransporter();

    if (!activeTransporter) {
        console.log('\x1b[33m%s\x1b[0m', `[mailer] EMAIL_HOST not configured — skipping approval email.`);
        console.log('\x1b[36m%s\x1b[0m', `[mailer] ${username} <${to}> has been approved and can now log in.`);
        return;
    }

    const info = await activeTransporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject: 'Your HydroLift account has been approved',
        html: `
            <p>Hi ${username},</p>
            <p>Good news — an administrator has reviewed and approved your HydroLift account. You can now log in.</p>
            <p><a href="${loginLink}">Log in to HydroLift</a></p>
        `,
    });

    console.log('\x1b[32m%s\x1b[0m', `[mailer] Approval email accepted for ${to}. messageId=${info.messageId} response="${info.response}"`);
};

const sendOtpEmail = async ({ to, otp }) => {
    const activeTransporter = getTransporter();

    if (!activeTransporter) {
        console.log('\x1b[33m%s\x1b[0m', `[mailer] EMAIL_HOST not configured — skipping OTP email.`);
        console.log('\x1b[36m%s\x1b[0m', `[mailer] OTP for ${to} is ${otp} (printed here since email isn't configured).`);
        return;
    }

    const info = await activeTransporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject: 'Your HydroLift password reset code',
        html: `
            <p>Your HydroLift password reset code is:</p>
            <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
            <p>It expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        `,
    });

    console.log('\x1b[32m%s\x1b[0m', `[mailer] OTP email accepted for ${to}. messageId=${info.messageId} response="${info.response}"`);
};

module.exports = { sendApprovalEmail, sendOtpEmail };
