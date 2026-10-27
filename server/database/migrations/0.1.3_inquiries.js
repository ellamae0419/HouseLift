require('dotenv').config()
const db = require('../db');

const run = async () => {
    // The website only takes inquiries. Nobody gets an account until they pay in person, so an
    // inquiry is just a name and a way to reach them. An admin registers the buyer later.
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS inquiries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fullName VARCHAR(100) NOT NULL,
                mobileNumber VARCHAR(15) NOT NULL,
                email VARCHAR(75) DEFAULT NULL,
                houseSize VARCHAR(10) DEFAULT NULL,
                message VARCHAR(500) DEFAULT NULL,
                status VARCHAR(10) NOT NULL DEFAULT 'new',
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                KEY idx_inquiries_status_time (status, createdAt)
            );
        `);
        console.log('✓ inquiries table created');
    } catch (err) {
        console.log('✗ Could not create inquiries (it may already exist):', err.message);
    }

    await db.end();
    process.exit();
};

run();
