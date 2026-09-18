const db = require('../db');

db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        description TEXT NOT NULL,
        isRead TINYINT(1) NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT current_timestamp(),
        INDEX idx_notifications_createdAt (createdAt),
        INDEX idx_notifications_isRead (isRead)
    );
`, (err) => {
    if(err) {
        console.error("\x1b[31m%s\x1b[0m", `\n[!] Error creating the notifications table : ${err.message}`);
        return db.end();
    }
}).then(() => {
    console.log("\x1b[32m%s\x1b[0m", `\n(!) "notifications" table created`);
    db.end();
    return process.exit();
});
