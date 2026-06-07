import { describe, it, expect } from 'vitest';
import { renderSprite } from '../src/art/render';
import { SpriteDef } from '../src/art/types';

// Minimal fake CanvasRenderingContext2D that records fills with the active fillStyle.
function fakeCtx() {
  const fills: string[] = [];
  const ctx: any = {
    fillStyle: '', strokeStyle: '', lineWidth: 0, lineCap: '', lineJoin: '',
    save() {}, restore() {}, beginPath() {}, closePath() {},
    moveTo() {}, lineTo() {}, arc() {}, ellipse() {}, rect() {}, roundRect() {},
    fill() { fills.push(String(ctx.fillStyle)); },
    stroke() {},
    createLinearGradient() { return { addColorStop() {} }; },
  };
  return { ctx, fills };
}

const DEF: SpriteDef = {
  id: 'test', w: 20, h: 20, shadow: false,
  prims: [
    { kind: 'rect', x: 2, y: 2, w: 16, h: 16, color: '#112233' },
    { kind: 'circle', cx: 10, cy: 10, r: 5, color: '#445566' },
  ],
};

describe('renderSprite (flat)', () => {
  it('fills each primitive with its base color, in order', () => {
    const { ctx, fills } = fakeCtx();
    renderSprite(ctx, DEF, 'flat');
    expect(fills).toEqual(['#112233', '#445566']);
  });

  it('draws a contact shadow when shadow !== false', () => {
    const { ctx, fills } = fakeCtx();
    renderSprite(ctx, { ...DEF, shadow: true }, 'flat');
    // shadow fill happens first, before the two prim fills
    expect(fills.length).toBe(3);
    expect(fills.slice(1)).toEqual(['#112233', '#445566']);
  });
});
