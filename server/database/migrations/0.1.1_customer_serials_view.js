require('dotenv').config()
const db = require('../db');

const run = async () => {
    // serial_codes only holds an internal user id, so on its own it can't tell you
    // who bought which code. This view joins the buyer, their ID type and the
    // serial code into one readable list. It is read-only and holds no data of
    // its own, and it never includes the ID photo.
    try {
        await db.query(`
            CREATE OR REPLACE VIEW customer_serials AS
            SELECT u.username, u.fullName, u.email, u.mobileNumber,
                   o.id AS orderId, o.status AS orderStatus, v.idType, o.paidAt,
                   s.code AS serialCode, s.status AS serialStatus, s.issuedAt, s.redeemedAt,
                   e.esp32_id AS deviceId
            FROM serial_codes s
            JOIN users u ON u.id = s.userId
            JOIN orders o ON o.id = s.orderId
            LEFT JOIN id_verifications v ON v.orderId = o.id
            LEFT JOIN esp32 e ON e.id = s.esp32Id;
        `);
        console.log('✓ customer_serials view created');
    } catch (err) {
        console.log('✗ Could not create customer_serials:', err.message);
    }

    await db.end();
    process.exit();
};

run();
