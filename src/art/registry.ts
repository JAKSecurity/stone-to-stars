import { Prim, SpriteDef } from './types';

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function colorOk(c: string): boolean {
  return HEX.test(c) || c.startsWith('rgb');
}

function primErrors(p: Prim, w: number, h: number): string[] {
  const e: string[] = [];
  if (!colorOk(p.color)) e.push(`bad color ${p.color}`);
  const inX = (x: number) => x >= -1 && x <= w + 1;
  const inY = (y: number) => y >= -1 && y <= h + 1;
  switch (p.kind) {
    case 'circle':
      if (p.r <= 0) e.push('circle r<=0');
      if (!inX(p.cx) || !inY(p.cy)) e.push('circle center out of bounds');
      break;
    case 'rect':
      if (p.w <= 0 || p.h <= 0) e.push('rect non-positive size');
      if (!inX(p.x) || !inY(p.y)) e.push('rect origin out of bounds');
      break;
    case 'poly':
      if (p.points.length < 3) e.push('poly needs >=3 points');
      break;
    case 'line':
      if (p.width <= 0) e.push('line width<=0');
      break;
  }
  return e;
}

export function validateSpriteDef(def: SpriteDef): string[] {
  const e: string[] = [];
  if (!def.id) e.push('empty id');
  if (def.w <= 0 || def.h <= 0) e.push('non-positive canvas size');
  if (!def.prims || def.prims.length === 0) e.push('no prims');
  (def.prims || []).forEach((p, i) => primErrors(p, def.w, def.h).forEach((m) => e.push(`prim[${i}] ${m}`)));
  return e;
}

// Sprites are added here as Tasks 5, 7, 8, 9 land them.
export const SPRITES: Record<string, SpriteDef> = {};
