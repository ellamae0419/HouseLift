require('dotenv').config()
const db = require('../db');

const run = async () => {
    try {
        await db.query(`
            ALTER TABLE users
            ADD COLUMN resetOtp VARCHAR(10) DEFAULT NULL,
            ADD COLUMN resetOtpExpires DATETIME DEFAULT NULL;
        `);
        console.log('✓ Password reset OTP columns added to users table');
    } catch (err) {
        console.log('✗ Could not add password reset OTP columns (they may already exist):', err.message);
    }

    await db.end();
    process.exit();
};

run();
