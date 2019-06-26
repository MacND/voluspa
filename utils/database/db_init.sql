--
-- Table structure for table `activities`
--

DROP TABLE IF EXISTS `activities`;

CREATE TABLE `activities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nickname` varchar(16) DEFAULT NULL,
  `name` varchar(64) NOT NULL,
  `tagline` varchar(64) DEFAULT NULL,
  `fireteam_size` smallint(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nickname` (`nickname`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;

CREATE TABLE `events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `activity_id` int(11) NOT NULL,
  `join_code` varchar(16) NOT NULL,
  `start_time` datetime DEFAULT NULL,
  `finish_time` datetime DEFAULT NULL,
  `fireteam_id` int(11) NOT NULL,
  `raid_report_url` varchar(512) DEFAULT NULL,
  `note` varchar(512) DEFAULT NULL,
  `opened_time` datetime DEFAULT NULL,
  `private` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table `fireteams`
--

DROP TABLE IF EXISTS `fireteams`;

CREATE TABLE `fireteams` (
  `event_id` int(11) NOT NULL,
  `discord_id` varchar(32) NOT NULL,
  `streaming` tinyint(1) NOT NULL DEFAULT '0',
  `reserve` tinyint(1) NOT NULL DEFAULT '0',
  `admin` tinyint(1) NOT NULL DEFAULT '0',
  `join_date` datetime DEFAULT NULL,
  PRIMARY KEY (`event_id`,`discord_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `discord_id` varchar(32) NOT NULL,
  `timezone` varchar(64) NOT NULL,
  `bnet_id` varchar(18) DEFAULT NULL,
  `twitch` varchar(32) DEFAULT NULL,
  UNIQUE KEY `discord_id` (`discord_id`),
  UNIQUE KEY `bnet_id` (`bnet_id`),
  UNIQUE KEY `twitch` (`twitch`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;