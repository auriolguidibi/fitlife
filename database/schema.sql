-- FitLife – MySQL schema
CREATE DATABASE IF NOT EXISTS fitlife CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fitlife;

-- ---------- Users ----------
CREATE TABLE IF NOT EXISTS users (
  id            CHAR(20)     NOT NULL PRIMARY KEY,
  first_name    VARCHAR(60)  NOT NULL,
  last_name     VARCHAR(60)  NOT NULL DEFAULT '',
  email         VARCHAR(160) NOT NULL UNIQUE,
  phone         VARCHAR(40)  NOT NULL DEFAULT '',
  password_hash VARCHAR(255) NOT NULL,
  birth_date    DATE         NOT NULL,
  sex           ENUM('male','female','other') NOT NULL DEFAULT 'other',
  height_cm     SMALLINT     NOT NULL DEFAULT 170,
  weight_kg     DECIMAL(5,1) NOT NULL DEFAULT 70.0,
  avatar_url    VARCHAR(255) NULL,
  role          ENUM('user','coach','admin','superadmin') NOT NULL DEFAULT 'user',
  is_premium    TINYINT(1)   NOT NULL DEFAULT 0,
  premium_plan  ENUM('essential','premium') NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- Preferences / profile ----------
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id            CHAR(20) NOT NULL PRIMARY KEY,
  goal               ENUM('weight_loss','muscle_gain','endurance','fitness','wellness') NOT NULL DEFAULT 'fitness',
  level              ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  days_per_week      TINYINT  NOT NULL DEFAULT 3,
  session_minutes    SMALLINT NOT NULL DEFAULT 30,
  equipment          JSON     NOT NULL,
  favorite_foods     JSON     NOT NULL,
  avoided_foods      JSON     NOT NULL,
  allergies          JSON     NOT NULL,
  diet_restrictions  JSON     NOT NULL,
  budget             ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  meals_per_day      TINYINT  NOT NULL DEFAULT 3,
  onboarded          TINYINT(1) NOT NULL DEFAULT 0,
  water_goal_ml      SMALLINT NOT NULL DEFAULT 2500,
  step_goal          INT      NOT NULL DEFAULT 8000,
  bio                VARCHAR(500) NOT NULL DEFAULT '',
  city               VARCHAR(120) NOT NULL DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Body weight history ----------
CREATE TABLE IF NOT EXISTS weights (
  id      CHAR(20)   NOT NULL PRIMARY KEY,
  user_id CHAR(20)   NOT NULL,
  date    DATE       NOT NULL,
  value   DECIMAL(5,1) NOT NULL,
  KEY (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Completed workouts ----------
CREATE TABLE IF NOT EXISTS workout_logs (
  id         CHAR(20) NOT NULL PRIMARY KEY,
  user_id    CHAR(20) NOT NULL,
  workout_id VARCHAR(40) NOT NULL,
  date       DATE     NOT NULL,
  name       VARCHAR(120) NOT NULL,
  type       VARCHAR(30)  NOT NULL,
  minutes    SMALLINT NOT NULL DEFAULT 0,
  calories   SMALLINT NOT NULL DEFAULT 0,
  exercises  JSON     NULL,
  KEY (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Meal logs ----------
CREATE TABLE IF NOT EXISTS meal_logs (
  id          CHAR(20) NOT NULL PRIMARY KEY,
  user_id     CHAR(20) NOT NULL,
  meal_id     VARCHAR(20) NULL,
  date        DATE     NOT NULL,
  name        VARCHAR(160) NOT NULL,
  type        ENUM('breakfast','lunch','snack','dinner') NOT NULL,
  calories    SMALLINT NOT NULL DEFAULT 0,
  protein     DECIMAL(5,1) NOT NULL DEFAULT 0,
  carbs       DECIMAL(5,1) NOT NULL DEFAULT 0,
  fat         DECIMAL(5,1) NOT NULL DEFAULT 0,
  KEY (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Shopping list ----------
CREATE TABLE IF NOT EXISTS shopping_items (
  id       CHAR(20) NOT NULL PRIMARY KEY,
  user_id  CHAR(20) NOT NULL,
  name     VARCHAR(160) NOT NULL,
  quantity VARCHAR(80)  NOT NULL DEFAULT '',
  category VARCHAR(80)  NOT NULL DEFAULT '',
  checked  TINYINT(1) NOT NULL DEFAULT 0,
  KEY (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Water ----------
CREATE TABLE IF NOT EXISTS water_log (
  user_id CHAR(20) NOT NULL,
  date    DATE     NOT NULL,
  ml      INT      NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Steps ----------
CREATE TABLE IF NOT EXISTS steps_log (
  user_id CHAR(20) NOT NULL,
  date    DATE     NOT NULL,
  steps   INT      NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Activities ----------
CREATE TABLE IF NOT EXISTS activities (
  id             CHAR(20) NOT NULL PRIMARY KEY,
  user_id        CHAR(20) NOT NULL,
  type           ENUM('walk','run','bike','other') NOT NULL DEFAULT 'walk',
  status         ENUM('active','paused','finished') NOT NULL DEFAULT 'active',
  started_at     DATETIME NOT NULL,
  finished_at    DATETIME NULL,
  duration_seconds  INT      NOT NULL DEFAULT 0,
  moving_seconds    INT      NOT NULL DEFAULT 0,
  distance_km    DECIMAL(8,2) NOT NULL DEFAULT 0,
  steps          INT      NOT NULL DEFAULT 0,
  avg_speed_kmh  DECIMAL(6,2) NOT NULL DEFAULT 0,
  max_speed_kmh  DECIMAL(6,2) NOT NULL DEFAULT 0,
  calories       INT      NOT NULL DEFAULT 0,
  route          JSON     NULL,
  review_status  ENUM('pending','validated','rejected') NOT NULL DEFAULT 'pending',
  review_reason  VARCHAR(255) NULL,
  KEY (user_id, started_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Badges ----------
CREATE TABLE IF NOT EXISTS badges (
  code        VARCHAR(20) NOT NULL PRIMARY KEY,
  name        VARCHAR(60) NOT NULL,
  emoji       VARCHAR(8)  NOT NULL,
  description VARCHAR(160) NOT NULL,
  requirement VARCHAR(80) NOT NULL,
  tier        ENUM('bronze','silver','gold','platinum') NOT NULL DEFAULT 'bronze',
  criteria    JSON        NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_badges (
  user_id   CHAR(20) NOT NULL,
  badge_code VARCHAR(20) NOT NULL,
  earned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, badge_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_code) REFERENCES badges(code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Challenges ----------
CREATE TABLE IF NOT EXISTS challenges (
  id           VARCHAR(20) NOT NULL PRIMARY KEY,
  title        VARCHAR(120) NOT NULL,
  emoji        VARCHAR(8)  NOT NULL DEFAULT '',
  description  VARCHAR(255) NOT NULL,
  metric       ENUM('distance','steps','sessions','days') NOT NULL,
  target       INT NOT NULL,
  unit         VARCHAR(10) NOT NULL,
  days         SMALLINT NOT NULL,
  participants INT NOT NULL DEFAULT 0,
  starts_at    DATETIME NOT NULL,
  ends_at      DATETIME NOT NULL,
  badge_code   VARCHAR(20) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS challenge_participations (
  challenge_id VARCHAR(20) NOT NULL,
  user_id      CHAR(20) NOT NULL,
  progress     DECIMAL(10,2) NOT NULL DEFAULT 0,
  joined_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed    TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (challenge_id, user_id),
  FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Community ----------
CREATE TABLE IF NOT EXISTS community_posts (
  id             CHAR(20) NOT NULL PRIMARY KEY,
  user_id        CHAR(20) NOT NULL,
  content        TEXT NOT NULL,
  activity_json  JSON NULL,
  likes_count    INT NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS post_likes (
  post_id CHAR(20) NOT NULL,
  user_id CHAR(20) NOT NULL,
  PRIMARY KEY (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS post_comments (
  id         CHAR(20) NOT NULL PRIMARY KEY,
  post_id    CHAR(20) NOT NULL,
  user_id    CHAR(20) NOT NULL,
  text       VARCHAR(500) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Lives ----------
CREATE TABLE IF NOT EXISTS lives (
  id              VARCHAR(20) NOT NULL PRIMARY KEY,
  coach_id        VARCHAR(20) NOT NULL DEFAULT 'coach_awa',
  coach_name      VARCHAR(60) NOT NULL DEFAULT 'Coach Awa',
  coach_avatar_url VARCHAR(255) NULL,
  title           VARCHAR(160) NOT NULL,
  description     VARCHAR(255) NOT NULL DEFAULT '',
  status          ENUM('scheduled','live','ended') NOT NULL DEFAULT 'scheduled',
  scheduled_at    DATETIME NOT NULL,
  duration_minutes SMALLINT NOT NULL DEFAULT 30,
  viewers         INT NOT NULL DEFAULT 0,
  level           ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  premium_only    TINYINT(1) NOT NULL DEFAULT 0,
  thumbnail_url   VARCHAR(255) NULL,
  stream_url      VARCHAR(500) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS live_messages (
  id          CHAR(20) NOT NULL PRIMARY KEY,
  live_id     VARCHAR(20) NOT NULL,
  user_id     VARCHAR(20) NOT NULL,
  user_name   VARCHAR(60) NOT NULL,
  avatar_url  VARCHAR(255) NULL,
  text        VARCHAR(500) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_coach    TINYINT(1) NOT NULL DEFAULT 0,
  is_question TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (live_id) REFERENCES lives(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Direct caméra : hôte qui diffuse et messages de connexion WebRTC entre l'hôte et les spectateurs.
CREATE TABLE IF NOT EXISTS live_hosts (
  live_id      VARCHAR(20) NOT NULL PRIMARY KEY,
  host_user_id VARCHAR(20) NOT NULL,
  camera_on    TINYINT(1) NOT NULL DEFAULT 1,
  mic_on       TINYINT(1) NOT NULL DEFAULT 1,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS live_signals (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  live_id    VARCHAR(20) NOT NULL,
  from_user  VARCHAR(20) NOT NULL,
  to_user    VARCHAR(20) NOT NULL,
  kind       VARCHAR(16) NOT NULL,
  payload    MEDIUMTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY (live_id, to_user, id)
) ENGINE=InnoDB;

-- ---------- Événements & annonces (gérés par les coachs / admins) ----------
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
  author_role ENUM('user','coach','admin','superadmin') NOT NULL DEFAULT 'coach',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- Menu du jour & paiements ----------
CREATE TABLE IF NOT EXISTS menu_items (
  id          VARCHAR(24) NOT NULL PRIMARY KEY,
  date        DATE NOT NULL,
  meal_type   ENUM('breakfast','lunch','snack','dinner') NOT NULL,
  name        VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  calories    SMALLINT NOT NULL DEFAULT 0,
  protein     SMALLINT NOT NULL DEFAULT 0,
  carbs       SMALLINT NOT NULL DEFAULT 0,
  fat         SMALLINT NOT NULL DEFAULT 0,
  image_url   VARCHAR(500) NULL,
  created_by  VARCHAR(120) NOT NULL,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY (date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id             VARCHAR(24) NOT NULL PRIMARY KEY,
  user_id        CHAR(20) NOT NULL,
  reference      VARCHAR(32) NOT NULL UNIQUE,
  plan_id        ENUM('essential','premium') NOT NULL,
  billing        ENUM('monthly','yearly') NOT NULL,
  amount         INT NOT NULL,
  currency       CHAR(4) NOT NULL DEFAULT 'FCFA',
  method         ENUM('orange_money','mtn_momo','moov_money','wave','card') NOT NULL,
  phone_masked   VARCHAR(20) NULL,
  status         ENUM('pending','succeeded','failed') NOT NULL DEFAULT 'pending',
  failure_reason VARCHAR(255) NULL,
  provider_ref   VARCHAR(64) NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at        DATETIME NULL,
  KEY (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Coach AI ----------
CREATE TABLE IF NOT EXISTS chat_messages (
  id         CHAR(20) NOT NULL PRIMARY KEY,
  user_id    CHAR(20) NOT NULL,
  role       ENUM('user','assistant') NOT NULL,
  content    TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Subscription ----------
CREATE TABLE IF NOT EXISTS subscription_plans (
  id            ENUM('essential','premium') NOT NULL PRIMARY KEY,
  name          VARCHAR(60) NOT NULL,
  price_monthly INT NOT NULL,
  price_yearly  INT NOT NULL,
  currency      CHAR(4) NOT NULL DEFAULT 'FCFA',
  features      JSON NOT NULL,
  highlighted   TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subscriptions (
  id         CHAR(20) NOT NULL PRIMARY KEY,
  user_id    CHAR(20) NOT NULL,
  plan_id    ENUM('essential','premium') NOT NULL,
  billing    ENUM('monthly','yearly') NOT NULL DEFAULT 'monthly',
  status     ENUM('active','cancelled','expired') NOT NULL DEFAULT 'active',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  renews_at  DATETIME NULL,
  method     VARCHAR(20) NULL,
  UNIQUE KEY (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
) ENGINE=InnoDB;

-- ---------- Notifications ----------
CREATE TABLE IF NOT EXISTS notifications (
  id         CHAR(20) NOT NULL PRIMARY KEY,
  user_id    CHAR(20) NOT NULL,
  type       ENUM('workout','hydration','meal','live','leaderboard','badge','challenge','encouragement','announcement','event') NOT NULL DEFAULT 'workout',
  title      VARCHAR(120) NOT NULL,
  body       VARCHAR(500) NOT NULL,
  `read`     TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Codes promo (accès Premium pour une durée choisie par un coach / admin)
CREATE TABLE IF NOT EXISTS promo_codes (
  code            VARCHAR(32) NOT NULL PRIMARY KEY,
  days            INT NOT NULL,
  max_uses        INT NULL,
  uses            INT NOT NULL DEFAULT 0,
  expires_at      DATETIME NULL,
  note            VARCHAR(160) NULL,
  active          TINYINT(1) NOT NULL DEFAULT 1,
  created_by      VARCHAR(20) NOT NULL,
  created_by_name VARCHAR(120) NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS promo_redemptions (
  code        VARCHAR(32) NOT NULL,
  user_id     VARCHAR(20) NOT NULL,
  redeemed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (code, user_id),
  KEY (user_id)
) ENGINE=InnoDB;

-- Messagerie membre <-> coachs du site (user_id = membre propriétaire de la conversation)
CREATE TABLE IF NOT EXISTS coach_messages (
  id             VARCHAR(20) NOT NULL PRIMARY KEY,
  seq            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
  user_id        VARCHAR(20) NOT NULL,
  sender_id      VARCHAR(20) NOT NULL,
  from_coach     TINYINT(1) NOT NULL DEFAULT 0,
  sender_name    VARCHAR(120) NOT NULL,
  text           TEXT NOT NULL,
  read_by_member TINYINT(1) NOT NULL DEFAULT 0,
  read_by_coach  TINYINT(1) NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY (user_id, created_at)
) ENGINE=InnoDB;
