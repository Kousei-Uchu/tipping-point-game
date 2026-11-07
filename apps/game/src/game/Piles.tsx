import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import type { Card } from "@tipping-point/content";
import { biomeName, content } from "../core/content";
import { pileLayers } from "../core/boardArt";
import { CARD_RATIO } from "../core/cardArt";
import { materials } from "../theme/materials";
import { colors, elevation } from "../theme/tokens";
import { Label } from "../ui/Label";
import { useLoop } from "../ui/useTween";
import { Glyph } from "./biomeArt";
import { CardBack } from "./CardFace";

export { CardBack };

/** A card seen from far away: its biome colour and symbol. The name is in the accessibility label. */
export function MiniCard({ card, width }: { card: Card; width: number }) {
  const h = Math.round(width * CARD_RATIO);
  const biome = card.type === "event" ? null : content.biomes[card.biome];
  const band = biome ? biome.healthy_hex : "#C9C1A8";
  const surge = card.type === "ravage" && card.surge;
  const kind = card.type === "ravage" ? `${biomeName(card.biome)} Ravage` : card.type === "tool" ? `${biomeName(card.biome)} Tool` : "Event";
  return (
    <View style={[styles.mini, { width, height: h }]} accessible accessibilityLabel={`${card.name}. ${kind}.${surge ? " Surge card." : ""}`}>
      <View style={{ backgroundColor: band, height: Math.round(h * 0.55), alignItems: "center", justifyContent: "center" }}>
        {biome && card.type !== "event" ? <Svg width={width * 0.55} height={width * 0.55} viewBox="-12 -12 24 24"><Glyph id={card.biome} x={0} y={0} size={22} color={colors.ink} /></Svg> : null}
      </View>
      {surge ? <Svg width={width} height={width * 0.5} style={{ position: "absolute", top: 0, left: 0 }}><Polygon points={`${width * 0.55},0 ${width},0 ${width},${width * 0.45}`} fill={colors.dangerText} /></Svg> : null}
      <View style={{ flex: 1, padding: 3, gap: 3 }}>
        <View style={{ height: 3, borderRadius: 1.5, backgroundColor: colors.ink, opacity: 0.35, width: "80%" }} />
        <View style={{ height: 3, borderRadius: 1.5, backgroundColor: colors.ink, opacity: 0.2, width: "55%" }} />
      </View>
    </View>
  );
}

interface PilesProps {
  deckCount: number;
  discard: Card | null;
  /** md beside a wide hand; sm tucked into the phone's hand header. */
  size: "sm" | "md";
  /** The reveal measures these to fly a card from the draw pile and onto the discard. */
  drawRef?: React.Ref<View>;
  discardRef?: React.Ref<View>;
  /** The guide says Draw is the move: the draw pile gets a pulsing gold ring. */
  pulse?: boolean;
}

/** The draw pile with its count, and the discard showing the last card. Gives the Draw key something to draw from. */
export function Piles({ deckCount, discard, size, drawRef, discardRef, pulse }: PilesProps) {
  const ring = useLoop(!!pulse);
  const w = size === "md" ? 46 : 32;
  const h = Math.round(w * CARD_RATIO);
  const layers = pileLayers(deckCount);
  return (
    <View style={styles.row}>
      <View ref={drawRef} collapsable={false} style={{ width: w + 8, height: h + 14 }} accessible accessibilityLabel={`Draw pile, ${deckCount} cards${pulse ? ". Draw is the move." : ""}`}>
        {pulse ? <View pointerEvents="none" style={[styles.ring, { opacity: ring, top: 4, left: -3, right: 1, bottom: 0 }]} /> : null}
        {layers === 0 ? (
          <View style={[styles.slot, { width: w, height: h }]} />
        ) : (
          Array.from({ length: layers }, (_, i) => (
            <View key={i} style={{ position: "absolute", left: (layers - 1 - i) * 1.5, top: 8 + (layers - 1 - i) * 1.5, ...(i === layers - 1 ? elevation.resting : null) }}>
              <CardBack width={w} />
            </View>
          ))
        )}
        <View style={styles.count}><Label text={String(deckCount)} /></View>
      </View>
      <View ref={discardRef} collapsable={false} style={{ width: w + 4, height: h + 14 }}>
        <View style={{ marginTop: 8 }}>
          {discard ? <View style={elevation.resting}><MiniCard card={discard} width={w} /></View> : <View style={[styles.slot, { width: w, height: h }]} accessible accessibilityLabel="Discard pile, empty" />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  mini: { backgroundColor: materials.stock, borderRadius: 5, borderWidth: 1.5, borderColor: colors.ink, overflow: "hidden" },
  slot: { borderRadius: 5, borderWidth: 1.5, borderStyle: "dashed", borderColor: materials.keyline, marginTop: 8, opacity: 0.7 },
  ring: { position: "absolute", borderRadius: 8, borderWidth: 3, borderColor: colors.trophy },
  count: { position: "absolute", left: 0, bottom: 0 },
});
