import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import type { Env } from '../config/env.validation';
import { PrismaClient } from '../generated/prisma/client';
import { toMariaDbPoolConfig } from './database-url';

/**
 * The single Prisma client of the API (MySQL through the MariaDB driver adapter). The pool connects lazily on the
 * first query, so the API starts, and liveness checks pass, without a database.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super({ adapter: new PrismaMariaDb(toMariaDbPoolConfig(config.get('DATABASE_URL', { infer: true }))) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
