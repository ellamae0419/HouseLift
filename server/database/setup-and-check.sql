-- HydroLift / HouseLift: set up the database and check it (TiDB / MySQL 8).
-- Safe to run again at any time: it only CREATES what is missing (tables, and the
-- one new users.isActivated column) and only READS everything else. It never
-- drops, deletes or changes any data.
-- Run it all with the SQL Editor: select all (Ctrl+A), then Run.

USE house_lift;

-- ---------------------------------------------------------------------------
-- 1. Tables (same as schema.sql; tables that already exist are skipped)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id                  VARCHAR(100) NOT NULL PRIMARY KEY,
    username            VARCHAR(50)  NOT NULL,
    email               VARCHAR(75)  DEFAULT NULL,
    password            VARCHAR(200) NOT NULL,                -- bcrypt hash, never the real password
    roles               VARCHAR(150) DEFAULT 'user',          -- 'user' or 'admin'
    refreshToken        TEXT         DEFAULT NULL,
    createdAt           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    isVerified          TINYINT(1)   NOT NULL DEFAULT 0,      -- 0 = waiting for admin approval
    verificationToken   VARCHAR(255) DEFAULT NULL,
    verificationExpires DATETIME     DEFAULT NULL,
    fullName            VARCHAR(100) DEFAULT NULL,
    address             VARCHAR(255) DEFAULT NULL,
    mobileNumber        VARCHAR(20)  DEFAULT NULL,            -- flood alert texts go here
    resetOtp            VARCHAR(10)  DEFAULT NULL,
    resetOtpExpires     DATETIME     DEFAULT NULL,
    resetOtpAttempts    INT          NOT NULL DEFAULT 0,
    isActivated         TINYINT(1)   NOT NULL DEFAULT 1,      -- 0 = bought online, locked until the serial code is entered
    UNIQUE KEY uniq_users_username (username),
    UNIQUE KEY uniq_users_email (email)
);

CREATE TABLE IF NOT EXISTS esp32 (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    esp32_id     VARCHAR(255) NOT NULL,                       -- e.g. esp32-<userId>
    threshold    INT          DEFAULT 2,
    wifi_ssid    VARCHAR(255) NOT NULL,                       -- unused, kept so nothing breaks
    wifi_pass    VARCHAR(255) NOT NULL,                       -- unused, kept so nothing breaks
    createdAt    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updatedAt    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    userId       VARCHAR(100) DEFAULT NULL,                   -- owner (one device per user)
    deviceSecret VARCHAR(64)  DEFAULT NULL,                   -- key the physical ESP32 sends
    lastSeenAt   DATETIME     DEFAULT NULL,                   -- online = within the last 30 seconds
    UNIQUE KEY esp32_id (esp32_id),
    UNIQUE KEY uniq_esp32_userId (userId)
);

CREATE TABLE IF NOT EXISTS notifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(150) NOT NULL,
    description TEXT         NOT NULL,
    isRead      TINYINT(1)   NOT NULL DEFAULT 0,
    createdAt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    userId      VARCHAR(100) DEFAULT NULL,                    -- NULL = admin-only notice
    KEY idx_notifications_createdAt (createdAt),
    KEY idx_notifications_isRead (isRead),
    KEY idx_notifications_user_time (userId, createdAt),
    CONSTRAINT fk_notifications_user FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sensor_readings (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    esp32Id    INT          NOT NULL,
    wlRaw      INT          NOT NULL,                         -- raw sensor number, 0-4095
    wlLevel    DECIMAL(5,2) NOT NULL,                         -- 0-4 water level
    isLifted   TINYINT(1)   NOT NULL DEFAULT 0,
    recordedAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_sensor_readings_device_time (esp32Id, recordedAt),
    CONSTRAINT fk_sensor_readings_esp32 FOREIGN KEY (esp32Id) REFERENCES esp32 (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lift_events (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    esp32Id     INT         NOT NULL,
    direction   VARCHAR(10) NOT NULL,                         -- 'lift' or 'retract'
    `trigger`   VARCHAR(10) NOT NULL,                         -- 'auto', 'manual' or 'remote'
    startedAt   DATETIME(3) NOT NULL,
    completedAt DATETIME(3) NOT NULL,
    KEY idx_lift_events_device_time (esp32Id, completedAt),
    CONSTRAINT fk_lift_events_esp32 FOREIGN KEY (esp32Id) REFERENCES esp32 (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    userId       VARCHAR(100) NOT NULL,                       -- the customer who ordered
    houseSize    VARCHAR(10)  DEFAULT NULL,                   -- 'S', 'M' or 'L'
    price        INT          DEFAULT NULL,                   -- pesos, if a price was set
    status       VARCHAR(10)  NOT NULL DEFAULT 'pending',     -- 'pending', 'approved' or 'rejected'
    rejectReason VARCHAR(255) DEFAULT NULL,
    paidAt       DATETIME     DEFAULT NULL,                   -- payment is taken in person
    reviewedAt   DATETIME     DEFAULT NULL,
    createdAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_orders_status_time (status, createdAt),
    KEY idx_orders_user (userId),
    CONSTRAINT fk_orders_user FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inquiries (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    fullName     VARCHAR(100) NOT NULL,
    mobileNumber VARCHAR(15)  NOT NULL,                       -- how we reach them; no account is made
    email        VARCHAR(75)  DEFAULT NULL,
    houseSize    VARCHAR(10)  DEFAULT NULL,                   -- 'S', 'M' or 'L', if they said
    message      VARCHAR(500) DEFAULT NULL,
    status       VARCHAR(10)  NOT NULL DEFAULT 'new',         -- 'new', 'contacted', 'bought' or 'closed'
    createdAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_inquiries_status_time (status, createdAt)
);

CREATE TABLE IF NOT EXISTS id_verifications (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    orderId   INT         NOT NULL,
    idType    VARCHAR(30) NOT NULL,                           -- e.g. 'philsys', 'passport'
    mimeType  VARCHAR(20) NOT NULL,                           -- image/jpeg, image/png or image/webp
    image     MEDIUMBLOB  NOT NULL,                           -- photo of the ID, admin-only
    createdAt DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_id_verifications_order (orderId),
    CONSTRAINT fk_id_verifications_order FOREIGN KEY (orderId) REFERENCES orders (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS serial_codes (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    code       VARCHAR(20) NOT NULL,                          -- HL-XXXX-XXXX-XXXX
    orderId    INT         NOT NULL,
    userId     VARCHAR(100) NOT NULL,                         -- only this customer can use the code
    esp32Id    INT         NOT NULL,                          -- the device the code links to
    status     VARCHAR(10) NOT NULL DEFAULT 'issued',         -- 'issued' or 'redeemed'
    issuedAt   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    redeemedAt DATETIME    DEFAULT NULL,
    UNIQUE KEY uniq_serial_code (code),
    UNIQUE KEY uniq_serial_order (orderId),
    KEY idx_serial_user (userId),
    CONSTRAINT fk_serial_order FOREIGN KEY (orderId) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_serial_user FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_serial_esp32 FOREIGN KEY (esp32Id) REFERENCES esp32 (id) ON DELETE CASCADE
);


-- An existing users table needs the new isActivated column added once. This adds
-- it only if it is missing, and every existing account starts as activated (1),
-- so nobody is locked out. No data is changed.
SET @has_col = (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'isActivated');
SET @add_col = IF(@has_col = 0,
                  'ALTER TABLE users ADD COLUMN isActivated TINYINT(1) NOT NULL DEFAULT 1',
                  'SELECT 1');
PREPARE stmt FROM @add_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- An existing orders table needs the new houseSize column (S, M or L) added once. This adds
-- it only if it is missing. Orders placed before sizes existed simply have no size.
SET @has_size = (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'houseSize');
SET @add_size = IF(@has_size = 0,
                   'ALTER TABLE orders ADD COLUMN houseSize VARCHAR(10) DEFAULT NULL',
                   'SELECT 1');
PREPARE stmt FROM @add_size;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- A readable list of who bought, which size and ID they gave and which serial code they got.
-- It only reads the tables above and never includes the ID photo.
CREATE OR REPLACE VIEW customer_serials AS
SELECT u.username, u.fullName, u.email, u.mobileNumber,
       o.id AS orderId, o.status AS orderStatus, o.houseSize, v.idType, o.paidAt,
       s.code AS serialCode, s.status AS serialStatus, s.issuedAt, s.redeemedAt,
       e.esp32_id AS deviceId
FROM serial_codes s
JOIN users u ON u.id = s.userId
JOIN orders o ON o.id = s.orderId
LEFT JOIN id_verifications v ON v.orderId = o.id
LEFT JOIN esp32 e ON e.id = s.esp32Id;

-- ---------------------------------------------------------------------------
-- 2. Checks (read-only)
-- ---------------------------------------------------------------------------

-- How many rows each table holds.
SELECT 'users' AS tbl, COUNT(*) AS n FROM users
UNION ALL SELECT 'esp32', COUNT(*) FROM esp32
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'sensor_readings', COUNT(*) FROM sensor_readings
UNION ALL SELECT 'lift_events', COUNT(*) FROM lift_events
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'id_verifications', COUNT(*) FROM id_verifications
UNION ALL SELECT 'serial_codes', COUNT(*) FROM serial_codes;

-- Every account with its device. A device with key_length 64 can connect.
-- secs_ago under 30 means that device is online right now.
SELECT u.username, u.roles, u.isVerified, u.mobileNumber,
       e.esp32_id, LENGTH(e.deviceSecret) AS key_length,
       TIMESTAMPDIFF(SECOND, e.lastSeenAt, NOW()) AS secs_ago
FROM users u
LEFT JOIN esp32 e ON e.userId = u.id
ORDER BY u.createdAt;

-- Orders and where each one is in the buying steps (the ID photo itself is not shown).
SELECT o.id, u.username, o.houseSize, o.status, o.paidAt, s.code AS serial_code, s.status AS serial_status
FROM orders o
JOIN users u ON u.id = o.userId
LEFT JOIN serial_codes s ON s.orderId = o.id
ORDER BY o.createdAt DESC;

-- Every customer with the serial code they were given. Each code is different.
SELECT username, fullName, mobileNumber, houseSize, idType, serialCode, serialStatus, deviceId
FROM customer_serials
ORDER BY issuedAt DESC;

-- Lifts by cause (auto = water reached the threshold).
SELECT `trigger`, direction, COUNT(*) AS total, MAX(completedAt) AS latest
FROM lift_events
GROUP BY `trigger`, direction
ORDER BY total DESC;

-- The 5 most recent alerts.
SELECT n.createdAt, u.username, n.title, n.isRead
FROM notifications n
LEFT JOIN users u ON u.id = n.userId
ORDER BY n.createdAt DESC
LIMIT 5;
