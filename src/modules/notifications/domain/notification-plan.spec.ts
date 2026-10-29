import { describe, expect, it } from 'vitest';
import type { TripEvent } from '../../../shared/events/trip-events.js';
import { payloadFor, recipientsFor } from './notification-plan.js';

const event = (overrides: Partial<TripEvent> = {}): TripEvent => ({
  type: 'DESTINATION_ADDED',
  tripId: 't',
  actorId: 'ana',
  ...overrides,
});

describe('recipientsFor', () => {
  it('tells everyone on the trip except who did it', () => {
    expect(recipientsFor(event(), ['ana', 'bia', 'caio'])).toEqual([
      'bia',
      'caio',
    ]);
  });

  it('never tells the actor, whoever they are on the trip', () => {
    expect(
      recipientsFor(event({ actorId: 'caio' }), ['ana', 'bia', 'caio']),
    ).toEqual(['ana', 'bia']);
  });

  it('tells nobody when the actor is alone on the trip', () => {
    expect(recipientsFor(event(), ['ana'])).toEqual([]);
  });

  it('adds the people the event names, even though they are not on the trip', () => {
    expect(
      recipientsFor(event({ type: 'MEMBER_REMOVED', alsoNotify: ['dani'] }), [
        'ana',
        'bia',
      ]),
    ).toEqual(['bia', 'dani']);
  });

  it('lists each person once', () => {
    expect(
      recipientsFor(event({ alsoNotify: ['bia', 'dani', 'dani'] }), [
        'ana',
        'bia',
      ]),
    ).toEqual(['bia', 'dani']);
  });

  it('still leaves the actor out when the event names them', () => {
    expect(recipientsFor(event({ alsoNotify: ['ana'] }), ['bia'])).toEqual([
      'bia',
    ]);
  });

  it('is empty for a trip with nobody on it', () => {
    expect(recipientsFor(event(), [])).toEqual([]);
  });
});

describe('payloadFor', () => {
  const names = { tripName: 'Eurotrip 2026', actorName: 'Ana' };

  it('carries the names to show', () => {
    expect(payloadFor(event(), names)).toEqual(names);
  });

  it('adds the subject and the details of the event', () => {
    expect(
      payloadFor(
        event({ subjectId: 'x', details: { from: 'VIEWER', to: 'EDITOR' } }),
        names,
      ),
    ).toEqual({ ...names, subjectId: 'x', from: 'VIEWER', to: 'EDITOR' });
  });

  it('keeps a missing name as null rather than dropping it', () => {
    expect(payloadFor(event(), { tripName: null, actorName: null })).toEqual({
      tripName: null,
      actorName: null,
    });
  });
});
