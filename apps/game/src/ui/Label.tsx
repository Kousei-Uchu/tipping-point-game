import React from "react";
import { StyleSheet, View } from "react-native";
import { materials } from "../theme/materials";
import { colors } from "../theme/tokens";
import { Text } from "./Text";

type Tone = "neutral" | "good" | "bad";

const TINT: Record<Tone, string> = { neutral: materials.stockDeep, good: "#DCEBDD", bad: "#F3D9D1" };

/** A typewriter stamp on a paper tag, for short status words. Replaces small grey text. */
export function Label({ text, tone = "neutral", off }: { text: string; tone?: Tone; off?: boolean }) {
  return (
    <View style={[styles.tag, { backgroundColor: TINT[tone], opacity: off ? 0.5 : 1 }]}>
      <Text variant="stamp" color={colors.ink}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, borderWidth: 1, borderColor: materials.keyline },
});
