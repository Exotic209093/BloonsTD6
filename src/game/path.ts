import type { Vec } from './types';
import { distToSegment } from './geometry';

// The course the bloons follow, from off-screen left to off-screen right.
export const WAYPOINTS: Vec[] = [
  { x: -30, y: 120 },
  { x: 170, y: 120 },
  { x: 170, y: 330 },
  { x: 380, y: 330 },
  { x: 380, y: 140 },
  { x: 600, y: 140 },
  { x: 600, y: 430 },
  { x: 250, y: 430 },
  { x: 250, y: 540 },
  { x: 780, y: 540 },
  { x: 780, y: 250 },
  { x: 990, y: 250 },
];

interface Segment {
  a: Vec;
  b: Vec;
  len: number;
  cum: number; // path length up to the start of this segment
  angle: number;
}

const SEGMENTS: Segment[] = [];
let total = 0;
for (let i = 0; i < WAYPOINTS.length - 1; i++) {
  const a = WAYPOINTS[i];
  const b = WAYPOINTS[i + 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  SEGMENTS.push({ a, b, len, cum: total, angle: Math.atan2(b.y - a.y, b.x - a.x) });
  total += len;
}

export const TOTAL_LENGTH = total;

/** Position (and travel angle) at a given distance along the path. */
export function positionAt(distance: number): { pos: Vec; angle: number } {
  if (distance <= 0) {
    const s = SEGMENTS[0];
    return { pos: { x: s.a.x, y: s.a.y }, angle: s.angle };
  }
  if (distance >= total) {
    const s = SEGMENTS[SEGMENTS.length - 1];
    return { pos: { x: s.b.x, y: s.b.y }, angle: s.angle };
  }
  for (const s of SEGMENTS) {
    if (distance <= s.cum + s.len) {
      const t = (distance - s.cum) / s.len;
      return {
        pos: { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t },
        angle: s.angle,
      };
    }
  }
  const last = SEGMENTS[SEGMENTS.length - 1];
  return { pos: { x: last.b.x, y: last.b.y }, angle: last.angle };
}

/** Shortest distance from a point to the path centre-line. */
export function distanceToPath(p: Vec): number {
  let min = Infinity;
  for (const s of SEGMENTS) {
    const d = distToSegment(p, s.a, s.b);
    if (d < min) min = d;
  }
  return min;
}
