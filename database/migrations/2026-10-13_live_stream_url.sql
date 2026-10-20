-- Migration : lien du direct (YouTube Live, Zoom, Meet…) sur les lives.
-- mysql -u root -p fitlife < database/migrations/2026-10-13_live_stream_url.sql

ALTER TABLE lives ADD COLUMN stream_url VARCHAR(500) NULL AFTER thumbnail_url;
