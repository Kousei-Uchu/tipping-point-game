import React from "react";
import GRAIN from "../../assets/grain.png";
import { Image, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { materials } from "../theme/materials";
import { elevation, radius, type Elevation } from "../theme/tokens";


interface Props extends ViewProps {
  /** stock is the normal card; deep is a recessed or alternate row on the same sheet. */
  tone?: "stock" | "deep";
  elevation?: Elevation | "flat";
  /** A coloured edge on the left, like a tab (the play guide, tips). */
  accent?: string;
  /** Replaces the default corner radius. */
  corner?: number;
  /** Round only the top corners (a docked sheet). */
  topOnly?: boolean;
  grain?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A printed card laid on the table: card stock, an outer edge, a fine inner keyline, a trace of
 * grain and a resting shadow. Replaces the flat white rounded panel.
 */
export function Plate({ tone = "stock", elevation: lvl = "resting", accent, corner = radius.md, topOnly, grain = true, style, children, ...rest }: Props) {
  const r = topOnly ? { borderTopLeftRadius: corner, borderTopRightRadius: corner } : { borderRadius: corner };
  const inner = Math.max(corner - 3, 2);
  const ri = topOnly ? { borderTopLeftRadius: inner, borderTopRightRadius: inner } : { borderRadius: inner };
  return (
    <View
      {...rest}
      style={[
        styles.base,
        r,
        { backgroundColor: tone === "deep" ? materials.stockDeep : materials.stock },
        lvl === "flat" ? null : elevation[lvl],
        accent ? { borderLeftColor: accent, borderLeftWidth: 6 } : null,
        style,
      ]}
    >
      {grain ? (
        <View style={[styles.fill, r]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no">
          <Image source={GRAIN} resizeMode="repeat" style={[styles.fill, r, { opacity: 0.5 }]} />
        </View>
      ) : null}
      <View style={[styles.keyline, ri]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1, borderColor: materials.keyline },
  fill: { ...StyleSheet.absoluteFillObject },
  keyline: { ...StyleSheet.absoluteFillObject, top: 3, left: 3, right: 3, bottom: 3, borderWidth: 1, borderColor: "rgba(201,188,155,0.55)" },
});
