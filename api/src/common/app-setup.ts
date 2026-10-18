import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Env } from '../config/env.validation';

export const API_PREFIX = 'api';
export const DEFAULT_API_VERSION = '1';
export const SWAGGER_PATH = `${API_PREFIX}/docs`;

/**
 * HTTP setup shared by main.ts and the e2e tests, so tests exercise the real routes:
 * /api/v{n}/… (URI versioning, v1 by default), strict DTO validation, CORS for the configured origins, Swagger.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  const express = app.getHttpAdapter().getInstance() as { set?: (key: string, value: unknown) => void };
  express.set?.('trust proxy', 1);

  app.enableShutdownHooks();
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: DEFAULT_API_VERSION });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: config.get('CORS_ORIGINS', { infer: true }),
    credentials: true,
  });

  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    const document = new DocumentBuilder()
      .setTitle('FarmExit API')
      .setDescription('FarmExit REST API')
      .setVersion(DEFAULT_API_VERSION)
      .addBearerAuth()
      .build();
    SwaggerModule.setup(SWAGGER_PATH, app, () => SwaggerModule.createDocument(app, document));
  }
}
