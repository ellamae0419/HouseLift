-- HydroLift / HouseLift: add the pet house size to orders (TiDB / MySQL 8).
-- Run this BEFORE the new server goes live, then select all (Ctrl+A) and Run.
-- Safe to run again: it adds the column only if it is missing, changes no existing data,
-- and orders placed before sizes existed simply show no size.

USE house_lift;

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

-- Check: you should see houseSize in the list.
SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' ORDER BY ORDINAL_POSITION;
