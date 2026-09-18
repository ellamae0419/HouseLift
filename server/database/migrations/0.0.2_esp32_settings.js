require('dotenv').config()
const db = require('../db');

const createESP32Table = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS esp32 (
                id INT AUTO_INCREMENT PRIMARY KEY,
                esp32_id VARCHAR(255) UNIQUE NOT NULL,
                threshold INT DEFAULT 2,
                wifi_ssid VARCHAR(255) NOT NULL,
                wifi_pass VARCHAR(255) NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);
        console.log('✓ ESP32 table created successfully');

        await db.query(`
            INSERT IGNORE INTO esp32 (esp32_id, threshold, wifi_ssid, wifi_pass)
            VALUES (?, ?, ?, ?)
        `, ['esp32-default', 2, 'YOUR_SSID', 'YOUR_PASSWORD']);
        
        console.log('✓ Default ESP32 entry created');
    } catch (err) {
        console.log('✗ Error creating ESP32 table:', err.message);
    }
};

createESP32Table();
