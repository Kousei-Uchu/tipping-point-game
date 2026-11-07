import React from "react";
import { Circle, G, Path, Rect } from "react-native-svg";

// The ids that have a mark live in core/cardArt.ts (EVENT_ICON_IDS), so a test can check them without a renderer.

/**
 * One small mark per Event card, drawn in a -10..10 box in a single ink colour.
 * Each says what the card does, so the six Events are told apart at a glance and not only by name:
 * E-1 a magnifier (look at the deck), E-2 a coin (take a Tool), E-3 three walkers (everyone moves),
 * E-4 a smokestack beside a briefcase (Ravages get worse), E-5 a card dropping onto a stack (Tools go back to the deck),
 * E-6 a sun over cracked ground (two more cards at once).
 * Keep clear of shapes that read as something else: a dome around a disc is an eye, arrows meeting at a bar is a snowflake.
 */

/** The old eight-pointed burst. Only a fallback for an Event card that has no mark yet. */
const BURST = "M0,-10 L2.4,-3.6 L9.5,-3 L4,1.8 L5.8,9 L0,5 L-5.8,9 L-4,1.8 L-9.5,-3 L-2.4,-3.6 Z";

export function EventIcon({ id, color }: { id: string; color: string }) {
  const stroke = { fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (id) {
    case "E-1":
      return (
        <G>
          <Circle cx={-2} cy={-2} r={6.5} {...stroke} />
          <Path d="M2.8,2.8 L9,9" {...stroke} strokeWidth={3} />
          <Path d="M-5,-2 H1 M-2,-5 V1" {...stroke} strokeWidth={1.4} />
        </G>
      );
    case "E-2":
      return (
        <G>
          <Circle cx={0} cy={0} r={8.5} {...stroke} />
          <Circle cx={0} cy={0} r={5} {...stroke} strokeWidth={1.2} />
          <Path d="M0,3.2 V-1 M0,0.6 Q-3.6,0.6 -3.6,-3 Q0,-3 0,0.6 M0,-0.6 Q3.4,-0.6 3.4,-3.6 Q0,-3.6 0,-0.6" {...stroke} strokeWidth={1.2} />
        </G>
      );
    case "E-3":
      return (
        <G>
          {[-6.5, 0, 6.5].map((x) => (
            <G key={x}>
              <Circle cx={x} cy={-5.5} r={2.3} fill={color} />
              <Path d={`M${x},-2.6 V3 M${x},-1 L${x - 2.4},1.8 M${x},-1 L${x + 2.4},1.8 M${x},3 L${x - 2},8 M${x},3 L${x + 2},8`} {...stroke} strokeWidth={1.7} />
            </G>
          ))}
        </G>
      );
    case "E-4":
      return (
        <G>
          <Path d="M-9.5,9 L-8.5,-4 H-4.5 L-3.5,9 Z" fill={color} />
          <Path d="M-8,-6.5 Q-5,-8 -7,-10 M-5,-6.5 Q-2,-8 -4,-10" {...stroke} strokeWidth={1.3} />
          <Rect x={-1} y={2} width={10} height={7} rx={1.2} {...stroke} strokeWidth={1.8} />
          <Path d="M2,2 V0 H6 V2 M-1,5 H9" {...stroke} strokeWidth={1.6} />
          <Rect x={3.2} y={4} width={1.6} height={2.4} fill={color} />
        </G>
      );
    case "E-5":
      return (
        <G>
          <Rect x={-7} y={3} width={14} height={3} rx={1} {...stroke} strokeWidth={1.6} />
          <Rect x={-7} y={6.5} width={14} height={3} rx={1} {...stroke} strokeWidth={1.6} />
          <G rotation={-10}>
            <Rect x={-5} y={-9.5} width={10} height={9} rx={1.2} {...stroke} strokeWidth={1.8} />
            <Path d="M0,-6.5 V-2 M-2,-3.9 L0,-2 L2,-3.9" {...stroke} strokeWidth={1.6} />
          </G>
        </G>
      );
    case "E-6":
      return (
        <G>
          <Path d="M-5,3 A5,5 0 0 1 5,3 Z" fill={color} />
          <Path d="M-6.06,-0.5 L-8.66,-2 M-3.5,-3.06 L-5,-5.66 M0,-4 L0,-7 M3.5,-3.06 L5,-5.66 M6.06,-0.5 L8.66,-2" {...stroke} strokeWidth={1.8} />
          <Path d="M-9.5,3 H9.5" {...stroke} />
          <Path d="M-3,3 L-4.5,6 L-2.5,8 L-4,10 M3.5,3 L5,6 L3,8.5 M-4.5,6 L-8,7" {...stroke} strokeWidth={1.5} />
        </G>
      );
    default:
      return <Path d={BURST} fill={color} transform="scale(0.9)" />;
  }
}
