import { type ExecutionContext, type INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CompletedProfileGuard } from '../auth/completed-profile.guard';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { RequestDocumentsService } from './request-documents.service';

describe('private document list HTTP route', () => {
  let app: INestApplication<App>;
  const listMetadata = jest
    .fn()
    .mockResolvedValue([{ id: '12', slotKey: 'supporting_test', reviewStatus: 'uploaded' }]);
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RequestsController],
      providers: [
        { provide: RequestsService, useValue: {} },
        { provide: RequestDocumentsService, useValue: { listMetadata } },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{ auth: { userId: bigint } }>();
          req.auth = { userId: 3n };
          return true;
        },
      })
      .overrideGuard(CompletedProfileGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication<INestApplication<App>>();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it('serves GET metadata rather than 404, delegates authorization and disables caching', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/requests/10/documents').expect(200);
    expect(listMetadata).toHaveBeenCalledWith(3n, 10n);
    expect(res.body).toEqual([{ id: '12', slotKey: 'supporting_test', reviewStatus: 'uploaded' }]);
    expect(res.headers['cache-control']).toBe('private, no-store');
  });
  it('rejects malformed identifiers before reaching the service', async () => {
    const count = listMetadata.mock.calls.length;
    await request(app.getHttpServer()).get('/api/v1/requests/not-an-id/documents').expect(400);
    expect(listMetadata.mock.calls).toHaveLength(count);
  });
});
