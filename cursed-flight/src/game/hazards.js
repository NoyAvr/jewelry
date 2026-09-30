/**
 * The curses. Each hazard type has a collision radius, how wildly it tumbles
 * while falling, and the copy shown when it cancels the parents' flight.
 */
export const HAZARD_TYPES = {
  crab: {
    radius: 0.42,
    tumble: 1,
    title: 'Crab Invasion',
    reason: 'A marching army of crabs has occupied the runway.',
  },
  missile: {
    radius: 0.34,
    tumble: 0,
    title: 'Airspace Closed',
    reason: 'War broke out overnight — all flights are grounded.',
  },
  plane: {
    radius: 0.42,
    tumble: 0, // nose-dives in a tight spiral instead of tumbling
    title: 'Airline Grounded',
    reason: "A terrorist pilot attempted to crash a plane, and all of the airline's flights were cancelled.",
  },
  tv: {
    radius: 0.42,
    tumble: 0.5,
    title: 'Breaking News',
    reason: 'The airline just announced a surprise strike. On live TV.',
  },
  medkit: {
    radius: 0.38,
    tumble: 0.9,
    title: 'Medical Emergency',
    reason: 'A sudden medical emergency. The trip is postponed — again.',
  },
}

export const HAZARD_KEYS = Object.keys(HAZARD_TYPES)
