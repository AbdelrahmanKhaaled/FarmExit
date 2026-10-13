-- Prisma Migrate shadow database (local dev only). Runs once when the MySQL data volume is first created.
-- The application user must not use the root account; grant only on the shadow schema.
CREATE DATABASE IF NOT EXISTS farmexit_shadow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

GRANT ALL PRIVILEGES ON farmexit_shadow.* TO 'farmexit'@'%';
FLUSH PRIVILEGES;
