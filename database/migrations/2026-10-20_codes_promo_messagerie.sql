-- Codes promo + messagerie avec les coachs (tables aussi créées automatiquement par l'API).
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
