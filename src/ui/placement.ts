import { CivState } from '../game/types';
import { tileUnlocked, tileOccupied } from '../camp/camp';
import { GRID_SIZE } from '../game/config';

export type Selection =
  | { kind: 'new'; id: string }
  | { kind: 'move'; from: number };

/** Tiles a currently-armed selection may legally target: unlocked, empty, and (for a
 *  move) not the source tile. Pure — drives the tap-to-place highlight + commit. */
export function validTargetTiles(civ: CivState, sel: Selection): Set<number> {
  const out = new Set<number>();
  for (let tile = 0; tile < GRID_SIZE; tile++) {
    if (!tileUnlocked(civ, tile)) continue;
    if (tileOccupied(civ, tile)) continue;
    if (sel.kind === 'move' && sel.from === tile) continue;
    out.add(tile);
  }
  return out;
}
