import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { colors, radius, space } from "../theme/tokens";
import { Button } from "./Button";
import { Plate } from "./Plate";
import { Text } from "./Text";

interface Props {
  title: string;
  subtitle?: string;
  onClose: () => void;
  closeLabel?: string;
  children: React.ReactNode;
  /** Wide layouts show the sheet as a centred card. Phones dock it to the bottom. */
  docked?: boolean;
  footer?: React.ReactNode;
  /** Draw attention to the board instead of dimming it (used while a Ravage plays out). */
  dim?: boolean;
  maxHeight?: `${number}%`;
}

/**
 * A card laid on the table over a dimmed mat, with the held shadow. In-screen (not a native
 * Modal) so the board stays visible behind it and behaves the same on web, iOS and Android.
 */
export function Sheet({ title, subtitle, onClose, closeLabel = "Close", children, docked = true, footer, dim = true, maxHeight = "86%" }: Props) {
  return (
    <View style={[StyleSheet.absoluteFill, docked ? styles.dockedWrap : styles.centerWrap]} pointerEvents="box-none">
      {dim ? <Pressable accessibilityLabel="Dismiss" style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} onPress={onClose} /> : null}
      <Plate elevation="held" corner={radius.lg} topOnly={docked} style={[styles.sheet, { maxHeight }]} accessibilityViewIsModal={dim}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="title" accessibilityRole="header">{title}</Text>
            {subtitle ? <Text variant="small" color={colors.muted}>{subtitle}</Text> : null}
          </View>
        </View>
        <ScrollView style={styles.body} contentContainerStyle={{ gap: space.md, paddingBottom: space.md }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        <View style={styles.footer}>
          {footer}
          <Button label={closeLabel} onPress={onClose} kind="quiet" />
        </View>
      </Plate>
    </View>
  );
}

const styles = StyleSheet.create({
  dockedWrap: { justifyContent: "flex-end", alignItems: "center" },
  centerWrap: { justifyContent: "center", alignItems: "center" },
  sheet: { width: "100%", maxWidth: 560, padding: space.lg },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: space.sm },
  body: { flexGrow: 0 },
  footer: { gap: space.xs, paddingTop: space.xs },
});
