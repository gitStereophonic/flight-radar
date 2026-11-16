/**
 * Tests for `usePlanes`, using a fake WebSocket: connection status, receiving
 * planes, ignoring bad frames, and reconnecting after the connection drops.
 */

import { act, renderHook } from '@testing-library/react';
import { BASIC_PLANES_URL } from '../config';
import { FakeWebSocket } from '../test/FakeWebSocket';
import { makeBasic } from '../test/fixtures';
import { usePlanes } from './usePlanes';

beforeEach(() => {
  FakeWebSocket.reset();
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('usePlanes', () => {
  it('connects to the basic endpoint and reports the status', () => {
    const { result } = renderHook(() => usePlanes());
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toBe(BASIC_PLANES_URL);
    expect(result.current.status).toBe('connecting');

    act(() => FakeWebSocket.instances[0].open());
    expect(result.current.status).toBe('open');
  });

  it('exposes the planes from each broadcast and builds tracks', () => {
    const { result } = renderHook(() => usePlanes());
    const socket = FakeWebSocket.instances[0];
    act(() => socket.open());

    act(() => socket.receive({ type: 'planes', data: [makeBasic('a'), makeBasic('b')] }));
    expect(result.current.planes.map((p) => p.id)).toEqual(['a', 'b']);
    expect(result.current.tracksRef.current.size).toBe(2);

    act(() => socket.receive({ type: 'planes', data: [makeBasic('a')] }));
    expect(result.current.planes.map((p) => p.id)).toEqual(['a']);
    expect(result.current.tracksRef.current.size).toBe(1);
  });

  it('ignores malformed messages', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => usePlanes());
    const socket = FakeWebSocket.instances[0];
    act(() => socket.open());

    act(() => socket.receive('garbage'));
    expect(result.current.planes).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('reconnects after the connection drops', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePlanes());
    act(() => FakeWebSocket.instances[0].open());

    act(() => FakeWebSocket.instances[0].drop());
    expect(result.current.status).toBe('reconnecting');
    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(FakeWebSocket.instances).toHaveLength(2);

    act(() => FakeWebSocket.instances[1].open());
    expect(result.current.status).toBe('open');
  });

  it('closes the socket on unmount', () => {
    const { unmount } = renderHook(() => usePlanes());
    const socket = FakeWebSocket.instances[0];
    unmount();
    expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
  });
});
