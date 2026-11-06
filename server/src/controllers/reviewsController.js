const { SIZES, NAME_REGEX } = require('./shopController');

// A review is a star rating and a short comment from someone who bought HydroLift. The shop is sold
// face to face, so the proof of buying is the serial code the buyer was given. Each code can write one
// review, and it stays 'pending' until an admin approves it: only approved reviews show on the shop.
const STATUSES = ['pending', 'approved', 'hidden'];
const COMMENT_MAX = 500;
const NAME_MAX = 60;
const DEFAULT_NAME = 'Verified buyer';
const SHOWN_ON_SHOP = 30;

// The table is created the first time it is needed, so the live database needs no separate setup step.
// (server/database/migrations/0.1.4_reviews.js makes the same table.)
let tableReady = null;
const ensureTable = () => {
    if (!tableReady) {
        tableReady = global.db.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                serialCodeId INT NOT NULL,
                displayName VARCHAR(60) NOT NULL,
                rating TINYINT NOT NULL,
                comment VARCHAR(500) DEFAULT NULL,
                status VARCHAR(10) NOT NULL DEFAULT 'pending',
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_review_serial (serialCodeId),
                KEY idx_reviews_status_time (status, createdAt),
                CONSTRAINT fk_review_serial FOREIGN KEY (serialCodeId)
                    REFERENCES serial_codes (id) ON DELETE CASCADE
            )
        `).catch((err) => { tableReady = null; throw err; });
    }
    return tableReady;
};

const createReview = async (req, res) => {
    const { serialCode, name, rating, comment, website } = req.body || {};

    // A hidden box real visitors never see. A bot that fills it gets a normal-looking answer and nothing is saved.
    if (website) return res.status(201).json({ message: 'Review received.' });

    const code = String(serialCode || '').trim().toUpperCase();
    const shownName = String(name || '').trim();
    const stars = Number(rating);
    const text = String(comment || '').trim();

    if (!code) return res.status(400).json({ message: 'Enter the serial code you were given when you bought HydroLift.' });
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) return res.status(400).json({ message: 'Choose 1 to 5 stars.' });
    if (shownName && (!NAME_REGEX.test(shownName) || shownName.length > NAME_MAX)) return res.status(400).json({ message: 'Use letters only for your name, or leave it empty.' });
    if (text.length > COMMENT_MAX) return res.status(400).json({ message: `Keep your comment under ${COMMENT_MAX} characters.` });

    try {
        await ensureTable();

        const found = await global.db.query('SELECT id FROM serial_codes WHERE code = ?', [code]);
        if (!found.length) return res.status(404).json({ message: 'We could not find that serial code. Check it and try again.' });
        const serialCodeId = found[0].id;

        const already = await global.db.query('SELECT id FROM reviews WHERE serialCodeId = ?', [serialCodeId]);
        if (already.length) return res.status(409).json({ message: 'A review was already sent with this serial code. Thank you!' });

        await global.db.query(
            'INSERT INTO reviews (serialCodeId, displayName, rating, comment) VALUES (?,?,?,?)',
            [serialCodeId, shownName || DEFAULT_NAME, stars, text || null]
        );

        try {
            await global.db.query(
                'INSERT INTO notifications (title, description, isRead) VALUES (?, ?, 0)',
                ['New HydroLift review', `${shownName || DEFAULT_NAME} gave ${stars} out of 5 stars. Approve it under Reviews to show it on the shop.`]
            );
        } catch (notifyErr) {
            console.error('[createReview] Failed to create notification:', notifyErr.message);
        }

        res.status(201).json({ message: 'Review received.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'A review was already sent with this serial code. Thank you!' });
        console.error('[createReview]', err.message);
        res.status(500).json({ message: 'Something went wrong sending your review. Please try again.' });
    }
};

// What the shop shows: approved reviews only, newest first, with the count and average rating.
const listPublicReviews = async (req, res) => {
    try {
        await ensureTable();
        const rows = await global.db.query(
            `SELECT r.id, r.displayName, r.rating, r.comment, r.createdAt, o.houseSize
             FROM reviews r
             JOIN serial_codes sc ON sc.id = r.serialCodeId
             LEFT JOIN orders o ON o.id = sc.orderId
             WHERE r.status = 'approved'
             ORDER BY r.createdAt DESC, r.id DESC
             LIMIT ?`,
            [SHOWN_ON_SHOP]
        );
        const [summary] = await global.db.query("SELECT COUNT(*) AS total, AVG(rating) AS average FROM reviews WHERE status = 'approved'");
        const total = Number(summary.total);
        res.json({
            count: total,
            average: total ? Math.round(Number(summary.average) * 10) / 10 : null,
            reviews: rows.map((r) => ({
                id: r.id, name: r.displayName, rating: r.rating, comment: r.comment, createdAt: r.createdAt,
                sizeLabel: SIZES[r.houseSize] || null,
            })),
        });
    } catch (err) {
        console.error('[listPublicReviews]', err.message);
        res.status(500).json({ message: 'Could not load reviews.' });
    }
};

const listReviews = async (req, res) => {
    try {
        await ensureTable();
        const rows = await global.db.query(
            `SELECT r.id, r.displayName, r.rating, r.comment, r.status, r.createdAt, sc.code AS serialCode, o.houseSize
             FROM reviews r
             JOIN serial_codes sc ON sc.id = r.serialCodeId
             LEFT JOIN orders o ON o.id = sc.orderId
             ORDER BY r.createdAt DESC, r.id DESC`
        );
        res.json(rows.map((r) => ({ ...r, sizeLabel: SIZES[r.houseSize] || null })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const setReviewStatus = async (req, res) => {
    const status = String(req.body?.status || '');
    if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Status must be pending, approved or hidden.' });

    try {
        await ensureTable();
        const result = await global.db.query('UPDATE reviews SET status = ? WHERE id = ?', [status, req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Review not found.' });
        res.json({ message: 'Review updated.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const deleteReview = async (req, res) => {
    try {
        await ensureTable();
        const result = await global.db.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Review not found.' });
        res.json({ message: 'Review deleted.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { createReview, listPublicReviews, listReviews, setReviewStatus, deleteReview };
