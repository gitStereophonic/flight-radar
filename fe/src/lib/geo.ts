/**
 * Small maths and display-formatting helpers.
 *
 * Contains:
 *  - generic maths (`lerp`, `clamp`) and a compass `bearing` calculation
 *  - unit conversions and `format*` functions that turn the backend's metric
 *    values (metres, m/s, minutes, epoch ms) into aviation-style text
 *
 * All functions are pure, which makes them easy to unit test.
 */

/** Metres -> feet multiplier. */
const M_TO_FT = 3.28084;
/** Metres per second -> knots multiplier. */
const MS_TO_KNOTS = 1.943844;
/** Metres per second -> feet per minute multiplier. */
const MS_TO_FPM = 196.85;

/** Linear interpolation: returns `a` at t=0, `b` at t=1, and a blend in between. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Restricts `value` to the range [min, max]. */
export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Degrees -> radians. */
const toRad = (deg: number) => (deg * Math.PI) / 180;
/** Radians -> degrees. */
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Initial compass bearing from point 1 to point 2, in degrees.
 * 0 = north, 90 = east, clockwise, result in [0, 360).
 * Used to rotate plane icons in the direction they are moving.
 */
export function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Converts metres to feet. */
export const metersToFeet = (m: number) => m * M_TO_FT;

/** Metres -> text like "35,000 ft". */
export function formatAltitude(meters: number): string {
  return `${Math.round(metersToFeet(meters)).toLocaleString('en-US')} ft`;
}

/** Metres per second -> text like "450 kts". */
export function formatSpeed(metersPerSecond: number): string {
  return `${Math.round(metersPerSecond * MS_TO_KNOTS)} kts`;
}

/** Metres per second -> text like "+1,200 ft/min"; climbs get a "+" sign. */
export function formatVerticalSpeed(metersPerSecond: number): string {
  const fpm = Math.round(metersPerSecond * MS_TO_FPM);
  return `${fpm > 0 ? '+' : ''}${fpm} ft/min`;
}

/** Degrees -> text like "182°". */
export const formatHeading = (degrees: number) => `${Math.round(degrees)}°`;

/** Latitude/longitude -> fixed 4-decimal text (about 10 m precision). */
export const formatCoordinate = (value: number) => value.toFixed(4);

/** Minutes -> "2h 05m" for an hour or more, otherwise "45m". Negative values count as 0. */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** Epoch-ms arrival time -> time remaining, e.g. "in 3h 12m", or "arrived" once passed. */
export function formatTimeRemaining(etaEpochMs: number, nowEpochMs: number = Date.now()): string {
  const minutes = (etaEpochMs - nowEpochMs) / 60000;
  return minutes <= 0 ? 'arrived' : `in ${formatDuration(minutes)}`;
}

/** Epoch ms -> local 24-hour clock time like "14:35". */
export function formatClock(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
