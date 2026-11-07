import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useNav } from "../app/NavProvider";
import { useSessionCtx, useSnapshot } from "../app/SessionProvider";
import { biomeName, cardById, content, sourceById } from "../core/content";
import { useSettings } from "../app/SettingsProvider";
import { cue } from "../platform/feedback";
import { exportText } from "../platform/exportText";
import { darken } from "../theme/colour";
import { materials } from "../theme/materials";
import { colors, elevation, radius, space } from "../theme/tokens";
import { Key } from "../ui/Key";
import { Label } from "../ui/Label";
import { Plate } from "../ui/Plate";
import { Screen } from "../ui/Screen";
import { Text } from "../ui/Text";
import { useCountUp, useTween } from "../ui/useTween";
import { MiniBoard } from "../game/MiniBoard";
import { Metre } from "../game/Metre";
import { SeatMark } from "../game/PlayersPanel";
import { TrayDisc } from "../game/StewardMat";

export function ResultScreen() {
  const { session } = useSessionCtx();
  const nav = useNav();
  useEffect(() => { if (!session) nav.navigate("title"); }, [session, nav]);
  if (!session) return null;
  return <ResultInner />;
}

/** The Trophy cup: a gold cup on a small wooden plinth. */
function Cup({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="-16 -16 32 32" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect x={-8} y={11} width={16} height={4} rx={1} fill={materials.wood} stroke={colors.ink} strokeWidth={1.2} />
      <Path d="M-2,5 H2 V11 H-2 Z" fill={colors.trophy} stroke={colors.ink} strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M-9,-11 H9 V-3 Q9,6 0,6 Q-9,6 -9,-3 Z" fill={colors.trophy} stroke={colors.ink} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M-9,-8 H-13 Q-13,-1 -8,0 M9,-8 H13 Q13,-1 8,0" fill="none" stroke={colors.ink} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M-5,-9 V-2" stroke={materials.brassLight} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

/** The Skull plate: a skull stamped on a dark red plate. */
function Skull({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="-16 -16 32 32" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M-10,0 Q-10,-12 0,-12 Q10,-12 10,0 Q10,4 7,6 V10 H-7 V6 Q-10,4 -10,0 Z" fill={materials.stock} stroke={colors.ink} strokeWidth={1.4} strokeLinejoin="round" />
      <Circle cx={-4} cy={-1} r={2.8} fill={colors.ink} />
      <Circle cx={4} cy={-1} r={2.8} fill={colors.ink} />
      <Path d="M0,3 L-1.4,6 H1.4 Z" fill={colors.ink} />
      <Path d="M-3.5,10 V7 M0,10 V7 M3.5,10 V7" stroke={colors.ink} strokeWidth={1.1} />
    </Svg>
  );
}

function ResultInner() {
  const { session, leave } = useSessionCtx();
  const nav = useNav();
  const snap = useSnapshot(session!);
  const s = snap.state;
  const result = s.result;
  const { settings } = useSettings();
  const kind = result?.kind;
  // The loudest moments of the game: the cup chime, or the long low note.
  useEffect(() => { if (kind) cue(kind === "trophy" ? "trophy" : "collapse", settings); }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  // The Metre starts a little away from where it ended, then the slider glides in: the cup rises, or the Skull is reached.
  const finalTicks = s.metreTicks;
  const total = content.rules.metre.total_ticks;
  const [shownTicks, setShownTicks] = useState(() => (kind === "trophy" ? Math.min(total, finalTicks + 16) : Math.max(0, finalTicks - 16)));
  const [shake, setShake] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => { setShownTicks(finalTicks); if (kind === "collapse") setShake(1); }, 450);
    return () => clearTimeout(t);
  }, [finalTicks, kind]);

  // Facts the table met: every Ravage card drawn, once each, with its source (wf5 note 5).
  const facts = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; fact: string; source: string; url?: string }[] = [];
    for (const e of snap.events) {
      if (e.kind !== "CardDrawn") continue;
      const c = cardById(e.cardId as string);
      if (c?.type !== "ravage" || seen.has(c.id)) continue;
      seen.add(c.id);
      const src = sourceById(c.source_id);
      out.push({ id: c.id, fact: c.fact, source: src ? src.short : "", url: src?.url });
    }
    return out;
  }, [snap.events]);

  const legacy = useMemo(() => [...(result?.legacy ?? [])].sort((a, b) => b.total - a.total), [result]);
  const maxTokens = legacy.reduce((m, l) => Math.max(m, l.tokensOnHealthy), 0);
  // Legacy is counted out in tokens, one at a time, onto each Steward's tally; the totals and the winner come last.
  const counted = useCountUp(maxTokens, 160, 900);
  const done = counted >= maxTokens;
  const liftWin = useTween(done ? 1 : 0, "lift");
  const tiles = useMemo(() => s.tiles.map((t) => ({ id: t.id, biome: t.biome, status: t.status, shield: t.shield, stabilised: t.stabilised })), [s.tiles]);

  if (!result) return null;
  const trophy = result.kind === "trophy";
  const standing = s.tiles.filter((t) => t.status !== "removed").length;
  const winners = new Set(result.winners ?? []);
  const cause = result.reason === "skull" ? "The Metre reached the Skull." : "A second biome went extinct.";
  const lostByBiome = Object.entries(s.removedByBiome).filter(([, n]) => n > 0);
  const again = () => { leave(true); nav.navigate("title"); nav.navigate("lobby"); };

  // Quiet and heavy for a Collapse: a dark plate, no gold. Loud and happy for a Trophy.
  const headFill = trophy ? colors.trophy : darken(colors.danger, 0.55);
  const headInk = trophy ? colors.ink : materials.stock;

  return (
    <Screen felt>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.col}>
          <View style={[styles.banner, elevation.held, { backgroundColor: headFill, borderColor: colors.ink }]} accessibilityLiveRegion="polite">
            {trophy ? <Cup /> : <Skull />}
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="display" color={headInk} accessibilityRole="header">{trophy ? "Trophy" : "Collapse"}</Text>
              <Text color={headInk}>{trophy ? "The ecosystems held." : cause}</Text>
              <Text variant="small" color={headInk}>{`Round ${s.round}. ${standing} of ${content.rules.tiles.total} tiles standing.`}</Text>
            </View>
          </View>

          <View style={styles.pair}>
            <Plate style={styles.metrePlate} accessible accessibilityLabel={trophy ? "The Pressure Metre ended at the Trophy." : "The Pressure Metre ended at the Skull."}>
              <View style={{ width: 70, height: 250, flexDirection: "row" }}>
                {/* At the end the real reading is 0 (Trophy) or past the top (Skull), where the slider is hidden. Rest it on the last notch so it visibly reaches the cup or the Skull. */}
                <Metre ticks={Math.min(total, Math.max(1, shownTicks))} compact shakeKey={shake} />
              </View>
            </Plate>
            <View style={{ flex: 1, gap: space.sm }}>
              <Plate style={styles.boardPlate}>
                <Label text={trophy ? "The board you kept" : "The board that was lost"} />
                <View style={styles.boardFelt}><MiniBoard tiles={tiles} width={230} /></View>
              </Plate>
            </View>
          </View>

          {trophy ? (
            <View style={{ gap: space.sm }}>
              <Label text="Legacy" />
              {legacy.map((l) => {
                const p = s.players.find((q) => q.id === l.player)!;
                const win = winners.has(l.player);
                const here = Math.min(counted, l.tokensOnHealthy);
                return (
                  <ResultRow key={l.player} win={win && done} lift={win ? liftWin : 0}
                    label={`${p.name}, Legacy ${l.total}${win ? ", winner" : ""}`}>
                    <SeatMark seat={p.seat} colour={p.colour} size={26} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text variant="heading">{p.name}</Text>
                      <View style={styles.tally}>
                        {Array.from({ length: l.tokensOnHealthy }, (_, i) => (
                          <TrayDisc key={i} seat={p.seat} colour={p.colour} here={i < here} d={20} />
                        ))}
                      </View>
                      <Text variant="small" color={colors.muted}>
                        {`${l.tokensOnHealthy} tokens on Healthy tiles`}{l.guardianBiomes.length ? `. Guardian of ${l.guardianBiomes.map((b) => biomeName(b)).join(", ")}` : ""}
                      </Text>
                    </View>
                    <View style={{ alignItems: "center", gap: 4, opacity: done ? 1 : 0.15 }}>
                      <Text variant="title">{String(l.total)}</Text>
                      {win ? <Label text="WINNER" tone="good" /> : null}
                    </View>
                  </ResultRow>
                );
              })}
              {winners.size > 1 ? <Plate elevation="flat" tone="deep" style={styles.fact}><Text variant="small">Still tied after both tie-breaks, so the win is shared.</Text></Plate> : null}
            </View>
          ) : (
            <View style={{ gap: space.sm }}>
              <Label text="Tiles lost" />
              <Plate style={styles.fact}>
                {lostByBiome.length ? lostByBiome.map(([b, n]) => <Text key={b}>{`${biomeName(b as never)}: ${n} of ${content.rules.tiles.per_biome}`}</Text>) : <Text>None.</Text>}
              </Plate>
            </View>
          )}

          {facts.length ? (
            <View style={{ gap: space.sm }}>
              <Label text="Facts you met" />
              {facts.map((f) => (
                <Plate key={f.id} elevation="flat" style={styles.fact}>
                  <Text>{f.fact}</Text>
                  {f.source ? <Text variant="small" color={colors.muted}>{`Source: ${f.source}`}</Text> : null}
                </Plate>
              ))}
            </View>
          ) : null}

          <Plate elevation="held" style={styles.keys}>
            <Key kind="primary" label="Play again" onPress={again} />
            <Key label="Download game log" hint="JSON with the seed, every action and every event." onPress={() => void exportText("tipping-point-log.json", JSON.stringify({ ...session!.toSaved(), events: snap.events }, null, 2))} />
            <Key kind="quiet" label="Back to title" onPress={() => { leave(true); nav.navigate("title"); }} />
          </Plate>
        </View>
      </ScrollView>
    </Screen>
  );
}

/** One Steward's tally. The winner's mat is lifted: it rises, its shadow grows and it gets a gold edge. */
function ResultRow({ win, lift, label, children }: { win: boolean; lift: number; label: string; children: React.ReactNode }) {
  return (
    <View style={{ transform: [{ translateY: -4 * lift }] }}>
      <Plate elevation={win ? "lifted" : "resting"} style={[styles.row, win && styles.win]} accessible accessibilityLabel={label}>{children}</Plate>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.lg, alignItems: "center" },
  col: { width: "100%", maxWidth: 600, gap: space.lg },
  banner: { flexDirection: "row", alignItems: "center", gap: space.md, borderRadius: radius.lg, borderWidth: 2, padding: space.lg },
  pair: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  metrePlate: { padding: space.sm },
  boardPlate: { padding: space.sm, gap: space.sm, alignItems: "flex-start" },
  boardFelt: { backgroundColor: materials.felt, borderRadius: radius.md, padding: space.sm, alignSelf: "stretch", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md },
  win: { borderColor: colors.trophy, borderWidth: 3 },
  tally: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  fact: { padding: space.md, gap: 2 },
  keys: { padding: space.md, gap: space.sm },
});
