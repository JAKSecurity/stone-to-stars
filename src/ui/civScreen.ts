import { CivState, Resource, RESOURCES } from '../game/types';
import { TECHS } from '../tech/techData';
import { BUILDINGS } from '../camp/buildingData';
import { canResearch, isResearched, getAge } from '../tech/tech';
import { canBuild, isBuildingUnlocked, tileOccupied, upgradeCost } from '../camp/camp';
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
  ageSpan.innerHTML = `Age: <strong>${getAge(civ) === 'bronze' ? 'Bronze' : 'Stone'}</strong>`;
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
      cell.onclick = () => {
        const choice = Object.values(BUILDINGS).find(
          (def) =>
            isBuildingUnlocked(civ, def.id) &&
            !civ.buildings.some((b) => b.id === def.id) &&
            !tileOccupied(civ, tile) &&
            canBuild(civ, def.id, tile),
        );
        if (choice) cb.onBuild(choice.id, tile);
      };
    }
    grid.appendChild(cell);
  }
  campPanel.appendChild(grid);
  cols.appendChild(campPanel);

  wrap.appendChild(cols);

  const start = document.createElement('button');
  start.className = 'startrun';
  start.textContent = '⚔️  Start Expedition';
  start.onclick = () => cb.onStartRun();
  wrap.appendChild(start);

  root.appendChild(wrap);
}
