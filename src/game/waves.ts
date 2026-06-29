import type { Round } from './types';

// Helper to keep round data terse.
const g = (type: string, count: number, spacing = 0.55, delay = 0) => ({
  type,
  count,
  spacing,
  delay,
});

// 20 escalating rounds. Greens arrive on round 5 and fast Yellows on round 6 —
// the first real difficulty spike — then Pinks, Black/White, Lead, Ceramic, and
// a MOAB boss to finish.
export const ROUNDS: Round[] = [
  /* 1  */[g('red', 10, 0.7)],
  /* 2  */[g('red', 18, 0.45)],
  /* 3  */[g('red', 8, 0.5), g('blue', 6, 0.6, 5)],
  /* 4  */[g('blue', 12, 0.5), g('red', 8, 0.4, 1)],
  /* 5  */[g('blue', 10, 0.5), g('green', 8, 0.6, 4)],
  /* 6  */[g('green', 10, 0.5), g('yellow', 8, 0.45, 6)],
  /* 7  */[g('green', 12, 0.4), g('yellow', 8, 0.5, 5), g('blue', 10, 0.35, 9)],
  /* 8  */[g('yellow', 12, 0.45), g('green', 10, 0.4, 3)],
  /* 9  */[g('green', 14, 0.35), g('pink', 8, 0.6, 6)],
  /* 10 */[g('yellow', 16, 0.35), g('pink', 10, 0.45, 6)],
  /* 11 */[g('pink', 12, 0.4), g('black', 6, 0.7, 4)],
  /* 12 */[g('black', 8, 0.6), g('white', 8, 0.6, 3), g('yellow', 12, 0.3, 7)],
  /* 13 */[g('black', 10, 0.45), g('white', 10, 0.45, 2), g('pink', 12, 0.35, 6)],
  /* 14 */[g('lead', 4, 1.0), g('pink', 14, 0.35, 4)],
  /* 15 */[g('lead', 8, 0.8), g('black', 10, 0.4, 4), g('white', 10, 0.4, 4)],
  /* 16 */[g('ceramic', 4, 1.1), g('pink', 16, 0.3, 3)],
  /* 17 */[g('ceramic', 6, 0.9), g('black', 10, 0.4, 5), g('white', 10, 0.4, 5)],
  /* 18 */[g('ceramic', 9, 0.75), g('lead', 6, 0.9, 4)],
  /* 19 */[g('ceramic', 14, 0.6), g('lead', 8, 0.8, 6)],
  /* 20 */[g('moab', 1, 1, 0), g('ceramic', 6, 0.8, 6), g('pink', 18, 0.3, 10)],
];
