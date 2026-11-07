import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { State } from "@tipping-point/engine";
import { useSettings } from "../app/SettingsProvider";
import { CARD_RATIO, revealPanelHeight } from "../core/cardArt";
import { isBigMoment } from "../core/soundPlan";
import { isSurgeBeat, movesMetre, phaseAtLeast, type RevealState } from "../core/revealPlan";
import type { Story, StoryStep } from "../core/story";
import { fonts, fontState, colors, space } from "../theme/tokens";
import { Key } from "../ui/Key";
import { Plate } from "../ui/Plate";
import { Text } from "../ui/Text";
import { usePulse, useTween } from "../ui/useTween";
import { CardBack, CardFace } from "./CardFace";
import { StoryBody } from "./StoryBody";

interface Rect { x: number; y: number; w: number; h: number }
/** Where a card sits: its centre and how much the reveal-size face is scaled. */
interface Pose { cx: number; cy: number; s: number }

interface Props {
  state: State;
  story: Story;
  reveal: RevealState;
  /** A tap anywhere on the table: finish the beat in progress. */
  onSkipBeat: () => void;
  /** Continue or Next card. Only counts at rest. */
  onProceed: () => void;
  /** Skip the rest of this draw. The table is already final; this only stops the show. */
  onSkipAll: () => void;
  /** The piles in the hand tray, measured so the card flies from the real deck and lands on the real discard. */
  drawRef: React.RefObject<View | null>;
  discardRef: React.RefObject<View | null>;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function measure(ref: React.RefObject<View | null>): Promise<Rect | null> {
  return new Promise((resolve) => {
    const done = setTimeout(() => resolve(null), 200); // a missing or slow native view must never stall the reveal
    try {
      const n = ref.current;
      if (!n || typeof n.measureInWindow !== "function") { clearTimeout(done); resolve(null); return; }
      n.measureInWindow((x, y, w, h) => { clearTimeout(done); resolve(Number.isFinite(x) && w > 0 ? { x, y, w, h } : null); });
    } catch { clearTimeout(done); resolve(null); }
  });
}

/**
 * The Ravage reveal (Phase 4): a drawn card lifts off the deck, flips and slides to the centre, settles into the notebook
 * panel, then each called tile is stamped as the board behind plays its hit. A Surge, Cascade or extinction clears the
 * panel away, shakes the Metre (in GameScreen), flashes the table red and stamps its name. The card ends on the discard pile.
 * What happens when is decided in core/revealPlan.ts; this draws it. Every beat can be skipped with a tap.
 */
export function RevealLayer(props: Props) {
  const rootRef = useRef<View>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [geo, setGeo] = useState<{ step: number; origin: Rect | null; deck: Rect | null; discard: Rect | null } | null>(null);
  const { step } = props.reveal;

  useEffect(() => {
    if (box.w === 0) return;
    let alive = true;
    void Promise.all([measure(rootRef), measure(props.drawRef), measure(props.discardRef)]).then(([origin, deck, discard]) => {
      if (alive) setGeo({ step, origin, deck, discard });
    });
    return () => { alive = false; };
  }, [step, box.w, box.h]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = box.w > 0 && geo !== null && geo.step === step;
  return (
    <View ref={rootRef} collapsable={false} style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {ready ? <StepView key={step} {...props} box={box} geo={geo!} /> : null}
    </View>
  );
}

function StepView({ state, story, reveal, onSkipBeat, onProceed, onSkipAll, box, geo }: Props & { box: { w: number; h: number }; geo: { origin: Rect | null; deck: Rect | null; discard: Rect | null } }) {
  const { settings } = useSettings();
  const { phase, step, shown } = reveal;
  const st = story.steps[step]!;
  const last = step === story.steps.length - 1;
  const big = isBigMoment(st);
  const moving = !settings.reducedMotion;

  // ---- geometry ----------------------------------------------------------------------------------------------
  const W = box.w, H = box.h;
  const cw = Math.round(Math.max(150, Math.min(240, W * 0.6, (H * 0.5) / CARD_RATIO)));
  const ch = Math.round(cw * CARD_RATIO);
  const PW = Math.min(560, W);
  // A Ravage panel needs room for the hits and the real-world fact; a Tool or Event has one line to say.
  const PH = revealPanelHeight(st.card.type, H);
  const dockW = W < 520 ? 84 : 100;
  const dockH = Math.round(dockW * CARD_RATIO);
  const pad = space.md;
  const rel = (r: Rect | null): Rect | null => (r ? { x: r.x - (geo.origin?.x ?? 0), y: r.y - (geo.origin?.y ?? 0), w: r.w, h: r.h } : null);
  const poses = useMemo(() => {
    const deck = rel(geo.deck), discard = rel(geo.discard);
    const centre: Pose = { cx: W / 2, cy: Math.max(ch / 2 + 8, (H - PH) * 0.5 + 8), s: 1 };
    const slot: Pose = { cx: (W - PW) / 2 + pad + dockW / 2, cy: H - PH + pad + dockH / 2, s: dockW / cw };
    const fromDeck: Pose = deck ? { cx: deck.x + deck.w * 0.45, cy: deck.y + deck.h * 0.6, s: Math.max(0.15, (deck.w * 0.85) / cw) } : { cx: W * 0.1, cy: H - 60, s: 0.2 };
    const toDiscard: Pose = discard ? { cx: discard.x + discard.w * 0.5, cy: discard.y + discard.h * 0.62, s: Math.max(0.15, (discard.w * 0.9) / dockW) } : { cx: W * 0.2, cy: H - 60, s: 0.4 };
    return { centre, slot, fromDeck, toDiscard };
  }, [W, H, cw, ch, PW, PH, dockW, dockH, geo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- motion, all through the named moves in theme/motion.ts ------------------------------------------------------
  const docked = phaseAtLeast(phase, "dock");
  const draw = useTween(1, "cardSlide", 0);                // deck to centre
  const flip = useTween(1, "cardFlip", 0);                  // the face swaps at the half
  const dock = useTween(docked ? 1 : 0, "cardSlide");      // centre to the panel's slot
  const away = useTween(phase === "away" ? 1 : 0, "cardSlide"); // slot to the discard pile
  const scrim = useTween(phase === "draw" || phase === "read" ? 1 : 0, "cardSlide", 0);
  const fade = useTween(1, "crossfade", 0);                 // what reduced motion uses instead of a move
  // A Surge clears the panel off the Metre, so the slider can be seen moving.
  const clear = useTween(movesMetre(st) && (phase === "beat" || phase === "metre") ? 1 : 0, "cardSlide");

  const [flashKey, setFlashKey] = useState(0);
  const surgeNow = isSurgeBeat(story, reveal);
  useEffect(() => { if (surgeNow) setFlashKey((k) => k + 1); }, [surgeNow]);
  const flash = Math.sin(Math.PI * usePulse(flashKey, "flash")); // 0 at rest, peaks mid-way; absent under reduced motion
  const stamp = useTween(big && (phase === "beat" || phase === "metre") ? 1 : 0, "place", 0);

  // The panel and its slot card come in as the flying card docks (or just fade in under reduced motion).
  const panelIn = moving ? clamp01((dock - 0.5) / 0.25) : fade;
  const panelOpacity = docked ? panelIn * (1 - away) : 0;
  const slotOpacity = moving ? clamp01((dock - 0.8) / 0.2) : fade;

  const flying = moving && (phase === "draw" || phase === "read" || (phase === "dock" && dock < 1));
  const pos = (a: Pose, b: Pose, t: number): Pose => ({ cx: lerp(a.cx, b.cx, t), cy: lerp(a.cy, b.cy, t), s: lerp(a.s, b.s, t) });
  const fly = pos(pos(poses.fromDeck, poses.centre, draw), poses.slot, dock);
  const tilt = lerp(-9, 0, draw) * (1 - dock);
  const flipX = Math.max(0.001, Math.abs(Math.cos(Math.PI * flip)));
  const autoBeat = phase !== "rest" && phase !== "away";
  const scroller = useRef<ScrollView>(null);
  // At rest the panel shows its end (the real-world fact and the keys) when the text overflows. Waiting a moment lets the last lines lay out first.
  const toEnd = () => scroller.current?.scrollTo({ y: 100000, animated: false });
  useEffect(() => { if (phase !== "rest") return; const a = setTimeout(toEnd, 80), b = setTimeout(toEnd, 350); return () => { clearTimeout(a); clearTimeout(b); }; }, [phase, step]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: scrim * 0.85 }]} pointerEvents="none" />
      {flash > 0.001 ? <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.danger, opacity: flash * 0.34 }]} pointerEvents="none" /> : null}
      {autoBeat ? <Pressable style={StyleSheet.absoluteFill} onPress={onSkipBeat} accessibilityRole="button" accessibilityLabel="Skip to the next step" /> : null}

      {flying ? (
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: "absolute", left: 0, top: 0, width: cw, height: ch, transform: [{ translateX: fly.cx - cw / 2 }, { translateY: fly.cy - ch / 2 }, { rotate: `${tilt}deg` }, { scale: fly.s }, { scaleX: flipX }], opacity: 1 - clamp01((dock - 0.65) / 0.35) }}>
          {flip < 0.5 ? <CardBack width={cw} /> : <CardFace card={st.card} width={cw} size="reveal" />}
        </View>
      ) : null}
      {phase === "away" ? <AwayCard card={st.card} dockW={dockW} from={poses.slot} to={poses.toDiscard} /> : null}

      {stamp > 0.001 ? <SurgeStamp st={st} t={stamp} top={Math.max(24, H * 0.12)} /> : null}

      <Plate
        elevation="held"
        corner={16}
        topOnly
        accessibilityViewIsModal={false}
        pointerEvents={panelOpacity > 0.5 && phase !== "away" ? "auto" : "none"}
        style={{ position: "absolute", bottom: 0, left: (W - PW) / 2, width: PW, height: PH, padding: pad, opacity: panelOpacity, transform: [{ translateY: clear * PH * 0.76 + (1 - panelIn) * 24 }] }}
      >
        <View style={{ flex: 1, minHeight: 0, flexDirection: "row", gap: pad }}>
          <View style={{ width: dockW, height: dockH, opacity: phase === "away" ? 0 : slotOpacity }}>
            <CardFace card={st.card} width={dockW} size="hand" />
          </View>
          <ScrollView ref={scroller} onContentSizeChange={() => { if (phase === "rest") toEnd(); }} style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ paddingBottom: space.sm }} keyboardShouldPersistTaps="handled">
            <StoryBody state={state} story={story} step={step} shown={shown} phase={phase} />
          </ScrollView>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, paddingTop: space.xs }}>
          <Key kind="primary" label={last ? "Continue" : "Next card"} onPress={onProceed} disabled={phase !== "rest"} style={{ flex: 2 }} />
          <Key kind="quiet" label="Skip" onPress={onSkipAll} style={{ flex: 1 }} />
        </View>
      </Plate>
    </>
  );
}

/** The card, at hand size, from its slot in the panel to the discard pile. Mounted only for that beat so its tween starts at the slot. */
function AwayCard({ card, dockW, from, to }: { card: StoryStep["card"]; dockW: number; from: Pose; to: Pose }) {
  const t = useTween(1, "cardSlide", 0);
  const h = Math.round(dockW * CARD_RATIO);
  const cx = lerp(from.cx, to.cx, t), cy = lerp(from.cy, to.cy, t), s = lerp(1, to.s, t);
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: "absolute", left: 0, top: 0, width: dockW, height: h, transform: [{ translateX: cx - dockW / 2 }, { translateY: cy - h / 2 }, { scale: s }] }}>
      <CardFace card={card} width={dockW} size="hand" />
    </View>
  );
}

/** SURGE, CASCADE or EXTINCTION, stamped on the table for the beat the Metre moves. It is the loudest thing on the screen. */
function SurgeStamp({ st, t, top }: { st: StoryStep; t: number; top: number }) {
  const text = st.extinct.length ? "EXTINCTION" : st.cascade.length ? "CASCADE" : "SURGE";
  return (
    <View pointerEvents="none" accessible accessibilityLiveRegion="assertive" accessibilityLabel={`${text.charAt(0)}${text.slice(1).toLowerCase()}.`} style={{ position: "absolute", left: 0, right: 0, top, alignItems: "center", opacity: clamp01(t * 1.4) }}>
      <View style={{ transform: [{ rotate: "-4deg" }, { scale: lerp(1.5, 1, Math.min(1, t)) }], backgroundColor: colors.dangerText, borderWidth: 3, borderColor: colors.ink, borderRadius: 6, paddingHorizontal: space.xl, paddingVertical: space.sm }}>
        <Text variant="display" color="#FFFFFF" style={[{ letterSpacing: 4 }, fontState.custom ? { fontFamily: fonts.stamp } : null]}>{text}</Text>
      </View>
    </View>
  );
}
