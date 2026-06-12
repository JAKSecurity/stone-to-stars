import { RunResult, Resource, RESOURCES } from '../game/types';
import { MUTATORS } from '../run/mutatorData';

const ICON: Record<Resource, string> = {
  exploration: '🧭', science: '🔬', industry: '🏭', culture: '🎭',
};

const LABEL: Record<Resource, string> = {
  exploration: 'Exploration', science: 'Science', industry: 'Industry', culture: 'Culture',
};

/** End-of-run summary: thematic outcome line + the resources gathered this run + a return button. */
export function renderRunEndScreen(root: HTMLElement, result: RunResult, onContinue: () => void): void {
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'runend-wrap';

  const title = document.createElement('h2');
  title.textContent = result.died
    ? 'Your expedition’s resources are exhausted — you must return to base.'
    : 'Expedition complete — you return to base with your haul.';
  wrap.appendChild(title);

  const total = RESOURCES.reduce((s, r) => s + result.collected[r], 0);
  const sub = document.createElement('div');
  sub.className = 'runend-sub';
  sub.textContent = `Resources gathered this expedition — ${total} total`;
  wrap.appendChild(sub);

  const grid = document.createElement('div');
  grid.className = 'runend-grid';
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

  // RC-029: when wagers were honored, name them and show the haul multiplier they earned.
  if (result.mutators?.length && result.rewardMult && result.rewardMult > 1) {
    const names = result.mutators.map((id) => MUTATORS[id]?.name ?? id).join(', ');
    const div = document.createElement('div');
    div.className = 'mutline';
    div.textContent = `Wagers honored: ${names} — haul ×${result.rewardMult.toFixed(2)}`;
    wrap.appendChild(div);
  }

  const btn = document.createElement('button');
  btn.className = 'runend-btn';
  btn.textContent = 'Return to base';
  btn.onclick = () => onContinue();
  wrap.appendChild(btn);

  root.appendChild(wrap);
}
