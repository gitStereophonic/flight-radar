/**
 * Smooth-movement ("tracks") logic for the map.
 *
 * The backend broadcasts positions only once per interval (1s by default), so
 * drawing them directly would make planes jump. Instead each plane gets a
 * `Track`: a segment from its previous position to its newest one. The map
 * reads `positionAt` on every animation frame to draw the plane partway along
 * that segment. The result is continuous motion that lags real time by about
 * one broadcast interval.
 *
 * Contains the `Track` and `LngLat` types, `estimateInterval`, `updateTracks`
 * and `positionAt`. Everything here is pure (no React, no timers).
 */

import type { PlaneBasic } from '../types/plane';
import { bearing, clamp, lerp } from './geo';

/** A geographic point in the order MapLibre expects (longitude first). */
export type LngLat = { lng: number; lat: number };

/**
 * One plane's animation segment: it moves from `from` to `to` over `duration`
 * ms starting at `receivedAt`. Times are `performance.now()` values.
 */
export type Track = {
  id: string;
  color: string;
  /** meters */
  altitude: number;
  /** where the segment starts (the plane's previous reported position) */
  from: LngLat;
  /** where the segment ends (the plane's newest reported position) */
  to: LngLat;
  /** direction of travel in degrees, derived from the from -> to movement */
  heading: number;
  /** `performance.now()` when the newest position arrived */
  receivedAt: number;
  /** how long, in ms, the animation from `from` to `to` should take */
  duration: number;
};

/** Assumed broadcast interval before two messages have been seen. */
export const DEFAULT_INTERVAL_MS = 1000;
/** Lower bound for the measured interval, so a burst of messages can't make motion frantic. */
const MIN_INTERVAL_MS = 250;
/** Upper bound for the measured interval, so a stall can't make planes crawl. */
const MAX_INTERVAL_MS = 5000;

/**
 * Estimates the backend's broadcast interval from the time between two
 * messages. Falls back to the default for the first message.
 */
export function estimateInterval(previousAt: number | null, now: number): number {
  if (previousAt === null) return DEFAULT_INTERVAL_MS;
  return clamp(now - previousAt, MIN_INTERVAL_MS, MAX_INTERVAL_MS);
}

/**
 * Builds the next set of tracks from a fresh broadcast.
 *  - new planes start stationary at their reported position
 *  - known planes animate from their previous `to` to the new position, and
 *    their heading is recomputed from that movement (or kept if they didn't move)
 *  - planes missing from the broadcast are dropped
 * Does not mutate `previous`.
 */
export function updateTracks(
  previous: ReadonlyMap<string, Track>,
  planes: readonly PlaneBasic[],
  now: number,
  duration: number,
): Map<string, Track> {
  const next = new Map<string, Track>();

  for (const plane of planes) {
    const to: LngLat = { lng: plane.longitude, lat: plane.latitude };
    const old = previous.get(plane.id);

    if (!old) {
      next.set(plane.id, {
        id: plane.id,
        color: plane.color,
        altitude: plane.altitude,
        from: to,
        to,
        heading: 0,
        receivedAt: now,
        duration,
      });
      continue;
    }

    const moved = old.to.lat !== to.lat || old.to.lng !== to.lng;
    next.set(plane.id, {
      id: plane.id,
      color: plane.color,
      altitude: plane.altitude,
      from: old.to,
      to,
      heading: moved ? bearing(old.to.lat, old.to.lng, to.lat, to.lng) : old.heading,
      receivedAt: now,
      duration,
    });
  }

  return next;
}

/**
 * The plane's interpolated position at time `now`: `from` right when the
 * track was created, `to` once `duration` has elapsed (it never overshoots).
 */
export function positionAt(track: Track, now: number): LngLat {
  const t = clamp((now - track.receivedAt) / track.duration, 0, 1);
  return { lng: lerp(track.from.lng, track.to.lng, t), lat: lerp(track.from.lat, track.to.lat, t) };
}
