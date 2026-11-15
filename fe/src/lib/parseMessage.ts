/**
 * Validation and parsing of raw WebSocket payloads.
 *
 * Contains type guards for each data shape and `parseServerMessage`, the single
 * entry point that turns a raw string into a typed `ServerMessage` (or null).
 * Everything coming from the network passes through here, so the rest of the
 * app can trust its types and never crashes on a malformed frame.
 */

import type { PlaneBasic, PlaneDetailed, ServerMessage } from '../types/plane';

/** True for any non-null object, narrowing it so its fields can be inspected. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** True for real numbers only (rejects NaN, Infinity and numeric strings). */
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Plain boolean check for the fields shared by basic and detailed planes.
 * Deliberately not a type guard, so callers keep access to other fields.
 */
const hasBasicFields = (value: Record<string, unknown>): boolean =>
  typeof value.id === 'string' &&
  isNumber(value.latitude) &&
  isNumber(value.longitude) &&
  isNumber(value.altitude) &&
  typeof value.color === 'string';

/** Checks that a value has every field of `PlaneBasic` with the right types. */
export function isPlaneBasic(value: unknown): value is PlaneBasic {
  return isRecord(value) && hasBasicFields(value);
}

/** Checks that a value looks like an `Airport` ({ airport, city }). */
const isAirport = (value: unknown) =>
  isRecord(value) && typeof value.airport === 'string' && typeof value.city === 'string';

/** Checks that a value has every field of `PlaneDetailed` (a superset of the basic fields). */
export function isPlaneDetailed(value: unknown): value is PlaneDetailed {
  return (
    isRecord(value) &&
    hasBasicFields(value) &&
    typeof value.model === 'string' &&
    typeof value.airline === 'string' &&
    typeof value.flightNumber === 'string' &&
    typeof value.registration === 'string' &&
    isNumber(value.speed) &&
    isNumber(value.heading) &&
    isNumber(value.verticalSpeed) &&
    isAirport(value.origin) &&
    isAirport(value.destination) &&
    isNumber(value.flightDuration) &&
    isNumber(value.estimatedArrival) &&
    isNumber(value.numberOfPassengers) &&
    isNumber(value.maxPassengers) &&
    typeof value.status === 'string'
  );
}

/**
 * Parses a raw WebSocket payload. Returns null for anything that is not a
 * well-formed server message, so callers can simply ignore bad frames.
 */
export function parseServerMessage(raw: string): ServerMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;

  switch (parsed.type) {
    case 'planes':
      return Array.isArray(parsed.data) && parsed.data.every(isPlaneBasic)
        ? { type: 'planes', data: parsed.data }
        : null;
    case 'plane-details':
      return isPlaneDetailed(parsed.data) ? { type: 'plane-details', data: parsed.data } : null;
    case 'error':
      return typeof parsed.message === 'string' ? { type: 'error', message: parsed.message } : null;
    default:
      return null;
  }
}
