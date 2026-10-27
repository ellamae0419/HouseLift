const { SIZES, EMAIL_REGEX, NAME_REGEX, MOBILE_REGEX } = require('./shopController');

// An inquiry is only a question from someone who may or may not buy. It creates no account:
// an admin registers the buyer in person once they pay (see registerBuyer in ordersController).
const STATUSES = ['new', 'contacted', 'bought', 'closed'];

const createInquiry = async (req, res) => {
    const { fullName, mobileNumber, email, size, message, website } = req.body || {};

    // A hidden box real visitors never see. A bot that fills it gets a normal-looking
    // answer and nothing is saved.
    if (website) return res.status(201).json({ message: 'Inquiry received.' });

    const name = String(fullName || '').trim();
    const note = String(message || '').trim();
    const mail = String(email || '').trim();

    if (!NAME_REGEX.test(name)) return res.status(400).json({ message: 'Enter your full name (letters only).' });
    if (!MOBILE_REGEX.test(mobileNumber || '')) return res.status(400).json({ message: 'Mobile number must be 11 digits starting with 09.' });
    if (mail && (!EMAIL_REGEX.test(mail) || mail.length > 75)) return res.status(400).json({ message: 'Enter a valid email address, or leave it empty.' });
    if (size && !Object.prototype.hasOwnProperty.call(SIZES, size)) return res.status(400).json({ message: 'Choose Small, Medium or Large, or leave the size empty.' });
    if (note.length > 500) return res.status(400).json({ message: 'Keep your message under 500 characters.' });

    try {
        const result = await global.db.query(
            'INSERT INTO inquiries (fullName, mobileNumber, email, houseSize, message) VALUES (?,?,?,?,?)',
            [name, mobileNumber, mail || null, size || null, note || null]
        );

        try {
            await global.db.query(
                'INSERT INTO notifications (title, description, isRead) VALUES (?, ?, 0)',
                ['New HydroLift inquiry', `${name} (${mobileNumber}) asked about HydroLift${size ? `, ${SIZES[size]} size` : ''}. See Inquiries.`]
            );
        } catch (notifyErr) {
            console.error('[createInquiry] Failed to create notification:', notifyErr.message);
        }

        res.status(201).json({ inquiryId: Number(result.insertId), message: 'Inquiry received.' });
    } catch (err) {
        console.error('[createInquiry]', err.message);
        res.status(500).json({ message: 'Something went wrong sending your inquiry. Please try again.' });
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
