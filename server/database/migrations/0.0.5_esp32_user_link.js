require('dotenv').config()
const db = require('../db');

const run = async () => {
    try {
        await db.query(`ALTER TABLE esp32 ADD COLUMN userId varchar(100) DEFAULT NULL;`);
        console.log('✓ Added userId column to esp32 table');
    } catch (err) {
        console.log('✗ Could not add userId column (it may already exist):', err.message);
    }

    try {
        await db.query(`ALTER TABLE esp32 ADD UNIQUE KEY uniq_esp32_userId (userId);`);
        console.log('✓ Unique constraint added on esp32.userId');
    } catch (err) {
        console.log('✗ Could not add unique constraint on esp32.userId (already applied?):', err.message);
    }

    // Backfill: every existing non-admin user who doesn't have a linked
    // device yet gets a placeholder row, so Flood Monitoring can list them
    // immediately even before a real ESP32 is provisioned for them.
    try {
        const users = await db.query(`
            SELECT u.id, u.username FROM users u
            LEFT JOIN esp32 e ON e.userId = u.id
            WHERE e.id IS NULL AND u.roles NOT LIKE '%admin%'
        `);

        for (const user of users) {
            const esp32Id = `esp32-${user.id}`;
            try {
                await db.query(
                    'INSERT INTO esp32 (esp32_id, threshold, wifi_ssid, wifi_pass, userId) VALUES (?, ?, ?, ?, ?)',
                    [esp32Id, 2, '', '', user.id]
                );
                console.log(`✓ Placeholder device created for ${user.username}`);
            } catch (err) {
                console.log(`✗ Could not create placeholder device for ${user.username}:`, err.message);
            }
        }
    } catch (err) {
        console.log('✗ Could not backfill placeholder devices:', err.message);
    }

    await db.end();
    process.exit();
};

run();
