import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { GameEvent, State } from "@tipping-point/engine";
import { content } from "../core/content";
import { narrateAll } from "../core/narrate";
import { colors, space } from "../theme/tokens";
import { Text } from "../ui/Text";

/** Newest first. The container is a live region so screen readers announce new lines. */
export function EventLog({ state, events, max = 80 }: { state: State; events: readonly GameEvent[]; max?: number }) {
  const lines = useMemo(() => narrateAll(content, state, events).slice(-max).reverse(), [state, events, max]);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: space.xs }} accessibilityLiveRegion="polite">
      {lines.map((l) => (
        <View key={l.seq} style={[styles.row, { borderLeftColor: l.tone === "bad" ? colors.danger : l.tone === "good" ? colors.good : colors.border }]}>
          <Text variant="small">{l.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({ row: { borderLeftWidth: 4, paddingLeft: space.sm, paddingVertical: 2 } });
