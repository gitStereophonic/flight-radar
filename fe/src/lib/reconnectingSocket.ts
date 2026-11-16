/**
 * A tiny WebSocket wrapper that reconnects automatically.
 *
 * Contains the `ConnectionStatus` type and `createReconnectingSocket`, which
 * opens a socket, forwards its messages, reports connection status changes, and
 * retries with exponential backoff whenever the connection drops. Used for the
 * basic planes feed so the map recovers by itself if the backend restarts.
 */

/** Connection state shown in the UI badge. */
export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting';

/** Settings for `createReconnectingSocket`. */
type Options = {
  /** full WebSocket URL to connect to */
  url: string;
  /** called with the raw text of every received message */
  onMessage: (raw: string) => void;
  /** called whenever the connection status changes */
  onStatus: (status: ConnectionStatus) => void;
  /** first retry delay in ms (doubles on each failed attempt); default 1000 */
  minDelayMs?: number;
  /** maximum retry delay in ms; default 10000 */
  maxDelayMs?: number;
};

/**
 * Opens a WebSocket that reconnects with exponential backoff (1s, 2s, 4s ... up
 * to `maxDelayMs`) until `close()` is called. Returns a handle with `close()`.
 */
export function createReconnectingSocket({
  url,
  onMessage,
  onStatus,
  minDelayMs = 1000,
  maxDelayMs = 10000,
}: Options) {
  let socket: WebSocket | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0;
  let closed = false;

  /** Creates a new socket and wires up its event handlers; also used for every retry. */
  const connect = () => {
    onStatus(attempt === 0 ? 'connecting' : 'reconnecting');
    const ws = new WebSocket(url);
    socket = ws;

    ws.onopen = () => {
      attempt = 0;
      onStatus('open');
    };
    ws.onmessage = (event) => onMessage(String(event.data));
    ws.onerror = () => ws.close();
    ws.onclose = () => {
      if (closed) return;
      attempt += 1;
      onStatus('reconnecting');
      timer = setTimeout(connect, Math.min(maxDelayMs, minDelayMs * 2 ** (attempt - 1)));
    };
  };

  connect();

  return {
    /** Stops reconnecting, cancels any pending retry, and closes the current socket. */
    close() {
      closed = true;
      clearTimeout(timer);
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
        socket.close();
      }
    },
  };
}
