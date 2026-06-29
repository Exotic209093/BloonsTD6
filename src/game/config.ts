// Global game constants and balance knobs.

export const CANVAS_W = 960;
export const CANVAS_H = 600;

export const START_CASH = 650;
export const START_LIVES = 100;

// Pixels/second a Red Bloon (speed multiplier 1.0) travels along the path.
export const BASE_BLOON_SPEED = 66;

// Placement geometry.
export const PATH_RADIUS = 26; // half-width of the drawn path
export const TOWER_RADIUS = 18; // tower body radius (also min spacing unit)
export const PLACE_PATH_CLEARANCE = 30; // min distance from path centre to place

// Refund fraction when selling a tower.
export const SELL_REFUND = 0.7;

// After a bloon thaws it cannot be re-frozen for this long, so Ice heavily
// slows the path instead of locking it permanently.
export const THAW_WINDOW = 0.7;

// End-of-round cash bonus = ROUND_BONUS_BASE + round * ROUND_BONUS_PER_ROUND.
export const ROUND_BONUS_BASE = 37;
export const ROUND_BONUS_PER_ROUND = 8;

// Largest simulation step (seconds) per frame, before speed multiplier, to
// avoid the simulation "exploding" if the tab was backgrounded.
export const MAX_FRAME_DT = 1 / 30;
