/**
 * Tests for `parseServerMessage`: valid server messages are returned typed,
 * and everything malformed (bad JSON, unknown type, missing fields) gives null.
 */

import { makeBasic, makeDetailed } from '../test/fixtures';
import { parseServerMessage } from './parseMessage';

describe('parseServerMessage', () => {
  it('parses a planes message', () => {
    const data = [makeBasic('plane-1'), makeBasic('plane-2')];
    expect(parseServerMessage(JSON.stringify({ type: 'planes', data }))).toEqual({
      type: 'planes',
      data,
    });
  });

  it('parses a plane-details message', () => {
    const data = makeDetailed('plane-3');
    expect(parseServerMessage(JSON.stringify({ type: 'plane-details', data }))).toEqual({
      type: 'plane-details',
      data,
    });
  });

  it('parses an error message', () => {
    expect(parseServerMessage('{"type":"error","message":"Plane x not found"}')).toEqual({
      type: 'error',
      message: 'Plane x not found',
    });
  });

  it('returns null for invalid JSON', () => {
    expect(parseServerMessage('not json')).toBeNull();
  });

  it('returns null for non-object JSON', () => {
    expect(parseServerMessage('42')).toBeNull();
    expect(parseServerMessage('null')).toBeNull();
  });

  it('returns null for an unknown message type', () => {
    expect(parseServerMessage('{"type":"hello"}')).toBeNull();
  });

  it('returns null when a plane in the list is malformed', () => {
    const data = [makeBasic('plane-1'), { id: 'plane-2', latitude: 'north' }];
    expect(parseServerMessage(JSON.stringify({ type: 'planes', data }))).toBeNull();
  });

  it('returns null when detail fields are missing', () => {
    const { model, ...incomplete } = makeDetailed();
    void model;
    expect(
      parseServerMessage(JSON.stringify({ type: 'plane-details', data: incomplete })),
    ).toBeNull();
  });
});
