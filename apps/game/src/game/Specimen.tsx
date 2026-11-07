import React from "react";
import { View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import type { BiomeId } from "@tipping-point/content";
import { PLAYER_COLOURS } from "@tipping-point/engine";
import { BOARD } from "../core/boardGeometry";
import { THICK } from "../core/boardArt";
import type { SpecimenKind } from "../core/rulebook";
import { darken } from "../theme/colour";
import { materials } from "../theme/materials";
import { elevation } from "../theme/tokens";
import { PatternDefs } from "./biomeArt";
import { Tile, type TileProps } from "./Tile";

/** An ordinary tile well away from the hub, so its neighbours do not matter. */
const SAMPLE_ID = 10;
const SAMPLE_BIOME: BiomeId = "forest" as BiomeId;
const g = BOARD.tiles.find((t) => t.id === SAMPLE_ID)!;

/** What each specimen shows, as props of the real Tile. Nothing here is a copy of the art. */
function propsFor(kind: SpecimenKind, biome: BiomeId): TileProps {
  const base: TileProps = { id: SAMPLE_ID, biome, status: "healthy", shield: false, stabilised: false, ownerSeat: -1, ownerColour: "#000000", pawns: "", highlight: null, badge: 0, label: "", onPress: () => {} };
  switch (kind) {
    case "healthy": return base;
    case "vulnerable": return { ...base, status: "vulnerable" };
    case "shield": return { ...base, shield: true };
    case "stabilised": return { ...base, status: "vulnerable", stabilised: true };
    case "lost": return { ...base, status: "removed" };
    case "token": return { ...base, ownerSeat: 1, ownerColour: PLAYER_COLOURS[1] };
    case "pawn": return { ...base, pawns: `0:${PLAYER_COLOURS[0]}:M` };
    case "reach": return { ...base, highlight: "reach" };
  }
}

/**
 * One piece of the board, drawn by the real `Tile` on a scrap of the kraft board. The rulebook shows these
 * beside the words, so a new player learns the objects they will see on the table. Decorative: the words beside it
 * are what a screen reader reads.
 */
export function Specimen({ kind, biome = SAMPLE_BIOME, size = 76 }: { kind: SpecimenKind; biome?: BiomeId; size?: number }) {
  const h = Math.round(size * 1.15);
  return (
    <View style={[{ width: size, height: h, borderRadius: 8, overflow: "hidden", backgroundColor: materials.feltDeep }, elevation.resting]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={h} viewBox={`${g.cx - 1.2} ${g.cy - 1.25} 2.4 2.76`}>
        <PatternDefs />
        <Polygon points={g.tray} fill="#000000" fillOpacity={0.12} transform={`translate(0.04 ${THICK + 0.2})`} />
        <Polygon points={g.tray} fill={materials.kraftDeep} transform={`translate(0 ${THICK * 0.8})`} />
        <Polygon points={g.tray} fill={materials.kraft} stroke={darken(materials.kraft, 0.3)} strokeWidth={0.02} strokeLinejoin="round" />
        <Tile {...propsFor(kind, biome)} />
      </Svg>
    </View>
  );
}
