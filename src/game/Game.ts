import {
  BASE_BLOON_SPEED,
  CANVAS_H,
  CANVAS_W,
  PLACE_PATH_CLEARANCE,
  ROUND_BONUS_BASE,
  ROUND_BONUS_PER_ROUND,
  SELL_REFUND,
  START_CASH,
  START_LIVES,
  THAW_WINDOW,
  TOWER_RADIUS,
} from './config';
import type { DamageType, TargetMode, TowerType, Vec } from './types';
import { dist, dist2 } from './geometry';
import { TOTAL_LENGTH, distanceToPath, positionAt } from './path';
import { Bloon, Effect, Projectile, Tower, towerStats } from './entities';
import { ROUNDS } from './waves';
import { TOWER_TYPES } from './towers';

export type GameStatus = 'ready' | 'running' | 'won' | 'lost';

interface SpawnEntry {
  type: string;
  time: number;
}

const SUBSTEP = 1 / 120;

export class Game {
  cash = START_CASH;
  lives = START_LIVES;
  round = 0; // current/last round number (1-based); 0 before the first round
  status: GameStatus = 'ready';
  speed = 1;

  bloons: Bloon[] = [];
  towers: Tower[] = [];
  projectiles: Projectile[] = [];
  effects: Effect[] = [];

  selectedTower: Tower | null = null;
  placingType: TowerType | null = null;
  mouse: Vec = { x: 0, y: 0 };

  popCount = 0;
  lastBonus = 0;

  private spawnQueue: SpawnEntry[] = [];
  private queueIndex = 0;
  private roundTimer = 0;

  reset(): void {
    this.cash = START_CASH;
    this.lives = START_LIVES;
    this.round = 0;
    this.status = 'ready';
    this.speed = 1;
    this.bloons = [];
    this.towers = [];
    this.projectiles = [];
    this.effects = [];
    this.selectedTower = null;
    this.placingType = null;
    this.popCount = 0;
    this.lastBonus = 0;
    this.spawnQueue = [];
    this.queueIndex = 0;
    this.roundTimer = 0;
  }

  get totalRounds(): number {
    return ROUNDS.length;
  }

  // ---- Round control -------------------------------------------------------

  startRound(): boolean {
    if (this.status !== 'ready') return false;
    if (this.round >= ROUNDS.length) return false;
    this.round++;
    const def = ROUNDS[this.round - 1];
    const q: SpawnEntry[] = [];
    for (const group of def) {
      for (let i = 0; i < group.count; i++) {
        q.push({ type: group.type, time: group.delay + i * group.spacing });
      }
    }
    q.sort((a, b) => a.time - b.time);
    this.spawnQueue = q;
    this.queueIndex = 0;
    this.roundTimer = 0;
    this.status = 'running';
    return true;
  }

  // ---- Simulation ----------------------------------------------------------

  /** Advance the world by `realDt` seconds, honouring the speed multiplier. */
  advance(realDt: number): void {
    let remaining = realDt * this.speed;
    let guard = 0;
    while (remaining > 1e-6 && guard++ < 4096) {
      const dt = Math.min(SUBSTEP, remaining);
      this.step(dt);
      remaining -= dt;
    }
  }

  private step(dt: number): void {
    this.updateEffects(dt);
    if (this.status !== 'running' && this.status !== 'ready') return;
    if (this.status === 'running') this.updateSpawns(dt);
    this.updateBloons(dt);
    this.updateTowers(dt);
    this.updateProjectiles(dt);
    if (this.status === 'running') this.checkRoundEnd();
  }

  private updateSpawns(dt: number): void {
    this.roundTimer += dt;
    while (
      this.queueIndex < this.spawnQueue.length &&
      this.spawnQueue[this.queueIndex].time <= this.roundTimer
    ) {
      this.bloons.push(new Bloon(this.spawnQueue[this.queueIndex].type, 0));
      this.queueIndex++;
    }
  }

  private updateBloons(dt: number): void {
    for (const b of this.bloons) {
      if (b.dead) continue;
      if (b.frozen > 0) {
        b.frozen -= dt;
        if (b.frozen <= 0) {
          b.frozen = 0;
          b.refreezeLock = THAW_WINDOW; // brief immunity so Ice can't perma-lock
        }
      } else {
        if (b.refreezeLock > 0) b.refreezeLock -= dt;
        b.distance += b.type.speed * BASE_BLOON_SPEED * dt;
      }
      if (b.distance >= TOTAL_LENGTH) {
        b.dead = true;
        this.lives -= b.type.leak;
        if (this.lives <= 0) {
          this.lives = 0;
          this.status = 'lost';
        }
        continue;
      }
      const { pos, angle } = positionAt(b.distance);
      b.pos = pos;
      b.angle = angle;
    }
    if (this.bloons.some((b) => b.dead)) {
      this.bloons = this.bloons.filter((b) => !b.dead);
    }
  }

  private updateTowers(dt: number): void {
    for (const t of this.towers) {
      if (t.flash > 0) t.flash = Math.max(0, t.flash - dt);
      t.cooldownTimer -= dt;
      if (t.cooldownTimer > 0) continue;
      const fired = this.fireTower(t);
      if (fired) {
        t.cooldownTimer = towerStats(t).cooldown;
        t.flash = 0.08;
      } else {
        t.cooldownTimer = 0; // ready to fire the instant a target appears
      }
    }
  }

  private fireTower(t: Tower): boolean {
    const s = towerStats(t);
    const range2 = s.range * s.range;
    const inRange: Bloon[] = [];
    for (const b of this.bloons) {
      if (b.dead) continue;
      if (dist2(t.pos, b.pos) <= range2) inRange.push(b);
    }
    if (inRange.length === 0) return false;

    const dmgType = t.type.damageType;

    // Ice / pulse towers: hit everything in range at once. The pulse fires (and
    // consumes its cooldown) whenever anything is in range, even if every bloon
    // happens to be immune.
    if (t.type.fire === 'pulse') {
      for (const b of inRange) {
        if (b.type.immune.includes(dmgType)) continue;
        // Freeze first so any children spawned by the pop inherit the chill.
        if (!b.type.freezeImmune && b.refreezeLock <= 0) {
          b.frozen = Math.max(b.frozen, s.freezeDuration);
        }
        this.damageBloon(b, s.damage, dmgType);
      }
      this.effects.push({
        kind: 'freeze',
        pos: { x: t.pos.x, y: t.pos.y },
        radius: 0,
        maxRadius: s.range,
        life: 0.35,
        maxLife: 0.35,
        color: '#bfe9ff',
      });
      return true;
    }

    // Aimed / radial towers need a target to aim at (radial just for rotation).
    let candidates = inRange.filter((b) => !b.type.immune.includes(dmgType));
    if (candidates.length === 0) {
      if (t.type.blastRadius > 0 || t.type.fire === 'radial') candidates = inRange;
      else return false; // pure single-target shot would be wasted
    }
    const target = this.pickTarget(candidates, t);
    t.rotation = Math.atan2(target.pos.y - t.pos.y, target.pos.x - t.pos.x);

    // Hitscan (sniper): instantly damage the single target.
    if (t.type.projectileSpeed === 0) {
      if (!target.type.immune.includes(dmgType)) {
        this.damageBloon(target, s.damage, dmgType);
      }
      this.effects.push({
        kind: 'tracer',
        pos: { x: t.pos.x, y: t.pos.y },
        to: { x: target.pos.x, y: target.pos.y },
        radius: 0,
        maxRadius: 0,
        life: 0.12,
        maxLife: 0.12,
        color: '#ffe9a8',
      });
      return true;
    }

    const speed = s.projectileSpeed;
    if (t.type.fire === 'radial') {
      for (let i = 0; i < s.shots; i++) {
        const a = (i / s.shots) * Math.PI * 2;
        this.spawnProjectile(t, s, a, speed);
      }
    } else {
      const n = Math.max(1, s.shots);
      const spread = 0.2;
      const start = t.rotation - (spread * (n - 1)) / 2;
      for (let i = 0; i < n; i++) {
        this.spawnProjectile(t, s, start + i * spread, speed);
      }
    }
    return true;
  }

  private spawnProjectile(t: Tower, s: ReturnType<typeof towerStats>, angle: number, speed: number): void {
    this.projectiles.push(
      new Projectile({
        pos: { x: t.pos.x, y: t.pos.y },
        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        damage: s.damage,
        pierce: s.pierce,
        type: t.type.damageType,
        blastRadius: s.blastRadius,
        life: t.type.projectileLifespan,
        radius: t.type.blastRadius > 0 ? 6 : 4,
      }),
    );
  }

  private pickTarget(list: Bloon[], t: Tower): Bloon {
    let best = list[0];
    switch (t.target) {
      case 'first':
        for (const b of list) if (b.distance > best.distance) best = b;
        break;
      case 'last':
        for (const b of list) if (b.distance < best.distance) best = b;
        break;
      case 'close': {
        let bestD = dist2(t.pos, best.pos);
        for (const b of list) {
          const d = dist2(t.pos, b.pos);
          if (d < bestD) {
            bestD = d;
            best = b;
          }
        }
        break;
      }
      case 'strong':
        for (const b of list) if (b.type.rbe > best.type.rbe) best = b;
        break;
    }
    return best;
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (p.dead) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.dead = true;
        continue;
      }
      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;
      if (p.pos.x < -40 || p.pos.x > CANVAS_W + 40 || p.pos.y < -40 || p.pos.y > CANVAS_H + 40) {
        p.dead = true;
        continue;
      }
      const n = this.bloons.length; // snapshot: ignore bloons spawned mid-loop
      for (let i = 0; i < n; i++) {
        const b = this.bloons[i];
        if (b.dead || p.hit.has(b.id)) continue;
        const rr = b.type.radius + p.radius;
        if (dist2(p.pos, b.pos) <= rr * rr) {
          if (p.blastRadius > 0) {
            this.explode(p);
            p.dead = true;
            break;
          }
          const did = this.damageBloon(b, p.damage, p.type);
          if (did) {
            p.hit.add(b.id);
            p.pierce -= 1;
            if (p.pierce <= 0) {
              p.dead = true;
              break;
            }
          }
          // Immune bloon: projectile passes through without spending pierce.
        }
      }
    }
    if (this.projectiles.some((p) => p.dead)) {
      this.projectiles = this.projectiles.filter((p) => !p.dead);
    }
  }

  private explode(p: Projectile): void {
    this.effects.push({
      kind: 'explosion',
      pos: { x: p.pos.x, y: p.pos.y },
      radius: 0,
      maxRadius: p.blastRadius,
      life: 0.25,
      maxLife: 0.25,
      color: '#ffb24a',
    });
    const r2 = p.blastRadius * p.blastRadius;
    const n = this.bloons.length;
    for (let i = 0; i < n; i++) {
      const b = this.bloons[i];
      if (b.dead) continue;
      if (dist2(p.pos, b.pos) <= r2) {
        this.damageBloon(b, p.damage, p.type);
      }
    }
  }

  /** Returns true if the bloon could be damaged by this type (for pierce). */
  private damageBloon(b: Bloon, amount: number, type: DamageType): boolean {
    const t = b.type;
    if (t.immune.includes(type)) return false;
    b.health -= amount;
    if (b.health > 0) return true;
    this.popBloon(b);
    return true;
  }

  private popBloon(b: Bloon): void {
    const t = b.type;
    this.cash += t.reward;
    this.popCount++;
    b.dead = true;
    this.effects.push({
      kind: 'pop',
      pos: { x: b.pos.x, y: b.pos.y },
      radius: t.radius,
      maxRadius: t.radius + 6,
      life: 0.18,
      maxLife: 0.18,
      color: t.color,
    });
    for (let i = 0; i < t.children.length; i++) {
      const childDist = Math.max(0, b.distance - i * 6);
      const child = new Bloon(t.children[i], childDist);
      child.frozen = b.frozen; // chilled children stay chilled briefly
      this.bloons.push(child);
    }
  }

  private updateEffects(dt: number): void {
    for (const e of this.effects) {
      e.life -= dt;
      const p = 1 - e.life / e.maxLife;
      if (e.kind === 'explosion' || e.kind === 'freeze' || e.kind === 'pop') {
        e.radius = e.maxRadius * Math.min(1, p);
      }
    }
    if (this.effects.some((e) => e.life <= 0)) {
      this.effects = this.effects.filter((e) => e.life > 0);
    }
  }

  private checkRoundEnd(): void {
    if (this.queueIndex < this.spawnQueue.length) return;
    if (this.bloons.length > 0) return;
    const bonus = ROUND_BONUS_BASE + this.round * ROUND_BONUS_PER_ROUND;
    this.cash += bonus;
    this.lastBonus = bonus;
    this.status = this.round >= ROUNDS.length ? 'won' : 'ready';
  }

  // ---- Placement & selection ----------------------------------------------

  canPlaceAt(p: Vec): boolean {
    if (
      p.x < TOWER_RADIUS ||
      p.x > CANVAS_W - TOWER_RADIUS ||
      p.y < TOWER_RADIUS ||
      p.y > CANVAS_H - TOWER_RADIUS
    ) {
      return false;
    }
    if (distanceToPath(p) < PLACE_PATH_CLEARANCE) return false;
    for (const t of this.towers) {
      if (dist(p, t.pos) < TOWER_RADIUS * 2) return false;
    }
    return true;
  }

  beginPlace(typeId: string): void {
    const tt = TOWER_TYPES.find((t) => t.id === typeId) ?? null;
    this.placingType = tt;
    this.selectedTower = null;
  }

  cancelPlace(): void {
    this.placingType = null;
  }

  tryPlaceAt(p: Vec): boolean {
    if (!this.placingType) return false;
    if (this.cash < this.placingType.cost) return false;
    if (!this.canPlaceAt(p)) return false;
    const tower = new Tower(this.placingType.id, { x: p.x, y: p.y }, this.placingType.cost);
    this.cash -= this.placingType.cost;
    this.towers.push(tower);
    this.selectedTower = tower;
    this.placingType = null;
    return true;
  }

  selectAt(p: Vec): Tower | null {
    let found: Tower | null = null;
    let bestD = (TOWER_RADIUS + 4) * (TOWER_RADIUS + 4);
    for (const t of this.towers) {
      const d = dist2(p, t.pos);
      if (d <= bestD) {
        bestD = d;
        found = t;
      }
    }
    this.selectedTower = found;
    return found;
  }

  deselect(): void {
    this.selectedTower = null;
  }

  upgradeSelected(): boolean {
    const t = this.selectedTower;
    if (!t) return false;
    const ups = t.type.upgrades;
    if (t.level >= ups.length) return false;
    const next = ups[t.level];
    if (this.cash < next.cost) return false;
    this.cash -= next.cost;
    t.invested += next.cost;
    t.level++;
    return true;
  }

  sellSelected(): boolean {
    const t = this.selectedTower;
    if (!t) return false;
    this.cash += Math.floor(t.invested * SELL_REFUND);
    this.towers = this.towers.filter((x) => x !== t);
    this.selectedTower = null;
    return true;
  }

  setTarget(mode: TargetMode): void {
    if (this.selectedTower) this.selectedTower.target = mode;
  }
}
