require('dotenv').config()
const db = require('../db');

const addEmailVerificationColumns = async () => {
    try {
        await db.query(`
            ALTER TABLE users
            ADD COLUMN isVerified TINYINT(1) NOT NULL DEFAULT 0,
            ADD COLUMN verificationToken VARCHAR(255) DEFAULT NULL,
            ADD COLUMN verificationExpires DATETIME DEFAULT NULL;
        `);
        console.log('✓ Email verification columns added to users table');

        await db.query(`
            UPDATE users SET isVerified = 1 WHERE verificationToken IS NULL;
        `);
        console.log('✓ Existing accounts grandfathered in as verified');
    } catch (err) {
        console.log('✗ Error adding email verification columns:', err.message);
    } finally {
        await db.end();
        process.exit();
    }
};

addEmailVerificationColumns();
