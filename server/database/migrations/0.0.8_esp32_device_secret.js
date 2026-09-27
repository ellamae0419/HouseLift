require('dotenv').config()
const db = require('../db');

const run = async () => {
    try {
        await db.query(`
            ALTER TABLE esp32
            ADD COLUMN deviceSecret VARCHAR(64) DEFAULT NULL,
            ADD COLUMN lastSeenAt DATETIME DEFAULT NULL;
        `);
        console.log('✓ deviceSecret and lastSeenAt columns added to esp32 table');
    } catch (err) {
        console.log('✗ Could not add deviceSecret/lastSeenAt columns (they may already exist):', err.message);
    }

    await db.end();
    process.exit();
};

run();
