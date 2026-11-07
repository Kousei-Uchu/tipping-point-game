import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { Card } from "@tipping-point/content";
import type { Player } from "@tipping-point/engine";
import { cardById, content } from "../core/content";
import { fanLayout } from "../core/boardArt";
import { space } from "../theme/tokens";
import { Key } from "../ui/Key";
import { Label } from "../ui/Label";
import { Plate } from "../ui/Plate";
import { Text } from "../ui/Text";
import { Wood } from "../ui/Wood";
import type { SpotId } from "../core/tutorial";
import { CardFace } from "./CardFace";
import { Piles } from "./Piles";
import { Spot } from "./Tutorial";
import { useLoop, useTween } from "../ui/useTween";
import { colors } from "../theme/tokens";
import type { FanSlot } from "../core/boardArt";

interface Props {
  player: Player;
  canAct: boolean;
  cardWidth: number;
  onCard: (index: number) => void;
  onDraw: () => void;
  drawLabel: string;
  drawDisabled: boolean;
  selectedIndex: number | null;
  /** Wide layouts put Draw to the right of the hand; phones put it under it. */
  drawBeside: boolean;
  /** Draw pile size and the last card discarded. */
  deckCount: number;
  discard: Card | null;
  /** The reveal measures the piles to fly a card from the draw pile and onto the discard. */
  drawRef?: React.Ref<View>;
  discardRef?: React.Ref<View>;
  /** Tutorial only. undefined in a normal game, otherwise the part of the screen the current step wants framed. */
  spot?: SpotId | null;
  /** The guide's "Do this now" names a Tool card: a gold bar glows under the hand. */
  glow?: boolean;
  /** The guide says Draw is the move: the draw pile pulses. */
  pulseDeck?: boolean;
}

/**
 * Your hand fanned along the near edge on a wooden ledge, the draw and discard piles beside it.
 * The selected card straightens, lifts and enlarges; the others tuck down.
 */
export function HandTray({ player, canAct, cardWidth, onCard, onDraw, drawLabel, drawDisabled, selectedIndex, drawBeside, deckCount, discard, drawRef, discardRef, spot, glow, pulseDeck }: Props) {
  const glowOp = useLoop(!!glow);
  const empty = player.hand.length === 0;
  const framed = spot !== undefined;
  const current = spot ?? null;
  const slots = fanLayout(player.hand.length, selectedIndex, cardWidth);
  const draw = (
    <Spot active={framed} id="draw" current={current} style={drawBeside ? { alignSelf: "stretch" } : undefined}>
      <Key kind="primary" label={drawLabel} onPress={onDraw} disabled={drawDisabled || !canAct} style={drawBeside ? { alignSelf: "stretch", flex: 1, minWidth: 120 } : undefined} />
    </Spot>
  );
  return (
    <View style={[styles.wrap, drawBeside && { flexDirection: "row", alignItems: "stretch" }]}>
      {drawBeside ? <View style={styles.pilesCol}><Piles deckCount={deckCount} discard={discard} size="md" drawRef={drawRef} discardRef={discardRef} pulse={pulseDeck} /></View> : null}
      <View style={{ flex: 1 }}>
        <View style={styles.head}>
          <Label text={`${player.name}'s Tools ${player.hand.length} of ${content.rules.limits.hand}`} />
          <View style={{ flex: 1 }} />
          {!drawBeside ? <Piles deckCount={deckCount} discard={discard} size="sm" drawRef={drawRef} discardRef={discardRef} pulse={pulseDeck} /> : null}
        </View>
        <Spot active={framed} id="hand" current={current}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {empty ? <Plate elevation="flat" style={{ padding: space.sm }}><Text variant="small">No Tools in hand. Draw to find one.</Text></Plate> : null}
            {player.hand.map((h, i) => {
              const card = cardById(h.cardId);
              const s = slots[i]!;
              return card ? (
                <FanCard key={`${h.cardId}-${i}`} slot={s}>
                  <CardFace card={card} held={h} width={cardWidth} selected={selectedIndex === i} onPress={() => onCard(i)} />
                </FanCard>
              ) : null;
            })}
          </ScrollView>
          <Wood style={styles.ledge} />
          {glow ? <View pointerEvents="none" accessibilityElementsHidden style={[styles.glow, { opacity: glowOp }]} /> : null}
        </Spot>
      </View>
      {draw}
    </View>
  );
}

/** One card in the fan. It glides to its slot over the lift move, so picking one up straightens and raises it. */
function FanCard({ slot, children }: { slot: FanSlot; children: React.ReactNode }) {
  const y = useTween(slot.dy - slot.lift, "lift");
  const rot = useTween(slot.rotate, "lift");
  const scale = useTween(slot.scale, "lift");
  return <View style={{ marginLeft: slot.dx, zIndex: slot.z, elevation: slot.z, transform: [{ translateY: y }, { rotate: `${rot}deg` }, { scale }] }}>{children}</View>;
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  pilesCol: { justifyContent: "flex-end" },
  head: { flexDirection: "row", alignItems: "flex-end", marginBottom: 2 },
  row: { paddingTop: 16, paddingBottom: 4, paddingHorizontal: space.md, alignItems: "flex-end", justifyContent: "center", flexGrow: 1 },
  glow: { height: 4, marginTop: 2, marginHorizontal: space.md, borderRadius: 2, backgroundColor: colors.trophy },
  ledge: { height: 10, marginTop: -6, marginHorizontal: space.xs, zIndex: 0 },
});
