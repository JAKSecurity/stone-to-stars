import { CivState, Expedition, Resource, RESOURCES } from '../game/types';
import { BIOMES } from '../run/biomeData';
import { ENEMIES } from '../run/enemyData';
import { availableExpeditions, apexEnemyId, biomeDanger } from '../run/expedition';
import { incomeMult } from '../game/economy';
import { computeRunModifiers } from '../run/modifiers';
import { WEAPONS } from '../run/weaponData';
import { weaponStatText } from '../run/weapons';
import { spriteCanvas } from '../art/domSprite';

const ICON: Record<Resource, string> = {
  exploration: '🧭', science: '🔬', industry: '🏭', culture: '🎭',
};

export interface ExpeditionCallbacks {
  onPick: (expedition: Expedition) => void;
  onSelectWeapon: (weaponId: string) => void;
  onBack: () => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function biasText(bias: Partial<Record<Resource, number>>): string {
  return RESOURCES.filter((r) => bias[r]).map((r) => ICON[r]).join(' ') || '—';
}

export function renderExpeditionScreen(root: HTMLElement, civ: CivState, cb: ExpeditionCallbacks): void {
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'exp-wrap';
  wrap.innerHTML = '<h2>Choose an Expedition</h2>';

  // --- Starting-weapon picker (A6): a flat grid of every unlocked weapon, one-click to set the
  //     run's opening weapon. Persisted as the default. ---
  const pool = computeRunModifiers(civ).weapons;
  const chosen = pool.includes(civ.startWeapon ?? 'club') ? (civ.startWeapon ?? 'club') : 'club';
  const wsec = document.createElement('div');
  wsec.className = 'startweapon';
  wsec.innerHTML = `<h3>Starting weapon — <span class="sw-chosen">${WEAPONS[chosen]?.name ?? chosen}</span></h3>`;
  const wgrid = document.createElement('div');
  wgrid.className = 'wgrid';
  for (const id of pool) {
    const def = WEAPONS[id];
    if (!def) continue;
    const card = document.createElement('button');
    card.className = 'wcard' + (id === chosen ? ' sel' : '');
    card.appendChild(spriteCanvas(def.projectileSprite, 22));
    const text = document.createElement('div');
    text.innerHTML =
      `<div class="wnm">${def.name}</div>` +
      `<div class="wstat">${weaponStatText(def)}</div>`;
    card.appendChild(text);
    card.onclick = () => cb.onSelectWeapon(id);
    wgrid.appendChild(card);
  }
  wsec.appendChild(wgrid);
  wrap.appendChild(wsec);

  // --- Expedition cards (C6): biome swatch, enemy thumbnails, apex, reward, danger, best haul. ---
  const grid = document.createElement('div');
  grid.className = 'exp-grid';
  for (const exp of availableExpeditions(civ)) {
    const biome = BIOMES[exp.biomeId];
    const v = biome.visual;
    const card = document.createElement('button');
    card.className = 'exp-card';

    const head = document.createElement('div');
    head.className = 'exp-head';
    const swatch = document.createElement('span');
    swatch.className = 'exp-swatch';
    if (v) swatch.style.background = `linear-gradient(135deg, ${v.ground}, ${v.grid})`;
    head.appendChild(swatch);
    const title = document.createElement('div');
    title.className = 'exp-title';
    title.innerHTML =
      `<div class="name">${biome.name}</div>` +
      `<div class="exp-sub">${cap(biome.minAge)} Age · Reward ×${incomeMult(exp.tier).toFixed(1)} · Yields ${biasText(biome.resourceBias)}</div>`;
    head.appendChild(title);
    const d = biomeDanger(biome.spawnTable);
    const danger = document.createElement('span');
    danger.className = 'exp-danger';
    danger.title = `Threat ${d}/5`;
    danger.textContent = '◆'.repeat(d) + '◇'.repeat(5 - d);
    head.appendChild(danger);
    card.appendChild(head);

    const foes = document.createElement('div');
    foes.className = 'exp-foes';
    for (const id of Object.keys(biome.spawnTable)) {
      const c = spriteCanvas(ENEMIES[id].sprite, 26);
      c.title = ENEMIES[id].name;
      foes.appendChild(c);
    }
    card.appendChild(foes);

    const apex = ENEMIES[apexEnemyId(biome.spawnTable)];
    const best = civ.biomeBests?.[biome.id] ?? 0;
    const meta = document.createElement('div');
    meta.className = 'exp-meta';
    meta.innerHTML =
      `Apex: <b>${apex.name}</b>` + (best > 0 ? ` &nbsp;·&nbsp; Best haul <b>${best}</b>` : '');
    card.appendChild(meta);

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
