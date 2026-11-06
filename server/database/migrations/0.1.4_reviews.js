require('dotenv').config()
const db = require('../db');

const run = async () => {
    // A customer review on the shop. Only someone holding a serial code can write one, and only one
    // review per code. It stays 'pending' until an admin approves it; only approved ones show on the shop.
    try {
        await db.query(`
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
            );
        `);
        console.log('✓ reviews table created');
    } catch (err) {
        console.log('✗ Could not create reviews (it may already exist):', err.message);
    }

    await db.end();
    process.exit();
};

run();
