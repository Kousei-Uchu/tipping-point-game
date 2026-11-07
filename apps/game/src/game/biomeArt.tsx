// Placeholder vector art (UI_Spec section 10 accepts this for M1 to M3).
// Every biome gets three cues at once: colour, an icon and an edge pattern, so no one cue is needed alone.
import React from "react";
import { Circle, Defs, G, Path, Pattern, Polygon, Rect } from "react-native-svg";
import type { BiomeId } from "@tipping-point/content";
import { BIOME_IDS } from "@tipping-point/content";
import { colors } from "../theme/tokens";

interface Prim { d: string; kind: "fill" | "stroke"; w?: number }

/** Drawn in a -10..10 box. */
export const BIOME_ICONS: Record<BiomeId | "hub", Prim[]> = {
  forest: [{ kind: "fill", d: "M0,-10 L6,-2 L3,-2 L8,5 L1.6,5 L1.6,10 L-1.6,10 L-1.6,5 L-8,5 L-3,-2 L-6,-2 Z" }],
  coral: [{ kind: "stroke", w: 2.2, d: "M0,10 L0,1 M0,5 L-6,-3 M0,5 L6,-3 M0,1 L-3,-9 M0,1 L3,-9 M-6,-3 L-8,-7 M6,-3 L8,-7" }],
  wetland: [
    { kind: "stroke", w: 1.8, d: "M-4,10 L-4,-3 M4,10 L4,-7" },
    { kind: "fill", d: "M4,-10 C6.2,-9 6.2,-4 4,-3.6 C1.8,-4 1.8,-9 4,-10 Z" },
  ],
  glacier: [
    { kind: "fill", d: "M-10,9 L-2,-10 L2,-2 L5,-6 L10,9 Z" },
    { kind: "stroke", w: 1.2, d: "M-2,-10 L-4,2 L1,9" },
  ],
  grassland: [{ kind: "stroke", w: 2, d: "M-6,10 Q-6,2 -8,-3 M0,10 Q0,0 1,-9 M6,10 Q6,3 8,-2" }],
  river: [{ kind: "stroke", w: 2.6, d: "M-7,-8 C7,-8 7,0 0,0 C-7,0 -7,8 7,8" }],
  hub: [
    { kind: "fill", d: "M-9,0 L0,-9 L9,0 L7,0 L7,9 L-7,9 L-7,0 Z" },
  ],
};

export function Glyph({ id, x, y, size, color }: { id: BiomeId | "hub"; x: number; y: number; size: number; color: string }) {
  const s = size / 20;
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      {BIOME_ICONS[id].map((p, i) =>
        p.kind === "fill"
          ? <Path key={i} d={p.d} fill={color} />
          : <Path key={i} d={p.d} fill="none" stroke={color} strokeWidth={p.w ?? 2} strokeLinecap="round" strokeLinejoin="round" />,
      )}
    </G>
  );
}

export const patternId = (b: BiomeId) => `tp-pat-${b}`;

/** Edge patterns, one per biome (biomes.json names them). Drawn as a faint overlay in ink. */
export function PatternDefs() {
  const c = colors.ink;
  const o = 0.28;
  return (
    <Defs>
      <Pattern id={patternId("forest")} width={0.32} height={0.32} patternUnits="userSpaceOnUse">
        <Path d="M0,0.24 L0.08,0.06 L0.16,0.24 L0.24,0.06 L0.32,0.24" stroke={c} strokeWidth={0.035} fill="none" opacity={o} />
      </Pattern>
      <Pattern id={patternId("coral")} width={0.24} height={0.24} patternUnits="userSpaceOnUse">
        <Circle cx={0.06} cy={0.06} r={0.035} fill={c} opacity={o} />
        <Circle cx={0.18} cy={0.18} r={0.035} fill={c} opacity={o} />
      </Pattern>
      <Pattern id={patternId("wetland")} width={0.36} height={0.2} patternUnits="userSpaceOnUse">
        <Path d="M0,0.1 Q0.09,0 0.18,0.1 T0.36,0.1" stroke={c} strokeWidth={0.035} fill="none" opacity={o} />
      </Pattern>
      <Pattern id={patternId("glacier")} width={0.28} height={0.28} patternUnits="userSpaceOnUse">
        <Polygon points="0.14,0.02 0.26,0.14 0.14,0.26 0.02,0.14" stroke={c} strokeWidth={0.03} fill="none" opacity={o} />
      </Pattern>
      <Pattern id={patternId("grassland")} width={0.2} height={0.3} patternUnits="userSpaceOnUse">
        <Rect x={0.08} y={0.06} width={0.035} height={0.18} fill={c} opacity={o} />
      </Pattern>
      <Pattern id={patternId("river")} width={0.4} height={0.2} patternUnits="userSpaceOnUse">
        <Path d="M0,0.1 L0.4,0.1" stroke={c} strokeWidth={0.04} fill="none" opacity={o} />
      </Pattern>
    </Defs>
  );
}
export const ALL_BIOMES = BIOME_IDS;

/** Seat identity is colour plus a shape plus an initial, so colour alone never carries it. */
export function seatShapePath(seat: number, r: number): string {
  switch (seat % 5) {
    case 0: return `M${-r},0 a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0 Z`;                       // circle
    case 1: return `M${-r},${-r} H${r} V${r} H${-r} Z`;                                                         // square
    case 2: return `M0,${-r * 1.15} L${r * 1.1},${r * 0.9} L${-r * 1.1},${r * 0.9} Z`;                          // triangle
    case 3: return `M0,${-r * 1.2} L${r * 1.2},0 L0,${r * 1.2} L${-r * 1.2},0 Z`;                               // diamond
    default: return `M${-r * 0.6},${-r} H${r * 0.6} L${r},${-r * 0.6} V${r * 0.6} L${r * 0.6},${r} H${-r * 0.6} L${-r},${r * 0.6} V${-r * 0.6} Z`; // octagon
  }
}
