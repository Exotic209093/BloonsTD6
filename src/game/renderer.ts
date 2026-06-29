import { CANVAS_H, CANVAS_W, PATH_RADIUS, TOWER_RADIUS } from './config';
import { WAYPOINTS } from './path';
import { Game } from './Game';
import { Bloon, Tower, towerStats } from './entities';

export function render(ctx: CanvasRenderingContext2D, game: Game): void {
  drawBackground(ctx);
  drawPath(ctx);

  // Range ring for the selected tower or the tower being placed.
  if (game.selectedTower) {
    drawRange(ctx, game.selectedTower.pos.x, game.selectedTower.pos.y, towerStats(game.selectedTower).range, 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0.5)');
  }

  for (const t of game.towers) drawTower(ctx, t, t === game.selectedTower);
  for (const b of game.bloons) drawBloon(ctx, b);
  drawProjectiles(ctx, game);
  drawEffects(ctx, game);

  if (game.placingType) drawPlacementPreview(ctx, game);
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#4f9a4f';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // subtle checker for depth
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let y = 0; y < CANVAS_H; y += 48) {
    for (let x = 0; x < CANVAS_W; x += 48) {
      if (((x + y) / 48) % 2 === 0) ctx.fillRect(x, y, 48, 48);
    }
  }
}

function drawPath(ctx: CanvasRenderingContext2D): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.strokeStyle = '#7a5a36';
  ctx.lineWidth = PATH_RADIUS * 2 + 6;
  tracePath(ctx);
  ctx.stroke();

  ctx.strokeStyle = '#b08a5a';
  ctx.lineWidth = PATH_RADIUS * 2;
  tracePath(ctx);
  ctx.stroke();

  // entrance & exit markers
  const start = WAYPOINTS[0];
  const end = WAYPOINTS[WAYPOINTS.length - 1];
  ctx.fillStyle = 'rgba(40,200,90,0.9)';
  ctx.beginPath();
  ctx.arc(Math.max(14, start.x), start.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(230,60,60,0.9)';
  ctx.beginPath();
  ctx.arc(Math.min(CANVAS_W - 14, end.x), end.y, 12, 0, Math.PI * 2);
  ctx.fill();
}

function tracePath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(WAYPOINTS[0].x, WAYPOINTS[0].y);
  for (let i = 1; i < WAYPOINTS.length; i++) ctx.lineTo(WAYPOINTS[i].x, WAYPOINTS[i].y);
}

function drawRange(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke: string,
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function drawBloon(ctx: CanvasRenderingContext2D, b: Bloon): void {
  const t = b.type;
  ctx.beginPath();
  ctx.arc(b.pos.x, b.pos.y, t.radius, 0, Math.PI * 2);
  ctx.fillStyle = t.color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = t.outline;
  ctx.stroke();

  // glossy highlight
  ctx.beginPath();
  ctx.arc(b.pos.x - t.radius * 0.32, b.pos.y - t.radius * 0.34, t.radius * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();

  if (t.glyph) {
    ctx.fillStyle = t.id === 'white' ? '#333' : '#fff';
    ctx.font = `bold ${t.id === 'moab' ? 12 : 13}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.glyph, b.pos.x, b.pos.y + 0.5);
  }

  // health bar for tough bloons
  if (t.health > 1) {
    const frac = Math.max(0, b.health / t.health);
    const w = t.radius * 2;
    const bx = b.pos.x - t.radius;
    const by = b.pos.y - t.radius - 7;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(bx, by, w, 4);
    ctx.fillStyle = '#65e06a';
    ctx.fillRect(bx, by, w * frac, 4);
  }

  if (b.frozen > 0) {
    ctx.beginPath();
    ctx.arc(b.pos.x, b.pos.y, t.radius + 1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150,220,255,0.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,245,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawTower(ctx: CanvasRenderingContext2D, t: Tower, selected: boolean): void {
  const type = t.type;
  const { x, y } = t.pos;

  if (selected) {
    ctx.beginPath();
    ctx.arc(x, y, TOWER_RADIUS + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // barrel
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t.rotation);
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(0, -3, TOWER_RADIUS + 6, 6);
  ctx.restore();

  // body
  ctx.beginPath();
  ctx.arc(x, y, TOWER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = type.color;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = t.flash > 0 ? '#fff7d6' : 'rgba(0,0,0,0.45)';
  ctx.stroke();

  // upgrade pips
  for (let i = 0; i < t.level; i++) {
    ctx.beginPath();
    ctx.arc(x - 9 + i * 9, y + TOWER_RADIUS + 6, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
  }

  // icon
  ctx.font = '18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(type.icon, x, y + 1);
}

function drawProjectiles(ctx: CanvasRenderingContext2D, game: Game): void {
  for (const p of game.projectiles) {
    if (p.blastRadius > 0) {
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#1c1c1c';
      ctx.fill();
      ctx.strokeStyle = '#ff7a2a';
      ctx.lineWidth = 2;
      ctx.stroke();
      continue;
    }
    const ang = Math.atan2(p.vel.y, p.vel.x);
    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    ctx.rotate(ang);
    ctx.strokeStyle = p.type === 'energy' ? '#ffe14d' : p.type === 'ice' ? '#7fdcff' : '#f4f1e6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.stroke();
    ctx.restore();
  }
}

function drawEffects(ctx: CanvasRenderingContext2D, game: Game): void {
  for (const e of game.effects) {
    const alpha = Math.max(0, e.life / e.maxLife);
    if (e.kind === 'tracer' && e.to) {
      ctx.strokeStyle = `rgba(255,233,168,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.pos.x, e.pos.y);
      ctx.lineTo(e.to.x, e.to.y);
      ctx.stroke();
    } else if (e.kind === 'explosion') {
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,150,40,${0.5 * alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,90,20,${alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (e.kind === 'freeze') {
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(180,235,255,${alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (e.kind === 'pop') {
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function drawPlacementPreview(ctx: CanvasRenderingContext2D, game: Game): void {
  const type = game.placingType!;
  const { x, y } = game.mouse;
  const ok = game.canPlaceAt(game.mouse) && game.cash >= type.cost;
  drawRange(
    ctx,
    x,
    y,
    type.range,
    ok ? 'rgba(120,255,140,0.18)' : 'rgba(255,90,90,0.18)',
    ok ? 'rgba(120,255,140,0.7)' : 'rgba(255,90,90,0.7)',
  );
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, TOWER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = ok ? type.color : '#8a3b3b';
  ctx.fill();
  ctx.font = '18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(type.icon, x, y + 1);
  ctx.globalAlpha = 1;
}
