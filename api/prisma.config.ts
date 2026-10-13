import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
    // Dedicated DB for `prisma migrate dev`; must differ from DATABASE_URL (see api/.env.example).
    shadowDatabaseUrl: env('SHADOW_DATABASE_URL'),
  },
});
