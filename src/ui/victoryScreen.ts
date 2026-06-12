import { CivState, RunResult, Resource, RESOURCES, AGE_ORDER } from '../game/types';
import { getAge } from '../tech/tech';

const ICON: Record<Resource, string> = {
  exploration: '🧭', science: '🔬', industry: '🏭', culture: '🎭',
};
const LABEL: Record<Resource, string> = {
  exploration: 'Exploration', science: 'Science', industry: 'Industry', culture: 'Culture',
};

export interface VictoryCallbacks { onContinue: () => void }

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function fmtTime(ms: number): string {
  const totalS = Math.floor(ms / 1000);
  const m = Math.floor(totalS / 60);
  const s = totalS % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * RC-042 — the Last Stand victory screen (pattern of runEndScreen, gold-toned). Shows the
 * finale run's stats (time survived, haul) plus the civ's lifetime stats (age reached, total
 * expeditions, lifetime resources). One button: Continue → civ screen (the sandbox continues;
 * the finale stays replayable). `civ` is the post-banking civ so the lifetime numbers are current.
 */
export function renderVictoryScreen(
  root: HTMLElement, result: RunResult, civ: CivState, cb: VictoryCallbacks,
): void {
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'victory-wrap';

  const title = document.createElement('h2');
  title.className = 'victory-title';
  title.textContent = '🏆 THE LAST STAND — VICTORY';
  wrap.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'victory-sub';
  sub.textContent = 'The mothership burns. The invasion is repelled — your civilization endures.';
  wrap.appendChild(sub);

  // Run stats — time survived + the haul, in the familiar resource grid.
  const total = RESOURCES.reduce((s, r) => s + result.collected[r], 0);
  const runline = document.createElement('div');
  runline.className = 'victory-stats';
  runline.innerHTML =
    `<span class="victory-stat">⏱ Survived <strong>${fmtTime(result.survivedMs)}</strong></span>` +
    `<span class="victory-stat">💎 Haul <strong>${total}</strong></span>`;
  wrap.appendChild(runline);

  const grid = document.createElement('div');
  grid.className = 'victory-grid';
  for (const r of RESOURCES) {
    const cell = document.createElement('div');
    cell.className = 'runend-res';
    cell.innerHTML =
      `<div class="ricon">${ICON[r]}</div>` +
      `<div class="rval">${result.collected[r]}</div>` +
      `<div class="rlbl">${LABEL[r]}</div>`;
    grid.appendChild(cell);
  }
  wrap.appendChild(grid);

  // Civ lifetime stats — the legacy this victory caps.
  const lt = civ.lifetimeResources ?? { exploration: 0, science: 0, industry: 0, culture: 0 };
  const ltText = RESOURCES.map((r) => `${ICON[r]}${lt[r]}`).join(' ');
  const legacy = document.createElement('div');
  legacy.className = 'victory-stats';
  legacy.innerHTML =
    `<span class="victory-stat">Age <strong>${cap(getAge(civ))}</strong> (${AGE_ORDER.indexOf(getAge(civ)) + 1} of ${AGE_ORDER.length})</span>` +
    `<span class="victory-stat">⚔️ <strong>${civ.runs}</strong> expedition${civ.runs === 1 ? '' : 's'}</span>` +
    `<span class="victory-stat">Lifetime ${ltText}</span>`;
  wrap.appendChild(legacy);

  const btn = document.createElement('button');
  btn.className = 'victory-btn';
  btn.textContent = 'Continue';
  btn.onclick = () => cb.onContinue();
  wrap.appendChild(btn);

  root.appendChild(wrap);
}
