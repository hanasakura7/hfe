-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 24, 2026 at 05:26 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mushroom_farm_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `cycle_tracker`
--

CREATE TABLE `cycle_tracker` (
  `id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `current_phase` enum('seeding','colonisation','initiation','fruiting','harvest') NOT NULL DEFAULT 'seeding',
  `phase_start_date` datetime NOT NULL DEFAULT current_timestamp(),
  `phase_due_date` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cycle_tracker`
--

INSERT INTO `cycle_tracker` (`id`, `room_id`, `current_phase`, `phase_start_date`, `phase_due_date`) VALUES
(1, 1, 'fruiting', '2026-05-24 20:06:51', '2026-05-31 20:06:51'),
(2, 2, 'colonisation', '2026-05-24 18:53:58', '2026-06-07 18:53:58'),
(3, 3, 'fruiting', '2026-05-24 18:54:03', '2026-05-31 18:54:03');

-- --------------------------------------------------------

--
-- Table structure for table `environmental_data`
--

CREATE TABLE `environmental_data` (
  `id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `temperature` decimal(5,2) NOT NULL,
  `humidity` decimal(5,2) NOT NULL,
  `lighting` int(11) NOT NULL,
  `co2_level` int(11) NOT NULL,
  `air_flow` decimal(5,2) NOT NULL,
  `cycle_day_current` int(11) NOT NULL DEFAULT 1,
  `cycle_day_total` int(11) NOT NULL DEFAULT 35,
  `last_updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `environmental_data`
--

INSERT INTO `environmental_data` (`id`, `room_id`, `temperature`, `humidity`, `lighting`, `co2_level`, `air_flow`, `cycle_day_current`, `cycle_day_total`, `last_updated`) VALUES
(1, 1, 21.20, 94.62, 360, 599, 23.20, 23, 35, '2026-05-24 23:26:10'),
(2, 2, 23.32, 88.66, 296, 1047, 19.30, 4, 35, '2026-05-24 23:26:10'),
(3, 3, 20.08, 90.32, 422, 548, 16.76, 23, 35, '2026-05-24 23:26:10');

-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

CREATE TABLE `rooms` (
  `id` int(11) NOT NULL,
  `room_number` tinyint(4) NOT NULL,
  `mushroom_type` varchar(40) NOT NULL
) ;

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`id`, `room_number`, `mushroom_type`) VALUES
(1, 1, 'Grey Oyster'),
(2, 2, 'Black Jelly'),
(3, 3, 'White Oyster');

-- --------------------------------------------------------

--
-- Table structure for table `system_alerts`
--

CREATE TABLE `system_alerts` (
  `id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `alert_message` varchar(255) NOT NULL,
  `severity` enum('info','warning','danger') NOT NULL DEFAULT 'info',
  `timestamp` datetime NOT NULL DEFAULT current_timestamp(),
  `is_resolved` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `system_alerts`
--

INSERT INTO `system_alerts` (`id`, `room_id`, `alert_message`, `severity`, `timestamp`, `is_resolved`) VALUES
(707, 2, 'Air flow high in Black Jelly room — ventilation throttled.', 'info', '2026-05-24 17:26:09', 0),
(708, 2, 'Humidity below target in Black Jelly room — humidifier ON.', 'warning', '2026-05-24 17:29:20', 0),
(709, 3, 'Humidity above target in White Oyster room — passive vent.', 'info', '2026-05-24 17:29:20', 0),
(710, 3, 'CO₂ below baseline in White Oyster room.', 'warning', '2026-05-24 17:29:36', 0),
(711, 1, 'Air flow high in Grey Oyster room — ventilation throttled.', 'info', '2026-05-24 17:29:44', 0),
(712, 3, 'CO₂ level critical in White Oyster room — exhaust ON.', 'danger', '2026-05-24 17:29:44', 0),
(713, 1, 'Air flow high in Grey Oyster room — ventilation throttled.', 'info', '2026-05-24 17:29:52', 0),
(714, 1, 'Low lighting in Grey Oyster room — grow lights ON.', 'info', '2026-05-24 17:30:00', 0),
(715, 3, 'Low lighting in White Oyster room — grow lights ON.', 'info', '2026-05-24 17:30:29', 0),
(716, 1, 'Temperature high in Grey Oyster room — cooling fan engaged.', 'warning', '2026-05-24 17:30:41', 0),
(717, 2, 'Low lighting in Black Jelly room — grow lights ON.', 'info', '2026-05-24 17:30:50', 0),
(718, 1, 'CO₂ level critical in Grey Oyster room — exhaust ON.', 'danger', '2026-05-24 17:30:58', 0),
(719, 1, 'Temperature low in Grey Oyster room — heater engaged.', 'danger', '2026-05-24 17:31:06', 0),
(720, 3, 'Humidity below target in White Oyster room — humidifier ON.', 'warning', '2026-05-24 17:31:06', 0),
(721, 1, 'Low lighting in Grey Oyster room — grow lights ON.', 'info', '2026-05-24 17:31:22', 0),
(722, 3, 'Temperature high in White Oyster room — cooling fan engaged.', 'warning', '2026-05-24 17:31:22', 0),
(723, 1, 'Lighting too bright in Grey Oyster room — dimming.', 'info', '2026-05-24 17:31:38', 0),
(724, 2, 'Temperature high in Black Jelly room — cooling fan engaged.', 'warning', '2026-05-24 17:31:46', 0),
(725, 3, 'Temperature high in White Oyster room — cooling fan engaged.', 'warning', '2026-05-24 17:31:46', 0),
(726, 3, 'Air flow high in White Oyster room — ventilation throttled.', 'info', '2026-05-24 17:31:54', 0),
(727, 2, 'Humidity above target in Black Jelly room — passive vent.', 'info', '2026-05-24 17:33:09', 0),
(728, 1, 'Temperature high in Grey Oyster room — cooling fan engaged.', 'warning', '2026-05-24 17:34:09', 0),
(729, 3, 'Air flow high in White Oyster room — ventilation throttled.', 'info', '2026-05-24 17:34:09', 0),
(730, 2, 'Air flow high in Black Jelly room — ventilation throttled.', 'info', '2026-05-24 17:36:09', 0),
(731, 1, 'Low lighting in Grey Oyster room — grow lights ON.', 'info', '2026-05-24 17:38:09', 0),
(732, 2, 'Temperature high in Black Jelly room — cooling fan engaged.', 'warning', '2026-05-24 17:38:09', 0),
(733, 1, 'Air flow weak in Grey Oyster room — ventilation ON.', 'warning', '2026-05-24 17:42:09', 0),
(734, 3, 'CO₂ below baseline in White Oyster room.', 'warning', '2026-05-24 17:42:09', 0),
(735, 1, 'Low lighting in Grey Oyster room — grow lights ON.', 'info', '2026-05-24 17:43:09', 0),
(736, 2, 'Temperature high in Black Jelly room — cooling fan engaged.', 'warning', '2026-05-24 17:44:09', 0),
(737, 2, 'Low lighting in Black Jelly room — grow lights ON.', 'info', '2026-05-24 17:45:09', 0),
(738, 1, 'CO₂ level critical in Grey Oyster room — exhaust ON.', 'danger', '2026-05-24 17:49:09', 0),
(739, 3, 'CO₂ below baseline in White Oyster room.', 'warning', '2026-05-24 17:50:57', 0),
(740, 3, 'Temperature high in White Oyster room — cooling fan engaged.', 'warning', '2026-05-24 17:52:09', 0),
(741, 3, 'CO₂ level critical in White Oyster room — exhaust ON.', 'danger', '2026-05-24 17:54:09', 0),
(742, 1, 'Temperature high in Grey Oyster room — cooling fan engaged.', 'warning', '2026-05-24 17:55:09', 0),
(743, 2, 'Temperature high in Black Jelly room — cooling fan engaged.', 'warning', '2026-05-24 17:56:09', 0),
(744, 1, 'Lighting too bright in Grey Oyster room — dimming.', 'info', '2026-05-24 17:58:09', 0),
(745, 2, 'Temperature high in Black Jelly room — cooling fan engaged.', 'warning', '2026-05-24 17:58:09', 0),
(746, 1, 'Temperature low in Grey Oyster room — heater engaged.', 'danger', '2026-05-24 17:59:09', 0),
(747, 2, 'Lighting too bright in Black Jelly room — dimming.', 'info', '2026-05-24 18:01:09', 0),
(748, 1, 'CO₂ level critical in Grey Oyster room — exhaust ON.', 'danger', '2026-05-24 18:02:09', 0),
(749, 2, 'CO₂ level critical in Black Jelly room — exhaust ON.', 'danger', '2026-05-24 18:02:09', 0),
(750, 3, 'Temperature low in White Oyster room — heater engaged.', 'danger', '2026-05-24 18:02:09', 0),
(751, 2, 'Air flow high in Black Jelly room — ventilation throttled.', 'info', '2026-05-24 18:03:09', 0),
(752, 1, 'Humidity below target in Grey Oyster room — humidifier ON.', 'warning', '2026-05-24 18:06:09', 0),
(753, 3, 'CO₂ level critical in White Oyster room — exhaust ON.', 'danger', '2026-05-24 18:06:09', 0),
(754, 2, 'Low lighting in Black Jelly room — grow lights ON.', 'info', '2026-05-24 18:07:09', 0),
(755, 3, 'CO₂ level critical in White Oyster room — exhaust ON.', 'danger', '2026-05-24 18:07:09', 0),
(756, 3, 'Temperature high in White Oyster room — cooling fan engaged.', 'warning', '2026-05-24 18:08:09', 0),
(757, 3, 'Temperature low in White Oyster room — heater engaged.', 'danger', '2026-05-24 18:10:09', 0),
(758, 1, 'Humidity above target in Grey Oyster room — passive vent.', 'info', '2026-05-24 18:11:09', 0),
(759, 3, 'Temperature high in White Oyster room — cooling fan engaged.', 'warning', '2026-05-24 18:13:09', 0),
(760, 1, 'Air flow high in Grey Oyster room — ventilation throttled.', 'info', '2026-05-24 18:14:09', 0),
(761, 3, 'Temperature high in White Oyster room — cooling fan engaged.', 'warning', '2026-05-24 18:14:09', 0),
(762, 3, 'CO₂ level critical in White Oyster room — exhaust ON.', 'danger', '2026-05-24 18:15:09', 0),
(763, 1, 'CO₂ level critical in Grey Oyster room — exhaust ON.', 'danger', '2026-05-24 18:16:09', 0),
(764, 2, 'Lighting too bright in Black Jelly room — dimming.', 'info', '2026-05-24 18:16:09', 0),
(765, 3, 'CO₂ below baseline in White Oyster room.', 'warning', '2026-05-24 18:17:09', 0),
(766, 1, 'Humidity below target in Grey Oyster room — humidifier ON.', 'warning', '2026-05-24 18:18:09', 0),
(767, 2, 'Temperature high in Black Jelly room — cooling fan engaged.', 'warning', '2026-05-24 18:20:09', 0),
(768, 3, 'CO₂ below baseline in White Oyster room.', 'warning', '2026-05-24 18:21:09', 0),
(769, 1, 'Humidity below target in Grey Oyster room — humidifier ON.', 'warning', '2026-05-24 18:22:09', 0),
(770, 1, 'Humidity below target in Grey Oyster room — humidifier ON.', 'warning', '2026-05-24 18:23:09', 0),
(771, 3, 'Lighting too bright in White Oyster room — dimming.', 'info', '2026-05-24 18:26:09', 0),
(772, 1, 'Humidity below target in Grey Oyster room — humidifier ON.', 'warning', '2026-05-24 18:27:09', 0),
(773, 2, 'Humidity below target in Black Jelly room — humidifier ON.', 'warning', '2026-05-24 18:29:09', 0),
(774, 3, 'Low lighting in White Oyster room — grow lights ON.', 'info', '2026-05-24 18:29:09', 0),
(775, 2, 'Air flow weak in Black Jelly room — ventilation ON.', 'warning', '2026-05-24 18:30:09', 0),
(776, 3, 'CO₂ below baseline in White Oyster room.', 'warning', '2026-05-24 18:30:09', 0),
(777, 1, 'Air flow weak in Grey Oyster room — ventilation ON.', 'warning', '2026-05-24 18:31:09', 0),
(778, 2, 'CO₂ level critical in Black Jelly room — exhaust ON.', 'danger', '2026-05-24 18:31:09', 0),
(779, 3, 'Low lighting in White Oyster room — grow lights ON.', 'info', '2026-05-24 18:33:09', 0),
(780, 2, 'Temperature high in Black Jelly room — cooling fan engaged.', 'warning', '2026-05-24 18:35:09', 0),
(781, 3, 'Low lighting in White Oyster room — grow lights ON.', 'info', '2026-05-24 18:36:45', 0),
(782, 2, 'Temperature low in Black Jelly room — heater engaged.', 'danger', '2026-05-24 18:40:09', 0),
(783, 3, 'Lighting too bright in White Oyster room — dimming.', 'info', '2026-05-24 18:40:09', 0),
(784, 1, 'Lighting too bright in Grey Oyster room — dimming.', 'info', '2026-05-24 18:42:09', 0),
(785, 1, 'Temperature low in Grey Oyster room — heater engaged.', 'danger', '2026-05-24 18:43:09', 0),
(786, 3, 'Humidity below target in White Oyster room — humidifier ON.', 'warning', '2026-05-24 18:45:09', 0),
(787, 1, 'Temperature high in Grey Oyster room — cooling fan engaged.', 'warning', '2026-05-24 18:46:09', 0),
(788, 3, 'Humidity below target in White Oyster room — humidifier ON.', 'warning', '2026-05-24 18:46:09', 0),
(789, 1, 'Lighting too bright in Grey Oyster room — dimming.', 'info', '2026-05-24 18:48:09', 0),
(790, 2, 'Humidity above target in Black Jelly room — passive vent.', 'info', '2026-05-24 18:48:09', 0),
(791, 2, 'Humidity above target in Black Jelly room — passive vent.', 'info', '2026-05-24 18:49:09', 0),
(792, 3, 'CO₂ below baseline in White Oyster room.', 'warning', '2026-05-24 18:49:09', 0),
(793, 1, 'Low lighting in Grey Oyster room — grow lights ON.', 'info', '2026-05-24 18:51:09', 0),
(794, 2, 'Air flow high in Black Jelly room — ventilation throttled.', 'info', '2026-05-24 18:51:09', 0),
(795, 1, 'Humidity above target in Grey Oyster room — passive vent.', 'info', '2026-05-24 18:52:06', 0),
(796, 2, 'Humidity above target in Black Jelly room — passive vent.', 'info', '2026-05-24 18:52:25', 0),
(797, 3, 'Low lighting in White Oyster room — grow lights ON.', 'info', '2026-05-24 18:52:25', 0),
(798, 2, 'CO₂ level critical in Black Jelly room — exhaust ON.', 'danger', '2026-05-24 18:52:33', 0),
(799, 3, 'Air flow high in White Oyster room — ventilation throttled.', 'info', '2026-05-24 18:52:33', 0),
(800, 1, 'Phase advanced to \'colonisation\'.', 'info', '2026-05-24 18:52:41', 0),
(801, 1, 'Phase advanced to \'initiation\'.', 'info', '2026-05-24 18:52:42', 0),
(802, 1, 'CO₂ level critical in Grey Oyster room — exhaust ON.', 'danger', '2026-05-24 18:52:49', 0),
(803, 1, 'CO₂ level critical in Grey Oyster room — exhaust ON.', 'danger', '2026-05-24 18:52:57', 0),
(804, 3, 'Lighting too bright in White Oyster room — dimming.', 'info', '2026-05-24 18:53:05', 0),
(805, 3, 'Temperature low in White Oyster room — heater engaged.', 'danger', '2026-05-24 18:53:09', 0),
(806, 1, 'Temperature high in Grey Oyster room — cooling fan engaged.', 'warning', '2026-05-24 18:53:10', 0),
(807, 2, 'Lighting too bright in Black Jelly room — dimming.', 'info', '2026-05-24 18:53:11', 0),
(808, 1, 'CO₂ level critical in Grey Oyster room — exhaust ON.', 'danger', '2026-05-24 18:53:13', 0),
(809, 2, 'Lighting too bright in Black Jelly room — dimming.', 'info', '2026-05-24 18:53:13', 0),
(810, 2, 'Humidity below target in Black Jelly room — humidifier ON.', 'warning', '2026-05-24 18:53:29', 0),
(811, 3, 'Humidity below target in White Oyster room — humidifier ON.', 'warning', '2026-05-24 18:53:29', 0),
(812, 1, 'CO₂ below baseline in Grey Oyster room.', 'warning', '2026-05-24 18:53:37', 0),
(813, 2, 'Air flow high in Black Jelly room — ventilation throttled.', 'info', '2026-05-24 18:53:53', 0),
(814, 2, 'Phase advanced to \'colonisation\'.', 'info', '2026-05-24 18:53:58', 0),
(815, 3, 'Phase advanced to \'colonisation\'.', 'info', '2026-05-24 18:54:03', 0),
(816, 3, 'Phase advanced to \'initiation\'.', 'info', '2026-05-24 18:54:03', 0),
(817, 3, 'Phase advanced to \'fruiting\'.', 'info', '2026-05-24 18:54:03', 0),
(818, 1, 'CO₂ level critical in Grey Oyster room — exhaust ON.', 'danger', '2026-05-24 18:54:24', 0),
(819, 2, 'Low lighting in Black Jelly room — grow lights ON.', 'info', '2026-05-24 18:54:41', 0),
(820, 2, 'Air flow high in Black Jelly room — ventilation throttled.', 'info', '2026-05-24 18:55:06', 0),
(821, 3, 'Lighting too bright in White Oyster room — dimming.', 'info', '2026-05-24 18:55:06', 0),
(822, 1, 'Air flow weak in Grey Oyster room — ventilation ON.', 'warning', '2026-05-24 18:55:15', 0),
(823, 3, 'Humidity below target in White Oyster room — humidifier ON.', 'warning', '2026-05-24 18:55:15', 0),
(824, 2, 'CO₂ below baseline in Black Jelly room.', 'warning', '2026-05-24 18:58:09', 0),
(825, 3, 'Air flow weak in White Oyster room — ventilation ON.', 'warning', '2026-05-24 19:06:09', 0),
(826, 1, 'Phase advanced to \'fruiting\'.', 'info', '2026-05-24 20:06:51', 0);

-- --------------------------------------------------------

--
-- Table structure for table `threshold_settings`
--

CREATE TABLE `threshold_settings` (
  `id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `temp_min` decimal(5,2) NOT NULL,
  `temp_max` decimal(5,2) NOT NULL,
  `humidity_min` decimal(5,2) NOT NULL,
  `humidity_max` decimal(5,2) NOT NULL,
  `light_min` int(11) NOT NULL,
  `light_max` int(11) NOT NULL,
  `co2_min` int(11) NOT NULL,
  `co2_max` int(11) NOT NULL,
  `airflow_min` decimal(5,2) NOT NULL,
  `airflow_max` decimal(5,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `threshold_settings`
--

INSERT INTO `threshold_settings` (`id`, `room_id`, `temp_min`, `temp_max`, `humidity_min`, `humidity_max`, `light_min`, `light_max`, `co2_min`, `co2_max`, `airflow_min`, `airflow_max`) VALUES
(1, 1, 20.00, 24.00, 85.00, 95.00, 200, 500, 500, 1000, 15.00, 25.00),
(2, 2, 22.00, 26.00, 88.00, 96.00, 100, 300, 600, 1100, 14.00, 22.00),
(3, 3, 20.00, 24.00, 85.00, 95.00, 250, 550, 500, 1000, 16.00, 26.00);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cycle_tracker`
--
ALTER TABLE `cycle_tracker`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `room_id` (`room_id`);

--
-- Indexes for table `environmental_data`
--
ALTER TABLE `environmental_data`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_env_room` (`room_id`);

--
-- Indexes for table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `room_number` (`room_number`);

--
-- Indexes for table `system_alerts`
--
ALTER TABLE `system_alerts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_alert_room` (`room_id`),
  ADD KEY `idx_alert_resolved` (`is_resolved`);

--
-- Indexes for table `threshold_settings`
--
ALTER TABLE `threshold_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `room_id` (`room_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cycle_tracker`
--
ALTER TABLE `cycle_tracker`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `environmental_data`
--
ALTER TABLE `environmental_data`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_alerts`
--
ALTER TABLE `system_alerts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=827;

--
-- AUTO_INCREMENT for table `threshold_settings`
--
ALTER TABLE `threshold_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cycle_tracker`
--
ALTER TABLE `cycle_tracker`
  ADD CONSTRAINT `fk_cycle_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `environmental_data`
--
ALTER TABLE `environmental_data`
  ADD CONSTRAINT `fk_env_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `system_alerts`
--
ALTER TABLE `system_alerts`
  ADD CONSTRAINT `fk_alert_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `threshold_settings`
--
ALTER TABLE `threshold_settings`
  ADD CONSTRAINT `fk_thr_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
