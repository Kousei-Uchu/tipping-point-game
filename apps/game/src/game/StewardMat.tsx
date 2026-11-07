import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { Player } from "@tipping-point/engine";
import { cardById, content, roleByKey } from "../core/content";
import { trayDiscs } from "../core/boardArt";
import { darken } from "../theme/colour";
import { materials } from "../theme/materials";
import { colors, elevation, radius, space } from "../theme/tokens";
import { Label } from "../ui/Label";
import { Plate } from "../ui/Plate";
import { Text } from "../ui/Text";
import { Wood } from "../ui/Wood";
import { seatShapePath } from "./biomeArt";
import { MiniCard } from "./Piles";

interface Props {
  player: Player;
  legacy: number;
  /** The Steward whose turn it is. Their mat is full size; the others are compact. */
  active: boolean;
}

const TOKENS = content.rules.limits.steward_tokens_each;
const HAND = content.rules.limits.hand;

/** The Steward's pawn on its wooden peg: the same shape and colour as on the board. */
export function Peg({ seat, colour, size }: { seat: number; colour: string; size: number }) {
  return (
    <Wood corner={size / 2} style={{ width: size + 8, height: size + 8, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="-12 -12 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Path d={seatShapePath(seat, 8)} fill={colour} stroke={colors.ink} strokeWidth={1.5} strokeLinejoin="round" />
      </Svg>
    </Wood>
  );
}

/** One token in the tray: a disc in the Steward's colour with their shape on it, or an empty dashed ring. */
export function TrayDisc({ seat, colour, here, d }: { seat: number; colour: string; here: boolean; d: number }) {
  return (
    <Svg width={d} height={d} viewBox="-12 -12 24 24">
      {here ? (
        <>
          <Circle cx={0} cy={1.5} r={10} fill={darken(colour, 0.38)} stroke={colors.ink} strokeWidth={1.2} />
          <Circle cx={0} cy={0} r={10} fill={colour} stroke={colors.ink} strokeWidth={1.4} />
          <Path d={seatShapePath(seat, 4.8)} fill={materials.stock} stroke={colors.ink} strokeWidth={1} strokeLinejoin="round" />
        </>
      ) : (
        <Circle cx={0} cy={0} r={9.5} fill="none" stroke={materials.kraft} strokeOpacity={0.9} strokeWidth={1.4} strokeDasharray="3 3" />
      )}
    </Svg>
  );
}

/**
 * A Steward's mat: pawn peg, role, three Tool slots, a tray of 12 tokens and the Legacy tally.
 * Names and roles are printed on a plate; the slots and tray are objects, not text.
 */
export function StewardMat({ player: p, legacy, active }: Props) {
  const placed = TOKENS - p.tokensInSupply;
  const roles = p.roles.map((r) => roleByKey(r).name).join(", ");
  const d = active ? 22 : 15;
  const slotW = active ? 40 : 24;
  const discs = trayDiscs(TOKENS, p.tokensInSupply);
  const label = `${p.name}, ${roles}, ${p.hand.length} Tools, ${placed} tokens placed, Legacy ${legacy}${p.pos === null ? ", away from the board" : ""}${active ? ", active" : ""}`;

  return (
    <View style={[styles.frame, active && styles.frameActive, active ? elevation.lifted : elevation.resting]} accessible accessibilityLabel={label}>
      <Plate elevation="flat" tone={active ? "stock" : "deep"} style={styles.head}>
        <Peg seat={p.seat} colour={p.colour} size={active ? 22 : 16} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="heading" numberOfLines={1}>{p.name}</Text>
          <Text variant="small" color={colors.muted} numberOfLines={active ? 2 : 1}>{roles}{p.pos === null ? `, away ${p.awayTurns}` : ""}</Text>
        </View>
        <View style={styles.tally}>
          <View style={styles.tallyDisc}><Text variant="heading" center>{String(legacy)}</Text></View>
          <Text variant="stamp" color={colors.muted}>Legacy</Text>
        </View>
      </Plate>

      <View style={styles.well}>
        <View style={styles.slots}>
          {Array.from({ length: HAND }, (_, i) => {
            const h = p.hand[i];
            const card = h ? cardById(h.cardId) : undefined;
            return card ? (
              <View key={i} style={elevation.resting}><MiniCard card={card} width={slotW} /></View>
            ) : (
              <View key={i} style={[styles.slot, { width: slotW, height: Math.round(slotW * 1.38) }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            );
          })}
        </View>
        <View style={styles.tray} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {discs.map((here, i) => <TrayDisc key={i} seat={p.seat} colour={p.colour} here={here} d={d} />)}
        </View>
      </View>
      {active ? <View style={styles.turnTag}><Label text="Your turn" tone="good" /></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { backgroundColor: materials.kraft, borderRadius: radius.lg, borderWidth: 2, borderColor: materials.kraftDeep, padding: 5, gap: 5 },
  frameActive: { borderColor: colors.ink, borderWidth: 2.5 },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.sm },
  tally: { alignItems: "center", gap: 2 },
  tallyDisc: { minWidth: 34, height: 34, paddingHorizontal: 4, borderRadius: 17, backgroundColor: materials.kraft, borderWidth: 2, borderColor: colors.ink, borderBottomWidth: 4, alignItems: "center", justifyContent: "center" },
  well: { backgroundColor: materials.kraftDeep, borderRadius: radius.md, padding: space.sm, gap: space.sm, flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  slots: { flexDirection: "row", gap: 5 },
  slot: { borderRadius: 4, borderWidth: 1.5, borderStyle: "dashed", borderColor: materials.keyline, backgroundColor: "rgba(0,0,0,0.12)" },
  tray: { flex: 1, minWidth: 90, flexDirection: "row", flexWrap: "wrap", gap: 2 },
  turnTag: { position: "absolute", top: -9, right: 10 },
});
