-- Migration : menu du jour (coachs / admins) et paiements Premium.
-- mysql -u root -p fitlife < database/migrations/2026-10-12_menu_payments.sql

ALTER TABLE subscriptions ADD COLUMN method VARCHAR(20) NULL AFTER renews_at;

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
