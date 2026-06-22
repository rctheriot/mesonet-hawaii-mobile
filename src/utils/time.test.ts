import { describe, it, expect } from 'vitest';
import { relativeTime, isStaleTimestamp } from './time';

// Helper: an ISO timestamp `ms` milliseconds in the past.
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('relativeTime', () => {
  it('shows "just now" under a minute', () => {
    expect(relativeTime(ago(30 * SECOND))).toBe('just now');
  });

  it('shows minutes under an hour', () => {
    expect(relativeTime(ago(5 * MINUTE))).toBe('5m ago');
    expect(relativeTime(ago(59 * MINUTE))).toBe('59m ago');
  });

  it('shows hours under a day', () => {
    expect(relativeTime(ago(2 * HOUR))).toBe('2h ago');
    expect(relativeTime(ago(23 * HOUR))).toBe('23h ago');
  });

  it('shows days beyond 24 hours', () => {
    expect(relativeTime(ago(3 * DAY))).toBe('3d ago');
  });
});

describe('isStaleTimestamp', () => {
  it('treats null as not stale', () => {
    expect(isStaleTimestamp(null)).toBe(false);
  });

  it('is not stale within 24 hours', () => {
    expect(isStaleTimestamp(ago(1 * HOUR))).toBe(false);
    expect(isStaleTimestamp(ago(23 * HOUR))).toBe(false);
  });

  it('is stale beyond 24 hours', () => {
    expect(isStaleTimestamp(ago(25 * HOUR))).toBe(true);
  });
});
