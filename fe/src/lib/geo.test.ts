/**
 * Tests for the maths and formatting helpers in `geo.ts`.
 */

import {
  bearing,
  clamp,
  formatAltitude,
  formatDuration,
  formatSpeed,
  formatTimeRemaining,
  formatVerticalSpeed,
  lerp,
} from './geo';

describe('lerp and clamp', () => {
  it('lerp blends between two values', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 0.5)).toBe(15);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('clamp keeps a value inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
  });
});

describe('bearing', () => {
  it('returns compass directions for cardinal movement', () => {
    expect(bearing(0, 0, 1, 0)).toBeCloseTo(0);
    expect(bearing(0, 0, 0, 1)).toBeCloseTo(90);
    expect(bearing(0, 0, -1, 0)).toBeCloseTo(180);
    expect(bearing(0, 0, 0, -1)).toBeCloseTo(270);
  });
});

describe('formatters', () => {
  it('formats altitude in feet with a thousands separator', () => {
    expect(formatAltitude(10668)).toBe('35,000 ft');
  });

  it('formats speed in knots', () => {
    expect(formatSpeed(283)).toBe('550 kts');
  });

  it('formats vertical speed with a sign for climbs', () => {
    expect(formatVerticalSpeed(0)).toBe('0 ft/min');
    expect(formatVerticalSpeed(5)).toBe('+984 ft/min');
    expect(formatVerticalSpeed(-5)).toBe('-984 ft/min');
  });

  it('formats durations', () => {
    expect(formatDuration(125)).toBe('2h 05m');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(-3)).toBe('0m');
  });

  it('formats the time remaining until arrival', () => {
    const now = 1_000_000;
    expect(formatTimeRemaining(now + 90 * 60000, now)).toBe('in 1h 30m');
    expect(formatTimeRemaining(now - 1000, now)).toBe('arrived');
  });
});
