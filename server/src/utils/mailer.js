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

module.exports = { sendApprovalEmail };
