import React from "react";
import { View } from "react-native";
import { cardById, content, engine } from "../../core/content";
import { explainError } from "../../core/errors";
import { giftTargets, toolOptions } from "../../core/selectors";
import { colors } from "../../theme/tokens";
import { Button } from "../../ui/Button";
import { Sheet } from "../../ui/Sheet";
import { Text } from "../../ui/Text";
import { CardFace } from "../CardFace";
import type { SheetProps } from "./common";

export function CardSheet({ state, actor, canAct, docked, onAct, onClose, index }: SheetProps & { index: number }) {
  const held = actor.hand[index];
  const card = held ? cardById(held.cardId) : undefined;
  if (!held || !card || card.type !== "tool") return null;
  const here = actor.pos !== null ? state.tiles[actor.pos]! : null;
  const o = toolOptions(state, actor, index);
  const targets = giftTargets(state, actor, index);
  const stranded = !!state.turn && actor.pos !== null && engine.isStranded(state, actor.id);
  const rules = content.rules.metre;
  const canRestore = o.restore === null, canFortify = o.fortify === null;
  const standing = here && here.biome !== "hub" ? `You are on a ${here.status} ${content.biomes[here.biome].name} tile.` : "You are on the Research Station.";

  return (
    <Sheet title={card.name} subtitle={standing} onClose={onClose} docked={docked}>
      <View style={{ alignItems: "center" }}><CardFace card={card} held={held} width={150} full /></View>
      {card.flavour ? <Text variant="small" color={colors.muted}>{card.flavour}</Text> : null}
      {card.programme && card.programme_text ? <Text variant="small">{card.programme_text}</Text> : null}
      <Button kind={canRestore ? "primary" : "secondary"} label="Restore" hint={canRestore ? `Flips the tile to Healthy and claims it. Metre down ${rules.restore_ticks_down}.` : explainError(o.restore)} disabled={!canAct || !canRestore} onPress={() => onAct({ type: "UseTool", handIndex: index, kind: "restore" })} />
      <Button kind={canFortify ? "primary" : "secondary"} label="Fortify" hint={canFortify ? `Adds a Shield. Metre down ${rules.fortify_ticks_down}.` : explainError(o.fortify)} disabled={!canAct || !canFortify} onPress={() => onAct({ type: "UseTool", handIndex: index, kind: "fortify" })} />
      {targets.length ? targets.map((t) => (
        <Button key={t.id} label={`Give to ${t.name}`} hint="Uses your Gift for the turn, except at the Research Station." disabled={!canAct} onPress={() => onAct({ type: "Gift", toPlayer: t.id, handIndex: index })} />
      )) : <Text variant="small" color={colors.muted}>Gifts need another Steward on your tile with room in their hand.</Text>}
      {stranded ? <Button label="Improvise" hint="Spend this Tool to hop over one lost tile this turn." disabled={!canAct} onPress={() => onAct({ type: "Improvise", handIndex: index })} /> : null}
    </Sheet>
  );
}
