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
    isActivated         TINYINT(1)   NOT NULL DEFAULT 1,      -- 0 = bought online, locked until the serial code is entered
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
