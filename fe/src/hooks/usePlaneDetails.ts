/**
 * React hook that streams detailed data for the currently selected plane.
 *
 * Contains `usePlaneDetails`, which manages the `/ws/planes/details` socket:
 * opening it, subscribing to a plane, switching planes, and closing it when
 * nothing is selected.
 */

import { useEffect, useRef, useState } from 'react';
import { PLANE_DETAILS_URL } from '../config';
import { parseServerMessage } from '../lib/parseMessage';
import type { PlaneDetailed, SubscribeRequest } from '../types/plane';

/** An error tied to the plane that was selected when it happened. */
type PlaneError = { planeId: string | null; message: string };

/**
 * Streams details for `selectedId` (pass null for "nothing selected").
 *
 * The backend has no "unsubscribe" message, so deselecting closes the socket.
 * Switching planes re-subscribes on the same socket while it is alive; if it died
 * (e.g. the server closed it with 1008 for an unknown plane) a new one is opened.
 *
 * Returns `details` (latest data for the selected plane, or null while loading)
 * and `error` (a message to show, or null).
 */
export function usePlaneDetails(selectedId: string | null, url: string = PLANE_DETAILS_URL) {
  const [latest, setLatest] = useState<PlaneDetailed | null>(null);
  const [failure, setFailure] = useState<PlaneError | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const selectedIdRef = useRef<string | null>(selectedId);

  /** Sends the subscribe request that makes the server stream `planeId`. */
  const subscribe = (ws: WebSocket, planeId: string) => {
    const request: SubscribeRequest = { type: 'subscribe', planeId };
    ws.send(JSON.stringify(request));
  };

  // Keep the socket's lifetime tied to "something is selected": the cleanup
  // runs when the selection goes back to null, and when the component unmounts.
  const hasSelection = selectedId !== null;
  useEffect(() => {
    if (!hasSelection) return;
    return () => {
      const ws = socketRef.current;
      socketRef.current = null;
      if (ws) {
        ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
        ws.close();
      }
    };
  }, [hasSelection]);

  // Open the socket (or re-subscribe on it) whenever the selected plane changes.
  useEffect(() => {
    selectedIdRef.current = selectedId;
    if (selectedId === null) return;

    const existing = socketRef.current;
    if (existing && existing.readyState === WebSocket.OPEN) {
      subscribe(existing, selectedId);
      return;
    }
    if (existing && existing.readyState === WebSocket.CONNECTING) {
      return; // onopen subscribes to whatever is selected by then
    }

    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      if (selectedIdRef.current !== null) subscribe(ws, selectedIdRef.current);
    };
    ws.onmessage = (event) => {
      const message = parseServerMessage(String(event.data));
      if (!message) return;
      if (message.type === 'plane-details') {
        // Ignore late frames for a plane that is no longer selected.
        if (message.data.id === selectedIdRef.current) {
          setLatest(message.data);
          setFailure(null);
        }
      } else if (message.type === 'error') {
        setFailure({ planeId: selectedIdRef.current, message: message.message });
      }
    };
    ws.onclose = (event) => {
      if (socketRef.current === ws) socketRef.current = null;
      // Keep an earlier, more specific error (e.g. "Plane x not found") if there is one.
      setFailure(
        (current) =>
          current ?? {
            planeId: selectedIdRef.current,
            message: event.reason || 'Connection to the details feed was lost',
          },
      );
    };
  }, [selectedId, url]);

  // Derive instead of resetting state: stale data for another plane is never shown.
  const details = selectedId !== null && latest?.id === selectedId ? latest : null;
  const error = selectedId !== null && failure?.planeId === selectedId ? failure.message : null;

  return { details, error };
}
