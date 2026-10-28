import assert from 'node:assert/strict';
import test from 'node:test';
import { applicationQuery, applicationsHref } from './linked-applications';

test('application filters are translated to server query parameters', () => {
  const query = new URLSearchParams(
    applicationQuery({
      applicationsPage: '2',
      applicationSearch: '  Applicant  ',
      applicationStatus: 'approved',
      applicationSort: 'oldest',
    }),
  );
  assert.equal(query.get('page'), '2');
  assert.equal(query.get('pageSize'), '6');
  assert.equal(query.get('search'), 'Applicant');
  assert.equal(query.get('status'), 'approved');
  assert.equal(query.get('sort'), 'oldest');
});

test('pagination retains parent, filters and the Applications section, and resets the first page', () => {
  const filters = { applicationSearch: 'Name & Co', applicationStatus: 'approved', applicationSort: 'oldest' };
  const url = new URL(applicationsHref('42', filters, 2), 'http://localhost');
  assert.equal(url.pathname, '/admin/requests/42');
  assert.equal(url.hash, '#applications');
  assert.equal(url.searchParams.get('applicationSearch'), 'Name & Co');
  assert.equal(url.searchParams.get('applicationStatus'), 'approved');
  assert.equal(url.searchParams.get('applicationsPage'), '2');
  assert.equal(
    new URL(applicationsHref('42', filters, 1), 'http://localhost').searchParams.has('applicationsPage'),
    false,
  );
});
