import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { State } from "@tipping-point/engine";
import { legacyNow } from "../core/selectors";
import { colors, space } from "../theme/tokens";
import { seatShapePath } from "./biomeArt";
import { StewardMat } from "./StewardMat";

export function SeatMark({ seat, colour, size = 20 }: { seat: number; colour: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="-12 -12 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={seatShapePath(seat, 8)} fill={colour} stroke={colors.ink} strokeWidth={1.5} />
    </Svg>
  );
}

/** All Stewards at a glance. The active Steward's mat is full size, the others are compact. */
export function PlayersPanel({ state }: { state: State }) {
  const { legacy } = legacyNow(state);
  return (
    <View style={{ gap: space.md }}>
      {state.players.map((p) => {
        const l = legacy.find((x) => x.player === p.id)!;
        return <StewardMat key={p.id} player={p} legacy={l.total} active={p.seat === state.activeSeat} />;
      })}
    </View>
  );
}
