require('dotenv').config()
const db = require('../db');

const run = async () => {
    // One row per saved water-level reading. Throttled server-side to roughly
    // one per device per minute, so this grows ~1.4k rows/device/day rather
    // than one row every 2 seconds.
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id BIGINT NOT NULL AUTO_INCREMENT,
                esp32Id INT NOT NULL,
                wlRaw INT NOT NULL,
                wlLevel DECIMAL(5,2) NOT NULL,
                isLifted TINYINT(1) NOT NULL DEFAULT 0,
                recordedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_sensor_readings_device_time (esp32Id, recordedAt),
                CONSTRAINT fk_sensor_readings_esp32 FOREIGN KEY (esp32Id)
                    REFERENCES esp32 (id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✓ sensor_readings table created');
    } catch (err) {
        console.log('✗ Could not create sensor_readings:', err.message);
    }

    // One row per completed lift/retract cycle. Doubles as the real data
    // source for the Maintenance page, which currently shows hardcoded rows.
    // `trigger` is a reserved word in MySQL — it must stay backticked in
    // every query that touches it.
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS lift_events (
                id BIGINT NOT NULL AUTO_INCREMENT,
                esp32Id INT NOT NULL,
                direction VARCHAR(10) NOT NULL,
                \`trigger\` VARCHAR(10) NOT NULL,
                -- (3) keeps milliseconds. Plain DATETIME rounds to whole
                -- seconds, which would make every lift duration look identical.
                startedAt DATETIME(3) NOT NULL,
                completedAt DATETIME(3) NOT NULL,
                PRIMARY KEY (id),
                KEY idx_lift_events_device_time (esp32Id, completedAt),
                CONSTRAINT fk_lift_events_esp32 FOREIGN KEY (esp32Id)
                    REFERENCES esp32 (id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✓ lift_events table created');
    } catch (err) {
        console.log('✗ Could not create lift_events:', err.message);
    }

    // NULL means an admin-only notice (e.g. "new signup pending approval").
    // A real id scopes the notification to that one user's house.
    try {
        await db.query(`ALTER TABLE notifications ADD COLUMN userId VARCHAR(100) DEFAULT NULL;`);
        console.log('✓ userId column added to notifications');
    } catch (err) {
        console.log('✗ Could not add notifications.userId (it may already exist):', err.message);
    }

    try {
        await db.query(`ALTER TABLE notifications ADD KEY idx_notifications_user_time (userId, createdAt);`);
        console.log('✓ Index added on notifications(userId, createdAt)');
    } catch (err) {
        console.log('✗ Could not add notifications index (already applied?):', err.message);
    }

    try {
        await db.query(`
            ALTER TABLE notifications
            ADD CONSTRAINT fk_notifications_user FOREIGN KEY (userId)
                REFERENCES users (id) ON DELETE CASCADE;
        `);
        console.log('✓ Foreign key added on notifications.userId');
    } catch (err) {
        console.log('✗ Could not add notifications foreign key (already applied?):', err.message);
    }

    await db.end();
    process.exit();
};

run();
