require('dotenv').config()
const db = require('../db');

const run = async () => {
    try {
        await db.query(`
            ALTER TABLE users
            ADD COLUMN fullName VARCHAR(100) DEFAULT NULL,
            ADD COLUMN address VARCHAR(255) DEFAULT NULL,
            ADD COLUMN mobileNumber VARCHAR(20) DEFAULT NULL;
        `);
        console.log('✓ Profile columns (fullName, address, mobileNumber) added to users table');
    } catch (err) {
        console.log('✗ Could not add profile columns (they may already exist):', err.message);
    }

    try {
        await db.query(`ALTER TABLE users ADD UNIQUE KEY uniq_users_username (username);`);
        console.log('✓ Unique constraint added on users.username');
    } catch (err) {
        console.log('✗ Could not add unique constraint on username (duplicates may exist, or it is already applied):', err.message);
    }

    try {
        await db.query(`ALTER TABLE users ADD UNIQUE KEY uniq_users_email (email);`);
        console.log('✓ Unique constraint added on users.email');
    } catch (err) {
        console.log('✗ Could not add unique constraint on email (duplicates may exist, or it is already applied):', err.message);
    }

    await db.end();
    process.exit();
};

run();
