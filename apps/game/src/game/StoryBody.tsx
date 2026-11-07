import React from "react";
import { Linking, Pressable, View } from "react-native";
import type { Story, StoryStep } from "../core/story";
import { biomeName, sourceById } from "../core/content";
import { phaseAtLeast, type Phase } from "../core/revealPlan";
import type { State } from "@tipping-point/engine";
import { colors, radius, space } from "../theme/tokens";
import { Text } from "../ui/Text";
import { Plate } from "../ui/Plate";

// Short on purpose: each hit is one line in the panel, so the real-world fact beneath it stays in view on a phone.
const OUTCOME = {
  vulnerable: "now vulnerable",
  shield_lost: "lost its Shield",
  marker_lost: "lost its marker",
  removed: "tile lost",
} as const;

interface Props {
  state: State;
  story: Story;
  step: number;
  /** How many called tiles have been revealed so far. */
  shown: number;
  /** Which beat of the reveal is playing. A line about the Metre waits for the Metre's beat, so it never gets ahead of the table. */
  phase: Phase;
}

/**
 * The notebook page beside the docked card: what the drawn card does, one line per hit as its number is stamped,
 * the Metre, and the real-world fact with its source. It sits in the reveal panel (game/RevealLayer.tsx).
 */
export function StoryBody({ state, story, step, shown, phase }: Props) {
  const s = story.steps[step]!;
  const beat = phaseAtLeast(phase, "beat");
  const metre = phaseAtLeast(phase, "metre");
  return (
    <View style={{ gap: space.sm }}>
      <View>
        <Text variant="title" accessibilityRole="header">{s.card.name}</Text>
        <Text variant="small" color={colors.muted}>{subtitle(s)}</Text>
      </View>
      {story.steps.length > 1 ? <Text variant="small" color={colors.muted}>{`Card ${step + 1} of ${story.steps.length}`}</Text> : null}
      {s.card.type === "ravage" ? <RavageBody s={s} shown={shown} state={state} beat={beat} /> : null}
      {s.card.type === "tool" ? <Text>{s.kept === "kept" ? `${state.players[s.seat]?.name ?? "A Steward"} keeps this Tool.` : "The hand is full, so this Tool goes back into the deck."}</Text> : null}
      {s.card.type === "event" ? (
        <>
          <Text>{s.card.effect}</Text>
          {s.note ? <Text variant="small" color={colors.muted}>{`Result: ${s.note}.`}</Text> : null}
        </>
      ) : null}
      {beat ? s.cascade.map((b) => <Text key={b} variant="heading" color={colors.dangerText}>{`Cascade: ${biomeName(b as never)} has lost five tiles.`}</Text>) : null}
      {beat ? s.extinct.map((b) => <Text key={b} variant="heading" color={colors.dangerText}>{`${biomeName(b as never)} is extinct.`}</Text>) : null}
      {beat ? s.evacuated.map((seat) => <Text key={seat} color={colors.dangerText}>{`${state.players[seat]?.name ?? "A Steward"} is evacuated.`}</Text>) : null}
      {metre ? s.metreMoves.map((m, i) => (
        <Text key={i} variant="heading" color={m.to > m.from ? colors.dangerText : colors.good}>{`The Metre moves from ${m.from} to ${m.to}.`}</Text>
      )) : null}
      {metre && story.trophy ? <Text variant="heading" color={colors.good}>Trophy reached. Everyone else gets one last turn.</Text> : null}
    </View>
  );
}

function subtitle(s: StoryStep): string {
  if (s.card.type === "ravage") return `Ravage: ${biomeName(s.card.biome)}${s.depth > 0 ? " (extra draw)" : ""}`;
  if (s.card.type === "tool") return `Tool: ${biomeName(s.card.biome)}`;
  return "Event";
}

function RavageBody({ s, shown, state, beat }: { s: StoryStep; shown: number; state: State; beat: boolean }) {
  const card = s.card.type === "ravage" ? s.card : null;
  if (!card) return null;
  const src = sourceById(card.source_id);
  return (
    <View style={{ gap: space.sm }}>
      <Text>{card.cause}</Text>
      <Text variant="heading">{`Pressure calls ${s.calls} ${s.calls === 1 ? "tile" : "tiles"}.`}</Text>
      {s.lobbyUsed ? <Text variant="small" color={colors.muted}>Industrial Lobby added one call.</Text> : null}
      {s.called.slice(0, shown).map((tile, i) => {
        const o = s.outcomes.find((x) => x.tile === tile);
        return <Text key={tile} color={colors.dangerText}>{`${i + 1}. ${biomeName(state.tiles[tile]!.biome)}: ${o ? OUTCOME[o.outcome] : "called"}.`}</Text>;
      })}
      {s.called.length === 0 ? <Text color={colors.muted}>{`${biomeName(card.biome)} is extinct, so nothing is called.`}</Text> : null}
      {beat && s.surge === "fired" ? <Text variant="heading" color={colors.dangerText}>Surge. The Metre moves up a band.</Text> : null}
      {beat && s.surge === "skipped" ? <Text color={colors.muted}>Surge skipped by the Calm cover.</Text> : null}
      <Plate tone="deep" elevation="flat" style={{ padding: space.md, gap: 4 }}>
        <Text variant="small" color={colors.muted}>Real world</Text>
        <Text>{card.fact}</Text>
        {src ? (
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(src.url)}>
            <Text variant="small" color={colors.accent} style={{ textDecorationLine: "underline" }}>{`Source: ${src.short}`}</Text>
          </Pressable>
        ) : null}
      </Plate>
    </View>
  );
}
