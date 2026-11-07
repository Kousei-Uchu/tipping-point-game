import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { darken } from "../theme/colour";
import { materials } from "../theme/materials";
import { colors } from "../theme/tokens";
import { Wood } from "../ui/Wood";

/** A small wooden robot disc: what a bot seat shows in place of a pawn. Eyes, a mouth line and an antenna, nothing to read. */
export function RobotDisc({ size = 32 }: { size?: number }) {
  return (
    <Wood corner={(size + 8) / 2} style={{ width: size + 8, height: size + 8, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="-12 -12 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Path d="M0,-10 V-6" stroke={colors.ink} strokeWidth={1.5} strokeLinecap="round" />
        <Circle cx={0} cy={-10.5} r={1.6} fill={colors.danger} stroke={colors.ink} strokeWidth={1} />
        <Rect x={-8} y={-6} width={16} height={13} rx={3.5} fill={materials.stock} stroke={colors.ink} strokeWidth={1.5} />
        <Rect x={-8} y={4} width={16} height={3} rx={1.5} fill={darken(materials.stock, 0.14)} />
        <Circle cx={-3.2} cy={-1.2} r={1.7} fill={colors.ink} />
        <Circle cx={3.2} cy={-1.2} r={1.7} fill={colors.ink} />
        <Path d="M-3,3 H3" stroke={colors.ink} strokeWidth={1.4} strokeLinecap="round" />
      </Svg>
    </Wood>
  );
}
