import { Prim, SpriteDef, RenderStyle } from './types';
import { LIGHT, PAL } from './palette';
import { gradientStops, shade } from './color';

type Ctx = CanvasRenderingContext2D;

function yExtent(p: Prim): [number, number] {
  switch (p.kind) {
    case 'circle': return [p.cy - p.r, p.cy + p.r];
    case 'rect': return [p.y, p.y + p.h];
    case 'poly': { const ys = p.points.map((pt) => pt[1]); return [Math.min(...ys), Math.max(...ys)]; }
    case 'line': return [Math.min(p.y1, p.y2), Math.max(p.y1, p.y2)];
  }
}

function fillFor(ctx: Ctx, p: Prim, style: RenderStyle): string | CanvasGradient {
  if (style === 'flat') return p.color;
  const { light, dark } = gradientStops(p.color);
  const [y0, y1] = yExtent(p);
  const g = ctx.createLinearGradient(0, y0, 0, y1 || y0 + 1);
  // LIGHT.y < 0 => light comes from the top
  g.addColorStop(0, LIGHT.y < 0 ? light : dark);
  g.addColorStop(1, LIGHT.y < 0 ? dark : light);
  return g;
}

function tracePath(ctx: Ctx, p: Prim): void {
  ctx.beginPath();
  switch (p.kind) {
    case 'circle': ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2); break;
    case 'rect':
      if (p.rx && ctx.roundRect) ctx.roundRect(p.x, p.y, p.w, p.h, p.rx);
      else ctx.rect(p.x, p.y, p.w, p.h);
      break;
    case 'poly':
      p.points.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt[0], pt[1]) : ctx.lineTo(pt[0], pt[1])));
      ctx.closePath();
      break;
    case 'line': ctx.moveTo(p.x1, p.y1); ctx.lineTo(p.x2, p.y2); break;
  }
}

function paintPrim(ctx: Ctx, p: Prim, style: RenderStyle): void {
  if (p.kind === 'line') {
    ctx.strokeStyle = style === 'flat' ? p.color : shade(p.color, -0.15);
    ctx.lineWidth = p.width; ctx.lineCap = 'round';
    tracePath(ctx, p); ctx.stroke();
    return;
  }
  ctx.fillStyle = fillFor(ctx, p, style) as string;
  tracePath(ctx, p); ctx.fill();
  if (style === 'shaded') {
    ctx.strokeStyle = shade(p.color, -0.5); ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    tracePath(ctx, p); ctx.stroke();
  }
}

export function renderSprite(ctx: Ctx, def: SpriteDef, style: RenderStyle): void {
  if (def.shadow !== false) {
    ctx.save();
    ctx.fillStyle = PAL.shadow;
    ctx.beginPath();
    ctx.ellipse(def.w / 2, def.h - 2, def.w * 0.32, Math.max(2, def.h * 0.04), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const p of def.prims) paintPrim(ctx, p, style);
}

/** Render a sprite to a fresh canvas (browser only — uses document). */
export function renderSpriteToCanvas(def: SpriteDef, style: RenderStyle): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = def.w; canvas.height = def.h;
  const ctx = canvas.getContext('2d')!;
  renderSprite(ctx, def, style);
  return canvas;
}
