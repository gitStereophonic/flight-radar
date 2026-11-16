/**
 * Panel with detailed information about the selected plane.
 *
 * Contains the `PlaneDetailsPanel` component (header, route, live figures,
 * passenger load, timings) and two small private helpers: `Stat` (a label/value
 * pair) and `StatusBadge` (a coloured flight-phase pill). It shows a loading
 * state until the first details message arrives, and an error state if the
 * details feed reports a problem.
 */

import {
  formatAltitude,
  formatClock,
  formatCoordinate,
  formatDuration,
  formatHeading,
  formatSpeed,
  formatTimeRemaining,
  formatVerticalSpeed,
} from '../../lib/geo';
import type { PlaneDetailed, PlaneStatus } from '../../types/plane';

/** Props for `PlaneDetailsPanel`. */
type Props = {
  /** id of the selected plane (shown while details are still loading) */
  planeId: string;
  /** latest details for that plane, or null before the first message */
  details: PlaneDetailed | null;
  /** error message from the details feed, or null */
  error: string | null;
  /** called when the user closes the panel */
  onClose: () => void;
};

/** Badge colour classes for each flight status. */
const STATUS_STYLES: Record<PlaneStatus, string> = {
  departed: 'bg-sky-500/20 text-sky-300',
  enroute: 'bg-indigo-500/20 text-indigo-300',
  cruising: 'bg-emerald-500/20 text-emerald-300',
  landing: 'bg-amber-500/20 text-amber-300',
};

/** A small label-over-value pair used throughout the panel. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="text-sm font-medium text-slate-100">{value}</dd>
    </div>
  );
}

/** Coloured pill showing the flight phase (cruising, landing, ...). */
function StatusBadge({ status }: { status: PlaneStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] ?? ''}`}
    >
      {status}
    </span>
  );
}

/** Renders the details panel for the selected plane. */
export function PlaneDetailsPanel({ planeId, details, error, onClose }: Props) {
  const passengerPercent = details
    ? Math.round((details.numberOfPassengers / Math.max(1, details.maxPassengers)) * 100)
    : 0;

  return (
    <section
      aria-label="Plane details"
      className="max-h-full overflow-y-auto rounded-xl border border-border bg-surface/95 shadow-2xl backdrop-blur"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <p className="text-xs text-slate-500">{details?.airline ?? planeId}</p>
          <h2 className="text-lg leading-tight font-semibold text-white">
            {details?.flightNumber ?? 'Loading…'}
          </h2>
          {details && (
            <p className="text-xs text-slate-400">
              {details.model} · {details.registration}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {details && <StatusBadge status={details.status} />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="m-4 rounded-md bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!details && !error && <p className="p-4 text-sm text-slate-400">Loading flight details…</p>}

      {details && (
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between text-center">
            <div>
              <p className="text-2xl font-bold text-white">{details.origin.airport}</p>
              <p className="text-xs text-slate-400">{details.origin.city}</p>
            </div>
            <span className="text-xl text-accent">✈</span>
            <div>
              <p className="text-2xl font-bold text-white">{details.destination.airport}</p>
              <p className="text-xs text-slate-400">{details.destination.city}</p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            <Stat label="Altitude" value={formatAltitude(details.altitude)} />
            <Stat label="Speed" value={formatSpeed(details.speed)} />
            <Stat label="Heading" value={formatHeading(details.heading)} />
            <Stat label="Vertical speed" value={formatVerticalSpeed(details.verticalSpeed)} />
            <Stat label="Latitude" value={formatCoordinate(details.latitude)} />
            <Stat label="Longitude" value={formatCoordinate(details.longitude)} />
            <Stat label="Flight time" value={formatDuration(details.flightDuration)} />
            <Stat
              label="Arrival"
              value={`${formatClock(details.estimatedArrival)} (${formatTimeRemaining(details.estimatedArrival)})`}
            />
          </dl>

          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>Passengers</span>
              <span>
                {details.numberOfPassengers} / {details.maxPassengers}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${passengerPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
