// E2E tests boot the real AppModule without a database: the Prisma pool connects lazily and no test queries it.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'mysql://farmexit:test@localhost:3306/farmexit_test';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.SWAGGER_ENABLED = 'true';
