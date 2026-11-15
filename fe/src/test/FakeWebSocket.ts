/**
 * A scriptable stand-in for the browser's WebSocket, used by the hook tests.
 *
 * Contains the `FakeWebSocket` class. Tests install it with
 * `vi.stubGlobal('WebSocket', FakeWebSocket)`, then drive it by hand: `open()`,
 * `receive()` and `drop()` simulate what the server and network would do, and
 * `sent` records what the app sent. Every created socket is kept in `instances`.
 */

/** Minimal shape of the close event the app reads (`code` and `reason`). */
type FakeCloseEvent = { code: number; reason: string };

export class FakeWebSocket {
  /** Same numeric constants as the real WebSocket, which the hooks compare against. */
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  /** Every socket created since the last `reset()`, oldest first. */
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  /** Raw strings the app passed to `send`. */
  sent: string[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: FakeCloseEvent) => void) | null = null;
  onerror: (() => void) | null = null;

  /** Registers the new socket in `instances` so tests can find it. */
  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  /** Records an outgoing message. */
  send(data: string) {
    this.sent.push(data);
  }

  /** Marks the socket closed (like the real one, without firing handlers here). */
  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }

  /** Simulates the connection being established. */
  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  /** Simulates the server sending a message; objects are JSON-encoded. */
  receive(payload: unknown) {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    this.onmessage?.({ data });
  }

  /** Simulates the connection closing (by the server or the network). */
  drop(code = 1006, reason = '') {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code, reason });
  }

  /** Forgets all created sockets; call before each test. */
  static reset() {
    FakeWebSocket.instances = [];
  }
}
