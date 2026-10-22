import { ConfigService } from '@nestjs/config';
import { AuthSessionAudience } from '../../generated/prisma/enums';
import { CommunicationRealtimeTicketService } from './communication-realtime-ticket.service';

describe('CommunicationRealtimeTicketService', () => {
  const config = {
    get: jest.fn((key: string) => (key === 'SOCKET_IO_PATH' ? '/socket.io' : undefined)),
  } as unknown as ConfigService;

  let service: CommunicationRealtimeTicketService;

  beforeEach(() => {
    service = new CommunicationRealtimeTicketService(config);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('rejects missing ticket on consume', () => {
    expect(service.consume('', AuthSessionAudience.website)).toBeNull();
  });

  it('rejects expired ticket', () => {
    jest.useFakeTimers();
    const minted = service.mint(1n, 2n, AuthSessionAudience.website);
    jest.advanceTimersByTime(61_000);
    expect(service.consume(minted.ticket, AuthSessionAudience.website)).toBeNull();
    jest.useRealTimers();
  });

  it('rejects replayed single-use ticket', () => {
    const minted = service.mint(1n, 2n, AuthSessionAudience.website);
    expect(service.consume(minted.ticket, AuthSessionAudience.website)?.userId).toBe(1n);
    expect(service.consume(minted.ticket, AuthSessionAudience.website)).toBeNull();
  });

  it('rejects wrong session audience', () => {
    const minted = service.mint(1n, 2n, AuthSessionAudience.website);
    expect(service.consume(minted.ticket, AuthSessionAudience.dashboard)).toBeNull();
  });

  it('mints opaque ticket with connection metadata', () => {
    const minted = service.mint(5n, 6n, AuthSessionAudience.dashboard);
    expect(minted.ticket.length).toBeGreaterThan(20);
    expect(minted.namespace).toBe('/communication');
    expect(minted.path).toBe('/socket.io');
    expect(new Date(minted.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});
