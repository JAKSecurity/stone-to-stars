import { CivState, Expedition, Resource, RESOURCES } from '../game/types';
import { BIOMES } from '../run/biomeData';
import { ENEMIES } from '../run/enemyData';
import { availableExpeditions, apexEnemyId, biomeDanger } from '../run/expedition';
import { incomeMult } from '../game/economy';
import { computeRunModifiers, unlockedWeapons } from '../run/modifiers';
import { WEAPONS } from '../run/weaponData';
import { weaponStatText } from '../run/weapons';
import { validateKit, KIT_SIZE } from '../run/kit';
import { ACTIVES } from '../run/activeData';
import { spriteCanvas } from '../art/domSprite';

const ICON: Record<Resource, string> = {
  exploration: '🧭', science: '🔬', industry: '🏭', culture: '🎭',
};

export interface ExpeditionCallbacks {
  onPick: (expedition: Expedition) => void;
  onKitChange: (kit: string[], startWeapon: string) => void;
  onSelectActive: (id: string) => void;
  onBack: () => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Brief shake to signal a refused action (e.g. trying to add a 5th kit weapon). */
function shake(el: HTMLElement): void {
  el.classList.remove('kit-shake');
  void el.offsetWidth; // restart the animation
  el.classList.add('kit-shake');
}

function biasText(bias: Partial<Record<Resource, number>>): string {
  return RESOURCES.filter((r) => bias[r]).map((r) => ICON[r]).join(' ') || '—';
}

export function renderExpeditionScreen(root: HTMLElement, civ: CivState, cb: ExpeditionCallbacks): void {
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'exp-wrap';
  wrap.innerHTML = '<h2>Choose an Expedition</h2>';

  // --- Expedition Kit picker (RC-031): a flat always-visible grid of EVERY unlocked weapon.
  //     Click toggles kit membership (up to KIT_SIZE); each in-kit card has a ★ start toggle
  //     (exactly one start weapon). A small deliberate kit is a real commitment — validateKit
  //     keeps a non-empty kit at its chosen size. Below: a one-card-per-unlocked-active row. ---
  const pool = unlockedWeapons(civ);
  // Normalize the persisted kit through the same gate the run uses, so the UI never shows
  // a stale/invalid kit (e.g. ids dropped by the catalog rebuild).
  const norm = validateKit(civ.kit, pool, civ.startWeapon);
  const kit = norm.kit;
  const startWeapon = norm.startWeapon;

  const wsec = document.createElement('div');
  wsec.className = 'startweapon';
  wsec.innerHTML =
    `<h3>Expedition kit — <span class="sw-chosen">${kit.length}/${KIT_SIZE}</span> ` +
    `<span class="kit-hint">click to add · ★ sets start weapon</span></h3>`;
  const wgrid = document.createElement('div');
  wgrid.className = 'wgrid';
  for (const id of pool) {
    const def = WEAPONS[id];
    if (!def) continue;
    const inKit = kit.includes(id);
    const isStart = id === startWeapon;
    const card = document.createElement('div');
    card.className = 'wcard kit-card' + (inKit ? ' sel' : '');

    const pick = document.createElement('button');
    pick.className = 'kit-pick';
    pick.appendChild(spriteCanvas(def.projectileSprite, 22));
    const text = document.createElement('div');
    text.innerHTML =
      `<div class="wnm">${def.name}</div>` +
      `<div class="wstat">${weaponStatText(def)}</div>`;
    pick.appendChild(text);
    if (inKit) {
      const badge = document.createElement('span');
      badge.className = 'kit-badge';
      badge.textContent = '✓ in kit';
      pick.appendChild(badge);
    }
    pick.onclick = () => {
      if (inKit) {
        // Refuse to remove the last kit weapon — a run needs a start weapon.
        if (kit.length <= 1) return;
        const next = kit.filter((w) => w !== id);
        const nextStart = isStart ? next[0] : startWeapon;
        const v = validateKit(next, pool, nextStart);
        cb.onKitChange(v.kit, v.startWeapon);
      } else {
        if (kit.length >= KIT_SIZE) { shake(card); return; }
        const v = validateKit([...kit, id], pool, startWeapon);
        cb.onKitChange(v.kit, v.startWeapon);
      }
    };
    card.appendChild(pick);

    if (inKit) {
      const star = document.createElement('button');
      star.className = 'kit-star' + (isStart ? ' on' : '');
      star.textContent = isStart ? '★ start' : '☆ start';
      star.title = isStart ? 'Start weapon' : 'Set as start weapon';
      star.onclick = () => {
        if (isStart) return;
        const v = validateKit(kit, pool, id);
        cb.onKitChange(v.kit, v.startWeapon);
      };
      card.appendChild(star);
    }
    wgrid.appendChild(card);
  }
  wsec.appendChild(wgrid);

  // --- Active item row: one card per unlocked active, exactly one selected. Hidden when none. ---
  const actives = computeRunModifiers(civ).actives;
  if (actives.length > 0) {
    const chosenActive = civ.activeItem && actives.includes(civ.activeItem)
      ? civ.activeItem : actives[0];
    const arow = document.createElement('div');
    arow.className = 'active-row';
    arow.innerHTML = '<h3>Active item <span class="kit-hint">right-click in-run</span></h3>';
    const acards = document.createElement('div');
    acards.className = 'wgrid';
    for (const id of actives) {
      const def = ACTIVES[id];
      if (!def) continue;
      const card = document.createElement('button');
      card.className = 'wcard active-card' + (id === chosenActive ? ' sel' : '');
      const icon = document.createElement('span');
      icon.className = 'active-icon';
      icon.textContent = def.icon;
      card.appendChild(icon);
      const text = document.createElement('div');
      text.innerHTML =
        `<div class="wnm">${def.name}</div>` +
        `<div class="wstat">${def.desc}</div>`;
      card.appendChild(text);
      card.onclick = () => cb.onSelectActive(id);
      acards.appendChild(card);
    }
    arow.appendChild(acards);
    wsec.appendChild(arow);
  }

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
