import React from "react";
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { lighten } from "../theme/colour";
import { materials } from "../theme/materials";
import { elevation, radius } from "../theme/tokens";

interface Props extends ViewProps {
  corner?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Painted-over wood: a flat wood face, a pale highlight along the top edge and a darker lower edge.
 * Used for ledges and pegs (the hand ledge, a Steward's pawn peg). No gradient library needed.
 */
export function Wood({ corner = radius.sm, style, children, ...rest }: Props) {
  return (
    <View {...rest} style={[styles.base, { borderRadius: corner }, elevation.resting, style]}>
      <View style={[styles.highlight, { borderTopLeftRadius: corner, borderTopRightRadius: corner }]} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: materials.wood, borderWidth: 1, borderColor: materials.woodDeep, borderBottomWidth: 3, overflow: "hidden" },
  highlight: { position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: lighten(materials.wood, 0.4), opacity: 0.7 },
});
