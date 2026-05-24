-- =========================================================
-- Smart Mushroom Farm Management Dashboard
-- MySQL schema (XAMPP / phpMyAdmin)
-- =========================================================
-- USAGE:
--   1. Open phpMyAdmin (http://localhost/phpmyadmin)
--   2. Run this entire file (Import tab or SQL tab).
--   3. The DB `mushroom_farm_db` is created with 3 rooms
--      statically bound to their mushroom types.
-- =========================================================

DROP DATABASE IF EXISTS mushroom_farm_db;
CREATE DATABASE mushroom_farm_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE mushroom_farm_db;

-- ---------------------------------------------------------
-- rooms : the 3 fixed incubation rooms
-- ---------------------------------------------------------
CREATE TABLE rooms (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    room_number  TINYINT NOT NULL UNIQUE,
    mushroom_type VARCHAR(40) NOT NULL,
    CONSTRAINT chk_room_number CHECK (room_number IN (1,2,3))
) ENGINE=InnoDB;

INSERT INTO rooms (room_number, mushroom_type) VALUES
    (1, 'Grey Oyster'),
    (2, 'Black Jelly'),
    (3, 'White Oyster');

-- ---------------------------------------------------------
-- environmental_data : latest readings per room
-- ---------------------------------------------------------
CREATE TABLE environmental_data (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    room_id           INT NOT NULL,
    temperature       DECIMAL(5,2) NOT NULL,
    humidity          DECIMAL(5,2) NOT NULL,
    lighting          INT NOT NULL,
    co2_level         INT NOT NULL,
    air_flow          DECIMAL(5,2) NOT NULL,
    cycle_day_current INT NOT NULL DEFAULT 1,
    cycle_day_total   INT NOT NULL DEFAULT 35,
    last_updated      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                         ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_env_room FOREIGN KEY (room_id)
        REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO environmental_data
    (room_id, temperature, humidity, lighting, co2_level, air_flow, cycle_day_current, cycle_day_total)
VALUES
    (1, 22.5, 88.0, 320, 780,  18.0, 1, 35),
    (2, 24.0, 92.0, 180, 820,  16.5, 1, 35),
    (3, 21.5, 90.0, 350, 760,  19.0, 1, 35);

-- ---------------------------------------------------------
-- threshold_settings : per-room min/max acceptance
-- ---------------------------------------------------------
CREATE TABLE threshold_settings (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    room_id      INT NOT NULL UNIQUE,
    temp_min     DECIMAL(5,2) NOT NULL,
    temp_max     DECIMAL(5,2) NOT NULL,
    humidity_min DECIMAL(5,2) NOT NULL,
    humidity_max DECIMAL(5,2) NOT NULL,
    light_min    INT NOT NULL,
    light_max    INT NOT NULL,
    co2_min      INT NOT NULL,
    co2_max      INT NOT NULL,
    airflow_min  DECIMAL(5,2) NOT NULL,
    airflow_max  DECIMAL(5,2) NOT NULL,
    CONSTRAINT fk_thr_room FOREIGN KEY (room_id)
        REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO threshold_settings
    (room_id, temp_min, temp_max, humidity_min, humidity_max,
     light_min, light_max, co2_min, co2_max, airflow_min, airflow_max)
VALUES
    (1, 20.0, 24.0, 85.0, 95.0, 200, 500, 500, 1000, 15.0, 25.0),
    (2, 22.0, 26.0, 88.0, 96.0, 100, 300, 600, 1100, 14.0, 22.0),
    (3, 19.0, 23.0, 85.0, 95.0, 250, 550, 500, 1000, 16.0, 26.0);

-- ---------------------------------------------------------
-- system_alerts : rolling alert log
-- ---------------------------------------------------------
CREATE TABLE system_alerts (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    room_id       INT NOT NULL,
    alert_message VARCHAR(255) NOT NULL,
    severity      ENUM('info','warning','danger') NOT NULL DEFAULT 'info',
    timestamp     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_resolved   TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT fk_alert_room FOREIGN KEY (room_id)
        REFERENCES rooms(id) ON DELETE CASCADE,
    INDEX idx_alert_room (room_id),
    INDEX idx_alert_resolved (is_resolved)
) ENGINE=InnoDB;

INSERT INTO system_alerts (room_id, alert_message, severity) VALUES
    (1, 'Room 1 (Grey Oyster) initialised — sensors online.', 'info'),
    (2, 'Room 2 (Black Jelly) initialised — sensors online.', 'info'),
    (3, 'Room 3 (White Oyster) initialised — sensors online.', 'info');

-- ---------------------------------------------------------
-- cycle_tracker : growth phase per room
-- ---------------------------------------------------------
CREATE TABLE cycle_tracker (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    room_id         INT NOT NULL UNIQUE,
    current_phase   ENUM('seeding','colonisation','initiation','fruiting','harvest') NOT NULL DEFAULT 'seeding',
    phase_start_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    phase_due_date  DATETIME NOT NULL,
    CONSTRAINT fk_cycle_room FOREIGN KEY (room_id)
        REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO cycle_tracker (room_id, current_phase, phase_start_date, phase_due_date) VALUES
    (1, 'seeding', NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY)),
    (2, 'seeding', NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY)),
    (3, 'seeding', NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY));
