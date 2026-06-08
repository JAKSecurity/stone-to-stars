import { CivState, Resource, RESOURCES } from '../game/types';
import { TECHS } from '../tech/techData';
import { BUILDINGS } from '../camp/buildingData';
import { canResearch, isResearched, getAge } from '../tech/tech';
import { buildableBuildings, buildingEffectText, upgradeCost } from '../camp/camp';
import { canAfford } from '../economy/resources';
import { GRID_SIZE } from '../game/config';
import { spriteCanvas } from '../art/domSprite';

const ICON: Record<Resource, string> = {
  exploration: '🧭', science: '🔬', industry: '🏭', culture: '🎭',
};

export interface CivCallbacks {
  onResearch: (techId: string) => void;
  onBuild: (buildingId: string, tile: number) => void;
  onUpgrade: (tile: number) => void;
  onStartRun: () => void;
}

function costText(cost: Partial<Record<Resource, number>>): string {
  return RESOURCES.filter((r) => cost[r]).map((r) => `${ICON[r]}${cost[r]}`).join(' ') || 'free';
}

function shortfallText(banked: Record<Resource, number>, cost: Partial<Record<Resource, number>>): string {
  return RESOURCES.filter((r) => (cost[r] ?? 0) > banked[r]).map((r) => `${ICON[r]}${cost[r]}`).join(' ');
}

export function renderCivScreen(root: HTMLElement, civ: CivState, cb: CivCallbacks): void {
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'civ-wrap';

  // Resource bar + age.
  const bar = document.createElement('div');
  bar.className = 'resbar';
  for (const r of RESOURCES) {
    const span = document.createElement('span');
    span.appendChild(spriteCanvas('gem_' + r, 18));
    span.appendChild(document.createTextNode(' ' + civ.banked[r]));
    bar.appendChild(span);
  }
  const ageSpan = document.createElement('span');
  ageSpan.className = 'age';
  const age = getAge(civ);
  ageSpan.innerHTML = `Age: <strong>${age.charAt(0).toUpperCase()}${age.slice(1)}</strong>`;
  bar.appendChild(ageSpan);
  wrap.appendChild(bar);

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
    label.innerHTML = `<div>${tech.name}</div><div class="cost">${costText(tech.cost)}</div>`;
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
  for (let tile = 0; tile < GRID_SIZE; tile++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const placed = civ.buildings.find((b) => b.tile === tile);
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
          ? `Upgrade — ${costText(upgradeCost(placed.id, placed.level))}`
          : 'Max level';
      cell.onclick = () => {
        if (placed.level < def.maxLevel && canAfford(civ.banked, upgradeCost(placed.id, placed.level))) {
          cb.onUpgrade(tile);
        }
      };
    } else {
      cell.innerHTML = '<span class="lvl">empty</span>';
    }
    grid.appendChild(cell);
  }
  campPanel.appendChild(grid);

  // Available-buildings palette: every unlocked, not-yet-built building, always visible.
  const palette = document.createElement('div');
  palette.className = 'palette';
  palette.innerHTML = '<h3>Available Buildings</h3>';
  const options = buildableBuildings(civ);
  if (options.length === 0) {
    const note = document.createElement('div');
    note.className = 'empty-note';
    note.textContent = 'All available buildings constructed — research more tech.';
    palette.appendChild(note);
  } else {
    const bgrid = document.createElement('div');
    bgrid.className = 'bgrid';
    for (const def of options) {
      const affordable = canAfford(civ.banked, def.baseCost);
      const card = document.createElement('div');
      card.className = 'bcard' + (affordable ? ' afford' : ' locked');
      card.appendChild(spriteCanvas(def.id, 32));
      const text = document.createElement('div');
      const eff = buildingEffectText(def);
      text.innerHTML =
        `<div class="bnm">${def.name}</div>` +
        `<div class="bcost">${costText(def.baseCost)}</div>` +
        (eff ? `<div class="beff">${eff}</div>` : '') +
        (affordable ? '' : `<div class="bneed">need ${shortfallText(civ.banked, def.baseCost)}</div>`);
      card.appendChild(text);
      bgrid.appendChild(card);
    }
    palette.appendChild(bgrid);
  }
  campPanel.appendChild(palette);

  cols.appendChild(campPanel);

  wrap.appendChild(cols);

  const start = document.createElement('button');
  start.className = 'startrun';
  start.textContent = '⚔️  Start Expedition';
  start.onclick = () => cb.onStartRun();
  wrap.appendChild(start);

  root.appendChild(wrap);
}
