import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { materials } from "../theme/materials";
import { Felt } from "./Felt";

/**
 * Root container for every screen: safe-area padding on notched devices over card stock, or over the
 * felt table when `felt` is set (the game screen). Text never sits straight on the felt: put it on a Plate.
 */
export function Screen({ children, style, felt }: { children: React.ReactNode; style?: ViewStyle; felt?: boolean }) {
  return (
    <SafeAreaView style={[styles.safe, felt && { backgroundColor: materials.felt }]}>
      {felt ? <Felt style={StyleSheet.absoluteFill} /> : null}
      <View style={[styles.fill, style]}>{children}</View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: materials.stock }, fill: { flex: 1 } });
