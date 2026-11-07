import React, { useMemo, useState } from "react";
import { View } from "react-native";
import type { State } from "@tipping-point/engine";
import { cardById, content } from "../../core/content";
import { biomeName } from "../../core/content";
import { colors } from "../../theme/tokens";
import { Button } from "../../ui/Button";
import { Sheet } from "../../ui/Sheet";
import { Text } from "../../ui/Text";
import { CardFace } from "../CardFace";
import type { SheetProps } from "./common";

/** One sheet for every decision the engine can ask for. Volunteer Day is handled on the board instead. */
export function PendingSheet({ state, actor, canAct, docked, onAct, onClose }: SheetProps) {
  const p = state.pending;
  if (!p || p.kind === "volunteerMove") return null;
  const who = state.players[p.seat]!.name;
  switch (p.kind) {
    case "reorderTop5": return <Reorder key="r" ids={p.cardIds} who={who} canAct={canAct} docked={docked} onDone={(order) => onAct({ type: "Resolve", payload: { order } })} onClose={onClose} />;
    case "grantPick": return <GrantPick state={state} who={who} canAct={canAct} docked={docked} onPick={(cardId) => onAct({ type: "Resolve", payload: { cardId } })} onClose={onClose} />;
    case "squeezeReturn": {
      const pl = state.players[p.seat]!;
      return (
        <Sheet title="Supply Squeeze" subtitle={`${who} returns one Tool to the deck`} onClose={onClose} closeLabel="Hide" docked={docked}>
          {pl.hand.map((h, i) => <Button key={i} label={cardById(h.cardId)?.name ?? "Tool"} hint={cardLabel(h.cardId)} disabled={!canAct} onPress={() => onAct({ type: "Resolve", payload: { handIndex: i } })} />)}
        </Sheet>
      );
    }
    case "forecastKeepOrBottom": return <Forecast cardId={p.cardId} who={who} canAct={canAct} docked={docked} onChoose={(bottom) => onAct({ type: "Resolve", payload: { bottom } })} onClose={onClose} />;
  }
  void actor;
  return null;
}

function Reorder({ ids, who, canAct, docked, onDone, onClose }: { ids: string[]; who: string; canAct: boolean; docked: boolean; onDone: (o: string[]) => void; onClose: () => void }) {
  const [order, setOrder] = useState(ids);
  const move = (i: number, d: -1 | 1) => setOrder((o) => { const n = [...o]; const j = i + d; if (j < 0 || j >= n.length) return o; [n[i], n[j]] = [n[j]!, n[i]!]; return n; });
  return (
    <Sheet title="Citizen Science" subtitle={`${who} puts the top ${ids.length} cards back in any order`} onClose={onClose} closeLabel="Hide" docked={docked}>
      <Text variant="small" color={colors.muted}>Top of the deck is first.</Text>
      {order.map((id, i) => (
        <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text variant="heading" style={{ width: 24 }}>{String(i + 1)}</Text>
          <View style={{ flex: 1 }}><Text variant="heading" numberOfLines={1}>{cardById(id)?.name}</Text><Text variant="small" color={colors.muted}>{cardLabel(id)}</Text></View>
          <Button compact label="Up" onPress={() => move(i, -1)} disabled={i === 0} accessibilityLabel={`Move ${cardById(id)?.name} up`} />
          <Button compact label="Down" onPress={() => move(i, 1)} disabled={i === order.length - 1} accessibilityLabel={`Move ${cardById(id)?.name} down`} />
        </View>
      ))}
      <Button kind="primary" label="Confirm order" disabled={!canAct} onPress={() => onDone(order)} />
    </Sheet>
  );
}

function cardLabel(id: string): string {
  const c = cardById(id);
  if (!c) return "";
  return c.type === "event" ? "Event" : `${biomeName(c.biome)} ${c.type === "ravage" ? "Ravage" : "Tool"}`;
}

function GrantPick({ state, who, canAct, docked, onPick, onClose }: { state: State; who: string; canAct: boolean; docked: boolean; onPick: (id: string) => void; onClose: () => void }) {
  // One option per distinct Tool (biome and programme), choosing any copy that is still in the deck.
  const options = useMemo(() => {
    const seen = new Map<string, string>();
    for (const id of state.deck) {
      const c = cardById(id);
      if (c?.type !== "tool") continue;
      const key = `${c.biome}:${c.programme}`;
      if (!seen.has(key)) seen.set(key, id);
    }
    return [...seen.values()];
  }, [state.deck]);
  return (
    <Sheet title="Grant Funding" subtitle={`${who} takes any Tool from the deck`} onClose={onClose} closeLabel="Hide" docked={docked}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        {options.map((id) => <CardFace key={id} card={cardById(id)!} width={120} full onPress={canAct ? () => onPick(id) : undefined} />)}
      </View>
    </Sheet>
  );
}

function Forecast({ cardId, who, canAct, docked, onChoose, onClose }: { cardId: string; who: string; canAct: boolean; docked: boolean; onChoose: (bottom: boolean) => void; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  const card = cardById(cardId)!;
  return (
    <Sheet title="Forecast" subtitle={`Only ${who} should look at this card`} onClose={onClose} closeLabel="Hide" docked={docked}>
      {!shown ? <Button label="Show the top card" onPress={() => setShown(true)} /> : (
        <>
          <View style={{ alignItems: "center" }}><CardFace card={card} width={150} full /></View>
          {card.type === "ravage" ? <Text variant="small">{card.cause}</Text> : null}
          <Button kind="primary" label="Keep on top" disabled={!canAct} onPress={() => onChoose(false)} />
          <Button label="Move to the bottom" disabled={!canAct} onPress={() => onChoose(true)} />
        </>
      )}
      <Text variant="small" color={colors.muted}>{`The deck has ${content.rules.deck.ravage + content.rules.deck.tool + content.rules.deck.event} cards in total.`}</Text>
    </Sheet>
  );
}
