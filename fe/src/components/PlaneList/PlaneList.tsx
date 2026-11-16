/**
 * Sidebar list of all planes.
 *
 * Contains the `PlaneList` component: a search box plus one clickable row per
 * plane. It is an alternative to clicking a plane on the map; clicking a row
 * selects that plane, and clicking the selected row again deselects it.
 */

import { useMemo, useState } from 'react';
import { formatAltitude } from '../../lib/geo';
import type { PlaneBasic } from '../../types/plane';

/** Props for `PlaneList`. */
type Props = {
  /** every plane from the basic feed */
  planes: PlaneBasic[];
  /** id of the selected plane, or null */
  selectedId: string | null;
  /** called with a plane's id when its row is clicked */
  onSelect: (id: string) => void;
};

/** Renders the searchable plane list. */
export function PlaneList({ planes, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('');

  // Filter by id and sort naturally (plane-2 before plane-10).
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return planes
      .filter((plane) => plane.id.toLowerCase().includes(needle))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }, [planes, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <h1 className="mb-2 text-sm font-semibold tracking-wide text-slate-200">Flights</h1>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search planes…"
          aria-label="Search planes"
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-1.5 text-sm outline-none placeholder:text-slate-500 focus:border-accent"
        />
      </div>

      <ul className="flex-1 overflow-y-auto p-2">
        {visible.map((plane) => {
          const selected = plane.id === selectedId;
          return (
            <li key={plane.id}>
              <button
                type="button"
                onClick={() => onSelect(plane.id)}
                aria-pressed={selected}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  selected ? 'bg-accent/15 text-white' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: plane.color }}
                />
                <span className="flex-1 font-medium">{plane.id}</span>
                <span className="text-xs text-slate-500">{formatAltitude(plane.altitude)}</span>
              </button>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-slate-500">
            {planes.length === 0 ? 'Waiting for planes…' : 'No planes match your search'}
          </li>
        )}
      </ul>
    </div>
  );
}
