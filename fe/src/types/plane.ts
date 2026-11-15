/**
 * Shared TypeScript types describing the data the backend sends over WebSocket.
 *
 * Contains:
 *  - the plane data models (basic + detailed) copied from the README
 *  - the three server -> client message shapes and their union
 *  - the one client -> server message (subscribe)
 *
 * These are intentionally duplicated from the backend instead of imported,
 * because `be/` must stay untouched and independent of the frontend.
 */

/**
 * Lightweight plane data broadcast to every client on `/ws/planes/basic`.
 * Used to draw planes on the map and to fill the plane list.
 */
export type PlaneBasic = {
  id: string;
  latitude: number;
  longitude: number;
  /** meters */
  altitude: number;
  /** hex colour, e.g. "#FF6B6B", used to tint the plane icon */
  color: string;
};

/** Phase of the flight, as reported by the backend. */
export type PlaneStatus = 'departed' | 'enroute' | 'cruising' | 'landing';

/** An airport on a flight's route (origin or destination). */
export type Airport = {
  /** airport code, e.g. "JFK" */
  airport: string;
  city: string;
};

/**
 * Full plane data streamed on `/ws/planes/details` for the one subscribed plane.
 * Shown in the details panel.
 */
export type PlaneDetailed = {
  id: string;
  model: string;
  airline: string;
  flightNumber: string;
  registration: string;
  latitude: number;
  longitude: number;
  /** meters */
  altitude: number;
  /** meters per second */
  speed: number;
  /** degrees */
  heading: number;
  /** meters per second */
  verticalSpeed: number;
  origin: Airport;
  destination: Airport;
  /** minutes */
  flightDuration: number;
  /** epoch milliseconds (a timestamp, not a duration) */
  estimatedArrival: number;
  numberOfPassengers: number;
  maxPassengers: number;
  status: PlaneStatus;
  color: string;
};

/** Server message carrying every plane's basic data (sent on the basic endpoint). */
export type PlanesMessage = { type: 'planes'; data: PlaneBasic[] };

/** Server message carrying one plane's detailed data (sent on the details endpoint). */
export type PlaneDetailsMessage = { type: 'plane-details'; data: PlaneDetailed };

/** Server message reporting a problem, e.g. unknown plane id or invalid JSON. */
export type ErrorMessage = { type: 'error'; message: string };

/** Any message the server can send to the frontend. */
export type ServerMessage = PlanesMessage | PlaneDetailsMessage | ErrorMessage;

/** The only message the frontend sends: asks the details endpoint to stream one plane. */
export type SubscribeRequest = { type: 'subscribe'; planeId: string };
