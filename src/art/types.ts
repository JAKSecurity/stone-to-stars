export type Vec = { x: number; y: number };

export type Prim =
  | { kind: 'circle'; cx: number; cy: number; r: number; color: string; role?: string }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx?: number; color: string; role?: string }
  | { kind: 'poly'; points: Array<[number, number]>; color: string; role?: string }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; width: number; color: string; role?: string };

export interface SpriteDef {
  id: string;
  w: number;
  h: number;
  prims: Prim[];
  shadow?: boolean; // contact-shadow ellipse at base; default true
}

export type RenderStyle = 'flat' | 'shaded';
