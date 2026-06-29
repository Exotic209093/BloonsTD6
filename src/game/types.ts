// Shared type contracts for the whole game.

export type DamageType = 'sharp' | 'explosion' | 'ice' | 'energy';
export type TargetMode = 'first' | 'last' | 'close' | 'strong';
export type FireStyle = 'aimed' | 'radial' | 'pulse';

export interface Vec {
  x: number;
  y: number;
}

/** A layer of a bloon (Red, Blue, ... MOAB). */
export interface BloonType {
  id: string;
  /** Hits to destroy this layer (most bloons = 1; ceramic/moab are tougher). */
  health: number;
  /** Speed multiplier relative to BASE_BLOON_SPEED. */
  speed: number;
  /** Cash awarded when this layer is popped. */
  reward: number;
  radius: number;
  color: string;
  outline: string;
  /** Bloon ids revealed when this layer is popped. */
  children: string[];
  /** Damage types this bloon ignores entirely. */
  immune: DamageType[];
  /** Lives lost if this layer reaches the exit. */
  leak: number;
  /** Red-Bloon-Equivalent, used for "Strong" targeting. */
  rbe: number;
  /** If true, the bloon takes ice damage but can never be frozen (MOAB). */
  freezeImmune?: boolean;
  /** Short glyph drawn on tough bloons (e.g. "L", "C"). */
  glyph?: string;
}

/** A single purchasable upgrade step for a tower (applied in order). */
export interface UpgradeTier {
  name: string;
  cost: number;
  description: string;
  range?: number; // additive
  cooldownMul?: number; // multiplicative (lower = faster)
  damage?: number; // additive
  pierce?: number; // additive
  shots?: number; // additive
  blastRadius?: number; // additive
  projectileSpeed?: number; // additive
  freezeDuration?: number; // additive (ice)
}

export interface TowerType {
  id: string;
  name: string;
  icon: string; // emoji shown on the tower & shop
  cost: number;
  color: string;
  range: number;
  cooldown: number; // seconds between firings
  damage: number;
  pierce: number; // bloons a single projectile can damage
  shots: number; // projectiles released per firing
  projectileSpeed: number; // px/s; 0 = hitscan (instant)
  damageType: DamageType;
  blastRadius: number; // >0 => explosive area damage on impact
  fire: FireStyle;
  projectileLifespan: number; // seconds a projectile lives
  freezeDuration: number; // seconds bloons stay frozen (pulse towers)
  description: string;
  upgrades: UpgradeTier[];
}

/** Effective, level-folded stats for a placed tower. */
export interface TowerStats {
  range: number;
  cooldown: number;
  damage: number;
  pierce: number;
  shots: number;
  blastRadius: number;
  projectileSpeed: number;
  freezeDuration: number;
}

export interface BloonGroup {
  type: string;
  count: number;
  spacing: number; // seconds between each spawn in the group
  delay: number; // seconds after round start before the group begins
}

export type Round = BloonGroup[];
