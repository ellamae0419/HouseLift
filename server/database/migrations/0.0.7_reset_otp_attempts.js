require('dotenv').config()
const db = require('../db');

const run = async () => {
    try {
        await db.query(`
            ALTER TABLE users
            ADD COLUMN resetOtpAttempts INT NOT NULL DEFAULT 0;
        `);
        console.log('✓ resetOtpAttempts column added to users table');
    } catch (err) {
        console.log('✗ Could not add resetOtpAttempts column (it may already exist):', err.message);
    }

    await db.end();
    process.exit();
};

run();
