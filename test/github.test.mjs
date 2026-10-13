import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cacheKey, isFresh, rateLimitMessage, CACHE_TTL_MS } from '../src/github.mjs';

test('cache key: stable per path, different across paths', () => {
  assert.equal(cacheKey('/repos/a/b'), cacheKey('/repos/a/b'));
  assert.notEqual(cacheKey('/repos/a/b'), cacheKey('/repos/a/b/license'));
});

test('cache entry is fresh for 24 hours, then must be revalidated', () => {
  const entry = { at: 1000 };
  assert.equal(isFresh(entry, 1000 + CACHE_TTL_MS - 1), true);
  assert.equal(isFresh(entry, 1000 + CACHE_TTL_MS), false);
  assert.equal(isFresh(null), false);
});

test('rate limit message: minutes until reset, token hint only without a token', () => {
  const now = 1_000_000_000;
  const h = { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(now / 1000 + 25 * 60) };
  assert.match(rateLimitMessage(403, h, now, false), /in about 25 min, or set GITHUB_TOKEN/);
  assert.doesNotMatch(rateLimitMessage(403, h, now, true), /GITHUB_TOKEN/);
});

test('rate limit message: retry-after (secondary limit); other 403s and statuses are not rate limits', () => {
  assert.match(rateLimitMessage(429, { 'retry-after': '90' }, 0, true), /about 2 min/);
  assert.equal(rateLimitMessage(403, { 'x-ratelimit-remaining': '12' }, 0, true), null);
  assert.equal(rateLimitMessage(500, { 'retry-after': '90' }, 0, true), null);
});
