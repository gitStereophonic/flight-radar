/**
 * Tests for `usePlaneDetails`, using a fake WebSocket: when the socket is
 * opened and closed, the subscribe messages that are sent, switching planes,
 * ignoring data for other planes, and error handling.
 */

import { act, renderHook } from '@testing-library/react';
import { PLANE_DETAILS_URL } from '../config';
import { FakeWebSocket } from '../test/FakeWebSocket';
import { makeDetailed } from '../test/fixtures';
import { usePlaneDetails } from './usePlaneDetails';

beforeEach(() => {
  FakeWebSocket.reset();
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Parses the JSON messages a fake socket has been asked to send. */
const sentMessages = (socket: FakeWebSocket) => socket.sent.map((raw) => JSON.parse(raw));

describe('usePlaneDetails', () => {
  it('does not open a socket while nothing is selected', () => {
    const { result } = renderHook(() => usePlaneDetails(null));
    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(result.current).toEqual({ details: null, error: null });
  });

  it('opens the details socket and subscribes once it is connected', () => {
    renderHook(() => usePlaneDetails('plane-1'));
    const socket = FakeWebSocket.instances[0];
    expect(socket.url).toBe(PLANE_DETAILS_URL);
    expect(socket.sent).toEqual([]);

    act(() => socket.open());
    expect(sentMessages(socket)).toEqual([{ type: 'subscribe', planeId: 'plane-1' }]);
  });

  it('returns the details streamed for the selected plane', () => {
    const { result } = renderHook(() => usePlaneDetails('plane-1'));
    const socket = FakeWebSocket.instances[0];
    act(() => socket.open());

    const data = makeDetailed('plane-1');
    act(() => socket.receive({ type: 'plane-details', data }));
    expect(result.current.details).toEqual(data);
  });

  it('re-subscribes on the same socket when another plane is selected', () => {
    const { result, rerender } = renderHook(({ id }) => usePlaneDetails(id), {
      initialProps: { id: 'plane-1' as string | null },
    });
    const socket = FakeWebSocket.instances[0];
    act(() => socket.open());
    act(() => socket.receive({ type: 'plane-details', data: makeDetailed('plane-1') }));

    rerender({ id: 'plane-2' });
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(sentMessages(socket)).toEqual([
      { type: 'subscribe', planeId: 'plane-1' },
      { type: 'subscribe', planeId: 'plane-2' },
    ]);
    // Data from the previous plane is not shown for the new one.
    expect(result.current.details).toBeNull();
  });

  it('ignores details frames for a plane that is no longer selected', () => {
    const { result, rerender } = renderHook(({ id }) => usePlaneDetails(id), {
      initialProps: { id: 'plane-1' as string | null },
    });
    const socket = FakeWebSocket.instances[0];
    act(() => socket.open());
    rerender({ id: 'plane-2' });

    act(() => socket.receive({ type: 'plane-details', data: makeDetailed('plane-1') }));
    expect(result.current.details).toBeNull();

    act(() => socket.receive({ type: 'plane-details', data: makeDetailed('plane-2') }));
    expect(result.current.details?.id).toBe('plane-2');
  });

  it('closes the socket and clears the details when deselected', () => {
    const { result, rerender } = renderHook(({ id }) => usePlaneDetails(id), {
      initialProps: { id: 'plane-1' as string | null },
    });
    const socket = FakeWebSocket.instances[0];
    act(() => socket.open());
    act(() => socket.receive({ type: 'plane-details', data: makeDetailed('plane-1') }));

    rerender({ id: null });
    expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
    expect(result.current.details).toBeNull();
  });

  it('surfaces server errors and opens a fresh socket for the next selection', () => {
    const { result, rerender } = renderHook(({ id }) => usePlaneDetails(id), {
      initialProps: { id: 'ghost' as string | null },
    });
    const socket = FakeWebSocket.instances[0];
    act(() => socket.open());

    act(() => socket.receive({ type: 'error', message: 'Plane ghost not found' }));
    act(() => socket.drop(1008, 'Plane not found'));
    expect(result.current.error).toBe('Plane ghost not found');

    rerender({ id: 'plane-1' });
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('closes the socket on unmount', () => {
    const { unmount } = renderHook(() => usePlaneDetails('plane-1'));
    const socket = FakeWebSocket.instances[0];
    unmount();
    expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
  });
});
