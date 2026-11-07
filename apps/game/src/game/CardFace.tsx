import { EventIcon } from "./eventIcons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, G, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";
import type { Card } from "@tipping-point/content";
import type { HeldTool } from "@tipping-point/engine";
import { biomeName, cardById, content, sourceById } from "../core/content";
import { CARD_RATIO, cardMetrics, cardSizeFor, cardSpeech, fitNamePx, pipStates, ribbonFor, type CardMetrics, type CardSize } from "../core/cardArt";
import { darken } from "../theme/colour";
import { materials } from "../theme/materials";
import { colors, fonts, fontState } from "../theme/tokens";
import { Plate } from "../ui/Plate";
import { Text } from "../ui/Text";
import { Glyph, PatternDefs, patternId } from "./biomeArt";

interface Props {
  card: Card;
  held?: HeldTool;
  width?: number;
  selected?: boolean;
  onPress?: () => void;
  /** Show the rules text (the sheet size). Without it a narrow card is the hand size: name, icon, pips. */
  full?: boolean;
  /** Overrides the size that would be chosen from the width. */
  size?: CardSize;
}

const EVENT_BAND = "#C9C1A8";

const kindOf = (card: Card) =>
  card.type === "tool" ? `${biomeName(card.biome)} ${card.programme ? "Programme Tool" : "Tool"}`
  : card.type === "ravage" ? `${biomeName(card.biome)} Ravage` : "Event";

/** The short stamped label: the same words as `kindOf`, in capitals, short enough for a tag. */
const stampOf = (card: Card) =>
  card.type === "tool" ? `${biomeName(card.biome)} ${card.programme ? "Programme" : "Tool"}`
  : card.type === "ravage" ? `${biomeName(card.biome)} Ravage` : "Event";

/**
 * The one card design, generated from cards.json and drawn at three sizes (hand, sheet, reveal): a framed picture window
 * in the biome's colour and edge pattern, the name in the display face, a stamped type label, use pips for Programme
 * Tools, the rules, and on a Ravage the real-world fact with its source as a footnote. A Surge card carries a red corner ribbon.
 * The picture is the minimum art from the plan: biome pattern plus a large symbol (Ravage adds a hazard mark).
 */
export function CardFace({ card, held, width = 104, selected, onPress, full, size: sizeProp }: Props) {
  const size = sizeProp ?? cardSizeFor(width, full);
  const m = cardMetrics(size, width);
  const programme = card.type === "tool" && card.programme;
  const uses = card.type === "tool" ? card.uses : 0;
  const usesLeft = held ? held.usesLeft : uses;
  const surge = card.type === "ravage" && card.surge;
  const kind = kindOf(card);
  const usesText = card.type === "tool" ? (programme ? `${usesLeft} of ${uses} uses left` : "Single use") : undefined;
  const speech = cardSpeech({ type: card.type, name: card.name, surge }, { kind, usesText });

  const inner = (
    <Plate
      corner={m.corner}
      elevation={selected ? "lifted" : size === "reveal" ? "held" : "resting"}
      style={[{ width, minHeight: Math.round(width * CARD_RATIO), padding: m.pad }, selected && { borderColor: colors.accent, borderWidth: 2 }]}
      accessible={!onPress}
      accessibilityLabel={onPress ? undefined : speech}
    >
      <Art card={card} width={width - m.pad * 2} m={m} />
      <View style={{ flexGrow: 1, paddingTop: m.pad, paddingHorizontal: 2, gap: size === "hand" ? 2 : 4 }}>
        <Text variant="title" size={fitNamePx(card.name, width - m.pad * 2 - 4, m.name)} maxScale={m.maxScale} numberOfLines={size === "hand" ? 2 : 3}>{card.name}</Text>
        {m.stampTag ? <Stamp text={stampOf(card)} danger={card.type === "ravage"} m={m} /> : null}
        {programme ? <Pips uses={uses} left={usesLeft} m={m} showText={size !== "hand"} /> : null}
        {size !== "hand" && card.type === "tool" && !programme ? <Text size={m.stamp} maxScale={m.maxScale} color={colors.muted}>Single use</Text> : null}
        {m.rulesText ? <Text size={m.rules} maxScale={m.maxScale}>{card.effect}</Text> : null}
        {m.factNote && card.type === "ravage" ? <Footnote card={card} m={m} /> : null}
      </View>
      {surge ? <RibbonLayer width={width} size={size} corner={m.corner} /> : null}
    </Plate>
  );
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={speech} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {inner}
    </Pressable>
  );
}

export function CardById({ id, ...rest }: { id: string } & Omit<Props, "card">) {
  const c = cardById(id);
  return c ? <CardFace card={c} {...rest} /> : null;
}

// ---- the picture window --------------------------------------------------------------------------------------------

/** Pattern tiles are drawn in board units (hex centre to corner = 1); this is how many pixels one unit is on a card. */
const PATTERN_PX = 18;

function Art({ card, width, m }: { card: Card; width: number; m: CardMetrics }) {
  const h = m.art;
  const biomeId = card.type === "event" ? null : card.biome;
  const biome = biomeId ? content.biomes[biomeId] : null;
  const band = biome ? biome.healthy_hex : EVENT_BAND;
  const gs = Math.round(h * 0.62);
  const cx = width / 2, cy = h / 2;
  return (
    <View style={{ width, height: h, borderRadius: Math.max(m.corner - 4, 3), overflow: "hidden", borderWidth: 1.5, borderColor: colors.ink }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={h}>
        <PatternDefs />
        <Rect x={0} y={0} width={width} height={h} fill={band} />
        {biome ? (
          <G transform={`scale(${PATTERN_PX})`}>
            <Rect x={0} y={0} width={width / PATTERN_PX} height={h / PATTERN_PX} fill={`url(#${patternId(biomeId!)})`} />
          </G>
        ) : null}
        {/* A lit seal behind the symbol keeps it clear of the pattern. */}
        <Circle cx={cx} cy={cy} r={gs * 0.62} fill={materials.stock} fillOpacity={0.42} />
        <Circle cx={cx} cy={cy} r={gs * 0.62} fill="none" stroke={darken(band, 0.4)} strokeOpacity={0.6} strokeWidth={1} />
        {biomeId ? <Glyph id={biomeId} x={cx} y={cy} size={gs} color={colors.ink} /> : (
          <G transform={`translate(${cx} ${cy}) scale(${gs / 22})`}><EventIcon id={card.id} color={colors.ink} /></G>
        )}
        <Rect x={0} y={h - 2} width={width} height={2} fill={darken(band, 0.35)} fillOpacity={0.7} />
        {card.type === "ravage" ? <Hazard x={Math.max(10, width * 0.1)} y={Math.max(10, h * 0.2)} r={Math.max(8, Math.round(width * 0.075))} /> : null}
      </Svg>
    </View>
  );
}

/** The danger mark on a Ravage: a red warning triangle. The word RAVAGE is on the stamp, so this is never the only cue. */
function Hazard({ x, y, r }: { x: number; y: number; r: number }) {
  const pts = `${x},${y - r} ${x + r * 1.1},${y + r * 0.85} ${x - r * 1.1},${y + r * 0.85}`;
  return (
    <G>
      <Polygon points={pts} fill={colors.danger} stroke={colors.ink} strokeWidth={1.4} strokeLinejoin="round" />
      <Rect x={x - r * 0.09} y={y - r * 0.4} width={r * 0.18} height={r * 0.7} rx={r * 0.06} fill="#FFFFFF" />
      <Circle cx={x} cy={y + r * 0.55} r={r * 0.11} fill="#FFFFFF" />
    </G>
  );
}

// ---- labels, pips, footnote, ribbon -------------------------------------------------------------------------------------

/** A typewriter stamp, a little crooked, like it was pressed on by hand. */
function Stamp({ text, danger, m }: { text: string; danger: boolean; m: CardMetrics }) {
  const c = danger ? colors.dangerText : colors.ink;
  return (
    <View style={{ alignSelf: "flex-start", transform: [{ rotate: "-1.5deg" }], borderWidth: 1.5, borderColor: c, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, opacity: 0.92 }}>
      <Text variant="stamp" size={m.stamp} maxScale={m.maxScale} color={c}>{text}</Text>
    </View>
  );
}

/** Two dots for a Programme Tool: open while a use is left, filled once spent. */
function Pips({ uses, left, m, showText }: { uses: number; left: number; m: CardMetrics; showText: boolean }) {
  const states = pipStates(uses, left);
  const d = m.pip;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      {states.map((s, i) => (
        <View key={i} style={{ width: d, height: d, borderRadius: d / 2, borderWidth: 1.5, borderColor: colors.ink, backgroundColor: s === "spent" ? colors.ink : "transparent" }} />
      ))}
      {showText ? <Text size={m.stamp} maxScale={m.maxScale} color={colors.muted}>{`${left} of ${uses} left`}</Text> : null}
    </View>
  );
}

/** The real-world fact as a small footnote: the plan's "real fact with its source". */
function Footnote({ card, m }: { card: Extract<Card, { type: "ravage" }>; m: CardMetrics }) {
  const src = sourceById(card.source_id);
  return (
    <View style={{ marginTop: "auto", paddingTop: 4, borderTopWidth: 1, borderTopColor: materials.keyline, gap: 1 }}>
      <Text size={m.fact} maxScale={m.maxScale} color={colors.muted}>{card.fact}</Text>
      {src ? <Text size={m.fact - 1} maxScale={m.maxScale} color={colors.muted} style={{ fontStyle: "italic" }}>{footnoteSource(src.short, card.fact_year)}</Text> : null}
    </View>
  );
}

/** "FAO 2020" already carries its year; add the fact's year only when the short name does not. */
export function footnoteSource(short: string, year?: number): string {
  return year && !short.includes(String(year)) ? `${short}, ${year}` : short;
}

/** The red corner ribbon of a Surge card, clipped to the card's rounded corner. */
function RibbonLayer({ width, size, corner }: { width: number; size: CardSize; corner: number }) {
  const r = ribbonFor(width, size);
  const stampFont = fontState.custom ? fonts.stamp : undefined;
  const side = Math.ceil(width * 0.52);
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: corner, overflow: "hidden" }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={side} style={{ position: "absolute", top: 0, left: 0 }}>
        <Polygon points={r.points} fill={colors.dangerText} stroke={colors.ink} strokeWidth={1.2} strokeLinejoin="round" />
        {r.showText ? (
          <SvgText transform={`translate(${r.textAt[0]} ${r.textAt[1]}) rotate(45)`} y={r.fontSize * 0.35} textAnchor="middle" fontSize={r.fontSize} fontFamily={stampFont} fontWeight={stampFont ? "normal" : "700"} letterSpacing={1} fill="#FFFFFF">SURGE</SvgText>
        ) : null}
      </Svg>
    </View>
  );
}

// ---- the card back --------------------------------------------------------------------------------------------------------

/** The shared card back: ink, a printed double border and the game's mark (a hex with a rising bar). */
export function CardBack({ width }: { width: number }) {
  const h = Math.round(width * CARD_RATIO);
  const stampFont = fontState.custom ? fonts.stamp : undefined;
  const wordmark = width >= 120;
  return (
    <View style={[styles.back, { width, height: h, borderRadius: width >= 120 ? 12 : 5 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={h} viewBox="0 0 40 55">
        <Rect x={1.6} y={1.6} width={36.8} height={51.8} rx={2.6} fill="none" stroke={materials.stock} strokeOpacity={0.7} strokeWidth={0.8} />
        <Rect x={3.2} y={3.2} width={33.6} height={48.6} rx={1.8} fill="none" stroke={materials.kraft} strokeOpacity={0.8} strokeWidth={0.5} />
        <Path d="M20,13 L30.5,19 V31 L20,37 L9.5,31 V19 Z" fill={darken(colors.ink, 0.25)} stroke={materials.kraft} strokeWidth={1.5} strokeLinejoin="round" />
        <Path d="M20,32.5 V21 M15.2,25.2 L20,20.4 L24.8,25.2" fill="none" stroke={materials.kraft} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M10,44 H30" stroke={materials.kraft} strokeOpacity={0.7} strokeWidth={0.7} strokeLinecap="round" />
        {wordmark ? <SvgText x={20} y={48.4} textAnchor="middle" fontSize={3.4} fontFamily={stampFont} letterSpacing={0.5} fill={materials.kraft}>TIPPING POINT</SvgText> : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { backgroundColor: colors.ink, borderWidth: 1.5, borderColor: darken(colors.ink, 0.4), overflow: "hidden" },
});
