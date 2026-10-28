import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildForwardingDecisionBody,
  isForwardingAwaitingOwnerDecision,
  parseRecordableOwnerDecision,
} from './forwarding-decision';
import type { RequestForwardingRow } from './RequestForwardingPanel';

const baseRow = (overrides: Partial<RequestForwardingRow>): RequestForwardingRow => ({
  id: '1',
  recipientUserId: '9',
  status: 'sent',
  ownerDecision: null,
  decisionReason: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  decidedAt: null,
  ...overrides,
});

describe('forwarding decision helpers', () => {
  it('detects forwardings awaiting owner response', () => {
    assert.equal(isForwardingAwaitingOwnerDecision(baseRow({})), true);
    assert.equal(isForwardingAwaitingOwnerDecision(baseRow({ ownerDecision: 'pending' })), true);
    assert.equal(isForwardingAwaitingOwnerDecision(baseRow({ status: 'viewed' })), true);
    assert.equal(isForwardingAwaitingOwnerDecision(baseRow({ status: 'decided', ownerDecision: 'accepted' })), false);
    assert.equal(isForwardingAwaitingOwnerDecision(baseRow({ status: 'closed' })), false);
    assert.equal(isForwardingAwaitingOwnerDecision(baseRow({ ownerDecision: 'accepted' })), false);
  });

  it('parses only accepted and declined', () => {
    assert.equal(parseRecordableOwnerDecision('accepted'), 'accepted');
    assert.equal(parseRecordableOwnerDecision('declined'), 'declined');
    assert.equal(parseRecordableOwnerDecision('pending'), null);
    assert.equal(parseRecordableOwnerDecision(''), null);
  });

  it('builds API body and rejects invalid decisions', () => {
    assert.deepEqual(buildForwardingDecisionBody('accepted'), { decision: 'accepted' });
    assert.deepEqual(buildForwardingDecisionBody('declined', '  terms unclear  '), {
      decision: 'declined',
      reason: 'terms unclear',
    });
    assert.deepEqual(buildForwardingDecisionBody('pending'), { error: 'invalid_decision' });
  });
});
