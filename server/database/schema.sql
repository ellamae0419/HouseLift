-- HydroLift / HouseLift: complete database schema (MySQL 8 / TiDB compatible).
-- Same result as running every file in database/migrations in order.
-- Use on a fresh, empty database:  CREATE DATABASE house_lift; USE house_lift;

CREATE TABLE IF NOT EXISTS users (
    id                  VARCHAR(100) NOT NULL PRIMARY KEY,
    username            VARCHAR(50)  NOT NULL,
    email               VARCHAR(75)  DEFAULT NULL,
    password            VARCHAR(200) NOT NULL,
    roles               VARCHAR(150) DEFAULT 'user',          -- 'user' or 'admin'
    refreshToken        TEXT         DEFAULT NULL,
    createdAt           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    isVerified          TINYINT(1)   NOT NULL DEFAULT 0,      -- 0 = waiting for admin approval
    verificationToken   VARCHAR(255) DEFAULT NULL,
    verificationExpires DATETIME     DEFAULT NULL,
    fullName            VARCHAR(100) DEFAULT NULL,
    address             VARCHAR(255) DEFAULT NULL,
    mobileNumber        VARCHAR(20)  DEFAULT NULL,
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
    wifi_ssid    VARCHAR(255) NOT NULL,
    wifi_pass    VARCHAR(255) NOT NULL,
    createdAt    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updatedAt    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    userId       VARCHAR(100) DEFAULT NULL,                   -- owner (one device per user)
    deviceSecret VARCHAR(64)  DEFAULT NULL,                   -- key the physical ESP32 sends
    lastSeenAt   DATETIME     DEFAULT NULL,
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
    wlRaw      INT          NOT NULL,
    wlLevel    DECIMAL(5,2) NOT NULL,
    isLifted   TINYINT(1)   NOT NULL DEFAULT 0,
    recordedAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_sensor_readings_device_time (esp32Id, recordedAt),
    CONSTRAINT fk_sensor_readings_esp32 FOREIGN KEY (esp32Id) REFERENCES esp32 (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lift_events (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    esp32Id     INT         NOT NULL,
    direction   VARCHAR(10) NOT NULL,                         -- 'lift' or 'retract'
    `trigger`   VARCHAR(10) NOT NULL,                         -- 'auto', 'manual', ...
    startedAt   DATETIME(3) NOT NULL,
    completedAt DATETIME(3) NOT NULL,
    KEY idx_lift_events_device_time (esp32Id, completedAt),
    CONSTRAINT fk_lift_events_esp32 FOREIGN KEY (esp32Id) REFERENCES esp32 (id) ON DELETE CASCADE
);
