// Tutorial UI: the highlight frame, the coach card, the full screen pages, and the hook that
// drives them. The step script and the gating rules live in core/tutorial.ts (pure, tested).
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { Action, GameEvent, State } from "@tipping-point/engine";
import { KEYS } from "../core/storage";
import { blockReason, coachProgress, factsOf, settle, TUTORIAL_STEPS, type Facts, type SpotId, type TutorialStep } from "../core/tutorial";
import { store } from "../platform/storage";
import { colors, radius, space } from "../theme/tokens";
import { Button } from "../ui/Button";
import { Text } from "../ui/Text";
import { Plate } from "../ui/Plate";
import { Notebook } from "../ui/Notebook";
import { useTween } from "../ui/useTween";
import { elevation, RISE } from "../theme/tokens";

// ---------------------------------------------------------------- remembering that it was seen

export type TutorialStatus = "done" | "skipped" | null;

/** Loads whether the tutorial was finished or skipped. "loading" until storage answers. */
export function useTutorialStatus(): TutorialStatus | "loading" {
  const [status, setStatus] = useState<TutorialStatus | "loading">("loading");
  useEffect(() => {
    let alive = true;
    void store.getItem(KEYS.tutorial).then((v) => { if (alive) setStatus(v === "done" || v === "skipped" ? v : null); });
    return () => { alive = false; };
  }, []);
  return status;
}

/** "done" is never downgraded to "skipped", so replaying and skipping does not bring the nudge back. */
export async function saveTutorialStatus(next: "done" | "skipped"): Promise<void> {
  if (next === "skipped" && (await store.getItem(KEYS.tutorial)) === "done") return;
  await store.setItem(KEYS.tutorial, next);
}

// ---------------------------------------------------------------- the hook

export interface Tutorial {
  step: TutorialStep;
  index: number;
  facts: Facts;
  paragraphs: string[];
  progress: { n: number; total: number } | null;
  /** True when the step before this one is a plain info step the player can safely go back to. */
  canBack: boolean;
  /** Hidden while a drawn card is being played out on screen. */
  hidden: boolean;
  next: () => void;
  back: () => void;
  /** Why this action is not allowed right now, or null if it is. */
  block: (a: Action) => string | null;
}

/**
 * Drives the tutorial from the live game state. Pass enabled=false in a normal game and it does nothing.
 * The shown step is recomputed from the state on every render, so Undo and replays stay consistent.
 */
export function useTutorial(enabled: boolean, state: State, events: readonly GameEvent[], overlayOpen: boolean): Tutorial | null {
  const [index, setIndex] = useState(0);
  const settled = enabled ? settle(TUTORIAL_STEPS, index, state) : 0;

  // Keep the stored index in step with the settled one, so Next always moves from what the player sees.
  useEffect(() => { if (enabled && settled !== index) setIndex(settled); }, [enabled, settled, index]);

  // Facts replay the story, so only compute them when the tutorial is actually running.
  const facts = useMemo(() => (enabled ? factsOf(state, events) : null), [enabled, state, events]);
  const step = TUTORIAL_STEPS[settled]!;
  const paragraphs = useMemo(() => (facts ? step.body(facts) : []), [step, facts]);

  const next = useCallback(() => setIndex(settle(TUTORIAL_STEPS, settled + 1, state)), [settled, state]);
  const back = useCallback(() => setIndex(Math.max(0, settled - 1)), [settled]);
  const block = useCallback((a: Action) => blockReason(step, a, state), [step, state]);

  if (!enabled || !facts) return null;
  return {
    step, index: settled, facts, paragraphs,
    progress: coachProgress(TUTORIAL_STEPS, settled),
    canBack: settled > 0 && TUTORIAL_STEPS[settled - 1]!.kind === "info",
    hidden: overlayOpen,
    next, back, block,
  };
}

// ---------------------------------------------------------------- highlight frame

interface SpotProps {
  /** False in a normal game: the frame is not rendered at all, so layout is untouched. */
  active: boolean;
  /** Which part of the screen this frame wraps. */
  id: SpotId;
  /** The part of the screen the current step wants looked at, if any. */
  current: SpotId | null;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The tutorial's spotlight. The named piece is lifted into the light (the same Lift move as picking up a
 * tile: it rises and its shadow grows) while the rest of the table dims, so it shows the object instead of
 * boxing a region. Under reduced motion the lift is instant. Wrap it around the Metre, the chips, the hand or Draw.
 */
export function Spot({ active, id, current, children, style }: SpotProps) {
  const on = active && current === id;
  const dim = active && current !== null && current !== id;
  const lift = useTween(on ? 1 : 0, "lift");
  const fade = useTween(dim ? 0.45 : 1, "crossfade");
  if (!active) return <>{children}</>;
  return (
    <View
      style={[
        styles.spot,
        on && styles.spotOn,
        on && elevation.lifted,
        { opacity: fade, transform: [{ translateY: -RISE.lifted * lift }] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---------------------------------------------------------------- coach card

interface CoachProps { tut: Tutorial; compact: boolean; onSkip: () => void }

/** The tip card shown above the board for "coach" steps. Hidden while a drawn card is on screen. */
export function TutorialCoach({ tut, compact, onSkip }: CoachProps) {
  const { step } = tut;
  // The card remounts for every step (see key), so a hidden tip comes back on its own at the next one.
  return step.presentation === "coach" && !tut.hidden ? <CoachCard key={step.id} tut={tut} compact={compact} onSkip={onSkip} /> : null;
}

function CoachCard({ tut, compact, onSkip }: CoachProps) {
  const { step, progress, paragraphs } = tut;
  const [collapsed, setCollapsed] = useState(false);
  const waiting = step.kind === "action";
  return (
    <Notebook edge={colors.accent} style={styles.coach} accessibilityLiveRegion="polite">
      <View style={styles.coachHead}>
        <Text variant="label" color={colors.accent}>{progress ? `TUTORIAL, STEP ${progress.n} OF ${progress.total}` : "TUTORIAL"}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={collapsed ? "Show the tip" : "Hide the tip"} onPress={() => setCollapsed((c) => !c)} hitSlop={8}>
          <Text variant="label" color={colors.muted}>{collapsed ? "Show tip" : "Hide tip"}</Text>
        </Pressable>
      </View>
      <Text variant={compact ? "heading" : "title"} accessibilityRole="header">{step.title}</Text>
      {collapsed ? null : paragraphs.map((p, i) => <Text key={i} variant={compact ? "small" : "body"}>{p}</Text>)}
      {waiting && !collapsed ? <Text variant="label" color={colors.accent}>Your turn: try it on the board.</Text> : null}
      <View style={styles.row}>
        {tut.canBack ? <Button compact label="Back" onPress={tut.back} /> : null}
        {step.kind === "info" ? <Button compact kind="primary" label={step.nextLabel ?? "Next"} onPress={tut.next} /> : null}
        <View style={{ flex: 1 }} />
        <Button compact kind="quiet" label="Skip tutorial" onPress={onSkip} />
      </View>
    </Notebook>
  );
}

// ---------------------------------------------------------------- full screen pages

interface ModalHostProps {
  tut: Tutorial;
  onSkip: () => void;
  /** Finish page buttons. */
  onStartGame: () => void;
  onReplay: () => void;
  onMenu: () => void;
}

/** Welcome, "good to know" pages and the finish page. Covers the screen and cannot be dismissed by tapping outside. */
export function TutorialModalHost({ tut, onSkip, onStartGame, onReplay, onMenu }: ModalHostProps) {
  const { step } = tut;
  if (step.presentation !== "modal" || tut.hidden) return null;
  const finish = step.id === "finish";
  return (
    <View style={styles.modalWrap} accessibilityViewIsModal>
      <Plate elevation="held" corner={radius.lg} style={styles.modalCard}>
        {step.eyebrow ? <Text variant="label" color={colors.accent}>{step.eyebrow.toUpperCase()}</Text> : null}
        <Text variant="title" accessibilityRole="header">{step.title}</Text>
        <ScrollView style={styles.modalBody} contentContainerStyle={{ gap: space.md }}>
          {tut.paragraphs.map((p, i) => <Text key={i}>{p}</Text>)}
        </ScrollView>
        <View style={{ gap: space.sm }}>
          {finish ? (
            <>
              <Button kind="primary" label="Start a real game" onPress={onStartGame} />
              <Button label="Replay the tutorial" onPress={onReplay} />
              <Button kind="quiet" label="Back to the menu" onPress={onMenu} />
            </>
          ) : (
            <>
              <Button kind="primary" label={step.nextLabel ?? "Next"} onPress={tut.next} />
              <View style={styles.row}>
                {tut.canBack ? <Button compact label="Back" onPress={tut.back} /> : null}
                <View style={{ flex: 1 }} />
                <Button compact kind="quiet" label="Skip tutorial" onPress={onSkip} />
              </View>
            </>
          )}
        </View>
      </Plate>
    </View>
  );
}

const styles = StyleSheet.create({
  spot: { borderWidth: 3, borderColor: "transparent", borderRadius: radius.md },
  spotOn: { borderColor: colors.trophy, backgroundColor: "rgba(201,162,74,0.14)" },
  coach: { padding: 0 },
  coachHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  modalWrap: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrim, alignItems: "center", justifyContent: "center", padding: space.lg },
  modalCard: { width: "100%", maxWidth: 560, maxHeight: "92%", padding: space.lg, gap: space.md },
  modalBody: { flexGrow: 0 },
});
