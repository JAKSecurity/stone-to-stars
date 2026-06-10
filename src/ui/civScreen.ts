import { CivState, Resource, RESOURCES } from '../game/types';
import { TECHS } from '../tech/techData';
import { BUILDINGS } from '../camp/buildingData';
import { canResearch, isResearched, getAge, techCost, techEffectText, unmetRequirements } from '../tech/tech';
import { buildableBuildings, firstEmptyTile, buildingEffectText, tileOccupied, upgradeCost, buildingCost, unlockedTileCount } from '../camp/camp';
import { canAfford } from '../economy/resources';
import { GRID_SIZE } from '../game/config';
import { spriteCanvas } from '../art/domSprite';

const ICON: Record<Resource, string> = {
  exploration: '🧭', science: '🔬', industry: '🏭', culture: '🎭',
};
const RNAME: Record<Resource, string> = {
  exploration: 'Exploration', science: 'Science', industry: 'Industry', culture: 'Culture',
};

export interface CivCallbacks {
  onResearch: (techId: string) => void;
  onBuild: (buildingId: string, tile: number) => void;
  onUpgrade: (tile: number) => void;
  onMoveBuilding: (fromTile: number, toTile: number) => void;
  onStartRun: () => void;
}

/**
 * A cost with any shortfall inlined per resource, e.g. "108 Industry, need 18 more" or
 * "40 Industry · 30 Science, need 5 more". Names (not icons) so it's unambiguous which token.
 */
function costLine(banked: Record<Resource, number>, cost: Partial<Record<Resource, number>>): string {
  const parts = RESOURCES.filter((r) => cost[r]).map((r) => {
    const need = cost[r] ?? 0;
    const short = Math.max(0, need - banked[r]);
    return short > 0 ? `${need} ${RNAME[r]}, need ${short} more` : `${need} ${RNAME[r]}`;
  });
  return parts.join(' · ') || 'free';
}

export function renderCivScreen(root: HTMLElement, civ: CivState, cb: CivCallbacks): void {
  root.innerHTML = '';
  let didDrag = false;
  const wrap = document.createElement('div');
  wrap.className = 'civ-wrap';

  // Resource bar + age.
  const bar = document.createElement('div');
  bar.className = 'resbar';
  for (const r of RESOURCES) {
    const span = document.createElement('span');
    span.className = 'res';
    span.appendChild(spriteCanvas('gem_' + r, 18));
    const name = document.createElement('span');
    name.className = 'rname';
    // Pair the gem with the emoji used in cost chips so players can map "🎭" → "Culture".
    name.textContent = `${ICON[r]} ${r.charAt(0).toUpperCase() + r.slice(1)}`;
    span.appendChild(name);
    const val = document.createElement('strong');
    val.textContent = String(civ.banked[r]);
    span.appendChild(val);
    bar.appendChild(span);
  }
  const ageSpan = document.createElement('span');
  ageSpan.className = 'age';
  const age = getAge(civ);
  ageSpan.innerHTML = `Age: <strong>${age.charAt(0).toUpperCase()}${age.slice(1)}</strong>`;
  bar.appendChild(ageSpan);
  wrap.appendChild(bar);

  // Start Expedition lives at the top so it's always in reach without scrolling past the panels.
  const start = document.createElement('button');
  start.className = 'startrun';
  start.textContent = '⚔️  Start Expedition';
  start.onclick = () => cb.onStartRun();
  wrap.appendChild(start);

  const cols = document.createElement('div');
  cols.className = 'cols';

  // Tech panel.
  const techPanel = document.createElement('div');
  techPanel.className = 'panel';
  techPanel.innerHTML = '<h2>Tech Tree</h2>';
  for (const tech of Object.values(TECHS)) {
    const row = document.createElement('div');
    const done = isResearched(civ, tech.id);
    row.className = 'tech' + (done ? ' done' : '');
    const label = document.createElement('div');
    label.className = 'techlabel';
    const eff = techEffectText(tech.id);
    const missing = done ? [] : unmetRequirements(civ, tech.id);
    label.innerHTML =
      // Name + effect share one line at one font size: "Pottery — Unlocks Granary (…)".
      `<div class="bnm">${tech.name}${eff ? ` <span class="effinline">— ${eff}</span>` : ''}</div>` +
      `<div class="bcost">${costLine(civ.banked, techCost(tech.id))}</div>` +
      (missing.length ? `<div class="bneed">Requires ${missing.join(', ')}</div>` : '');
    row.appendChild(label);
    if (done) {
      const tag = document.createElement('span');
      tag.textContent = '✓';
      row.appendChild(tag);
    } else {
      const btn = document.createElement('button');
      btn.textContent = 'Research';
      btn.disabled = !canResearch(civ, tech.id);
      btn.onclick = () => cb.onResearch(tech.id);
      row.appendChild(btn);
    }
    techPanel.appendChild(row);
  }
  cols.appendChild(techPanel);

  // Camp panel.
  const campPanel = document.createElement('div');
  campPanel.className = 'panel';
  campPanel.innerHTML = '<h2>Base Camp</h2>';
  const grid = document.createElement('div');
  grid.className = 'grid';
  const unlockedCount = unlockedTileCount(civ);
  for (let tile = 0; tile < GRID_SIZE; tile++) {
    const placed = civ.buildings.find((b) => b.tile === tile);
    const unlocked = tile < unlockedCount;
    const cell = document.createElement('div');
    cell.className = 'cell';
    // Locked tiles (not yet unlocked for this age) are inert placeholders that advertise future room.
    if (!unlocked && !placed) {
      cell.classList.add('locked-tile');
      cell.innerHTML = '<span class="lvl">🔒</span>';
      grid.appendChild(cell);
      continue;
    }
    cell.addEventListener('dragover', (e) => { e.preventDefault(); cell.classList.add('drop-hover'); });
    cell.addEventListener('dragleave', () => cell.classList.remove('drop-hover'));
    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      cell.classList.remove('drop-hover');
      const raw = e.dataTransfer?.getData('text/plain');
      if (!raw) return;
      let payload: { kind: string; id?: string; from?: number };
      try { payload = JSON.parse(raw); } catch { return; }
      if (payload.kind === 'new' && payload.id && !tileOccupied(civ, tile)) {
        cb.onBuild(payload.id, tile);
      }
      if (payload.kind === 'move' && payload.from !== undefined) {
        if (payload.from === tile) return;
        cb.onMoveBuilding(payload.from, tile);
      }
    });
    if (placed) {
      const def = BUILDINGS[placed.id];
      cell.innerHTML = '';
      cell.appendChild(spriteCanvas(placed.id, 40));
      const lvl = document.createElement('span');
      lvl.className = 'lvl';
      lvl.textContent = `${def.name} L${placed.level}`;
      cell.appendChild(lvl);
      cell.title =
        placed.level < def.maxLevel
          ? `Upgrade — ${costLine(civ.banked, upgradeCost(placed.id, placed.level))}`
          : 'Max level';
      cell.onclick = () => {
        if (didDrag) { didDrag = false; return; }
        if (placed.level < def.maxLevel && canAfford(civ.banked, upgradeCost(placed.id, placed.level))) {
          cb.onUpgrade(tile);
        }
      };
      cell.draggable = true;
      cell.addEventListener('dragstart', (e) => {
        didDrag = true;
        e.dataTransfer?.setData('text/plain', JSON.stringify({ kind: 'move', from: tile }));
      });
      cell.addEventListener('dragend', () => { didDrag = false; });
    } else {
      cell.innerHTML = '<span class="lvl">empty</span>';
    }
    grid.appendChild(cell);
  }
  campPanel.appendChild(grid);

  // Placed-buildings list: shows each built building's effect and its next-level upgrade cost
  // inline (the grid cell alone is too small), so "what does upgrading do / what does it cost" is
  // answerable without hovering. Upgrading multiplies the building's per-run yield and run bonus
  // by its new level.
  const placedList = document.createElement('div');
  placedList.className = 'palette placed';
  placedList.innerHTML = '<h3>Your Buildings — click to upgrade</h3>';
  const placedSorted = [...civ.buildings].sort((a, b) => a.tile - b.tile);
  if (placedSorted.length === 0) {
    const note = document.createElement('div');
    note.className = 'empty-note';
    note.textContent = 'No buildings yet — drag one from Available Buildings onto the grid.';
    placedList.appendChild(note);
  } else {
    const pgrid = document.createElement('div');
    pgrid.className = 'bgrid';
    for (const placed of placedSorted) {
      const def = BUILDINGS[placed.id];
      const maxed = placed.level >= def.maxLevel;
      const cost = maxed ? {} : upgradeCost(placed.id, placed.level);
      const affordable = !maxed && canAfford(civ.banked, cost);
      const card = document.createElement('div');
      card.className = 'bcard' + (maxed ? '' : affordable ? ' afford' : ' locked');
      card.appendChild(spriteCanvas(placed.id, 32));
      const text = document.createElement('div');
      const eff = buildingEffectText(def);
      text.innerHTML =
        `<div class="bnm">${def.name} <span class="lvltag">Lv ${placed.level}/${def.maxLevel}</span></div>` +
        (eff ? `<div class="beff">${eff} (×${placed.level})</div>` : '') +
        (maxed
          ? '<div class="bmax">Max level</div>'
          : `<div class="bcost">Upgrade → Lv ${placed.level + 1}: ${costLine(civ.banked, cost)}</div>`);
      card.appendChild(text);
      if (affordable) card.onclick = () => cb.onUpgrade(placed.tile);
      pgrid.appendChild(card);
    }
    placedList.appendChild(pgrid);
  }
  campPanel.appendChild(placedList);

  // Available-buildings palette: every unlocked, not-yet-built building, always visible.
  const palette = document.createElement('div');
  palette.className = 'palette';
  palette.innerHTML = '<h3>Available Buildings</h3>';
  const options = buildableBuildings(civ);
  if (options.length === 0) {
    const note = document.createElement('div');
    note.className = 'empty-note';
    // A fresh civ has nothing unlocked yet (no buildings placed) — distinguish that from the
    // genuinely-all-built case so the empty state isn't misleading on a new save.
    note.textContent = civ.buildings.length === 0
      ? 'Research tech to unlock buildings, then build them here.'
      : 'All available buildings constructed — research more tech.';
    palette.appendChild(note);
  } else {
    const bgrid = document.createElement('div');
    bgrid.className = 'bgrid';
    for (const def of options) {
      const affordable = canAfford(civ.banked, buildingCost(def.id, 1));
      const card = document.createElement('div');
      card.className = 'bcard' + (affordable ? ' afford' : ' locked');
      card.appendChild(spriteCanvas(def.id, 32));
      const text = document.createElement('div');
      const eff = buildingEffectText(def);
      text.innerHTML =
        `<div class="bnm">${def.name}</div>` +
        (eff ? `<div class="beff">${eff}</div>` : '') +
        `<div class="bcost">${costLine(civ.banked, buildingCost(def.id, 1))}</div>`;
      card.appendChild(text);
      if (affordable) {
        card.onclick = () => {
          const tile = firstEmptyTile(civ);
          if (tile !== null) cb.onBuild(def.id, tile);
        };
        card.draggable = true;
        card.addEventListener('dragstart', (e) => {
          e.dataTransfer?.setData('text/plain', JSON.stringify({ kind: 'new', id: def.id }));
        });
      }
      bgrid.appendChild(card);
    }
    palette.appendChild(bgrid);
  }
  campPanel.appendChild(palette);

  cols.appendChild(campPanel);

  wrap.appendChild(cols);

  root.appendChild(wrap);
}
