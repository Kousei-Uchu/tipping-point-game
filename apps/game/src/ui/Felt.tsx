import React from "react";
import GRAIN from "../../assets/grain.png";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { materials } from "../theme/materials";

/**
 * The table: a dark slate-green mat with a faint woven grain. Dark on purpose so biome colours glow.
 * It draws only a background, so it can sit behind anything. Never put text straight on it.
 */
export function Felt({ style, children }: { style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  return (
    <View style={[styles.mat, style]} pointerEvents="box-none">
      <View style={styles.grain} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no">
        <Image source={GRAIN} resizeMode="repeat" style={StyleSheet.absoluteFill} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  mat: { backgroundColor: materials.felt, overflow: "hidden" },
  grain: { ...StyleSheet.absoluteFillObject, opacity: 0.1 },
});
