// E2E tests boot the real AppModule without a database: the Prisma pool connects lazily, and auth tests replace
// PrismaService with an in-memory fake. These secrets are test-only values.
process.env.NODE_ENV = 'test';
process.env.DEV_FIXED_OTP_ENABLED = 'false';
process.env.CLIENT_DEMO_OTP_ENABLED = 'false';
process.env.DATABASE_URL ??= 'mysql://farmexit:test@localhost:3306/farmexit_test';
process.env.JWT_ACCESS_SECRET = 'e2e-only-jwt-secret-e2e-only-jwt-secret';
process.env.OTP_HASH_SECRET = 'e2e-only-otp-secret-e2e-only-otp-secret';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.SWAGGER_ENABLED = 'true';
