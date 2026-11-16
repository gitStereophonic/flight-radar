/**
 * Small status badge shown over the map.
 *
 * Contains the `ConnectionStatus` component: a coloured dot plus a label that
 * tells the user whether the live feed is connecting, live, or reconnecting.
 */

import type { ConnectionStatus as Status } from '../../lib/reconnectingSocket';

/** Props for `ConnectionStatus`. */
type Props = {
  /** current state of the basic planes socket */
  status: Status;
  /** number of planes currently tracked, shown next to "Live" */
  planeCount: number;
};

/** Dot colour and label for each connection status. */
const STYLES: Record<Status, { dot: string; label: string }> = {
  connecting: { dot: 'bg-amber-400', label: 'Connecting…' },
  open: { dot: 'bg-emerald-400', label: 'Live' },
  reconnecting: { dot: 'bg-red-500 animate-pulse', label: 'Reconnecting…' },
};

/** Renders the live-feed badge. `role="status"` lets screen readers announce changes. */
export function ConnectionStatus({ status, planeCount }: Props) {
  const { dot, label } = STYLES[status];

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur"
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span>{label}</span>
      {status === 'open' && <span className="text-slate-400">· {planeCount} planes</span>}
    </div>
  );
}
