import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { paginationRange } from './pagination-range';

describe('paginationRange', () => {
  it('computes first page range', () => {
    const r = paginationRange(1, 10, 138);
    assert.equal(r.from, 1);
    assert.equal(r.to, 10);
    assert.equal(r.total, 138);
    assert.equal(r.pages, 14);
    assert.equal(r.page, 1);
  });

  it('handles empty totals', () => {
    const r = paginationRange(1, 10, 0);
    assert.equal(r.from, 0);
    assert.equal(r.to, 0);
    assert.equal(r.pages, 1);
  });

  it('clamps page beyond last page', () => {
    const r = paginationRange(99, 10, 25);
    assert.equal(r.page, 3);
    assert.equal(r.to, 25);
  });

  it('handles last partial page', () => {
    const r = paginationRange(3, 10, 25);
    assert.equal(r.from, 21);
    assert.equal(r.to, 25);
  });
});
