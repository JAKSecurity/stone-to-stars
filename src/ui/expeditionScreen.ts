import { CivState, Expedition, Resource, RESOURCES } from '../game/types';
import { BIOMES } from '../run/biomeData';
import { ENEMIES } from '../run/enemyData';
import { availableExpeditions } from '../run/expedition';

const ICON: Record<Resource, string> = {
  exploration: '🧭', science: '🔬', industry: '🏭', culture: '🎭',
};

export interface ExpeditionCallbacks {
  onPick: (expedition: Expedition) => void;
  onBack: () => void;
}

function biasText(bias: Partial<Record<Resource, number>>): string {
  return RESOURCES.filter((r) => bias[r]).map((r) => ICON[r]).join(' ') || '—';
}

export function renderExpeditionScreen(root: HTMLElement, civ: CivState, cb: ExpeditionCallbacks): void {
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'exp-wrap';
  wrap.innerHTML = '<h2>Choose an Expedition</h2>';

  const grid = document.createElement('div');
  grid.className = 'exp-grid';
  for (const exp of availableExpeditions(civ)) {
    const biome = BIOMES[exp.biomeId];
    const card = document.createElement('button');
    card.className = 'exp-card';
    const enemies = Object.keys(biome.spawnTable).map((id) => ENEMIES[id].name).join(', ');
    card.innerHTML =
      `<span class="tier">Tier ${exp.tier}</span>` +
      `<div class="name">${biome.name}</div>` +
      `<div class="meta">Yields: ${biasText(biome.resourceBias)}<br>` +
      `Foes: ${enemies}<br>` +
      `Threat ×${exp.scaling.hpMult.toFixed(1)} · Reward ×${exp.scaling.dropMult.toFixed(1)}</div>`;
    card.onclick = () => cb.onPick(exp);
    grid.appendChild(card);
  }
  wrap.appendChild(grid);

  const back = document.createElement('button');
  back.className = 'exp-back';
  back.textContent = '← Back to camp';
  back.onclick = () => cb.onBack();
  wrap.appendChild(back);

  root.appendChild(wrap);
}
