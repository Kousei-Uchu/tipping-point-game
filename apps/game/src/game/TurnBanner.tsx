import React from "react";
import { StyleSheet, View } from "react-native";
import type { State } from "@tipping-point/engine";
import { useSettings } from "../app/SettingsProvider";
import { counters } from "../core/selectors";
import type { SpotId } from "../core/tutorial";
import { colors, radius, space } from "../theme/tokens";
import { Button } from "../ui/Button";
import { Plate } from "../ui/Plate";
import { TokenChip } from "../ui/TokenChip";
import { Text } from "../ui/Text";
import { Spot } from "./Tutorial";

/** `spot` is tutorial only: undefined in a normal game, otherwise the part of the screen to frame. */
interface Props { state: State; canUndo: boolean; onUndo: () => void; onMenu: () => void; compact: boolean; spot?: SpotId | null }

export function TurnBanner({ state, canUndo, onUndo, onMenu, compact, spot }: Props) {
  const { settings } = useSettings();
  const big = settings.textScale > 1.25; // at large text the name gets two lines and the buttons wrap under it, so nothing is cut off
  const p = state.players[state.activeSeat]!;
  const c = counters(state);
  const final = state.phase === "finalLap";
  return (
    <Plate style={styles.wrap}>
      <View style={[styles.top, big ? { flexWrap: "wrap" } : null]}>
        <View style={[styles.dot, { backgroundColor: p.colour }]} />
        <View style={big ? { flexBasis: "70%", flexGrow: 1 } : { flex: 1 }}>
          <Text variant={compact ? "heading" : "title"} numberOfLines={2} accessibilityRole="header">
            {final ? `Final lap: ${p.name}` : `Round ${state.round}: ${p.name}'s turn`}
          </Text>
        </View>
        <Button label="Undo" onPress={onUndo} disabled={!canUndo} kind="quiet" compact />
        <Button label="Menu" onPress={onMenu} kind="secondary" compact />
      </View>
      {c ? (
        <Spot active={spot !== undefined} id="chips" current={spot ?? null}>
          <View style={styles.chips} accessibilityLabel={`Left this turn: ${c.moves} moves, ${c.tool ? "Tool available" : "Tool used"}`}>
            <TokenChip label="Move" count={c.moves} />
            <TokenChip label="Tool" count={c.tool ? 1 : 0} />
            <TokenChip label="Ability" count={c.ability ? 1 : 0} />
            <TokenChip label="Gift" count={c.gift ? 1 : 0} />
          </View>
        </Spot>
      ) : null}
    </Plate>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs, paddingVertical: space.xs, paddingHorizontal: space.sm },
  top: { flexDirection: "row", alignItems: "center", gap: space.sm },
  dot: { width: 18, height: 18, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.ink },
  chips: { flexDirection: "row", gap: space.xs, flexWrap: "wrap" },
});
