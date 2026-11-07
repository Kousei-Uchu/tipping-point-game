import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import type { NewGameOptions } from "@tipping-point/engine";
import { PLAYER_COLOURS } from "@tipping-point/engine";
import type { Difficulty } from "@tipping-point/content";
import { useNav } from "../app/NavProvider";
import { useSessionCtx } from "../app/SessionProvider";
import { useSettings } from "../app/SettingsProvider";
import { content } from "../core/content";
import { clampStart, drawLots, lotsPath, nextSeatKind, seatLabel, type SeatKind } from "../core/lobby";
import { motionMs } from "../core/settings";
import { KEYS } from "../core/storage";
import { cue } from "../platform/feedback";
import { store } from "../platform/storage";
import { Peg } from "../game/StewardMat";
import { RobotDisc } from "../game/RobotDisc";
import { seatShapePath } from "../game/biomeArt";
import Svg, { Circle, Path } from "react-native-svg";
import { darken } from "../theme/colour";
import { materials } from "../theme/materials";
import { colors, MIN_TAP, radius, space, fonts, fontState } from "../theme/tokens";
import { Key } from "../ui/Key";
import { Label } from "../ui/Label";
import { Plate } from "../ui/Plate";
import { Screen } from "../ui/Screen";
import { Text } from "../ui/Text";

const DEFAULT_NAMES = ["Mia", "Raj", "Ben", "Zoe", "Kai"];
const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

/** What each difficulty changes, read from rules.json so the text cannot drift from the rules. */
function describeDifficulty(d: Difficulty): string {
  const r = content.rules.difficulty[d];
  const extra = d === "easy" ? " Two roles each (up to 3 Stewards), Calm cover on one Surge." : "";
  return `Starts at Pressure ${r.start_pressure}. Opening Strike of ${r.opening_strike} Ravage cards. Evacuated Stewards miss ${r.evacuation_rounds} ${r.evacuation_rounds === 1 ? "round" : "rounds"}.${extra}`;
}

/** A lot: a round counter with a Steward's shape. The one marked FIRST is the one that goes first. */
function Lot({ seat, colour, first, lit, name, onPress }: { seat: number; colour: string; first: boolean; lit: boolean; name: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: first }} accessibilityLabel={first ? `${name} goes first` : `${name}. Tap to make them go first.`} onPress={onPress} style={styles.lotHit}>
      <Svg width={44} height={44} viewBox="-13 -13 26 26">
        <Circle cx={0} cy={1.6} r={11} fill={darken(colour, 0.38)} stroke={colors.ink} strokeWidth={1.2} />
        <Circle cx={0} cy={0} r={11} fill={colour} stroke={colors.ink} strokeWidth={lit || first ? 2.6 : 1.4} />
        <Path d={seatShapePath(seat, 5.2)} fill={materials.stock} stroke={colors.ink} strokeWidth={1} strokeLinejoin="round" />
        {lit ? <Circle cx={0} cy={0} r={12.5} fill="none" stroke={colors.trophy} strokeWidth={2.2} /> : null}
      </Svg>
      {first ? <Label text="FIRST" tone="good" /> : <View style={{ height: 24 }} />}
    </Pressable>
  );
}

export function LobbyScreen() {
  const nav = useNav();
  const { start } = useSessionCtx();
  const { settings } = useSettings();
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES.slice(0, 3));
  const [bots, setBots] = useState<SeatKind[]>([null, null, null]);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [youngest, setYoungest] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const lotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (lotTimer.current) clearTimeout(lotTimer.current); }, []);

  // Remember the table between games.
  useEffect(() => {
    void store.getItem(KEYS.lobby).then((t) => {
      if (!t) return;
      try {
        const v = JSON.parse(t) as { names?: unknown; difficulty?: unknown };
        if (Array.isArray(v.names) && v.names.length >= 2 && v.names.length <= 5 && v.names.every((n) => typeof n === "string")) { setNames(v.names as string[]); setBots((v.names as string[]).map(() => null)); }
        if (DIFFICULTIES.includes(v.difficulty as Difficulty)) setDifficulty(v.difficulty as Difficulty);
      } catch { /* ignore a bad lobby save */ }
    });
  }, []);

  const setName = (i: number, v: string) => setNames((n) => n.map((x, j) => (j === i ? v : x)));
  const add = () => { if (names.length < 5) { setNames((n) => [...n, DEFAULT_NAMES[n.length]!]); setBots((b) => [...b, null]); } };
  const cycleBot = (i: number) => { cue("lift", settings); setBots((b) => b.map((x, j) => (j === i ? nextSeatKind(x) : x))); };
  const remove = () => {
    if (names.length <= 2) return;
    setBots((b) => b.slice(0, -1));
    setNames((n) => n.slice(0, -1));
    setYoungest((y) => clampStart(y, names.length - 1));
  };

  // Drawing lots: the marker goes round the table and stops on one seat. With reduced motion it just lands.
  const lots = () => {
    if (lotTimer.current) clearTimeout(lotTimer.current);
    const win = drawLots(names.length);
    const step = motionMs(settings, 110);
    if (step === 0) { setLit(null); setYoungest(win); cue("place", settings); return; }
    const path = lotsPath(names.length, win, 1);
    let i = 0;
    const tick = () => {
      setLit(path[i]!);
      cue("lift", settings);
      i++;
      if (i < path.length) lotTimer.current = setTimeout(tick, step + i * 12);
      else lotTimer.current = setTimeout(() => { setYoungest(win); setLit(null); cue("place", settings); }, step * 2);
    };
    tick();
  };

  const begin = () => {
    const players = names.map((n, i) => ({ id: `p${i}`, name: n.trim() || DEFAULT_NAMES[i]!, ...(bots[i] ? { isBot: true, botLevel: bots[i]! } : {}) }));
    const options: NewGameOptions = { seed: (Math.random() * 2 ** 31) >>> 0, difficulty, players, startSeat: youngest };
    void store.setItem(KEYS.lobby, JSON.stringify({ names: players.map((p) => p.name), difficulty }));
    start(options);
    nav.navigate("game");
  };

  return (
    <Screen felt>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.col}>
          <Plate style={styles.head}>
            <Text variant="title" accessibilityRole="header">Set up the table</Text>
            <Text variant="small" color={colors.muted}>Tap a pawn to swap it for a bot. Tap a bot to change how hard it plays.</Text>
          </Plate>

          {/* The seats: each one a slot with its piece. */}
          <Plate style={styles.mat}>
            <Label text="Stewards" />
            {names.map((n, i) => (
              <Plate key={i} tone="deep" elevation="flat" style={styles.slot}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${n} is ${bots[i] ? `a ${bots[i]} bot` : "a human"}. Tap to change.`} onPress={() => cycleBot(i)} style={styles.piece} hitSlop={4}>
                  {bots[i] ? <RobotDisc size={32} /> : <Peg seat={i} colour={PLAYER_COLOURS[i]!} size={32} />}
                </Pressable>
                <View style={{ flex: 1, gap: 2 }}>
                  <TextInput value={n} onChangeText={(v) => setName(i, v)} maxLength={14} accessibilityLabel={`Steward ${i + 1} name`} style={styles.input} />
                  <Label text={seatLabel(bots[i]!).toUpperCase()} tone={bots[i] ? "bad" : "good"} />
                </View>
              </Plate>
            ))}
            <View style={styles.row}>
              <Key label="Add Steward" onPress={add} disabled={names.length >= 5} style={{ flex: 1 }} />
              <Key label="Remove" onPress={remove} disabled={names.length <= 2} style={{ flex: 1 }} />
            </View>
          </Plate>

          {/* Who goes first: a drawn lot. */}
          <Plate style={styles.mat}>
            <Label text="Who goes first" />
            <View style={styles.lots}>
              {names.map((n, i) => <Lot key={i} seat={i} colour={PLAYER_COLOURS[i]!} first={youngest === i} lit={lit === i} name={n} onPress={() => { setLit(null); setYoungest(i); }} />)}
            </View>
            <Text variant="small" color={colors.muted}>The youngest Steward goes first. Tap a counter to choose, or draw lots.</Text>
            <Key label="Draw lots" onPress={lots} />
          </Plate>

          <Plate style={styles.mat}>
            <Label text="Difficulty" />
            <View style={styles.row}>
              {DIFFICULTIES.map((d) => (
                <Key key={d} kind={difficulty === d ? "primary" : "secondary"} label={d[0]!.toUpperCase() + d.slice(1)} onPress={() => setDifficulty(d)} style={{ flex: 1 }} />
              ))}
            </View>
            <Text variant="small" color={colors.muted}>{describeDifficulty(difficulty)}{names.length === 2 ? " Two players start one band higher." : ""}</Text>
          </Plate>

          <Plate elevation="held" style={styles.go}>
            <Key kind="primary" label="Start game" onPress={begin} />
            <Key kind="quiet" label="Back" onPress={() => nav.back()} />
          </Plate>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.lg, alignItems: "center" },
  col: { width: "100%", maxWidth: 520, gap: space.md },
  head: { padding: space.md, gap: space.xs },
  mat: { padding: space.md, gap: space.sm },
  slot: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.sm },
  piece: { minWidth: MIN_TAP, minHeight: MIN_TAP, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  lots: { flexDirection: "row", justifyContent: "space-around", flexWrap: "wrap", gap: space.sm },
  lotHit: { alignItems: "center", gap: 2, minWidth: MIN_TAP, minHeight: MIN_TAP },
  go: { padding: space.md, gap: space.sm },
  input: { minHeight: MIN_TAP - 6, borderWidth: 2, borderColor: colors.ink, borderRadius: radius.md, paddingHorizontal: space.md, backgroundColor: colors.surface, color: colors.ink, fontSize: 16, fontFamily: fontState.custom ? fonts.body : undefined },
});
