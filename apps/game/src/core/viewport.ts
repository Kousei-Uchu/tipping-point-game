// Pure zoom and pan maths for the board. No React, no platform code.
export interface Bounds { minX: number; minY: number; width: number; height: number }
export interface View { cx: number; cy: number; zoom: number }

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export function initialView(b: Bounds): View {
  return { cx: b.minX + b.width / 2, cy: b.minY + b.height / 2, zoom: 1 };
}

/** Pixels per board unit when the whole board fits the container at zoom 1. */
export function fitScale(b: Bounds, w: number, h: number): number {
  if (w <= 0 || h <= 0) return 1;
  return Math.min(w / b.width, h / b.height);
}

export function viewBoxFor(b: Bounds, v: View, w: number, h: number): { x: number; y: number; w: number; h: number } {
  const ppu = fitScale(b, w, h) * v.zoom;
  const vw = w / ppu, vh = h / ppu;
  return { x: v.cx - vw / 2, y: v.cy - vh / 2, w: vw, h: vh };
}

/** Keeps the view centre inside the board so the player cannot lose it off screen. */
export function clampView(b: Bounds, v: View): View {
  const zoom = clampZoom(v.zoom);
  return {
    zoom,
    cx: Math.min(b.minX + b.width, Math.max(b.minX, v.cx)),
    cy: Math.min(b.minY + b.height, Math.max(b.minY, v.cy)),
  };
}

export function panBy(b: Bounds, v: View, dxPx: number, dyPx: number, w: number, h: number): View {
  const ppu = fitScale(b, w, h) * v.zoom;
  return clampView(b, { ...v, cx: v.cx - dxPx / ppu, cy: v.cy - dyPx / ppu });
}

export function zoomTo(b: Bounds, v: View, zoom: number): View { return clampView(b, { ...v, zoom }); }

/** Width in px of one tile face (flat side to flat side) when the whole board fits at zoom 1. A hex has width sqrt(3) x its corner radius, and faces are drawn at 0.94. */
export function tilePxAtFit(b: Bounds, w: number, h: number): number { return fitScale(b, w, h) * Math.sqrt(3) * 0.94; }

/** The zoom at which a tile is at least `minPx` wide, never below 1 (whole board) and never above the maximum. Desktop screens are already big enough, so they stay at 1. */
export function comfortZoom(b: Bounds, w: number, h: number, minPx: number): number {
  const t = tilePxAtFit(b, w, h);
  if (t <= 0) return 1;
  return clampZoom(minPx / t);
}
