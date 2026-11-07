import React from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSettings } from "../app/SettingsProvider";
import { cue } from "../platform/feedback";
import { darken } from "../theme/colour";
import { materials } from "../theme/materials";
import { colors, MIN_TAP, radius, space } from "../theme/tokens";
import { Text } from "./Text";
import { useTween } from "./useTween";

export type KeyKind = "primary" | "secondary" | "danger" | "quiet";

interface Props {
  label: string;
  onPress: () => void;
  kind?: KeyKind;
  disabled?: boolean;
  /** Small line under the label, e.g. why the key is off or what it will do. */
  hint?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  compact?: boolean;
}

/** Depth of the visible base under the face. Pressing sinks the face by PRESS px of it. */
const BASE = 4;
const PRESS = 2;

const PALETTE = {
  primary: { face: colors.ink, fg: colors.paper, edge: colors.ink, base: darken(colors.ink, 0.5) },
  secondary: { face: materials.stock, fg: colors.ink, edge: materials.keyline, base: materials.kraft },
  danger: { face: colors.danger, fg: "#FFFFFF", edge: darken(colors.danger, 0.25), base: darken(colors.danger, 0.4) },
} as const;

/**
 * A raised key with a visible base, in place of the flat pill. Rest shows what is possible;
 * a disabled key looks unprinted: an empty dashed outline with no base.
 */
export function Key({ label, onPress, kind = "secondary", disabled, hint, style, accessibilityLabel, compact }: Props) {
  const { settings } = useSettings();
  const minFace = (compact ? 36 : MIN_TAP) - BASE;
  const quiet = kind === "quiet";
  const pal = quiet ? null : PALETTE[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => { cue("keyPress", settings); onPress(); }}
      style={style}
    >
      {({ pressed }) => {
        if (disabled) {
          return (
            <View style={[styles.face, styles.unprinted, { minHeight: minFace + BASE }]}>
              <KeyText label={label} hint={hint} color={colors.muted} />
            </View>
          );
        }
        if (quiet || !pal) {
          return (
            <View style={[styles.face, { minHeight: minFace + BASE, backgroundColor: pressed ? materials.stockDeep : "transparent", borderColor: "transparent" }]}>
              <KeyText label={label} hint={hint} color={colors.ink} />
            </View>
          );
        }
        return (
          <View style={[styles.base, { backgroundColor: pal.base }]}>
            <PressFace pressed={pressed} style={{ minHeight: minFace, backgroundColor: pal.face, borderColor: pal.edge }}>
              <KeyText label={label} hint={hint} color={pal.fg} />
            </PressFace>
          </View>
        );
      }}
    </Pressable>
  );
}

/** The face of a raised key: sinks PRESS px over the keyPress move and springs back. Instant under reduced motion. */
function PressFace({ pressed, style, children }: { pressed: boolean; style: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const sink = useTween(pressed ? PRESS : 0, "keyPress");
  return <View style={[styles.face, style, { transform: [{ translateY: sink }] }]}>{children}</View>;
}

function KeyText({ label, hint, color }: { label: string; hint?: string; color: string }) {
  return (
    <View style={styles.inner}>
      <Text variant="heading" color={color} center>{label}</Text>
      {hint ? <Text variant="small" color={color} center style={{ opacity: 0.85 }}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, paddingBottom: BASE },
  face: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.sm, justifyContent: "center" },
  unprinted: { borderStyle: "dashed", borderColor: materials.keyline, backgroundColor: "transparent" },
  inner: { alignItems: "center" },
});
