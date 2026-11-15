/**
 * Tests for the smooth-movement logic in `tracks.ts`: interval estimation,
 * building tracks from broadcasts, and interpolating positions.
 */

import { makeBasic } from '../test/fixtures';
import { estimateInterval, positionAt, updateTracks } from './tracks';

describe('estimateInterval', () => {
  it('uses the default for the first message', () => {
    expect(estimateInterval(null, 5000)).toBe(1000);
  });

  it('measures the gap between messages', () => {
    expect(estimateInterval(0, 1500)).toBe(1500);
  });

  it('clamps unreasonably short and long gaps', () => {
    expect(estimateInterval(0, 50)).toBe(250);
    expect(estimateInterval(0, 60000)).toBe(5000);
  });
});

describe('updateTracks', () => {
  it('starts new planes stationary at their reported position', () => {
    const tracks = updateTracks(
      new Map(),
      [makeBasic('a', { latitude: 10, longitude: 20 })],
      0,
      1000,
    );
    const track = tracks.get('a')!;
    expect(track.from).toEqual({ lat: 10, lng: 20 });
    expect(track.to).toEqual({ lat: 10, lng: 20 });
  });

  it('animates known planes from their previous position and derives the heading', () => {
    const first = updateTracks(new Map(), [makeBasic('a', { latitude: 0, longitude: 0 })], 0, 1000);
    const second = updateTracks(first, [makeBasic('a', { latitude: 0, longitude: 1 })], 1000, 1000);
    const track = second.get('a')!;
    expect(track.from).toEqual({ lat: 0, lng: 0 });
    expect(track.to).toEqual({ lat: 0, lng: 1 });
    expect(track.heading).toBeCloseTo(90);
  });

  it('keeps the previous heading when a plane did not move', () => {
    const first = updateTracks(new Map(), [makeBasic('a', { latitude: 0, longitude: 0 })], 0, 1000);
    const moved = updateTracks(first, [makeBasic('a', { latitude: 0, longitude: 1 })], 1000, 1000);
    const still = updateTracks(moved, [makeBasic('a', { latitude: 0, longitude: 1 })], 2000, 1000);
    expect(still.get('a')!.heading).toBeCloseTo(90);
  });

  it('drops planes that are missing from the broadcast and does not mutate the input', () => {
    const first = updateTracks(new Map(), [makeBasic('a'), makeBasic('b')], 0, 1000);
    const second = updateTracks(first, [makeBasic('a')], 1000, 1000);
    expect([...second.keys()]).toEqual(['a']);
    expect([...first.keys()]).toEqual(['a', 'b']);
  });
});

describe('positionAt', () => {
  const first = updateTracks(new Map(), [makeBasic('a', { latitude: 0, longitude: 0 })], 0, 1000);
  const track = updateTracks(
    first,
    [makeBasic('a', { latitude: 10, longitude: 20 })],
    1000,
    1000,
  ).get('a')!;

  it('starts at the previous position', () => {
    expect(positionAt(track, 1000)).toEqual({ lat: 0, lng: 0 });
  });

  it('is halfway at half the duration', () => {
    expect(positionAt(track, 1500)).toEqual({ lat: 5, lng: 10 });
  });

  it('stops at the newest position instead of overshooting', () => {
    expect(positionAt(track, 9000)).toEqual({ lat: 10, lng: 20 });
  });
});
