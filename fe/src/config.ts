/**
 * App-wide configuration.
 *
 * Contains the two WebSocket endpoint URLs, built from the `VITE_WS_URL`
 * environment variable (see `.env.example`). Defaults to the backend's
 * standard address, `ws://localhost:4000`.
 */

/** Backend base URL without a trailing slash. */
const base = (import.meta.env.VITE_WS_URL ?? 'ws://localhost:4000').replace(/\/+$/, '');

// The backend matches paths exactly, so no query string or trailing slash.

/** Endpoint that broadcasts every plane's basic data. */
export const BASIC_PLANES_URL = `${base}/ws/planes/basic`;

/** Endpoint that streams detailed data for one subscribed plane. */
export const PLANE_DETAILS_URL = `${base}/ws/planes/details`;
