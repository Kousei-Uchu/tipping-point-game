import React, { useMemo } from "react";
import { View } from "react-native";
import Svg from "react-native-svg";
import type { BiomeId } from "@tipping-point/content";
import type { TileStatus } from "@tipping-point/engine";
import { BOARD } from "../core/boardGeometry";
import { BoardMotionContext } from "../ui/useTween";
import { PatternDefs } from "./biomeArt";
import { BoardBase } from "./BoardView";
import { Tile } from "./Tile";

export interface MiniTile { id: number; biome: BiomeId | "hub"; status: TileStatus; shield?: boolean; stabilised?: boolean }

const noop = () => {};
const still = { ready: false };

/**
 * The whole board, small and still, made of the real tiles (thick faces, scuffs, holes). Used on the title box lid
 * and on the result screen, so the end of the game shows the very board that was played. Not interactive and hidden
 * from screen readers: the words around it say the same thing.
 */
export function MiniBoard({ tiles, width }: { tiles: readonly MiniTile[]; width: number }) {
  const b = BOARD.bounds;
  const height = Math.round((width * b.height) / b.width);
  const ordered = useMemo(() => {
    const byId = new Map(tiles.map((t) => [t.id, t]));
    return BOARD.tiles.map((g) => ({ g, t: byId.get(g.id) })).filter((x): x is { g: typeof x.g; t: MiniTile } => !!x.t);
  }, [tiles]);
  return (
    <View style={{ width, height }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <BoardMotionContext.Provider value={still}>
        <Svg width={width} height={height} viewBox={`${b.minX} ${b.minY} ${b.width} ${b.height}`}>
          <PatternDefs />
          <BoardBase />
          {[...ordered].sort((p, q) => p.g.cy - q.g.cy || p.g.cx - q.g.cx).map(({ g, t }) => (
            <Tile key={g.id} id={g.id} biome={t.biome} status={t.status} shield={!!t.shield} stabilised={!!t.stabilised}
              ownerSeat={-1} ownerColour="#000000" pawns="" highlight={null} badge={0} label="" onPress={noop} />
          ))}
        </Svg>
      </BoardMotionContext.Provider>
    </View>
  );
}
