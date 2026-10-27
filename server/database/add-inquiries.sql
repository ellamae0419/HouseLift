-- HydroLift / HouseLift: add the website inquiries table (TiDB / MySQL 8).
-- Run this BEFORE the new server goes live, then select all (Ctrl+A) and Run.
-- Safe to run again: it only creates the table if it is missing and changes no existing data.

USE house_lift;

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

-- Check: you should see one row that says inquiries_table = 1.
SELECT COUNT(*) AS inquiries_table FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inquiries';
