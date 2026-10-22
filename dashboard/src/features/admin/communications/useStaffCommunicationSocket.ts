'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getRealtimeSocketOrigin } from '@/lib/api/realtime-config';
import type { CaseMessage } from './communications-types';

export type StaffRealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'auth_required';

type RealtimeTicketResponse = {
  ticket: string;
  expiresAt: string;
  namespace: string;
  path: string;
};

export type StaffMessageCreatedEvent = {
  caseId: string;
  conversationId: string;
  message: CaseMessage;
};

type Options = {
  caseId: string;
  enabled: boolean;
  onMessage: (event: StaffMessageCreatedEvent) => void;
  onResync: () => void | Promise<void>;
};

const BACKOFF_MS = [1000, 2000, 4000, 8000, 15000];
const MAX_RECONNECT_ROUNDS = 8;
const DASHBOARD_AUDIENCE = 'dashboard';

function isMessageCreatedEvent(value: unknown): value is StaffMessageCreatedEvent {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.caseId !== 'string' || typeof v.conversationId !== 'string') return false;
  const msg = v.message;
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    typeof m.senderId === 'string' &&
    (typeof m.body === 'string' || m.body === null) &&
    (typeof m.sentAt === 'string' || m.sentAt === null) &&
    typeof m.isRelayedCopy === 'boolean'
  );
}

async function mintStaffRealtimeTicket(): Promise<RealtimeTicketResponse | 'unauthorized' | null> {
  try {
    const res = await fetch('/api/admin/communication/realtime-ticket', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (res.status === 401 || res.status === 403) return 'unauthorized';
    if (!res.ok) return null;
    return (await res.json()) as RealtimeTicketResponse;
  } catch {
    return null;
  }
}

function joinStaffCase(socket: Socket, caseId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.emit('case.join', { caseId }, (ack: unknown) => {
      if (ack && typeof ack === 'object' && (ack as { ok?: boolean }).ok) {
        resolve();
        return;
      }
      reject(new Error('JOIN_FAILED'));
    });
  });
}

function leaveStaffCase(socket: Socket, caseId: string): void {
  socket.emit('case.leave', { caseId });
}

function socketNamespaceUrl(origin: string, namespace: string): string {
  const ns = namespace.startsWith('/') ? namespace : `/${namespace}`;
  return `${origin.replace(/\/$/, '')}${ns}`;
}

export function useStaffCommunicationSocket({ caseId, enabled, onMessage, onResync }: Options): {
  status: StaffRealtimeStatus;
} {
  const [status, setStatus] = useState<StaffRealtimeStatus>('idle');
  const onMessageRef = useRef(onMessage);
  const onResyncRef = useRef(onResync);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onResyncRef.current = onResync;
  }, [onMessage, onResync]);

  useEffect(() => {
    if (!enabled) return;

    let generation = 0;
    let socket: Socket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectRound = 0;
    let stopped = false;
    const activeCaseId = caseId;

    const clearTimer = () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
    };

    const teardownSocket = () => {
      if (!socket) return;
      try {
        leaveStaffCase(socket, activeCaseId);
      } catch {
        /* ignore */
      }
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    };

    const scheduleReconnect = (myGen: number) => {
      if (stopped || myGen !== generation) return;
      if (reconnectRound >= MAX_RECONNECT_ROUNDS) {
        setStatus('offline');
        return;
      }
      const delay = BACKOFF_MS[Math.min(reconnectRound, BACKOFF_MS.length - 1)] ?? 15_000;
      reconnectRound += 1;
      setStatus('reconnecting');
      clearTimer();
      reconnectTimer = setTimeout(() => {
        void connect(myGen);
      }, delay);
    };

    const connect = async (myGen: number) => {
      if (stopped || myGen !== generation) return;
      teardownSocket();
      setStatus(reconnectRound > 0 ? 'reconnecting' : 'connecting');

      const origin = getRealtimeSocketOrigin();
      if (!origin) {
        setStatus('offline');
        return;
      }

      const ticketRes = await mintStaffRealtimeTicket();
      if (stopped || myGen !== generation) return;
      if (ticketRes === 'unauthorized') {
        setStatus('auth_required');
        return;
      }
      if (!ticketRes) {
        scheduleReconnect(myGen);
        return;
      }

      const nextSocket = io(socketNamespaceUrl(origin, ticketRes.namespace), {
        path: ticketRes.path,
        auth: { ticket: ticketRes.ticket, audience: DASHBOARD_AUDIENCE },
        reconnection: false,
        transports: ['websocket', 'polling'],
      });
      socket = nextSocket;

      nextSocket.on('connect', () => {
        if (stopped || myGen !== generation) return;
        reconnectRound = 0;
        setStatus('connected');
        void joinStaffCase(nextSocket, activeCaseId)
          .then(() => onResyncRef.current())
          .catch(() => {
            nextSocket.disconnect();
          });
      });

      nextSocket.on('message.created', (payload: unknown) => {
        if (stopped || myGen !== generation) return;
        if (!isMessageCreatedEvent(payload)) return;
        if (payload.caseId !== activeCaseId) return;
        onMessageRef.current(payload);
      });

      nextSocket.on('disconnect', () => {
        if (stopped || myGen !== generation) return;
        scheduleReconnect(myGen);
      });

      nextSocket.on('connect_error', () => {
        if (stopped || myGen !== generation) return;
        teardownSocket();
        scheduleReconnect(myGen);
      });
    };

    generation += 1;
    const myGen = generation;
    void connect(myGen);

    return () => {
      stopped = true;
      generation += 1;
      clearTimer();
      teardownSocket();
      setStatus('idle');
    };
  }, [caseId, enabled]);

  return { status: enabled ? status : 'idle' };
}
