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

module.exports = {
    getProduct, productPrice, decodeIdImage, ID_TYPES, SIZES,
    USERNAME_REGEX, EMAIL_REGEX, PASSWORD_REGEX, NAME_REGEX, MOBILE_REGEX,
};
