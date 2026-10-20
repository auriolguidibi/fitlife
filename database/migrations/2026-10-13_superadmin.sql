-- Migration : rôle super administrateur.
-- mysql -u root -p fitlife < database/migrations/2026-10-13_superadmin.sql

ALTER TABLE users MODIFY role ENUM('user','coach','admin','superadmin') NOT NULL DEFAULT 'user';
ALTER TABLE announcements MODIFY author_role ENUM('user','coach','admin','superadmin') NOT NULL DEFAULT 'coach';

-- Pour promouvoir un compte existant en super admin :
-- UPDATE users SET role = 'superadmin' WHERE email = 'ton.email@exemple.com';
