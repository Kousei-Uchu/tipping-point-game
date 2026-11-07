// The play guide UI: a strip that always says whose turn it is and what to do next, and a "how a turn works" sheet.
// All the wording comes from core/guide.ts (pure, tested). This file only draws it.
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { GameEvent, State } from "@tipping-point/engine";
import { buildGuide, isPassAndPlay, recap } from "../core/guide";
import { KEYS } from "../core/storage";
import { store } from "../platform/storage";
import { colors, radius, space } from "../theme/tokens";
import { Button } from "../ui/Button";
import { Sheet } from "../ui/Sheet";
import { Text } from "../ui/Text";
import { Label } from "../ui/Label";
import { Notebook } from "../ui/Notebook";

// ---------------------------------------------------------------- remembering open or closed

/** Whether the strip is expanded. Remembered, so someone who has learned the game can fold it away for good. */
export function useGuideOpen(): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    let alive = true;
    void store.getItem(KEYS.guide).then((v) => { if (alive && v === "closed") setOpen(false); });
    return () => { alive = false; };
  }, []);
  const set = (v: boolean) => { setOpen(v); void store.setItem(KEYS.guide, v ? "open" : "closed"); };
  return [open, set];
}

// ---------------------------------------------------------------- the strip

interface StripProps {
  state: State;
  events: readonly GameEvent[];
  compact: boolean;
  open: boolean;
  onToggle: (open: boolean) => void;
  onHelp: () => void;
}

export function GuideStrip({ state, events, compact, open, onToggle, onHelp }: StripProps) {
  const g = useMemo(() => buildGuide(state), [state]);
  const lines = useMemo(() => recap(state, events, 3), [state, events]);
  const pass = g.mode === "turn" && g.fresh && isPassAndPlay(state);
  const [more, setMore] = useState(false);
  const accent = g.who.colour;

  // The turn is the one thing that must never be missed, so it stays on screen even when folded.
  const head = (
    <View style={styles.head}>
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <View style={{ flex: 1 }}>
        <View style={styles.stamp}><Label text={g.mode === "bot" ? "BOT TURN" : g.mode === "decision" ? "DECISION" : g.mode === "turn" || g.mode === "finalLap" ? "YOUR TURN" : "GUIDE"} tone={g.mode === "decision" ? "bad" : g.mode === "turn" || g.mode === "finalLap" ? "good" : "neutral"} /></View>
        <Text variant={compact ? "heading" : "title"} accessibilityRole="header">{pass ? `Pass the device to ${g.who.name}.` : g.headline}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={open ? "Fold the guide away" : "Show the guide"} onPress={() => onToggle(!open)} hitSlop={8} style={styles.fold}>
        <Text variant="label" color={colors.muted}>{open ? "Hide" : "Show"}</Text>
      </Pressable>
    </View>
  );

  return (
    <Notebook ribbon={accent} style={styles.wrap} accessibilityLiveRegion="polite">
      {head}
      {open ? (
        <>
          <View style={[styles.block, styles.ruled]}>
            <Text variant="label" color={colors.muted}>DO THIS NOW</Text>
            <Text variant={compact ? "small" : "body"}>{g.now}</Text>
          </View>
          {more && g.also.length ? (
            <View style={styles.block}>
              <Text variant="label" color={colors.muted}>ALSO POSSIBLE</Text>
              {g.also.map((t, i) => <Text key={i} variant="small">{`• ${t}`}</Text>)}
            </View>
          ) : null}
          {more && g.then ? (
            <View style={styles.block}>
              <Text variant="label" color={colors.muted}>THEN</Text>
              <Text variant="small">{g.then}</Text>
            </View>
          ) : null}
          {more && lines.length ? (
            <View style={styles.block}>
              <Text variant="label" color={colors.muted}>JUST HAPPENED</Text>
              {lines.map((l, i) => <Text key={i} variant="small" color={l.tone === "bad" ? colors.danger : l.tone === "good" ? colors.good : colors.ink}>{l.text}</Text>)}
            </View>
          ) : null}
          <View style={styles.row}>
            <Button compact label={more ? "Less" : "More"} onPress={() => setMore((m) => !m)} />
            <Button compact label="How a turn works" onPress={onHelp} />
          </View>
        </>
      ) : null}
    </Notebook>
  );
}

// ---------------------------------------------------------------- the sheet

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="heading" accessibilityRole="header">{title}</Text>
      {children}
    </View>
  );
}

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <View style={styles.stepRow}>
    <View style={styles.stepNum}><Text variant="label" color={colors.paper}>{String(n)}</Text></View>
    <View style={{ flex: 1 }}>{children}</View>
  </View>
);

export function GuideSheet({ state, events, docked, onClose, onRulebook }: { state: State; events: readonly GameEvent[]; docked: boolean; onClose: () => void; onRulebook: () => void }) {
  const g = useMemo(() => buildGuide(state), [state]);
  const lines = useMemo(() => recap(state, events, 8), [state, events]);
  return (
    <Sheet title="How a turn works" subtitle="Cooperative game: everyone wins together or loses together." onClose={onClose} docked={docked} footer={<Button kind="primary" label="Open the full rulebook" onPress={onRulebook} />}>
      <Section title="The goal">
        <Text>Bring the Pressure Metre down to the Trophy. Repair damaged tiles to push it down. Every card you draw can push it back up. If it reaches the Skull, or a second biome dies out, everyone loses.</Text>
      </Section>

      <Section title="Right now">
        <Text>{g.headline}</Text>
        <Text variant="small" color={colors.muted}>{g.now}</Text>
        <Text variant="small" color={colors.muted}>{g.danger}</Text>
      </Section>

      <Section title="Your turn, step by step">
        <Step n={1}><Text>{"Look for a pale tile with a dashed edge. That means damaged (\"vulnerable\"). Fixing these is how you win."}</Text></Step>
        <Step n={2}><Text>{"Move. Tap a teal tile, then Move here. You can walk a few tiles each turn (the Move chip shows how many are left)."}</Text></Step>
        <Step n={3}><Text>{"Repair. Stand on a damaged tile of the same biome as your Tool, tap the Tool card, then Restore."}</Text></Step>
        <Step n={4}><Text>{"Optional: Fortify a healthy tile, Gift a Tool to a Steward on your tile, or use your Role ability."}</Text></Step>
        <Step n={5}><Text>{"Press Draw. This ends your turn. The next Steward goes, and the screen says whose turn it is."}</Text></Step>
      </Section>

      <Section title="The chips under the title">
        <Text>{"Move: tiles you can still walk. Tool: one Tool action per turn. Ability: your role power, once per turn. Gift: pass a card to someone on your tile."}</Text>
        <Text variant="small" color={colors.muted}>A greyed chip means that action is used up for this turn.</Text>
      </Section>

      <Section title="After you press Draw">
        <Text>Most cards are Ravage cards. They call tiles of one biome, and each called tile gets worse: it loses a Shield, then becomes damaged, then is lost for good. The higher the Pressure, the more tiles are called. Tap Next to read each card.</Text>
      </Section>

      <Section title="Lost on the screen?">
        <Text variant="small">{"• Whose turn: the coloured dot and the title at the top, and the box above the board."}</Text>
        <Text variant="small">{"• What can I do: the box above the board says what to do now."}</Text>
        <Text variant="small">{"• Made a mistake: Undo, top right. It works until you press Draw."}</Text>
        <Text variant="small">{"• What happened: Log, or the Just happened list below."}</Text>
      </Section>

      {lines.length ? (
        <Section title="Just happened">
          {lines.map((l, i) => <Text key={i} variant="small" color={l.tone === "bad" ? colors.danger : l.tone === "good" ? colors.good : colors.ink}>{l.text}</Text>)}
        </Section>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 0 },
  stamp: { transform: [{ rotate: "-2deg" }], alignSelf: "flex-start", marginBottom: 2 },
  ruled: { borderBottomWidth: 1, borderBottomColor: "rgba(201,188,155,0.9)", paddingBottom: space.xs },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm },
  dot: { width: 18, height: 18, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.ink },
  fold: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
  block: { gap: 2 },
  row: { flexDirection: "row", gap: space.sm },
  stepRow: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  stepNum: { width: 24, height: 24, borderRadius: radius.pill, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", marginTop: 1 },
});
