/**
 * React hook that connects the basic planes feed to the UI.
 *
 * Contains `usePlanes`, which opens `/ws/planes/basic`, parses each broadcast,
 * and exposes the planes, the connection status, and the animation tracks.
 */

import { useEffect, useRef, useState } from 'react';
import { BASIC_PLANES_URL } from '../config';
import { parseServerMessage } from '../lib/parseMessage';
import { createReconnectingSocket, type ConnectionStatus } from '../lib/reconnectingSocket';
import { estimateInterval, updateTracks, type Track } from '../lib/tracks';
import type { PlaneBasic } from '../types/plane';

/**
 * Subscribes to the basic planes feed for as long as the component is mounted.
 *
 * Returns:
 *  - `planes`: React state, re-renders once per broadcast (used by the list)
 *  - `status`: connection state for the status badge
 *  - `tracksRef`: a ref holding the interpolation data the map reads on every
 *    animation frame, so the map never depends on React re-rendering at 60fps
 */
export function usePlanes(url: string = BASIC_PLANES_URL) {
  const [planes, setPlanes] = useState<PlaneBasic[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const tracksRef = useRef<Map<string, Track>>(new Map());

  useEffect(() => {
    // performance.now() of the previous broadcast, used to measure the real interval
    let lastMessageAt: number | null = null;

    const connection = createReconnectingSocket({
      url,
      onStatus: setStatus,
      /** Handles one raw broadcast: validate, update the tracks, publish the planes. */
      onMessage: (raw) => {
        const message = parseServerMessage(raw);
        if (!message) {
          console.warn('Ignoring malformed message from planes feed');
          return;
        }
        if (message.type !== 'planes') return;

        const now = performance.now();
        tracksRef.current = updateTracks(
          tracksRef.current,
          message.data,
          now,
          estimateInterval(lastMessageAt, now),
        );
        lastMessageAt = now;
        setPlanes(message.data);
      },
    });

    return () => connection.close();
  }, [url]);

  return { planes, status, tracksRef };
}
