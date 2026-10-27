const bcrypt = require('bcrypt');
const { generateUserID } = require('../utils/functions');

const USERNAME_REGEX = /^[A-Za-z][A-Za-z0-9_-]{3,18}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!*@#$%]).{8,24}$/;
const NAME_REGEX = /^[A-Za-zÀ-ÿ' -]{2,100}$/;
const MOBILE_REGEX = /^09\d{9}$/;

const ID_TYPES = {
    philsys: 'Philippine National ID (PhilSys)',
    drivers_license: "Driver's license",
    passport: 'Passport',
    umid: 'UMID',
    sss: 'SSS ID',
    prc: 'PRC ID',
    postal: 'Postal ID',
    voters: "Voter's ID",
    other: 'Other government-issued ID',
};

// The pet house comes in three sizes, as on the product page.
const SIZES = { S: 'Small', M: 'Medium', L: 'Large' };

// The browser shrinks the photo before sending it, so a real upload is a few
// hundred KB. This cap only stops someone posting something huge on purpose.
const MAX_ID_BYTES = 2 * 1024 * 1024;

// Looks at the first bytes of the file, not just what the browser claimed, so a
// renamed script or document can't be stored as an "ID photo".
const MAGIC = {
    'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
    'image/webp': (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
};

const decodeIdImage = (dataUrl) => {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl || '');
    if (!match) return null;

    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length < 12 || buffer.length > MAX_ID_BYTES) return null;
    if (!MAGIC[match[1]](buffer)) return null;

    return { mimeType: match[1], buffer };
};

// HYDROLIFT_PRICE_PHP_S / _M / _L set a price per size; HYDROLIFT_PRICE_PHP is the one
// price used for any size that has none of its own.
const productPrice = (size) => {
    const own = size ? Math.round(Number(process.env[`HYDROLIFT_PRICE_PHP_${size}`])) : 0;
    if (own > 0) return own;
    const price = Math.round(Number(process.env.HYDROLIFT_PRICE_PHP));
    return price > 0 ? price : null;
};

const getProduct = (req, res) => {
    res.json({
        name: 'HydroLift',
        // Only shown when the owner has set it; the page says the price is
        // confirmed at hand-over otherwise, rather than inventing one.
        price: productPrice(),
        sizes: Object.entries(SIZES).map(([value, label]) => ({ value, label, price: productPrice(value) })),
        idTypes: Object.entries(ID_TYPES).map(([value, label]) => ({ value, label })),
    });
};

const placeOrder = async (req, res) => {
    const { fullName, username, email, mobileNumber, address, password, size, idType, idImage, consent } = req.body || {};

    if (!NAME_REGEX.test(String(fullName || '').trim())) return res.status(400).json({ message: 'Enter your full name (letters only).' });
    if (!USERNAME_REGEX.test(username || '')) return res.status(400).json({ message: 'Username must be 4 to 19 characters, start with a letter, and use only letters, numbers, - or _.' });
    if (!EMAIL_REGEX.test(email || '') || email.length > 75) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (!MOBILE_REGEX.test(mobileNumber || '')) return res.status(400).json({ message: 'Mobile number must be 11 digits starting with 09.' });
    if (!String(address || '').trim() || String(address).length > 255) return res.status(400).json({ message: 'Enter your home address.' });
    if (!PASSWORD_REGEX.test(password || '')) return res.status(400).json({ message: 'Password must be 8 to 24 characters with an uppercase letter, a lowercase letter, a number and a special character (! * @ # $ %).' });
    if (!Object.prototype.hasOwnProperty.call(SIZES, size)) return res.status(400).json({ message: 'Choose a size: Small, Medium or Large.' });
    if (!ID_TYPES[idType]) return res.status(400).json({ message: 'Choose the type of ID you are uploading.' });
    if (consent !== true) return res.status(400).json({ message: 'Please agree to let us keep your ID photo for verification.' });

    const image = decodeIdImage(idImage);
    if (!image) return res.status(400).json({ message: 'Upload a clear photo of your ID (JPG, PNG or WebP, up to 2 MB).' });

    try {
        const taken = await global.db.query('SELECT username, email FROM users WHERE username = ? OR email = ?', [username, email]);
        if (taken[0]) {
            return res.status(409).json({ message: taken[0].username === username ? 'This username is already taken.' : 'This email is already used by another account.' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const userId = generateUserID(15);

        // The account, its order and the ID photo are saved together or not at
        // all, so a failure part-way never leaves a login with no order behind.
        const conn = await global.db.getConnection();
        let orderId;
        try {
            await conn.beginTransaction();
            await conn.query(
                'INSERT INTO users (id, username, email, password, fullName, address, mobileNumber, isVerified, isActivated) VALUES (?,?,?,?,?,?,?,0,0)',
                [userId, username, email, hashed, String(fullName).trim(), String(address).trim(), mobileNumber]
            );
            const order = await conn.query('INSERT INTO orders (userId, houseSize, price) VALUES (?, ?, ?)', [userId, size, productPrice(size)]);
            orderId = Number(order.insertId);
            await conn.query(
                'INSERT INTO id_verifications (orderId, idType, mimeType, image) VALUES (?,?,?,?)',
                [orderId, idType, image.mimeType, image.buffer]
            );
            await conn.commit();
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }

        try {
            await global.db.query(
                'INSERT INTO notifications (title, description, isRead) VALUES (?, ?, 0)',
                ['New HydroLift order', `${String(fullName).trim()} (${username}) placed order #${orderId} for a ${SIZES[size]} HydroLift. Their ID is waiting for review in Orders.`]
            );
        } catch (notifyErr) {
            console.error('[placeOrder] Failed to create order notification:', notifyErr.message);
        }

        res.status(201).json({ orderId, message: 'Order received.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'This username or email is already taken.' });
        }
        console.error('[placeOrder]', err.message);
        res.status(500).json({ message: 'Something went wrong placing your order. Please try again.' });
    }
};

module.exports = { getProduct, placeOrder, ID_TYPES, SIZES };
