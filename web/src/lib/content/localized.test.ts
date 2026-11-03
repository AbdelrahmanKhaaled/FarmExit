import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authoredText, contentText } from './localized.ts';

test('authoring omission preserves legacy but explicit clears do not resurrect it', () => {
  assert.equal(authoredText({}, 'description', 'legacy'), 'legacy');
  assert.equal(authoredText({ en: { description: '' } }, 'description', 'legacy'), '');
  assert.equal(authoredText({ en: { description: '' }, ar: { description: 'عربي' } }, 'description', 'legacy'), 'عربي');
});
test('display uses the requested translation and preserves original language fallbacks', () => {
  const value = { en: { description: 'English' }, ar: { description: 'عربي' } };
  assert.equal(contentText(value, 'ar', 'description'), 'عربي');
  assert.equal(contentText({ ar: value.ar }, 'en', 'description'), 'عربي');
});
