import { hexCorners, hexToPixel } from "@tipping-point/engine";
import { content } from "./content";

/** `tray` is the full-size slot the tile sits in (corner radius 1.0); the kraft board is the union of all trays. */
export interface TileGeom { id: number; cx: number; cy: number; points: string; ring: string; tray: string }
export interface BoardGeom { tiles: TileGeom[]; bounds: { minX: number; minY: number; width: number; height: number } }

/** Pure geometry for the 61 hexes in unit space (centre to corner = 1). Computed once. */
export function buildBoardGeom(pad = 0.6): BoardGeom {
  const tiles: TileGeom[] = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of content.board.tiles) {
    const { x, y } = hexToPixel(t.q, t.r, 1);
    const pts = hexCorners(x, y, 0.94);
    const ring = hexCorners(x, y, 0.82);
    const tray = hexCorners(x, y, 1);
    tiles.push({
      id: t.id, cx: x, cy: y,
      points: pts.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(" "),
      ring: ring.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(" "),
      tray: tray.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(" "),
    });
    minX = Math.min(minX, x - 1); maxX = Math.max(maxX, x + 1);
    minY = Math.min(minY, y - 1); maxY = Math.max(maxY, y + 1);
  }
  return { tiles, bounds: { minX: minX - pad, minY: minY - pad, width: maxX - minX + 2 * pad, height: maxY - minY + 2 * pad } };
}

export const BOARD = buildBoardGeom();
