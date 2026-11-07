import React from "react";
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { materials } from "../theme/materials";
import { colors, elevation, radius } from "../theme/tokens";
import { Plate } from "./Plate";

interface Props extends ViewProps {
  /** A bookmark ribbon at the top edge, in a Steward's colour. */
  ribbon?: string;
  /** Border colour for a page that needs to stand out (the tutorial coach). */
  edge?: string;
  style?: StyleProp<ViewStyle>;
}

const HOLES = 3;

/**
 * A notebook page pinned at the table edge: card stock with a kraft binding down the left, punched holes,
 * a red pin and, optionally, a ribbon in the active Steward's colour. Words live on it (rule 4), not in a box.
 * Replaces the plain Plate for the play guide and the tutorial coach.
 */
export function Notebook({ ribbon, edge, style, children, ...rest }: Props) {
  return (
    <Plate {...rest} corner={radius.sm} style={[styles.page, edge ? { borderColor: edge, borderWidth: 2 } : null, style]}>
      <View style={styles.binding} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: HOLES }, (_, i) => <View key={i} style={styles.hole} />)}
      </View>
      <View style={styles.body}>{children}</View>
      {ribbon ? <View style={[styles.ribbon, { backgroundColor: ribbon }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" /> : null}
      <View style={styles.pin} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
    </Plate>
  );
}

const styles = StyleSheet.create({
  page: { flexDirection: "row", overflow: "visible" },
  binding: { width: 18, backgroundColor: materials.kraft, borderRightWidth: 1, borderRightColor: materials.kraftDeep, justifyContent: "space-evenly", alignItems: "center", borderTopLeftRadius: radius.sm, borderBottomLeftRadius: radius.sm },
  hole: { width: 8, height: 8, borderRadius: 4, backgroundColor: materials.felt, opacity: 0.85 },
  body: { flex: 1, padding: 8, gap: 8 },
  ribbon: { position: "absolute", top: -2, right: 44, width: 14, height: 22, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, borderWidth: 1.5, borderTopWidth: 0, borderColor: colors.ink },
  pin: { position: "absolute", top: -5, right: 14, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.dangerText, borderWidth: 1.5, borderColor: colors.ink, ...elevation.resting },
});
