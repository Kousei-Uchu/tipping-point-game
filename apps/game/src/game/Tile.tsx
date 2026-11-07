import React, { memo } from "react";
import { Circle, Ellipse, G, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";
import type { BiomeId } from "@tipping-point/content";
import type { TileStatus } from "@tipping-point/engine";
import { content } from "../core/content";
import { BOARD } from "../core/boardGeometry";
import { handledOffset, litEdgesPath, offsetPoints, scalePoints, scuffMarks, shadedEdgesPath, SHADOW_DROP, THICK, THICK_HUB } from "../core/boardArt";
import { darken, lighten } from "../theme/colour";
import { materials } from "../theme/materials";
import { colors } from "../theme/tokens";
import { useLanding, useTween } from "../ui/useTween";
import { Glyph, patternId, seatShapePath } from "./biomeArt";

/** "pulse" is the Ravage reveal calling out every tile of the named biome, once, before the numbers are stamped. */
export type Highlight = "reach" | "selected" | "target" | "pulse" | null;

export interface TileProps {
  id: number;
  biome: BiomeId | "hub";
  status: TileStatus;
  shield: boolean;
  stabilised: boolean;
  ownerSeat: number;          // -1 for none
  ownerColour: string;
  /** Pawns on this tile as "seat:colour:initial" entries, joined by "|". Kept as a string so memo works. */
  pawns: string;
  highlight: Highlight;
  badge: number;              // call order shown during a Ravage, 0 for none
  label: string;
  onPress: (id: number) => void;
}

const geomById = new Map(BOARD.tiles.map((t) => [t.id, t]));

/** The outline-derived shapes never change for a tile, so they are built once. */
interface Art { side: string; shadow: string; litFace: string; shadeFace: string; litHole: string; shadeLip: string; ringLit: string; ringShadow: string }
const artCache = new Map<number, Art>();
function artFor(id: number, hub: boolean): Art {
  const hit = artCache.get(id);
  if (hit) return hit;
  const g = geomById.get(id)!;
  const t = hub ? THICK_HUB : THICK;
  const inner = scalePoints(g.points, g.cx, g.cy, 0.955);
  const art: Art = {
    side: offsetPoints(g.points, 0, t),
    shadow: offsetPoints(g.points, 0.03, t + SHADOW_DROP),
    litFace: litEdgesPath(inner, g.cx, g.cy),
    shadeFace: shadedEdgesPath(inner, g.cx, g.cy),
    litHole: litEdgesPath(scalePoints(g.points, g.cx, g.cy, 0.93), g.cx, g.cy),
    shadeLip: shadedEdgesPath(g.points, g.cx, g.cy),
    ringLit: litEdgesPath(g.ring, g.cx, g.cy),
    ringShadow: offsetPoints(g.ring, 0, 0.05),
  };
  artCache.set(id, art);
  return art;
}

/** The worn rim on a tile in danger: how far in from the edge (a fraction of the tile) and how thick (board units). */
const WORN_RIM_SCALE = 0.84;
const WORN_RIM_WIDTH = 0.1;
const LIFT = 0.06; // a selected tile rises this far (board units)
const DROP = 0.3;  // a piece lands from this far above (board units, about 6 px at phone size)

function TileView(p: TileProps) {
  const g = geomById.get(p.id)!;
  const { cx, cy } = g;
  const removed = p.status === "removed";
  const vuln = p.status === "vulnerable";
  const hub = p.biome === "hub";
  const def = hub ? null : content.biomes[p.biome as BiomeId];
  const fill = hub ? colors.hub : def!.healthy_hex;          // the face, always; the worn face fades in over it
  const worn = hub ? fill : def!.vulnerable_hex;
  // Status changes glide: the worn face fades in or out (scuff), a lost tile sinks and the hole appears (drop),
  // a selected tile rises (lift). Pieces on the tile land when they first appear (see useLanding).
  const wear = useTween(vuln ? 1 : 0, "scuff");
  const gone = useTween(removed ? 1 : 0, "drop");
  const lift = useTween(p.highlight === "selected" ? 1 : 0, "lift");
  const pulse = useTween(p.highlight === "pulse" ? 1 : 0, "lift"); // rises and falls once, because the highlight lasts one beat
  const pawns = p.pawns ? p.pawns.split("|").map((s) => s.split(":")) : [];
  const art = artFor(p.id, hub);
  const rise = -LIFT * lift - LIFT * 0.8 * pulse + 0.3 * gone;

  return (
    <G>
      {gone > 0 ? (
        <G opacity={gone}>
          {/* A hole in the board: the felt shows through, dark along the edges facing the light. */}
          <Polygon points={g.points} fill={materials.feltDeep} stroke={materials.kraftDeep} strokeWidth={0.03} />
          <Path d={art.litHole} stroke="#000000" strokeOpacity={0.6} strokeWidth={0.12} strokeLinecap="round" fill="none" />
          <Path d={art.shadeLip} stroke={lighten(materials.kraft, 0.25)} strokeOpacity={0.9} strokeWidth={0.04} strokeLinecap="round" fill="none" />
          <Polygon points={g.ring} fill="none" stroke={lighten(materials.felt, 0.25)} strokeOpacity={0.45} strokeWidth={0.035} strokeDasharray="0.12 0.1" />
        </G>
      ) : null}
      {gone < 1 ? (
        <G opacity={1 - gone}>
          <Polygon points={art.shadow} fill="#000000" fillOpacity={0.26 + 0.08 * lift} transform={`translate(0 ${-LIFT * lift / 2})`} />
          <G transform={`translate(0 ${rise})`}>
            <Polygon points={art.side} fill={darken(fill, 0.18)} stroke={darken(fill, 0.4)} strokeWidth={0.03} strokeLinejoin="round" />
            <Polygon points={g.points} fill={fill} stroke={darken(fill, 0.4)} strokeWidth={0.03} strokeLinejoin="round" />
            {wear > 0 && !hub ? <Polygon points={g.points} fill={worn} fillOpacity={wear} /> : null}
            {!hub ? <Polygon points={g.points} fill={`url(#${patternId(p.biome as BiomeId)})`} /> : null}
            <Path d={art.litFace} stroke={lighten(fill, 0.55)} strokeOpacity={0.85} strokeWidth={0.04} strokeLinecap="round" fill="none" />
            <Path d={art.shadeFace} stroke={darken(fill, 0.25)} strokeOpacity={0.6} strokeWidth={0.035} strokeLinecap="round" fill="none" />
            {wear > 0 && !hub ? <G opacity={wear}><Scuffs id={p.id} cx={cx} cy={cy} fill={worn} points={g.points} /></G> : null}
            {hub ? <Station cx={cx} cy={cy} /> : <Glyph id={p.biome} x={cx} y={cy - 0.12} size={0.8} color={colors.ink} />}
            {wear > 0 && !hub ? <G opacity={wear}><WornRim points={g.points} cx={cx} cy={cy} /><FoldedTab cx={cx} cy={cy} /></G> : null}
            {p.shield ? <Dome ring={g.ring} lit={art.ringLit} shadow={art.ringShadow} /> : null}
            {p.stabilised ? <Cube x={cx + 0.5} y={cy + 0.42} /> : null}
            {p.ownerSeat >= 0 ? <Disc id={p.id} seat={p.ownerSeat} colour={p.ownerColour} x={cx + 0.52} y={cy - 0.4} /> : null}
            {pawns.map(([seat, colour, initial], i) => (
              <Pawn key={seat} seat={Number(seat)} colour={colour!} initial={initial!} x={cx + (i - (pawns.length - 1) / 2) * 0.46} y={cy + 0.4} />
            ))}
            {lift > 0 ? <Polygon points={g.points} fill="none" stroke={colors.ink} strokeOpacity={lift} strokeWidth={0.16} strokeLinejoin="round" /> : null}
          </G>
        </G>
      ) : null}
      {pulse > 0.001 && !removed ? <Polygon points={g.ring} fill={colors.danger} fillOpacity={0.3 * pulse} stroke={colors.danger} strokeOpacity={pulse} strokeWidth={0.1} strokeLinejoin="round" /> : null}
      {p.highlight === "reach" ? <Polygon points={g.ring} fill={colors.accent} fillOpacity={0.2} stroke={colors.accent} strokeWidth={0.09} /> : null}
      {p.highlight === "target" ? <Polygon points={g.ring} fill={colors.trophy} fillOpacity={0.25} stroke={colors.trophy} strokeWidth={0.12} /> : null}
      {p.badge > 0 ? (
        <G>
          <Polygon points={g.ring} fill={colors.danger} fillOpacity={0.35} stroke={colors.danger} strokeWidth={0.12} />
          <G transform={`translate(${cx} ${cy})`}>
            <Path d={seatShapePath(0, 0.36)} fill={colors.danger} stroke={materials.stock} strokeWidth={0.06} />
            <SvgText x={0} y={0.14} fontSize={0.42} fontWeight="800" fill="#FFFFFF" textAnchor="middle">{String(p.badge)}</SvgText>
          </G>
        </G>
      ) : null}
      {/* Transparent hit area on top so one press target covers the whole hex. */}
      <Polygon points={g.points} fill="#000000" fillOpacity={0.01} onPress={() => p.onPress(p.id)} accessible accessibilityLabel={p.label} />
    </G>
  );
}

/** A worn face: a faded wash and short scrapes. Shape, not only colour, says this tile is in danger. */
function Scuffs({ id, cx, cy, fill, points }: { id: number; cx: number; cy: number; fill: string; points: string }) {
  const marks = scuffMarks(id, cx, cy);
  return (
    <G>
      <Polygon points={points} fill={materials.stock} fillOpacity={0.16} />
      {marks.map((m, i) => (
        <G key={i}>
          <Path d={`M${m.x1.toFixed(3)},${(m.y1 + 0.025).toFixed(3)} L${m.x2.toFixed(3)},${(m.y2 + 0.025).toFixed(3)}`} stroke={darken(fill, 0.35)} strokeOpacity={0.5} strokeWidth={0.03} strokeLinecap="round" />
          <Path d={`M${m.x1.toFixed(3)},${m.y1.toFixed(3)} L${m.x2.toFixed(3)},${m.y2.toFixed(3)}`} stroke={lighten(fill, 0.7)} strokeOpacity={0.85} strokeWidth={0.04} strokeLinecap="round" />
        </G>
      ))}
    </G>
  );
}

/**
 * A solid dark red rim just inside the edge. The scrapes and the tab are fine detail that a squint or a small screen
 * loses; a heavy rim stays a visible darker ring, so a tile in danger still reads at a glance.
 */
function WornRim({ points, cx, cy }: { points: string; cx: number; cy: number }) {
  return <Polygon points={scalePoints(points, cx, cy, WORN_RIM_SCALE)} fill="none" stroke={colors.dangerText} strokeWidth={WORN_RIM_WIDTH} strokeLinejoin="round" strokeOpacity={0.9} />;
}

/** The red flag, kept as a folded tab. Large enough to see on a phone-size tile. */
function FoldedTab({ cx, cy }: { cx: number; cy: number }) {
  return (
    <G>
      <Path d={`M${cx - 0.78},${cy - 0.42} L${cx - 0.1},${cy - 0.86} L${cx - 0.1},${cy - 0.12} Z`} fill={colors.danger} stroke={colors.ink} strokeWidth={0.03} strokeLinejoin="round" />
      <Path d={`M${cx - 0.1},${cy - 0.86} L${cx - 0.1},${cy - 0.12} L${cx - 0.32},${cy - 0.48} Z`} fill={darken(colors.danger, 0.32)} />
    </G>
  );
}

/** A raised translucent blue collar sitting on the tile. */
function Dome({ ring, lit, shadow }: { ring: string; lit: string; shadow: string }) {
  const drop = useLanding();
  return (
    <G transform={`translate(0 ${-drop * DROP})`}>
      <Polygon points={shadow} fill="none" stroke="#000000" strokeOpacity={0.25} strokeWidth={0.1} strokeLinejoin="round" />
      <Polygon points={ring} fill={colors.shield} fillOpacity={0.2} stroke={darken(colors.shield, 0.35)} strokeWidth={0.13} strokeLinejoin="round" />
      <Polygon points={ring} fill="none" stroke={colors.shield} strokeWidth={0.085} strokeLinejoin="round" />
      <Path d={lit} stroke={lighten(colors.shield, 0.65)} strokeOpacity={0.95} strokeWidth={0.035} strokeLinecap="round" fill="none" />
    </G>
  );
}

/** A small cube with a plus stamped on its top. */
function Cube({ x, y }: { x: number; y: number }) {
  const drop = useLanding();
  return (
    <G transform={`translate(${x} ${y - drop * DROP})`}>
      <Ellipse cx={0.03} cy={0.2} rx={0.23} ry={0.07} fill="#000000" fillOpacity={0.28} />
      <Path d="M-0.17,0 H0.17 V0.17 H-0.17 Z" fill={darken(materials.stock, 0.22)} stroke={colors.ink} strokeWidth={0.03} strokeLinejoin="round" />
      <Path d="M-0.17,0 L-0.11,-0.14 H0.23 L0.17,0 Z" fill={materials.stock} stroke={colors.ink} strokeWidth={0.03} strokeLinejoin="round" />
      <Path d="M-0.01,-0.07 H0.13 M0.06,-0.12 V-0.02" stroke={colors.ink} strokeWidth={0.04} strokeLinecap="round" />
    </G>
  );
}

/** A disc in the Steward's colour with their shape stamped on it, placed with a slight offset. */
function Disc({ id, seat, colour, x, y }: { id: number; seat: number; colour: string; x: number; y: number }) {
  const o = handledOffset(id, seat);
  const drop = useLanding();
  return (
    <G transform={`translate(${x + o.dx} ${y + o.dy})`}>
      <Ellipse cx={0.03} cy={0.1} rx={0.2 * (1 + 0.4 * drop)} ry={0.1} fill="#000000" fillOpacity={0.3 * (1 - 0.4 * drop)} />
      <G transform={`translate(0 ${-drop * DROP})`}>
      <Circle cx={0} cy={0.045} r={0.17} fill={darken(colour, 0.38)} stroke={colors.ink} strokeWidth={0.03} />
      <Circle cx={0} cy={0} r={0.17} fill={colour} stroke={colors.ink} strokeWidth={0.035} />
      <Path d={seatShapePath(seat, 0.085)} fill={materials.stock} stroke={colors.ink} strokeWidth={0.02} strokeLinejoin="round" />
      </G>
    </G>
  );
}

/** A painted wooden pawn on a wood peg. The shape and initial stay, so identity never depends on colour. */
function Pawn({ seat, colour, initial, x, y }: { seat: number; colour: string; initial: string; x: number; y: number }) {
  const drop = useLanding();
  return (
    <G transform={`translate(${x} ${y})`}>
      <Ellipse cx={0.03} cy={0.2} rx={0.3 * (1 + 0.5 * drop)} ry={0.1} fill="#000000" fillOpacity={0.32 * (1 - 0.4 * drop)} />
      <G transform={`translate(0 ${-drop * DROP})`}>
      <Ellipse cx={0} cy={0.17} rx={0.27} ry={0.09} fill={materials.woodDeep} />
      <Ellipse cx={0} cy={0.14} rx={0.27} ry={0.09} fill={materials.wood} stroke={materials.woodDeep} strokeWidth={0.02} />
      <G transform="translate(0 0.07)"><Path d={seatShapePath(seat, 0.24)} fill={darken(colour, 0.4)} stroke={colors.ink} strokeWidth={0.04} strokeLinejoin="round" /></G>
      <Path d={seatShapePath(seat, 0.24)} fill={colour} stroke={materials.stock} strokeWidth={0.06} strokeLinejoin="round" />
      <Ellipse cx={-0.09} cy={-0.1} rx={0.075} ry={0.045} fill="#FFFFFF" fillOpacity={0.34} />
      <SvgText x={0} y={0.09} fontSize={0.28} fontWeight="700" fill="#FFFFFF" textAnchor="middle">{initial}</SvgText>
      </G>
    </G>
  );
}

/** The Research Station: a small building standing on its raised tile. */
function Station({ cx, cy }: { cx: number; cy: number }) {
  const x = cx, y = cy - 0.12;
  return (
    <G>
      <Ellipse cx={x + 0.05} cy={y + 0.36} rx={0.46} ry={0.1} fill="#000000" fillOpacity={0.3} />
      <Rect x={x - 0.3} y={y - 0.06} width={0.6} height={0.38} fill={materials.stock} stroke={colors.ink} strokeWidth={0.03} strokeLinejoin="round" />
      <Rect x={x + 0.04} y={y - 0.06} width={0.26} height={0.38} fill={darken(materials.stock, 0.14)} />
      <Path d={`M${x - 0.4},${y - 0.04} L${x},${y - 0.42} L${x + 0.4},${y - 0.04} Z`} fill={colors.ink} stroke={colors.ink} strokeWidth={0.03} strokeLinejoin="round" />
      <Path d={`M${x - 0.4},${y - 0.04} L${x},${y - 0.42} L${x},${y - 0.04} Z`} fill={lighten(colors.ink, 0.18)} />
      <Rect x={x - 0.08} y={y + 0.12} width={0.16} height={0.2} fill={materials.kraftDeep} stroke={colors.ink} strokeWidth={0.025} />
    </G>
  );
}

export const Tile = memo(TileView);
