-- Migration : événements, annonces et nouveaux types de notifications.
-- À exécuter une fois sur une base existante :
--   mysql -u root -p fitlife < database/migrations/2026-10-12_events_announcements.sql
-- (Une installation neuve via schema.sql contient déjà tout.)

ALTER TABLE notifications
  MODIFY type ENUM('workout','hydration','meal','live','leaderboard','badge','challenge','encouragement','announcement','event')
  NOT NULL DEFAULT 'workout';

CREATE TABLE IF NOT EXISTS events (
  id               VARCHAR(24) NOT NULL PRIMARY KEY,
  title            VARCHAR(160) NOT NULL,
  description      TEXT NOT NULL,
  category         ENUM('workshop','run','challenge','meetup','webinar') NOT NULL DEFAULT 'meetup',
  starts_at        DATETIME NOT NULL,
  duration_minutes SMALLINT NOT NULL DEFAULT 60,
  location         VARCHAR(255) NOT NULL DEFAULT '',
  online           TINYINT(1) NOT NULL DEFAULT 0,
  capacity         INT NULL,
  cover_url        VARCHAR(500) NULL,
  created_by       VARCHAR(120) NOT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY (starts_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS event_attendees (
  event_id   VARCHAR(24) NOT NULL,
  user_id    CHAR(20) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS announcements (
  id          VARCHAR(24) NOT NULL PRIMARY KEY,
  title       VARCHAR(160) NOT NULL,
  content     TEXT NOT NULL,
  priority    ENUM('info','important','urgent') NOT NULL DEFAULT 'info',
  pinned      TINYINT(1) NOT NULL DEFAULT 0,
  expires_at  DATETIME NULL,
  author_name VARCHAR(120) NOT NULL,
  author_role ENUM('user','coach','admin') NOT NULL DEFAULT 'coach',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
