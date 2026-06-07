import { RenderStyle, Vec } from './types';

// Flip to 'shaded' later to re-skin everything globally.
export const STYLE: RenderStyle = 'flat';

// Light from the top-left (used by the shaded renderer).
export const LIGHT: Vec = { x: -0.5, y: -0.85 };

// Shared palette — keep all sprites pulling from here for cohesion.
export const PAL = {
  skin: '#e3b38a', hair: '#4a3526',
  tunic: '#8d6e4f', trim: '#cbb994', leather: '#6d4c33',
  wood: '#7a5230', metal: '#cfd8dc',
  shieldRed: '#a1542f',
  // enemies
  beast: '#d9534f', beastDark: '#7a2320', scholar: '#58a6ff', scholarDark: '#1f6feb',
  // resources (gem sprite + resource-icon colors, one per resource)
  exploration: '#e3b341', science: '#58a6ff', industry: '#d9534f', culture: '#3fb950',
  // buildings
  roof: '#8a3b2b', wall: '#b08454', door: '#5d4632',
  grain: '#e3b341', rock: '#6e6a66', fire: '#ff8c42',
  // iron age — cold metal, cavern stone, automaton brass, molten fire
  iron: '#9aa3ab', ironDark: '#5a636b', steel: '#c0c8cf',
  caveStone: '#6b6560', caveStoneDark: '#3f3a36',
  brass: '#b9933f', brassDark: '#6f5520', rune: '#5ad1c7',
  molten: '#ff6a2b', ember: '#ffd152',
  // classical age — marble, bronze-gold, laurel, toga
  marble: '#e8e2d0', marbleDark: '#b8b09a',
  gold: '#d9b44a', goldDark: '#9c7a25',
  laurel: '#6f8f4e', toga: '#dcd2bd', oxblood: '#7a2e2e',
  // medieval age — cold steel, castle stone, royal blue, crimson heraldry, bone
  steelBlue: '#5b6b7a', castleStone: '#8a8073', castleStoneDark: '#5c554b',
  royal: '#3b53a8', crimson: '#a32735', bone: '#d8cdb0',
  shadow: 'rgba(0,0,0,0.28)',
} as const;
