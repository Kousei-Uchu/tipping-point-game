import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useNav } from "../app/NavProvider";
import { useSettings } from "../app/SettingsProvider";
import { TEXT_SCALES } from "../core/settings";
import { colors, space } from "../theme/tokens";
import { Button } from "../ui/Button";
import { Screen } from "../ui/Screen";
import { Text } from "../ui/Text";

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <Text variant="heading">{label}</Text>
        {hint ? <Text variant="small" color={colors.muted}>{hint}</Text> : null}
      </View>
      <Button compact kind={value ? "primary" : "secondary"} label={value ? "On" : "Off"} accessibilityLabel={`${label}: ${value ? "on" : "off"}`} onPress={() => onChange(!value)} />
    </View>
  );
}

export function SettingsScreen() {
  const nav = useNav();
  const { settings, update } = useSettings();
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.col}>
          <Text variant="title" accessibilityRole="header">Settings</Text>
          <Text variant="heading">Text size</Text>
          <View style={styles.wrap}>
            {TEXT_SCALES.map((s) => (
              <Button key={s} compact kind={settings.textScale === s ? "primary" : "secondary"} label={`${Math.round(s * 100)}%`} onPress={() => update({ textScale: s })} />
            ))}
          </View>
          <Toggle label="Reduce motion" hint="Replaces animations with a short highlight." value={settings.reducedMotion} onChange={(v) => update({ reducedMotion: v })} />
          <Toggle label="Faster animations" hint="Ignored when motion is reduced." value={settings.fastAnimations} onChange={(v) => update({ fastAnimations: v })} />
          <Toggle label="Sound" hint="Soft table sounds, loudest for a Surge, the Trophy and a Collapse." value={settings.sound} onChange={(v) => update({ sound: v })} />
          <Toggle label="Haptics" hint="Vibration on phones and tablets." value={settings.haptics} onChange={(v) => update({ haptics: v })} />
          <Text variant="small" color={colors.muted}>Colour-blind patterns are always on: every biome has a colour, an icon and an edge pattern.</Text>
          <Button kind="primary" label="Done" onPress={() => nav.back()} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.lg, alignItems: "center" },
  col: { width: "100%", maxWidth: 520, gap: space.md },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  toggle: { flexDirection: "row", alignItems: "center", gap: space.md },
});
