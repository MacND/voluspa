CREATE DATABASE `voluspa` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;

CREATE TABLE `activities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nickname` varchar(16) DEFAULT NULL,
  `name` varchar(64) NOT NULL,
  `tagline` varchar(96) DEFAULT NULL,
  `fireteam_size` smallint(6) NOT NULL,
  `requires` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nickname` (`nickname`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4;

CREATE TABLE `events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `activity_id` int(11) NOT NULL,
  `join_code` varchar(16) NOT NULL,
  `start_time` datetime DEFAULT NULL,
  `finish_time` datetime DEFAULT NULL,
  `raid_report_url` varchar(512) DEFAULT NULL,
  `note` varchar(128) DEFAULT NULL,
  `opened_time` datetime DEFAULT NULL,
  `private` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4;

CREATE TABLE `fireteams` (
  `event_id` int(11) NOT NULL,
  `discord_id` varchar(32) NOT NULL,
  `streaming` tinyint(1) NOT NULL DEFAULT '0',
  `reserve` tinyint(1) NOT NULL DEFAULT '0',
  `admin` tinyint(1) NOT NULL DEFAULT '0',
  `join_date` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`,`discord_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `notifications` (
  `discord_id` varchar(32) NOT NULL,
  `activity_id` int(11) NOT NULL,
  PRIMARY KEY (`discord_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `notifications` (
  `discord_id` varchar(32) NOT NULL,
  `activity_id` int(11) NOT NULL,
  PRIMARY KEY (`discord_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE 
    ALGORITHM = UNDEFINED 
    DEFINER = `voluspa`@` localhost ` 
    SQL SECURITY DEFINER
VIEW `vw_next_3_events` AS
    SELECT 
        `e`.`id` AS `id`,
        `e`.`start_time` AS `start_time`,
        `e`.`join_code` AS `join_code`,
        `a`.`nickname` AS `nickname`,
        `a`.`name` AS `name`,
        `e`.`opened_time` AS `opened_time`,
        GROUP_CONCAT(`f`.`discord_id`
            SEPARATOR ',') AS `fireteam`,
        `e`.`note` AS `note`,
        `e`.`private` AS `private`
    FROM
        ((`events` `e`
        JOIN `activities` `a` ON ((`a`.`id` = `e`.`activity_id`)))
        LEFT JOIN `fireteams` `f` ON (((`f`.`event_id` = `e`.`id`)
            AND (`f`.`reserve` = 0))))
    WHERE
        ISNULL(`e`.`finish_time`)
    GROUP BY `f`.`event_id`
    ORDER BY ISNULL(`e`.`start_time`) , `e`.`start_time` , `e`.`id`
    LIMIT 3;

DELIMITER $$
CREATE DEFINER=`voluspa`@`localhost` PROCEDURE `make_event`(IN activity_id INT(11), IN opened_time DATETIME, IN creator_id VARCHAR(32), IN private BOOL, OUT join_code VARCHAR(16))
BEGIN
SELECT @activity_nickname:=(SELECT nickname FROM activities WHERE id = activity_id);
SELECT @activity_count:=((SELECT COUNT(activity_id) FROM events WHERE events.activity_id = activity_id) + 1);
SELECT @join_code:=(SELECT CONCAT(@activity_nickname, "-", @activity_count));
INSERT INTO events (activity_id, opened_time, join_code, private) VALUES (activity_id, opened_time, @join_code, private);
SELECT @event_id:=LAST_INSERT_ID();
INSERT INTO fireteams(discord_id, event_id, admin) VALUES (creator_id, @event_id, true);
SET join_code = @join_code;
END$$
DELIMITER ;
