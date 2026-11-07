import React from "react";
import { StyleSheet, View } from "react-native";
import { materials } from "../theme/materials";
import { colors } from "../theme/tokens";
import { Text } from "./Text";

const D = 34;
const SIDE = 3;

/**
 * A round counter from the box: a disc with a visible side and a number on its face. When the
 * count is gone the disc is turned face down (an empty dashed ring), so a glance shows what is left.
 */
export function TokenChip({ label, count }: { label: string; count: number }) {
  const off = count <= 0;
  return (
    <View style={styles.wrap}>
      <View style={[styles.side, off && { backgroundColor: "transparent" }]}>
        <View style={[styles.face, off && styles.faceOff]}>
          <Text variant="heading" color={off ? colors.muted : colors.ink} center>{String(Math.max(0, count))}</Text>
        </View>
      </View>
      <Text variant="stamp" color={off ? colors.muted : colors.ink}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  side: { width: D, height: D + SIDE, borderRadius: D / 2 + SIDE, backgroundColor: materials.kraftDeep, justifyContent: "flex-start" },
  face: { width: D, height: D, borderRadius: D / 2, backgroundColor: materials.kraft, borderWidth: 2, borderColor: colors.ink, alignItems: "center", justifyContent: "center" },
  faceOff: { backgroundColor: "transparent", borderStyle: "dashed", borderColor: materials.keyline },
});
