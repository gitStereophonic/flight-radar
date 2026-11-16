/**
 * Sample data factories shared by the tests.
 *
 * Contains `makeBasic` and `makeDetailed`, which build valid plane objects in
 * the same shape the backend sends. Each accepts overrides for the fields a
 * particular test cares about.
 */

import type { PlaneBasic, PlaneDetailed } from '../types/plane';

/** Builds a valid `PlaneBasic`, with any field replaceable through `overrides`. */
export function makeBasic(id = 'plane-1', overrides: Partial<PlaneBasic> = {}): PlaneBasic {
  return {
    id,
    latitude: 45,
    longitude: -75,
    altitude: 10668,
    color: '#FF6B6B',
    ...overrides,
  };
}

/** Builds a valid `PlaneDetailed`, with any field replaceable through `overrides`. */
export function makeDetailed(
  id = 'plane-1',
  overrides: Partial<PlaneDetailed> = {},
): PlaneDetailed {
  return {
    ...makeBasic(id),
    model: 'Boeing 737',
    airline: 'Delta Air Lines',
    flightNumber: 'DE1234',
    registration: 'N12345',
    speed: 283,
    heading: 180,
    verticalSpeed: 0,
    origin: { airport: 'JFK', city: 'New York' },
    destination: { airport: 'LAX', city: 'Los Angeles' },
    flightDuration: 125,
    estimatedArrival: Date.now() + 3 * 3600000,
    numberOfPassengers: 180,
    maxPassengers: 200,
    status: 'cruising',
    ...overrides,
  };
}
