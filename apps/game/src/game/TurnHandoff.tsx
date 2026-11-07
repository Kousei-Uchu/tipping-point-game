import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { materials } from "../theme/materials";
import { colors, fonts, fontState, space } from "../theme/tokens";
import { Plate } from "../ui/Plate";
import { Text } from "../ui/Text";
import { useTween } from "../ui/useTween";
import { Wood } from "../ui/Wood";
import { seatShapePath } from "./biomeArt";

export interface Handoff { key: number; seat: number; name: string; colour: string; bot: string | null }

/**
 * The turn passes: a wooden turn disc in the Steward's colour slides in and a stamp reads YOUR TURN, or the bot's name and level.
 * It ignores touches, so it never blocks play. Under reduced motion the stamp just appears and the disc does not slide.
 */
export function TurnHandoff({ h }: { h: Handoff }) {
  const slide = useTween(0, "discSlide", 1);
  const stamp = h.bot ? "BOT" : "YOUR TURN";
  const line = h.bot ? `${h.name}, ${h.bot}` : h.name;
  return (
    <View style={styles.wrap} pointerEvents="none" accessibilityLiveRegion="polite" accessible accessibilityLabel={h.bot ? `${h.name}'s turn, a ${h.bot} bot` : `${h.name}'s turn`}>
      <Plate elevation="lifted" corner={6} style={[styles.stamp, { transform: [{ rotate: "-2deg" }] }]}>
        <View style={{ transform: [{ translateX: -120 * slide }] }}>
          <Wood corner={22} style={styles.disc}>
            <Svg width={30} height={30} viewBox="-12 -12 24 24">
              <Circle cx={0} cy={0} r={10.5} fill={h.colour} stroke={colors.ink} strokeWidth={1.5} />
              <Path d={seatShapePath(h.seat, 5.5)} fill={materials.stock} stroke={colors.ink} strokeWidth={1} strokeLinejoin="round" />
            </Svg>
          </Wood>
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text variant="title" color={h.bot ? colors.ink : colors.dangerText} style={fontState.custom ? { fontFamily: fonts.stamp, letterSpacing: 1 } : undefined}>{stamp}</Text>
          <Text variant="heading" numberOfLines={1}>{line}</Text>
        </View>
      </Plate>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, top: "34%", alignItems: "center", paddingHorizontal: space.lg },
  stamp: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderWidth: 2, borderColor: colors.ink },
  disc: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
