import Phaser from 'phaser';
import { SPRITES } from './registry';
import { STYLE } from './palette';
import { renderSpriteToCanvas } from './render';

/** Render every registered sprite to a canvas and add it as a Phaser texture (id = sprite id). */
export function registerTextures(game: Phaser.Game): void {
  for (const def of Object.values(SPRITES)) {
    if (game.textures.exists(def.id)) continue;
    game.textures.addCanvas(def.id, renderSpriteToCanvas(def, STYLE));
  }
}
