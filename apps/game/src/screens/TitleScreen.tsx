import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useNav } from "../app/NavProvider";
import { useSessionCtx } from "../app/SessionProvider";
import { titleBoard } from "../core/titleBoard";
import { TUTORIAL_OPTIONS } from "../core/tutorial";
import { LidPanorama } from "../game/Illustration";
import { MiniBoard } from "../game/MiniBoard";
import { useTutorialStatus } from "../game/Tutorial";
import { materials } from "../theme/materials";
import { colors, elevation, radius, space } from "../theme/tokens";
import { Key } from "../ui/Key";
import { Label } from "../ui/Label";
import { Plate } from "../ui/Plate";
import { Screen } from "../ui/Screen";
import { Text } from "../ui/Text";
import { useLayout } from "../ui/useLayout";

/**
 * The box lid. A kraft lid on the felt holds a printed title label and the board, already starting to tip.
 * Under it the menu is a row of keys on a card, so no word sits straight on the felt.
 * Minimum art version: the wordmark is typeset (Fredoka); the lid carries a drawn panorama of the six biomes (core/illustrations.ts) above the board.
 */
export function TitleScreen() {
  const nav = useNav();
  const layout = useLayout();
  const { hasSave, resume, start } = useSessionCtx();
  const tutorialStatus = useTutorialStatus();
  // First visit and nothing to continue: point at the tutorial instead of an empty lobby.
  const nudge = tutorialStatus === null && !hasSave;
  const onTutorial = () => { start(TUTORIAL_OPTIONS, { tutorial: true }); nav.navigate("game"); };
  const [msg, setMsg] = useState("");
  const tiles = useMemo(() => titleBoard(), []);
  const wide = layout.mode !== "phone";
  const boardW = Math.min(wide ? 380 : 300, layout.width - 2 * space.xl - 24);

  const onResume = async () => {
    if (await resume()) nav.navigate("game");
    else setMsg("That saved game could not be loaded, so it was removed.");
  };

  const lid = (
    <View style={[styles.lid, elevation.held]}>
      <View style={styles.lidInner}>
        <View style={styles.scene}><LidPanorama width={boardW} /></View>
        <Plate style={styles.label} elevation="flat">
          <Label text="A cooperative game of 2 to 5 Stewards" />
          <Text variant="display" center accessibilityRole="header">Tipping Point</Text>
          <Text color={colors.muted} center variant="small">Pull the Pressure Metre back to the Trophy before the planet tips over.</Text>
        </Plate>
        <View style={styles.boardWrap}><MiniBoard tiles={tiles} width={boardW} /></View>
      </View>
    </View>
  );

  const menu = (
    <Plate elevation="held" style={styles.menu}>
      {hasSave ? <Key kind="primary" label="Continue game" hint="Resume where you left off." onPress={() => void onResume()} /> : null}
      <Key kind={nudge ? "primary" : "secondary"} label="Learn to play" hint="A guided first turn, about three minutes." onPress={onTutorial} />
      <Key kind={hasSave || nudge ? "secondary" : "primary"} label="New game" hint="Pass and play on one device." onPress={() => nav.navigate("lobby")} />
      <View style={styles.row}>
        <Key label="Rulebook" onPress={() => nav.navigate("rules")} style={{ flex: 1 }} />
        <Key label="Settings" onPress={() => nav.navigate("settings")} style={{ flex: 1 }} />
      </View>
      {msg ? <Text variant="small" color={colors.dangerText} center accessibilityLiveRegion="polite">{msg}</Text> : null}
      <Text variant="small" color={colors.muted} center>Playtest build. Rules v1.3 draft.</Text>
    </Plate>
  );

  return (
    <Screen felt>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.wrap, wide && styles.wrapWide]}>
          {lid}
          <View style={wide ? styles.menuCol : styles.menuColNarrow}>{menu}</View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: space.xl },
  wrap: { alignItems: "center", gap: space.xl },
  wrapWide: { flexDirection: "row", justifyContent: "center", gap: space.xxl },
  lid: { backgroundColor: materials.kraft, borderRadius: radius.lg, borderWidth: 2, borderColor: materials.kraftDeep, padding: 10 },
  lidInner: { borderRadius: radius.md, borderWidth: 2, borderColor: materials.kraftDeep, borderStyle: "dashed", padding: 10, gap: space.md, alignItems: "center" },
  label: { padding: space.md, gap: space.xs, alignItems: "center", alignSelf: "stretch" },
  scene: { borderWidth: 1.5, borderColor: materials.kraftDeep, borderRadius: radius.sm, overflow: "hidden" },
  boardWrap: { alignItems: "center" },
  menuCol: { width: 340 },
  menuColNarrow: { width: "100%", maxWidth: 360 },
  menu: { padding: space.lg, gap: space.md },
  row: { flexDirection: "row", gap: space.sm },
});
