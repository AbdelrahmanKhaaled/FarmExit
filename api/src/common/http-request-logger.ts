import { Logger, type INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const log = new Logger('HTTP');

/** Logs method, path, status and duration to the process console (all environments). */
export function registerHttpRequestLogger(app: INestApplication): void {
  const express = app.getHttpAdapter().getInstance() as {
    use: (handler: (req: Request, res: Response, next: NextFunction) => void) => void;
  };

  express.use((req: Request, res: Response, next: NextFunction) => {
    const started = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - started;
      const path = req.originalUrl ?? req.url;
      log.log(`${req.method} ${path} ${res.statusCode} ${ms}ms`);
    });
    next();
  });
}
