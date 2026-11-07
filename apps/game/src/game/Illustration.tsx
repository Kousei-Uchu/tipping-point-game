import React from "react";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { LID_H, LID_W, ROLE_EMBLEMS, SCENE_H, SCENE_W, lidScene, type Shape } from "../core/illustrations";
import { colors } from "../theme/tokens";

const col = (c: string | undefined, ink: string) => (c === "ink" ? ink : c === "danger" ? colors.danger : c);

/** Draws a shape list inside an existing Svg, in the shapes' own units. */
export function Shapes({ shapes, ink = colors.ink }: { shapes: Shape[]; ink?: string }) {
  return (
    <G>
      {shapes.map((s, i) => {
        if (s.t === "rect") return <Rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={col(s.f, ink)} fillOpacity={s.o} />;
        if (s.t === "circle") return <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={col(s.f, ink)} fillOpacity={s.o} />;
        return (
          <Path key={i} d={s.d} fill={s.f ? col(s.f, ink) : "none"} stroke={s.s ? col(s.s, ink) : undefined} strokeWidth={s.s ? s.w ?? 1.6 : undefined}
            strokeLinecap="round" strokeLinejoin="round" opacity={s.o} />
        );
      })}
    </G>
  );
}

/** A scene fitted into a width by height window. It crops (never stretches), so the window can be wide or squat. */
export function SceneView({ shapes, x = 0, y = 0, width, height }: { shapes: Shape[]; x?: number; y?: number; width: number; height: number }) {
  return (
    <Svg x={x} y={y} width={width} height={height} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} preserveAspectRatio="xMidYMid slice">
      <Shapes shapes={shapes} />
    </Svg>
  );
}

/** A role's emblem on a round card-stock badge. Decorative: the role's name is always printed beside it. */
export function RoleEmblem({ role, size = 44, badge = "#F3ECDC" }: { role: string; size?: number; badge?: string }) {
  const emblem = ROLE_EMBLEMS[role];
  if (!emblem) return null;
  return (
    <Svg width={size} height={size} viewBox="-12 -12 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={0} cy={0} r={11} fill={badge} stroke={colors.ink} strokeWidth={0.9} />
      <Circle cx={0} cy={0} r={9.6} fill="none" stroke={colors.ink} strokeOpacity={0.35} strokeWidth={0.4} />
      <G transform="scale(0.78)"><Shapes shapes={emblem} /></G>
    </Svg>
  );
}

/** The panorama on the box lid. */
export function LidPanorama({ width }: { width: number }) {
  const height = Math.round((width * LID_H) / LID_W);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${LID_W} ${LID_H}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Shapes shapes={lidScene()} />
    </Svg>
  );
}
