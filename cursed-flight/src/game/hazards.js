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
  rubble: {
    radius: 0.45,
    tumble: 1.2,
    title: 'Terminal Collapse',
    reason: 'Falling rubble! The departures hall is closed for repairs.',
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
