import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { Card } from "@tipping-point/content";
import type { Action } from "@tipping-point/engine";
import { content, engine } from "../core/content";
import { explainError } from "../core/errors";
import { buildStory, type Story } from "../core/story";
import { motionMs } from "../core/settings";
import { displayPlayers, displayTiles } from "../core/reveal";
import { cardWidthFor } from "../core/cardArt";
import { metreDisplay, phaseAtLeast, pulsingBiome, type RevealState } from "../core/revealPlan";
import { cueForAction, isBigMoment, soundForOutcome } from "../core/soundPlan";
import { stampMs } from "../theme/motion";
import { abilityStatus, actorId, counters, isPlaying, toolOptions, unusedActions } from "../core/selectors";
import { setRulebookTarget } from "../core/rulebook";
import { guideFocus } from "../core/guide";
import { TUTORIAL_OPTIONS, TUTORIAL_TARGET } from "../core/tutorial";
import { useNav } from "../app/NavProvider";
import { useSessionCtx, useSnapshot } from "../app/SessionProvider";
import { useSettings } from "../app/SettingsProvider";
import { cue } from "../platform/feedback";
import { exportText } from "../platform/exportText";
import { colors, radius, space } from "../theme/tokens";
import { Button } from "../ui/Button";
import { Screen } from "../ui/Screen";
import { Sheet } from "../ui/Sheet";
import { Text } from "../ui/Text";
import { useLayout } from "../ui/useLayout";
import { BoardView } from "../game/BoardView";
import { EventLog } from "../game/EventLog";
import { HandTray } from "../game/HandTray";
import { Metre } from "../game/Metre";
import { PlayersPanel } from "../game/PlayersPanel";
import { GuideSheet, GuideStrip, useGuideOpen } from "../game/PlayGuide";
import { RoleCardView } from "../game/RoleCardView";
import { TurnBanner } from "../game/TurnBanner";
import { RevealLayer } from "../game/RevealLayer";
import { useReveal } from "../game/useReveal";
import { TurnHandoff, type Handoff } from "../game/TurnHandoff";
import { saveTutorialStatus, Spot, TutorialCoach, TutorialModalHost, useTutorial } from "../game/Tutorial";
import { useToast } from "../game/useToast";
import { CardSheet } from "../game/sheets/CardSheet";
import { PendingSheet } from "../game/sheets/PendingSheet";
import { RoleSheet } from "../game/sheets/RoleSheet";
import { TileSheet } from "../game/sheets/TileSheet";
import type { Highlight } from "../game/Tile";
import { Plate } from "../ui/Plate";
import { Label } from "../ui/Label";

type Panel =
  | { kind: "tile"; id: number }
  | { kind: "card"; index: number }
  | { kind: "role" }
  | { kind: "confirmDraw" }
  | { kind: "menu" }
  | { kind: "log" }
  | { kind: "players" }
  | { kind: "guide" }
  | null;

/** The cards a draw turned over. How far the reveal has got is in `useReveal` (game/useReveal.ts). */
interface Overlay { story: Story }

export function GameScreen() {
  const { session, sessionKey } = useSessionCtx();
  const nav = useNav();
  useEffect(() => { if (!session) nav.navigate("title"); }, [session, nav]);
  if (!session) return null;
  // The key resets panels, overlays and tutorial progress whenever a new session starts (for example "Replay the tutorial").
  return <GameInner key={sessionKey} />;
}

function GameInner() {
  const { session, controls, leave, start, isTutorial } = useSessionCtx();
  const nav = useNav();
  const { settings } = useSettings();
  const layout = useLayout();
  const snap = useSnapshot(session!);
  const state = snap.state;
  const toast = useToast();

  const [panel, setPanel] = useState<Panel>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [hiddenPending, setHiddenPending] = useState<string | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [guideOpen, setGuideOpen] = useGuideOpen();
  // The engine keeps no discard pile, so the app remembers the last Ravage or Event card it showed. Empty after a reload.
  const [discardTop, setDiscardTop] = useState<Card | null>(null);
  // Bumped when a Surge, Cascade or extinction lands, to shake the Metre.
  const [shakeKey, setShakeKey] = useState(0);
  // The turn stamp. `queuedSeat` waits for any card being read to close before the stamp shows.
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [queuedSeat, setQueuedSeat] = useState<number | null>(null);
  // The piles in the hand tray, measured by the reveal so the card flies from the real deck and lands on the real discard.
  const drawRef = useRef<View>(null);
  const discardRef = useRef<View>(null);
  const overlayRef = useRef(overlay); overlayRef.current = overlay;
  // Each card reaches the discard pile when its beat is over; the last one closes the reveal.
  const onLanded = useCallback((stepIdx: number, done: boolean) => {
    const c = overlayRef.current?.story.steps[stepIdx]?.card;
    if (c && c.type !== "tool") setDiscardTop(c);
    if (done) setOverlay(null);
  }, []);
  const rv = useReveal(overlay?.story ?? null, settings, onLanded);

  // null in a normal game. In the tutorial it decides which step is showing and which actions are allowed.
  const tut = useTutorial(isTutorial, state, snap.events, !!overlay);
  const tutBlock = tut ? tut.block : null;
  const tutSpot = tut ? tut.step.spot ?? null : undefined; // undefined = no frames at all (normal game)

  // Reaching the last page counts as finishing, even if the player then leaves from the menu.
  const onFinishPage = !!tut && tut.step.id === "finish";
  useEffect(() => { if (onFinishPage) void saveTutorialStatus("done"); }, [onFinishPage]);

  const exitTutorial = useCallback(() => { leave(false); nav.navigate("title"); }, [leave, nav]);
  const skipTutorial = useCallback(() => { void saveTutorialStatus("skipped"); exitTutorial(); }, [exitTutorial]);
  const startRealGame = useCallback(() => { leave(false); nav.navigate("title"); nav.navigate("lobby"); }, [leave, nav]);
  const replayTutorial = useCallback(() => start(TUTORIAL_OPTIONS, { tutorial: true }), [start]);

  const phone = layout.mode === "phone";
  const openRules = useCallback((chapter?: string) => { setRulebookTarget(chapter ?? null); nav.navigate("rules"); }, [nav]);
  const active = state.players[state.activeSeat]!;
  const actor = state.players[state.pending ? state.pending.seat : state.activeSeat]!;
  const canAct = controls === "all" || controls.includes(actor.id);
  const playing = isPlaying(state);
  const volunteer = state.pending?.kind === "volunteerMove" ? state.pending : null;

  // ---- dispatching ----------------------------------------------------------------------------
  const rememberDiscard = useCallback((story: Story) => {
    const last = [...story.steps].reverse().find((st) => st.card.type !== "tool");
    if (last) setDiscardTop(last.card);
  }, []);
  const act = useCallback((a: Action) => {
    // Tutorial: only the action the current step is waiting for may go through.
    const why = tutBlock ? tutBlock(a) : null;
    if (why) { toast.show(why); cue("warn", settings); return; }
    const cur = session!.getSnapshot().state;
    const r = session!.dispatch(a, actorId(cur));
    if (!r.ok) { toast.show(explainError(r.error)); cue("warn", settings); return; }
    cue(cueForAction({ type: a.type, kind: a.type === "UseTool" ? a.kind : undefined }), settings);
    setPanel(null);
    const story = buildStory(content, r.events, cur);
    if (story.steps.length) setOverlay({ story });
    else if (story.trophy) toast.show("Trophy reached. Everyone else gets one last turn.");
  }, [session, settings, toast, tutBlock]);

  const undo = useCallback(() => { if (session!.undo()) { setPanel(null); setOverlay(null); } }, [session]);

  // ---- bots: one action at a time, paused while a card is being read -------------------------------
  const botActing = playing && actor.isBot === true;
  useEffect(() => {
    if (!botActing || overlay || handoff || queuedSeat !== null || panel?.kind === "menu") return;
    const ms = Math.max(settings.reducedMotion ? 150 : 0, motionMs(settings, 700));
    const t = setTimeout(() => {
      const cur = session!.getSnapshot().state;
      if (cur.phase === "over") return;
      act(engine.chooseAction(cur));
    }, ms);
    return () => clearTimeout(t);
  }, [botActing, overlay, handoff, queuedSeat, state, panel?.kind, settings, session, act]);

  // Jump to the end of this bot's turn without watching it. The event log still has everything.
  const skipBot = useCallback(() => {
    let cur = session!.getSnapshot().state;
    const seat = cur.activeSeat;
    for (let n = 0; n < 80 && cur.phase !== "over" && cur.activeSeat === seat; n++) {
      const who = cur.players[cur.pending ? cur.pending.seat : cur.activeSeat]!;
      if (!who.isBot) break;
      const r = session!.dispatch(engine.chooseAction(cur), actorId(cur));
      if (!r.ok) break;
      rememberDiscard(buildStory(content, r.events));
      cur = session!.getSnapshot().state;
    }
    setOverlay(null); setPanel(null);
  }, [session, rememberDiscard]);

  // ---- the turn passes: a stamp, then the guide updates -------------------------------------------
  const lastSeat = useRef(state.activeSeat);
  useEffect(() => {
    if (lastSeat.current === state.activeSeat) return;
    lastSeat.current = state.activeSeat;
    if (!isTutorial && state.phase !== "over") setQueuedSeat(state.activeSeat);
  }, [state.activeSeat, state.phase, isTutorial]);
  useEffect(() => {
    if (queuedSeat === null || overlay || state.phase === "over") return;
    const p = state.players[queuedSeat]!;
    setQueuedSeat(null);
    cue("handoff", settings);
    setHandoff({ key: Date.now(), seat: p.seat, name: p.name, colour: p.colour, bot: p.isBot ? (p.botLevel ?? "bot") : null });
  }, [queuedSeat, overlay, state.phase, state.players, settings]);
  useEffect(() => {
    if (!handoff) return;
    const t = setTimeout(() => setHandoff(null), stampMs(settings));
    return () => clearTimeout(t);
  }, [handoff?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- sounds follow what the table shows ------------------------------------------------------------------------
  // The card flips and slides as it moves, each hit sounds as its number is stamped, and the big moment lands with the Metre.
  const prevRv = useRef<RevealState | null>(null);
  useEffect(() => {
    const cur = rv.state, prev = prevRv.current;
    prevRv.current = cur;
    if (!cur || !overlay) return;
    const st = overlay.story.steps[cur.step]!;
    const same = !!prev && prev.step === cur.step;
    const was = (p: Parameters<typeof phaseAtLeast>[1]) => same && phaseAtLeast(prev!.phase, p);
    const moves = motionMs(settings, 100) > 0; // no flip or slide sound when nothing flips or slides
    if (!same) { if (cur.step > 0) cue("cardDraw", settings); if (moves) cue("cardFlip", settings); }
    if (moves && phaseAtLeast(cur.phase, "dock") && !was("dock")) cue("cardSlide", settings);
    if (moves && cur.phase === "away" && !(same && prev!.phase === "away")) cue("cardSlide", settings);
    for (const tile of st.called.slice(same ? prev!.shown : 0, cur.shown)) {
      for (const o of st.outcomes.filter((x) => x.tile === tile)) cue(soundForOutcome(o.outcome), settings);
    }
    if (isBigMoment(st) && phaseAtLeast(cur.phase, "metre") && !was("metre")) { cue("surge", settings); setShakeKey((k) => k + 1); }
  }, [rv.state?.step, rv.state?.phase, rv.state?.shown]); // eslint-disable-line react-hooks/exhaustive-deps

  const skipAll = useCallback(() => { if (overlay) rememberDiscard(overlay.story); setOverlay(null); }, [overlay, rememberDiscard]);

  // ---- game over -----------------------------------------------------------------------------
  useEffect(() => { if (state.phase === "over" && !overlay) nav.navigate("result"); }, [state.phase, overlay, nav]);

  // ---- board data ----------------------------------------------------------------------------
  const reach = useMemo(() => {
    if (!playing) return new Map<number, number[]>();
    if (volunteer) return engine.moveTargets(state, state.players[volunteer.seat]!.id, 2);
    if (state.pending || !state.turn) return new Map<number, number[]>();
    return engine.moveTargets(state, active.id);
  }, [state, playing, volunteer, active.id]);

  // Tutorial: which tiles the current step wants circled. Plain booleans so the memo below stays stable.
  const ringVulnerable = !!tut?.step.ringVulnerable;
  const ringTarget = !!tut?.step.ringTarget;

  // While a reveal plays, tiles not yet revealed show as they were before the hit, with their owner token and any pawn on them.
  const rvs = overlay ? rv.state : null;
  const shownState = useMemo(
    () => (overlay && rvs ? { ...state, tiles: displayTiles(state.tiles, overlay.story, rvs.step, rvs.shown) as typeof state.tiles, players: displayPlayers(state.players, overlay.story, rvs.step, rvs.shown) as typeof state.players } : state),
    [state, overlay?.story, rvs?.step, rvs?.shown], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const pulse = overlay && rvs ? pulsingBiome(overlay.story, rvs) : null;
  // Phase 5: "Do this now" lights what it names (the damaged tile, your Tool cards, the draw pile). It waits for
  // the turn stamp and any card being read, like the guide itself, and the tutorial has its own rings.
  const lightsOn = !isTutorial && playing && !overlay && !state.pending && !handoff && queuedSeat === null && !botActing;
  const focus = useMemo(() => (lightsOn ? guideFocus(state) : { tiles: [] as number[], hand: false, deck: false }), [lightsOn, state]);
  const highlights = useMemo(() => {
    const m = new Map<number, Highlight>();
    // In the tutorial the teal "you can reach this" tiles only appear on the Move step, so they never clutter other lessons.
    const showReach = !overlay && (!isTutorial || ringTarget);
    if (showReach) for (const id of reach.keys()) m.set(id, "reach");
    if (!overlay && ringVulnerable) for (const t of state.tiles) if (t.status === "vulnerable") m.set(t.id, "target");
    if (!overlay && ringTarget) m.set(TUTORIAL_TARGET, "target");
    for (const id of focus.tiles) m.set(id, "target");
    // The named biome pulses once before the numbers are stamped.
    if (pulse) for (const t of shownState.tiles) if (t.biome === pulse && t.status !== "removed") m.set(t.id, "pulse");
    if (panel?.kind === "tile") m.set(panel.id, "selected");
    return m;
  }, [reach, panel, overlay, isTutorial, ringTarget, ringVulnerable, state.tiles, pulse, shownState.tiles, focus]);

  const badges = useMemo(() => {
    const m = new Map<number, number>();
    if (overlay && rvs) overlay.story.steps[rvs.step]!.called.slice(0, rvs.shown).forEach((t, i) => m.set(t, i + 1));
    return m;
  }, [overlay, rvs?.step, rvs?.shown]); // eslint-disable-line react-hooks/exhaustive-deps

  // The Metre keeps its old reading until its own beat, then the slider moves.
  const metreTicks = overlay && rvs ? metreDisplay(overlay.story, rvs.step, rvs.phase, state.metreTicks) : state.metreTicks;

  const selectedPath = panel?.kind === "tile" ? reach.get(panel.id) ?? [] : [];

  const previewTicks = useMemo(() => {
    const down = content.rules.metre.restore_ticks_down;
    if (!state.turn || state.pending) return null;
    if (panel?.kind === "card") { const o = toolOptions(state, active, panel.index); return o.restore === null ? state.metreTicks - down : o.fortify === null ? state.metreTicks - content.rules.metre.fortify_ticks_down : null; }
    if (panel?.kind === "tile" && panel.id === active.pos) {
      const t = state.tiles[panel.id]!;
      const key = t.status === "vulnerable" ? "restore" : "fortify";
      const ok = active.hand.some((_, i) => { const o = toolOptions(state, active, i); return key === "restore" ? o.restore === null : o.fortify === null; });
      if (ok) return state.metreTicks - (key === "restore" ? down : content.rules.metre.fortify_ticks_down);
    }
    return null;
  }, [panel, state, active]);

  const onTilePress = useCallback((id: number) => {
    if (overlay) return;
    if (volunteer) { const path = reach.get(id); if (path && canAct) act({ type: "Resolve", payload: { path } }); else toast.show("Pick a highlighted tile, or stay put."); return; }
    if (state.pending) return;
    cue("lift", settings);
    setPanel({ kind: "tile", id });
  }, [overlay, volunteer, reach, canAct, act, state.pending, toast, settings]);

  const onDraw = () => {
    const left = unusedActions(state);
    if (left.length && !isTutorial) setPanel({ kind: "confirmDraw" }); else act({ type: "Draw" });
  };

  // ---- pieces ----------------------------------------------------------------------------------
  const cardWidth = cardWidthFor(phone ? 92 : layout.dense ? 84 : 112, settings.textScale);
  const c = counters(state);
  const abilityReady = !!c && active.roles.some((r) => { const st = abilityStatus(state, active, r); return st.kind === "ready" || st.kind === "choice"; });
  const pendingKey = state.pending ? JSON.stringify(state.pending) : null;
  const showPending = !!state.pending && !volunteer && !overlay && hiddenPending !== pendingKey;

  // At large text three keys no longer fit across, so they take a row each share and wrap.
  const stripKey = settings.textScale > 1.25 ? { flexGrow: 1, flexBasis: "45%" as const } : { flex: 1 };
  const sheetBase = { state, actor: active, canAct, docked: phone, onAct: act, onClose: () => setPanel(null) };

  const board = (
    <View style={styles.boardRow}>
      <BoardView state={shownState} highlights={highlights} path={selectedPath} pathFrom={active.pos} badges={badges} focusTile={active.pos} onTilePress={onTilePress} comfortable={phone && !isTutorial} />
      <Spot active={isTutorial} id="metre" current={tutSpot ?? null} style={{ flexDirection: "row" }}>
        <Metre ticks={metreTicks} previewTicks={previewTicks} compact={phone} shakeKey={shakeKey} />
      </Spot>
    </View>
  );

  const rolesBlock = (
    <View style={{ gap: space.sm }}>
      {active.roles.map((r) => <RoleCardView key={r} role={r} />)}
      <Button label="Use ability" onPress={() => setPanel({ kind: "role" })} disabled={!canAct || !abilityReady || !!state.pending} />
    </View>
  );

  return (
    <Screen felt>
      <View style={styles.root}>
        {!phone ? (
          <View style={[styles.left, { width: layout.mode === "desktop" ? 340 : 280 }]}>
            <ScrollView contentContainerStyle={{ gap: space.md, paddingBottom: space.md }}>
              <Label text={`${active.name}'s role`} />
              {rolesBlock}
              <Label text="Stewards" />
              <PlayersPanel state={state} />
            </ScrollView>
            <Label text="Log" />
            <Plate elevation="flat" style={styles.logBox}><EventLog state={state} events={snap.events} /></Plate>
          </View>
        ) : null}

        <View style={styles.main}>
          <TurnBanner state={state} canUndo={snap.canUndo} onUndo={undo} onMenu={() => setPanel({ kind: "menu" })} compact={phone || layout.dense} spot={tutSpot} />
          {tut ? <TutorialCoach tut={tut} compact={phone || layout.dense} onSkip={skipTutorial} /> : null}
          {!isTutorial && playing && !overlay ? (
            <View style={{ opacity: handoff || queuedSeat !== null ? 0 : 1 }}>
              <GuideStrip state={state} events={snap.events} compact={phone || layout.dense} open={guideOpen} onToggle={setGuideOpen} onHelp={() => setPanel({ kind: "guide" })} />
            </View>
          ) : null}
          {board}
          {botActing && !overlay && !handoff && !isTutorial ? (
            <Plate style={styles.bar}>
              <Text variant="heading">{`${actor.name} is playing.`}</Text>
              <Button compact label="Skip to the end of the turn" onPress={skipBot} />
            </Plate>
          ) : null}
          {volunteer ? (
            <Plate style={styles.bar}>
              <Text variant="heading">{`Volunteer Day: ${state.players[volunteer.seat]!.name} may move up to 2 tiles.`}</Text>
              <Text variant="small" color={colors.muted}>Tap a highlighted tile on the board.</Text>
              <Button label="Stay put" onPress={() => act({ type: "Resolve", payload: { path: [] } })} disabled={!canAct} />
            </Plate>
          ) : null}
          {state.pending && !volunteer && hiddenPending === pendingKey && !overlay ? (
            <Plate style={styles.bar}>
              <Text variant="heading">A decision is waiting.</Text>
              <Button kind="primary" label="Open decision" onPress={() => setHiddenPending(null)} />
            </Plate>
          ) : null}
          {phone ? (
            <View style={styles.strip}>
              <Button compact label="Role" onPress={() => setPanel({ kind: "role" })} style={stripKey} />
              <Button compact label="Stewards" onPress={() => setPanel({ kind: "players" })} style={stripKey} />
              <Button compact label="Log" onPress={() => setPanel({ kind: "log" })} style={stripKey} />
            </View>
          ) : null}
          {playing ? (
            <HandTray
              player={active}
              canAct={canAct && !state.pending && !overlay}
              cardWidth={cardWidth}
              onCard={(i) => { cue("lift", settings); setPanel({ kind: "card", index: i }); }}
              onDraw={onDraw}
              drawLabel={state.phase === "finalLap" ? "End turn" : "Draw"}
              drawDisabled={!!state.pending || !!overlay}
              selectedIndex={panel?.kind === "card" ? panel.index : null}
              drawBeside={!phone}
              deckCount={state.deck.length}
              discard={discardTop}
              drawRef={drawRef}
              discardRef={discardRef}
              spot={tutSpot}
              glow={focus.hand}
              pulseDeck={focus.deck}
            />
          ) : null}
        </View>
      </View>

      {/* ---- sheets ---- */}
      {panel?.kind === "tile" ? <TileSheet {...sheetBase} tileId={panel.id} reach={reach} /> : null}
      {panel?.kind === "card" ? <CardSheet {...sheetBase} index={panel.index} /> : null}
      {panel?.kind === "role" ? <RoleSheet {...sheetBase} /> : null}
      {panel?.kind === "confirmDraw" ? (
        <Sheet title="Draw now?" subtitle={`You still have ${unusedActions(state).join(" and ")} left.`} onClose={() => setPanel(null)} closeLabel="Keep playing" docked={phone}>
          <Button kind="primary" label={state.phase === "finalLap" ? "End turn" : "Draw anyway"} onPress={() => act({ type: "Draw" })} disabled={!canAct} />
        </Sheet>
      ) : null}
      {panel?.kind === "guide" ? <GuideSheet state={state} events={snap.events} docked={phone} onClose={() => setPanel(null)} onRulebook={() => openRules("turn")} /> : null}
      {panel?.kind === "log" ? <Sheet title="Event log" onClose={() => setPanel(null)} docked={phone}><View style={{ height: 380 }}><EventLog state={state} events={snap.events} /></View></Sheet> : null}
      {panel?.kind === "players" ? <Sheet title="Stewards" onClose={() => setPanel(null)} docked={phone}><PlayersPanel state={state} /></Sheet> : null}
      {panel?.kind === "menu" ? (
        <Sheet title="Menu" onClose={() => { setPanel(null); setConfirmQuit(false); }} docked={phone}>
          <Button label="Undo last action" onPress={() => { undo(); }} disabled={!snap.canUndo} />
          <Button label="How a turn works" hint="Whose turn it is and what to do next." onPress={() => setPanel({ kind: "guide" })} />
          <Button label="Rulebook" hint="Every rule, in plain words." onPress={() => openRules()} />
          <Button label="Settings" onPress={() => nav.navigate("settings")} />
          {isTutorial ? (
            <Button kind="danger" label="Exit the tutorial" hint="Nothing from the tutorial is saved." onPress={skipTutorial} />
          ) : (
            <>
              <Button label="Download game log" hint="JSON with the seed, every action and every event." onPress={() => void exportText("tipping-point-log.json", JSON.stringify({ ...session!.toSaved(), events: snap.events }, null, 2))} />
              <Button label="Save and exit" hint="Resume from the title screen." onPress={() => { leave(false); nav.navigate("title"); }} />
              <Button kind="danger" label={confirmQuit ? "Tap again to discard this game" : "Quit without saving"} onPress={() => { if (confirmQuit) { leave(true); nav.navigate("title"); } else setConfirmQuit(true); }} />
            </>
          )}
        </Sheet>
      ) : null}
      {showPending ? <PendingSheet {...sheetBase} actor={actor} onClose={() => setHiddenPending(pendingKey)} /> : null}
      {overlay && rv.state ? <RevealLayer state={state} story={overlay.story} reveal={rv.state} onSkipBeat={rv.skipBeat} onProceed={rv.proceed} onSkipAll={skipAll} drawRef={drawRef} discardRef={discardRef} /> : null}
      {tut ? <TutorialModalHost tut={tut} onSkip={skipTutorial} onStartGame={startRealGame} onReplay={replayTutorial} onMenu={exitTutorial} /> : null}
      {handoff ? <TurnHandoff key={handoff.key} h={handoff} /> : null}
      {toast.node}
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", padding: space.md, gap: space.md },
  left: { gap: space.sm },
  main: { flex: 1, gap: space.sm },
  boardRow: { flex: 1, flexDirection: "row", gap: space.sm, minHeight: 200 },
  logBox: { height: 200, padding: space.sm },
  bar: { padding: space.md, gap: space.xs },
  strip: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
