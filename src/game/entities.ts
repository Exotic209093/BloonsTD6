import type { DamageType, TargetMode, TowerStats, TowerType, Vec } from './types';
import { BLOON_TYPES } from './bloons';
import { positionAt } from './path';
import { TOWER_BY_ID } from './towers';

let nextBloonId = 1;
let nextTowerId = 1;

export class Bloon {
  readonly id = nextBloonId++;
  typeId: string;
  health: number;
  distance: number;
  frozen = 0; // seconds of remaining freeze
  refreezeLock = 0; // seconds after thawing during which it can't be re-frozen
  dead = false;
  pos: Vec;
  angle = 0;

  constructor(typeId: string, distance: number) {
    this.typeId = typeId;
    this.health = BLOON_TYPES[typeId].health;
    this.distance = distance;
    const { pos, angle } = positionAt(distance);
    this.pos = pos;
    this.angle = angle;
  }

  get type() {
    return BLOON_TYPES[this.typeId];
  }
}

export class Tower {
  readonly id = nextTowerId++;
  typeId: string;
  pos: Vec;
  level = 0; // number of upgrades purchased
  cooldownTimer = 0;
  target: TargetMode = 'first';
  invested: number;
  rotation = 0;
  /** Brief visual cue after firing (seconds). */
  flash = 0;
  /** Memoised effective stats; recomputed only when `level` changes. */
  statsCache: TowerStats | null = null;
  statsCacheLevel = -1;

  constructor(typeId: string, pos: Vec, cost: number) {
    this.typeId = typeId;
    this.pos = pos;
    this.invested = cost;
  }

  get type(): TowerType {
    return TOWER_BY_ID[this.typeId];
  }
}

export class Projectile {
  pos: Vec;
  vel: Vec;
  damage: number;
  pierce: number;
  type: DamageType;
  blastRadius: number;
  life: number;
  radius: number;
  hit = new Set<number>();
  dead = false;

  constructor(opts: {
    pos: Vec;
    vel: Vec;
    damage: number;
    pierce: number;
    type: DamageType;
    blastRadius: number;
    life: number;
    radius?: number;
  }) {
    this.pos = { x: opts.pos.x, y: opts.pos.y };
    this.vel = opts.vel;
    this.damage = opts.damage;
    this.pierce = opts.pierce;
    this.type = opts.type;
    this.blastRadius = opts.blastRadius;
    this.life = opts.life;
    this.radius = opts.radius ?? 4;
  }
}

export type EffectKind = 'explosion' | 'freeze' | 'tracer' | 'pop';

export interface Effect {
  kind: EffectKind;
  pos: Vec;
  to?: Vec; // for tracer
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

/** Fold a tower's base stats with all purchased upgrade tiers (memoised). */
export function towerStats(tower: Tower): TowerStats {
  if (tower.statsCache && tower.statsCacheLevel === tower.level) return tower.statsCache;
  const t = tower.type;
  const s: TowerStats = {
    range: t.range,
    cooldown: t.cooldown,
    damage: t.damage,
    pierce: t.pierce,
    shots: t.shots,
    blastRadius: t.blastRadius,
    projectileSpeed: t.projectileSpeed,
    freezeDuration: t.freezeDuration,
  };
  for (let i = 0; i < tower.level && i < t.upgrades.length; i++) {
    const u = t.upgrades[i];
    if (u.range) s.range += u.range;
    if (u.cooldownMul) s.cooldown *= u.cooldownMul;
    if (u.damage) s.damage += u.damage;
    if (u.pierce) s.pierce += u.pierce;
    if (u.shots) s.shots += u.shots;
    if (u.blastRadius) s.blastRadius += u.blastRadius;
    if (u.projectileSpeed) s.projectileSpeed += u.projectileSpeed;
    if (u.freezeDuration) s.freezeDuration += u.freezeDuration;
  }
  tower.statsCache = s;
  tower.statsCacheLevel = tower.level;
  return s;
}
