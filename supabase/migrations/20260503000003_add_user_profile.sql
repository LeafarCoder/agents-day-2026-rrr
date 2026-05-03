ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name       text,
  ADD COLUMN IF NOT EXISTS home_city          text,
  ADD COLUMN IF NOT EXISTS home_country       text,
  ADD COLUMN IF NOT EXISTS home_country_code  char(2);
