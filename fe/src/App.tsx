/**
 * Root component: owns the selection state and lays out the whole screen.
 *
 * Contains `App`, which:
 *  - connects the two data hooks (`usePlanes` for the map, `usePlaneDetails` for the panel)
 *  - owns which plane is selected, and the ways to change that (map click,
 *    list click, close button, Escape key)
 *  - arranges the sidebar list, the map, the status badge and the details panel
 */

import { useCallback, useEffect, useState } from 'react';
import { ConnectionStatus } from './components/ConnectionStatus/ConnectionStatus';
import { MapView } from './components/MapView/MapView';
import { PlaneDetailsPanel } from './components/PlaneDetailsPanel/PlaneDetailsPanel';
import { PlaneList } from './components/PlaneList/PlaneList';
import { usePlaneDetails } from './hooks/usePlaneDetails';
import { usePlanes } from './hooks/usePlanes';

/** Renders the flight radar screen. */
export default function App() {
  const { planes, status, tracksRef } = usePlanes();
  const [selection, setSelection] = useState<string | null>(null);

  // A selected plane that vanished from the feed counts as deselected.
  const selectedId =
    selection !== null && planes.some((plane) => plane.id === selection) ? selection : null;

  const { details, error } = usePlaneDetails(selectedId);

  /** Selects a plane, or deselects it if it is already the selected one. */
  const toggleSelection = useCallback((id: string) => {
    setSelection((current) => (current === id ? null : id));
  }, []);

  /** Clears the selection (hides the details panel). */
  const clearSelection = useCallback(() => setSelection(null), []);

  // Escape closes the details panel.
  useEffect(() => {
    /** Deselects when the Escape key is pressed. */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelection(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex h-full">
      <aside className="w-64 shrink-0 border-r border-border bg-surface md:w-72">
        <PlaneList planes={planes} selectedId={selectedId} onSelect={toggleSelection} />
      </aside>

      <main className="relative flex-1">
        <MapView
          tracksRef={tracksRef}
          selectedId={selectedId}
          onSelect={toggleSelection}
          onClear={clearSelection}
        />

        <div className="absolute top-3 left-3">
          <ConnectionStatus status={status} planeCount={planes.length} />
        </div>

        {selectedId !== null && (
          <div className="absolute top-3 right-3 bottom-3 flex w-80 max-w-[calc(100%-1.5rem)] items-start">
            <PlaneDetailsPanel
              planeId={selectedId}
              details={details}
              error={error}
              onClose={clearSelection}
            />
          </div>
        )}
      </main>
    </div>
  );
}
