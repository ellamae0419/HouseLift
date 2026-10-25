-- HydroLift / HouseLift: set up the database and check it (TiDB / MySQL 8).
-- Safe to run again at any time: it only CREATES what is missing and only READS
-- everything else. It never drops, deletes or changes any data.
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

-- ---------------------------------------------------------------------------
-- 2. Checks (read-only)
-- ---------------------------------------------------------------------------

-- How many rows each table holds.
SELECT 'users' AS tbl, COUNT(*) AS n FROM users
UNION ALL SELECT 'esp32', COUNT(*) FROM esp32
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'sensor_readings', COUNT(*) FROM sensor_readings
UNION ALL SELECT 'lift_events', COUNT(*) FROM lift_events;

-- Every account with its device. A device with key_length 64 can connect.
-- secs_ago under 30 means that device is online right now.
SELECT u.username, u.roles, u.isVerified, u.mobileNumber,
       e.esp32_id, LENGTH(e.deviceSecret) AS key_length,
       TIMESTAMPDIFF(SECOND, e.lastSeenAt, NOW()) AS secs_ago
FROM users u
LEFT JOIN esp32 e ON e.userId = u.id
ORDER BY u.createdAt;

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
