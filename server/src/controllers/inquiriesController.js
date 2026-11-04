const { SIZES, EMAIL_REGEX, NAME_REGEX, MOBILE_REGEX } = require('./shopController');
const { sendShopMessageEmail } = require('../utils/mailer');

// An inquiry is only a question from someone who may or may not buy. It creates no account:
// an admin registers the buyer in person once they pay (see registerBuyer in ordersController).
const STATUSES = ['new', 'contacted', 'bought', 'closed'];

// Two kinds of message come from the shop:
//  - "contact": a message to us. Only the email is required, so we can reply.
//  - "meeting": a request to meet in person. It needs a name, a contact number and a day.
// Both go into the same table, so no database change is needed: a message with no name or number
// is saved with a placeholder name and an empty number, and a meeting's day and time are written
// at the start of its message.
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const MEETING_NOTE_MAX = 400;
const NO_NAME = 'Website visitor';

const meetingWhen = (date, time) => {
    const day = new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    if (!time) return day;
    const [h, m] = time.split(':').map(Number);
    return `${day}, ${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const createInquiry = async (req, res) => {
    const { fullName, mobileNumber, email, size, message, website, type, meetingDate, meetingTime } = req.body || {};

    // A hidden box real visitors never see. A bot that fills it gets a normal-looking
    // answer and nothing is saved.
    if (website) return res.status(201).json({ message: 'Inquiry received.' });

    const isMeeting = type === 'meeting';
    const name = String(fullName || '').trim();
    const note = String(message || '').trim();
    const mail = String(email || '').trim();
    const mobile = String(mobileNumber || '').trim();
    const date = String(meetingDate || '').trim();
    const time = String(meetingTime || '').trim();

    if (isMeeting) {
        if (!NAME_REGEX.test(name)) return res.status(400).json({ message: 'Enter your full name (letters only).' });
        if (!MOBILE_REGEX.test(mobile)) return res.status(400).json({ message: 'Contact number must be 11 digits starting with 09.' });
        if (!DATE_REGEX.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) return res.status(400).json({ message: 'Choose the day you would like to meet.' });
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (new Date(`${date}T00:00:00`) < today) return res.status(400).json({ message: 'Choose a day that has not passed.' });
        if (time && !TIME_REGEX.test(time)) return res.status(400).json({ message: 'Choose a valid time, or leave it empty.' });
        if (note.length > MEETING_NOTE_MAX) return res.status(400).json({ message: `Keep your note under ${MEETING_NOTE_MAX} characters.` });
    } else {
        if (!mail) return res.status(400).json({ message: 'Enter your email address so we can reply.' });
        if (name && !NAME_REGEX.test(name)) return res.status(400).json({ message: 'Use letters only for your name, or leave it empty.' });
        if (note.length > 500) return res.status(400).json({ message: 'Keep your message under 500 characters.' });
    }
    if (mail && (!EMAIL_REGEX.test(mail) || mail.length > 75)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (size && !Object.prototype.hasOwnProperty.call(SIZES, size)) return res.status(400).json({ message: 'Choose Small, Medium or Large, or leave the size empty.' });

    const savedName = name || NO_NAME;
    const savedMobile = isMeeting ? mobile : '';
    const savedMessage = isMeeting ? `MEETING REQUEST for ${meetingWhen(date, time)}.${note ? ` ${note}` : ''}` : note;

    try {
        const result = await global.db.query(
            'INSERT INTO inquiries (fullName, mobileNumber, email, houseSize, message) VALUES (?,?,?,?,?)',
            [savedName, savedMobile, mail || null, size || null, savedMessage || null]
        );

        try {
            const who = isMeeting ? `${name} (${mobile})` : (name ? `${name} (${mail})` : mail);
            await global.db.query(
                'INSERT INTO notifications (title, description, isRead) VALUES (?, ?, 0)',
                isMeeting
                    ? ['New HydroLift meeting request', `${who} would like to meet on ${meetingWhen(date, time)}. See Inquiries.`]
                    : ['New HydroLift message', `${who} sent a message${size ? ` about the ${SIZES[size]} size` : ''}. See Inquiries.`]
            );
        } catch (notifyErr) {
            console.error('[createInquiry] Failed to create notification:', notifyErr.message);
        }

        // Email the shop's inbox too. It must never make the visitor wait or fail, so it runs on the side.
        sendShopMessageEmail({
            isMeeting, name, email: mail, mobile: savedMobile, sizeLabel: size ? SIZES[size] : '',
            when: isMeeting ? meetingWhen(date, time) : '', message: note,
        }).catch((mailErr) => console.error('[createInquiry] Could not email the shop:', mailErr.message));

        res.status(201).json({ inquiryId: Number(result.insertId), message: isMeeting ? 'Meeting request received.' : 'Message received.' });
    } catch (err) {
        console.error('[createInquiry]', err.message);
        res.status(500).json({ message: 'Something went wrong sending your message. Please try again.' });
    }
};

const listInquiries = async (req, res) => {
    try {
        const rows = await global.db.query(
            'SELECT id, fullName, mobileNumber, email, houseSize, message, status, createdAt FROM inquiries ORDER BY createdAt DESC, id DESC'
        );
        res.json(rows.map((r) => ({ ...r, sizeLabel: SIZES[r.houseSize] || null })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const setInquiryStatus = async (req, res) => {
    const status = String(req.body?.status || '');
    if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Status must be new, contacted, bought or closed.' });

    try {
        const result = await global.db.query('UPDATE inquiries SET status = ? WHERE id = ?', [status, req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Inquiry not found.' });
        res.json({ message: 'Inquiry updated.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const deleteInquiry = async (req, res) => {
    try {
        const result = await global.db.query('DELETE FROM inquiries WHERE id = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Inquiry not found.' });
        res.json({ message: 'Inquiry deleted.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { createInquiry, listInquiries, setInquiryStatus, deleteInquiry };
