import './style.css';
import { CANVAS_H, CANVAS_W, MAX_FRAME_DT, SELL_REFUND } from './game/config';
import { Game } from './game/Game';
import { render } from './game/renderer';
import { towerStats } from './game/entities';
import { TOWER_TYPES } from './game/towers';
import type { TargetMode, Vec } from './game/types';

// ---- DOM helpers ----------------------------------------------------------
function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
}

const canvas = byId<HTMLCanvasElement>('game');
const ctx = canvas.getContext('2d')!;
const cashEl = byId('cash');
const livesEl = byId('lives');
const roundEl = byId('round');
const speedBtn = byId<HTMLButtonElement>('speedBtn');
const pauseBtn = byId<HTMLButtonElement>('pauseBtn');
const startBtn = byId<HTMLButtonElement>('startBtn');
const shopEl = byId('shop');
const selectedEl = byId('selected');
const overlayEl = byId('overlay');

const game = new Game();
let paused = false;
let introVisible = true;
const SPEEDS = [1, 2, 3];

// ---- Shop -----------------------------------------------------------------
const shopButtons: HTMLButtonElement[] = TOWER_TYPES.map((t) => {
  const btn = document.createElement('button');
  btn.className = 'shop-item';
  btn.innerHTML =
    `<span class="ic">${t.icon}</span>` +
    `<span class="body"><span class="nm">${t.name}</span>` +
    `<span class="ds">${t.description}</span></span>` +
    `<span class="pr">$${t.cost}</span>`;
  btn.addEventListener('click', () => {
    game.beginPlace(t.id);
    refreshSelectedPanel();
  });
  shopEl.appendChild(btn);
  return btn;
});

// ---- Selected tower panel -------------------------------------------------
let panelSig = '';
let targetButtons: Record<string, HTMLButtonElement> = {};
let upgradeBtn: HTMLButtonElement | null = null;
let sellBtn: HTMLButtonElement | null = null;
let statsBox: HTMLElement | null = null;

const TARGET_MODES: TargetMode[] = ['first', 'last', 'close', 'strong'];
const TARGET_LABELS: Record<TargetMode, string> = {
  first: 'First',
  last: 'Last',
  close: 'Close',
  strong: 'Strong',
};

function buildSelectedPanel(): void {
  const t = game.selectedTower;
  targetButtons = {};
  upgradeBtn = null;
  sellBtn = null;
  statsBox = null;
  if (!t) {
    selectedEl.classList.add('hidden');
    selectedEl.innerHTML = '';
    return;
  }
  selectedEl.classList.remove('hidden');
  selectedEl.innerHTML = '';

  const title = document.createElement('h3');
  title.innerHTML = `<span>${t.type.icon}</span> ${t.type.name}`;
  selectedEl.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'sub';
  sub.textContent = 'Targeting priority';
  selectedEl.appendChild(sub);

  const targets = document.createElement('div');
  targets.className = 'targets';
  for (const mode of TARGET_MODES) {
    const b = document.createElement('button');
    b.textContent = TARGET_LABELS[mode];
    b.addEventListener('click', () => {
      game.setTarget(mode);
      syncSelectedPanel();
    });
    targets.appendChild(b);
    targetButtons[mode] = b;
  }
  selectedEl.appendChild(targets);

  statsBox = document.createElement('div');
  selectedEl.appendChild(statsBox);

  const actions = document.createElement('div');
  actions.className = 'actions';
  upgradeBtn = document.createElement('button');
  upgradeBtn.id = 'upgradeBtn';
  upgradeBtn.addEventListener('click', () => {
    if (game.upgradeSelected()) refreshSelectedPanel();
  });
  sellBtn = document.createElement('button');
  sellBtn.id = 'sellBtn';
  sellBtn.addEventListener('click', () => {
    game.sellSelected();
    refreshSelectedPanel();
  });
  actions.appendChild(upgradeBtn);
  actions.appendChild(sellBtn);
  selectedEl.appendChild(actions);
}

function syncSelectedPanel(): void {
  const t = game.selectedTower;
  if (!t) return;
  for (const mode of TARGET_MODES) {
    targetButtons[mode]?.classList.toggle('active', t.target === mode);
  }
  const s = towerStats(t);
  if (statsBox) {
    const dps = t.type.fire === 'pulse' ? `${s.damage} / pulse` : `${s.damage}`;
    statsBox.innerHTML =
      line('Damage', dps) +
      line('Range', `${Math.round(s.range > 1000 ? 9999 : s.range)}`) +
      line('Rate', `${(1 / s.cooldown).toFixed(1)} /s`) +
      (t.type.fire === 'pulse' ? line('Freeze', `${s.freezeDuration.toFixed(1)}s`) : line('Shots', `${s.shots}`));
  }
  if (upgradeBtn) {
    const ups = t.type.upgrades;
    if (t.level >= ups.length) {
      upgradeBtn.textContent = 'Fully upgraded';
      upgradeBtn.disabled = true;
    } else {
      const next = ups[t.level];
      upgradeBtn.innerHTML = `⬆ ${next.name}<br><small>${next.description} — $${next.cost}</small>`;
      upgradeBtn.disabled = game.cash < next.cost;
    }
  }
  if (sellBtn) {
    sellBtn.textContent = `Sell $${Math.floor(t.invested * SELL_REFUND)}`;
  }
}

function line(label: string, value: string): string {
  return `<div class="stat-line"><span>${label}</span><b>${value}</b></div>`;
}

function refreshSelectedPanel(): void {
  panelSig = panelSignature();
  buildSelectedPanel();
  syncSelectedPanel();
  syncShop();
}

function panelSignature(): string {
  const t = game.selectedTower;
  return t ? `${t.id}:${t.level}` : 'none';
}

// ---- HUD sync -------------------------------------------------------------
function syncShop(): void {
  TOWER_TYPES.forEach((t, i) => {
    const btn = shopButtons[i];
    btn.classList.toggle('poor', game.cash < t.cost);
    btn.classList.toggle('selected', game.placingType?.id === t.id);
  });
}

function syncHUD(): void {
  cashEl.textContent = String(Math.floor(game.cash));
  livesEl.textContent = String(game.lives);
  roundEl.textContent = `${game.round} / ${game.totalRounds}`;
  speedBtn.textContent = `▶ ${game.speed}×`;
  pauseBtn.textContent = paused ? '▶ Resume' : '⏸ Pause';
  startBtn.disabled = game.status !== 'ready' || game.round >= game.totalRounds;
  startBtn.textContent =
    game.status === 'running' ? 'Wave in progress…' : `Start Round ${Math.min(game.round + 1, game.totalRounds)}`;

  // Rebuild the panel only when the selection or its level changes.
  if (panelSignature() !== panelSig) refreshSelectedPanel();
  else syncSelectedPanel();
  syncShop();
  syncOverlay();
}

// ---- Overlay --------------------------------------------------------------
type OverlayKey = 'intro' | 'won' | 'lost' | 'none';
let overlayKey: OverlayKey = '' as OverlayKey;

function desiredOverlay(): OverlayKey {
  if (game.status === 'won') return 'won';
  if (game.status === 'lost') return 'lost';
  if (introVisible) return 'intro';
  return 'none';
}

function syncOverlay(): void {
  const k = desiredOverlay();
  if (k === overlayKey) return;
  overlayKey = k;
  if (k === 'none') {
    overlayEl.classList.remove('show');
    overlayEl.innerHTML = '';
    return;
  }
  overlayEl.classList.add('show');
  if (k === 'intro') {
    overlayEl.innerHTML = card(
      '🎈 Bloons Tower Defense',
      'Defend the track for <b>20 waves</b>. Place monkeys, pop bloons, and don\'t let them reach the exit. Greens arrive on round 5 and lightning-fast Yellows on round 6 — gear up early!',
      'Play',
    );
    bindOverlayButton(() => {
      introVisible = false;
    });
  } else if (k === 'won') {
    overlayEl.innerHTML = card(
      '🏆 Victory!',
      `You cleared all ${game.totalRounds} waves with <b>${game.lives}</b> lives to spare. The bloons never stood a chance.`,
      'Play Again',
    );
    bindOverlayButton(restart);
  } else {
    overlayEl.innerHTML = card(
      '💥 Defeat',
      `The bloons overran you on <b>round ${game.round}</b>. Pop more, leak less — try a different tower mix!`,
      'Try Again',
    );
    bindOverlayButton(restart);
  }
}

function card(title: string, body: string, btn: string): string {
  return `<div class="card"><h1>${title}</h1><p class="big">${body}</p><button class="primary" id="overlayBtn">${btn}</button></div>`;
}

function bindOverlayButton(fn: () => void): void {
  const b = document.getElementById('overlayBtn');
  if (b) b.addEventListener('click', fn);
}

function restart(): void {
  game.reset();
  paused = false;
  introVisible = false;
  panelSig = 'none';
  buildSelectedPanel();
  syncHUD();
}

// ---- Input ----------------------------------------------------------------
function toCanvas(e: MouseEvent): Vec {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
    y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
  };
}

canvas.addEventListener('mousemove', (e) => {
  game.mouse = toCanvas(e);
});

canvas.addEventListener('click', (e) => {
  const p = toCanvas(e);
  game.mouse = p;
  if (game.placingType) {
    if (game.tryPlaceAt(p)) refreshSelectedPanel();
  } else {
    game.selectAt(p);
    refreshSelectedPanel();
  }
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  game.cancelPlace();
  game.deselect();
  refreshSelectedPanel();
});

speedBtn.addEventListener('click', () => {
  const idx = SPEEDS.indexOf(game.speed);
  game.speed = SPEEDS[(idx + 1) % SPEEDS.length];
});
pauseBtn.addEventListener('click', () => {
  paused = !paused;
});
startBtn.addEventListener('click', () => {
  game.startRound();
});

window.addEventListener('keydown', (e) => {
  // Ignore gameplay keys while an intro / win / lose overlay is up.
  if (desiredOverlay() !== 'none') return;
  if (e.key === 'Escape') {
    game.cancelPlace();
    game.deselect();
    refreshSelectedPanel();
  } else if (e.key === ' ') {
    e.preventDefault();
    paused = !paused;
  } else if (e.key === 'Enter') {
    game.startRound();
  } else if (e.key >= '1' && e.key <= '6') {
    const idx = Number(e.key) - 1;
    if (TOWER_TYPES[idx]) {
      game.beginPlace(TOWER_TYPES[idx].id);
      refreshSelectedPanel();
    }
  }
});

// ---- Main loop ------------------------------------------------------------
let last = performance.now();
function frame(now: number): void {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > MAX_FRAME_DT) dt = MAX_FRAME_DT;
  if (!paused) game.advance(dt);
  render(ctx, game);
  syncHUD();
  requestAnimationFrame(frame);
}

buildSelectedPanel();
syncHUD();
requestAnimationFrame(frame);

// Debug handle (handy in the dev console; harmless in production).
(window as unknown as { game: Game }).game = game;
