import { SPRITES } from './registry';
import { STYLE } from './palette';
import { renderSpriteToCanvas } from './render';

/** A <canvas> rendering of a registered sprite, scaled to `px` wide (aspect kept), for the DOM. */
export function spriteCanvas(id: string, px: number): HTMLCanvasElement {
  const def = SPRITES[id];
  if (!def) {
    // Unknown id — return a blank px-sized canvas rather than crashing the DOM render.
    const blank = document.createElement('canvas');
    blank.width = px;
    blank.height = px;
    return blank;
  }
  const canvas = renderSpriteToCanvas(def, STYLE);
  canvas.style.width = px + 'px';
  canvas.style.height = Math.round(px * (def.h / def.w)) + 'px';
  canvas.style.imageRendering = 'auto';
  return canvas;
}
