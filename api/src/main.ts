import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, SWAGGER_PATH } from './common/app-setup';
import { FarmExitSocketIoAdapter } from './common/socket-io.adapter';
import type { Env } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.useWebSocketAdapter(new FarmExitSocketIoAdapter(app, config.get('SOCKET_IO_PATH', { infer: true })));
  configureApp(app);
  app.enableShutdownHooks();
  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`FarmExit API listening on http://localhost:${port}/api/v1`);
  if (config.get('SWAGGER_ENABLED', { infer: true }))
    logger.log(`Swagger UI: http://localhost:${port}/${SWAGGER_PATH}`);
}

void bootstrap();
