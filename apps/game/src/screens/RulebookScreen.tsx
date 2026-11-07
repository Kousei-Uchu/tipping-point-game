// The rulebook screen. All the words live in core/rulebook.ts (data, tested against the live content).
// Wide screens show the chapter list beside the chapter. Phones show the list first, then one chapter at a time.
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useNav } from "../app/NavProvider";
import { useSessionCtx } from "../app/SessionProvider";
import { CHAPTERS, chapterIndex, takeRulebookTarget, type Block, type Chapter } from "../core/rulebook";
import { TUTORIAL_OPTIONS } from "../core/tutorial";
import { colors, radius, space } from "../theme/tokens";
import { Button } from "../ui/Button";
import { Screen } from "../ui/Screen";
import { Text } from "../ui/Text";
import { useLayout } from "../ui/useLayout";
import { Plate } from "../ui/Plate";
import { Specimen } from "../game/Specimen";

function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case "p": return <Text>{b.text}</Text>;
    case "h": return <Text variant="heading" accessibilityRole="header">{b.text}</Text>;
    case "tip": return <Plate tone="deep" elevation="flat" accent={colors.accent} style={styles.tip}><Text variant="small">{b.text}</Text></Plate>;
    case "list": return <View style={{ gap: space.xs }}>{b.items.map((t, i) => <Text key={i}>{`• ${t}`}</Text>)}</View>;
    case "steps": return (
      <View style={{ gap: space.sm }}>
        {b.items.map((t, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNum}><Text variant="label" color={colors.paper}>{String(i + 1)}</Text></View>
            <View style={{ flex: 1 }}><Text>{t}</Text></View>
          </View>
        ))}
      </View>
    );
    case "specimens": return (
      <View style={{ gap: space.sm }}>
        {b.items.map((it) => (
          <Plate key={it.kind} elevation="flat" tone="deep" style={styles.specimen} accessible accessibilityLabel={`${it.look}. ${it.means}`}>
            <Specimen kind={it.kind} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label" color={colors.muted}>{it.look}</Text>
              <Text>{it.means}</Text>
            </View>
          </Plate>
        ))}
      </View>
    );
    case "table": {
      const two = b.head.length === 2;
      const flexOf = (c: number) => (two ? (c === 0 ? 1 : 1.7) : 1);
      return (
        <Plate elevation="flat" grain={false} style={styles.table} accessibilityRole="summary">
          <View style={[styles.tr, styles.thead]}>
            {b.head.map((h, c) => <View key={c} style={[styles.td, { flex: flexOf(c) }]}><Text variant="label" color={colors.muted}>{h}</Text></View>)}
          </View>
          {b.rows.map((r, i) => (
            <View key={i} style={[styles.tr, i % 2 === 1 && { backgroundColor: colors.surfaceAlt }]}>
              {r.map((cell, c) => (
                <View key={c} style={[styles.td, { flex: flexOf(c) }]}>
                  <Text variant="small" style={c === 0 && two ? { fontWeight: "700" } : undefined}>{cell}</Text>
                </View>
              ))}
            </View>
          ))}
        </Plate>
      );
    }
  }
}

function ChapterView({ chapter, n }: { chapter: Chapter; n: number }) {
  return (
    <View style={{ gap: space.md }}>
      <View>
        <Text variant="label" color={colors.accent}>{`CHAPTER ${n + 1} OF ${CHAPTERS.length}`}</Text>
        <Text variant="title" accessibilityRole="header">{chapter.title}</Text>
      </View>
      {chapter.blocks.map((b, i) => <BlockView key={i} b={b} />)}
    </View>
  );
}

function ContentsList({ current, onPick, wide }: { current: number | null; onPick: (i: number) => void; wide: boolean }) {
  return (
    <View style={{ gap: space.sm }}>
      {CHAPTERS.map((c, i) => {
        const on = current === i;
        return (
          <Pressable key={c.id} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${c.title}. ${c.summary}`} onPress={() => onPick(i)}
            style={({ pressed }) => [styles.toc, on && styles.tocOn, pressed && { opacity: 0.7 }]}>
            <View style={[styles.tocNum, on && { backgroundColor: colors.ink }]}><Text variant="label" color={on ? colors.paper : colors.ink}>{String(i + 1)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text variant="heading" color={colors.ink}>{c.title}</Text>
              {wide ? null : <Text variant="small" color={colors.muted}>{c.summary}</Text>}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RulebookScreen() {
  const nav = useNav();
  const { start } = useSessionCtx();
  const layout = useLayout();
  const wide = layout.mode !== "phone";
  // null = the contents page (phones only). A screen that links here may ask for a chapter first.
  const [picked, setPicked] = useState<number | null>(() => { const t = takeRulebookTarget(); return t ? chapterIndex(t) : null; });
  const [scrollKey, setScrollKey] = useState(0);
  const index = wide ? picked ?? 0 : picked;
  const go = (i: number | null) => { setPicked(i); setScrollKey((k) => k + 1); };
  const onTutorial = () => { start(TUTORIAL_OPTIONS, { tutorial: true }); nav.navigate("game"); };

  const pager = index !== null ? (
    <View style={styles.pager}>
      <Button compact label="Previous" onPress={() => go(index - 1)} disabled={index === 0} style={{ flex: 1 }} />
      {wide ? null : <Button compact label="Contents" onPress={() => go(null)} style={{ flex: 1 }} />}
      <Button compact kind="primary" label="Next" onPress={() => go(index + 1)} disabled={index === CHAPTERS.length - 1} style={{ flex: 1 }} />
    </View>
  ) : null;

  const extras = (
    <View style={{ gap: space.sm }}>
      <Button label="Play the guided tutorial" hint="A short first turn on the real board." onPress={onTutorial} />
    </View>
  );

  return (
    <Screen>
      <View style={styles.root}>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text variant={wide ? "title" : "heading"} accessibilityRole="header">Rulebook</Text>
            {index !== null && !wide ? <Text variant="small" color={colors.muted}>{CHAPTERS[index]!.title}</Text> : null}
          </View>
          <Button compact kind="primary" label="Back" onPress={() => nav.back()} />
        </View>

        {wide ? (
          <View style={styles.wide}>
            <ScrollView style={styles.side} contentContainerStyle={{ gap: space.md, paddingBottom: space.lg }}>
              <ContentsList current={index} onPick={go} wide />
              {extras}
            </ScrollView>
            <ScrollView key={scrollKey} style={{ flex: 1 }} contentContainerStyle={styles.page}>
              <View style={styles.col}>
                <ChapterView chapter={CHAPTERS[index!]!} n={index!} />
                {pager}
              </View>
            </ScrollView>
          </View>
        ) : index === null ? (
          <ScrollView contentContainerStyle={{ gap: space.md, paddingBottom: space.lg }}>
            <Text color={colors.muted}>Tap a chapter. Short on time? Read The goal, Reading the screen and Your turn.</Text>
            <ContentsList current={null} onPick={go} wide={false} />
            {extras}
          </ScrollView>
        ) : (
          <>
            <ScrollView key={scrollKey} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: space.lg }}>
              <ChapterView chapter={CHAPTERS[index]!} n={index} />
            </ScrollView>
            {pager}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.md, gap: space.md },
  top: { flexDirection: "row", alignItems: "center", gap: space.sm },
  wide: { flex: 1, flexDirection: "row", gap: space.lg },
  side: { width: 300, flexGrow: 0 },
  page: { padding: space.sm, alignItems: "center" },
  col: { width: "100%", maxWidth: 680, gap: space.lg, paddingBottom: space.xl },
  pager: { flexDirection: "row", gap: space.sm },
  toc: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 56, padding: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  tocOn: { borderColor: colors.ink, borderWidth: 2 },
  tocNum: { width: 28, height: 28, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  tip: { padding: space.md },
  specimen: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.sm },
  table: { overflow: "hidden" },
  tr: { flexDirection: "row" },
  thead: { backgroundColor: colors.surfaceAlt },
  td: { padding: space.sm, justifyContent: "center" },
  stepRow: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  stepNum: { width: 24, height: 24, borderRadius: radius.pill, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", marginTop: 1 },
});
