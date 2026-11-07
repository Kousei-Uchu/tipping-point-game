import React from "react";
import { StyleSheet, View } from "react-native";
import type { RoleId } from "@tipping-point/content";
import { isActiveRole, roleByKey } from "../core/content";
import { colors, radius, space } from "../theme/tokens";
import { Text } from "../ui/Text";
import { Plate } from "../ui/Plate";
import { RoleEmblem } from "./Illustration";

export function RoleCardView({ role, children }: { role: RoleId; children?: React.ReactNode }) {
  const r = roleByKey(role);
  return (
    <Plate style={styles.card}>
      <View style={styles.head}>
        <RoleEmblem role={role} size={40} />
        <Text variant="heading">{r.name}</Text>
      </View>
      <Text variant="small" color={colors.muted}>{isActiveRole(role) ? r.timing : "Always on."}</Text>
      <Text variant="small">{r.ability}</Text>
      {children}
    </Plate>
  );
}
const styles = StyleSheet.create({ card: { gap: 4, padding: space.md }, head: { flexDirection: "row", alignItems: "center", gap: space.sm } });
