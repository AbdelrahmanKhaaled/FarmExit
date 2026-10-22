import { AuthSessionAudience } from '../../generated/prisma/enums';
import { caseStaffRoom, convRoom } from './communication-realtime.constants';
import { CommunicationRealtimePublisher } from './communication-realtime.publisher';

describe('CommunicationRealtimePublisher', () => {
  it('emits message.created to conversation and staff rooms only', () => {
    const publisher = new CommunicationRealtimePublisher();
    const convEmit = jest.fn();
    const staffEmit = jest.fn();
    const server = {
      to: jest.fn((room: string) => {
        if (room === convRoom('10')) return { emit: convEmit };
        if (room === caseStaffRoom('3')) return { emit: staffEmit };
        return { emit: jest.fn() };
      }),
    };
    publisher.attachServer(server as never);
    const message = {
      id: '1',
      senderId: '2',
      body: 'Hello',
      sentAt: '2026-01-01T00:00:00.000Z',
      isRelayedCopy: false,
    };
    publisher.messageCreated({ caseId: '3', conversationId: '10', message });
    expect(convEmit).toHaveBeenCalledWith('message.created', {
      caseId: '3',
      conversationId: '10',
      message,
    });
    expect(staffEmit).toHaveBeenCalledWith('message.created', {
      caseId: '3',
      conversationId: '10',
      message,
    });
    expect(message).not.toHaveProperty('relayNote');
    expect(AuthSessionAudience.website).toBeDefined();
  });

  it('does not throw when server is not attached', () => {
    const publisher = new CommunicationRealtimePublisher();
    expect(() =>
      publisher.messageCreated({
        caseId: '1',
        conversationId: '2',
        message: { id: '1', senderId: '1', body: 'x', sentAt: null, isRelayedCopy: false },
      }),
    ).not.toThrow();
  });
});
