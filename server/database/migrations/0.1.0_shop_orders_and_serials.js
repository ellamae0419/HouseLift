require('dotenv').config()
const db = require('../db');

const run = async () => {
    // 1 = can use the app straight away (every account that existed before the
    // shop, and every account an admin creates). A customer who orders online
    // starts at 0 and flips to 1 by entering the serial code they were given.
    try {
        await db.query(`ALTER TABLE users ADD COLUMN isActivated TINYINT(1) NOT NULL DEFAULT 1;`);
        console.log('✓ isActivated column added to users');
    } catch (err) {
        console.log('✗ Could not add users.isActivated (it may already exist):', err.message);
    }

    // One row per purchase. Payment is taken in person, so there is no payment
    // gateway: an admin checks the ID, then records the payment when handing over.
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT NOT NULL AUTO_INCREMENT,
                userId VARCHAR(100) NOT NULL,
                price INT DEFAULT NULL,
                status VARCHAR(10) NOT NULL DEFAULT 'pending',
                rejectReason VARCHAR(255) DEFAULT NULL,
                paidAt DATETIME DEFAULT NULL,
                reviewedAt DATETIME DEFAULT NULL,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_orders_status_time (status, createdAt),
                KEY idx_orders_user (userId),
                CONSTRAINT fk_orders_user FOREIGN KEY (userId)
                    REFERENCES users (id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✓ orders table created');
    } catch (err) {
        console.log('✗ Could not create orders:', err.message);
    }

    // The photo of the buyer's valid ID. Kept apart from orders so listing
    // orders never drags the image along; only an admin-only route reads it.
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS id_verifications (
                id INT NOT NULL AUTO_INCREMENT,
                orderId INT NOT NULL,
                idType VARCHAR(30) NOT NULL,
                mimeType VARCHAR(20) NOT NULL,
                image MEDIUMBLOB NOT NULL,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uniq_id_verifications_order (orderId),
                CONSTRAINT fk_id_verifications_order FOREIGN KEY (orderId)
                    REFERENCES orders (id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✓ id_verifications table created');
    } catch (err) {
        console.log('✗ Could not create id_verifications:', err.message);
    }

    // The code an admin hands over with the unit. It is tied to one buyer and
    // one device, and entering it at login is what links the device to them.
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS serial_codes (
                id INT NOT NULL AUTO_INCREMENT,
                code VARCHAR(20) NOT NULL,
                orderId INT NOT NULL,
                userId VARCHAR(100) NOT NULL,
                esp32Id INT NOT NULL,
                status VARCHAR(10) NOT NULL DEFAULT 'issued',
                issuedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                redeemedAt DATETIME DEFAULT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY uniq_serial_code (code),
                UNIQUE KEY uniq_serial_order (orderId),
                KEY idx_serial_user (userId),
                CONSTRAINT fk_serial_order FOREIGN KEY (orderId)
                    REFERENCES orders (id) ON DELETE CASCADE,
                CONSTRAINT fk_serial_user FOREIGN KEY (userId)
                    REFERENCES users (id) ON DELETE CASCADE,
                CONSTRAINT fk_serial_esp32 FOREIGN KEY (esp32Id)
                    REFERENCES esp32 (id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✓ serial_codes table created');
    } catch (err) {
        console.log('✗ Could not create serial_codes:', err.message);
    }

    await db.end();
    process.exit();
};

run();
