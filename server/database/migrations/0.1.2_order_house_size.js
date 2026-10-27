require('dotenv').config()
const db = require('../db');

const run = async () => {
    // The pet house comes in three sizes, so each order records which one was chosen:
    // 'S', 'M' or 'L'. Orders placed before this have no size (NULL).
    try {
        await db.query(`ALTER TABLE orders ADD COLUMN houseSize VARCHAR(10) DEFAULT NULL;`);
        console.log('✓ houseSize column added to orders');
    } catch (err) {
        console.log('✗ Could not add orders.houseSize (it may already exist):', err.message);
    }

    // The readable buyer list shows the size too. See 0.1.1 for what it is.
    try {
        await db.query(`
            CREATE OR REPLACE VIEW customer_serials AS
            SELECT u.username, u.fullName, u.email, u.mobileNumber,
                   o.id AS orderId, o.status AS orderStatus, o.houseSize, v.idType, o.paidAt,
                   s.code AS serialCode, s.status AS serialStatus, s.issuedAt, s.redeemedAt,
                   e.esp32_id AS deviceId
            FROM serial_codes s
            JOIN users u ON u.id = s.userId
            JOIN orders o ON o.id = s.orderId
            LEFT JOIN id_verifications v ON v.orderId = o.id
            LEFT JOIN esp32 e ON e.id = s.esp32Id;
        `);
        console.log('✓ customer_serials view updated');
    } catch (err) {
        console.log('✗ Could not update customer_serials:', err.message);
    }

    await db.end();
    process.exit();
};

run();
