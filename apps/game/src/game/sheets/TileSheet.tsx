import React from "react";
import { View } from "react-native";
import { biomeName, cardById, content } from "../../core/content";
import { engine } from "../../core/content";
import { explainError } from "../../core/errors";
import { stabiliseError, stepsBetween, toolOptions } from "../../core/selectors";
import { colors } from "../../theme/tokens";
import { Button } from "../../ui/Button";
import { Chip } from "../../ui/Chip";
import { Sheet } from "../../ui/Sheet";
import { Text } from "../../ui/Text";
import type { SheetProps } from "./common";

interface Props extends SheetProps { tileId: number; reach: ReadonlyMap<number, number[]> }

export function TileSheet({ state, actor, canAct, docked, onAct, onClose, tileId, reach }: Props) {
  const tile = state.tiles[tileId]!;
  const here = actor.pos === tileId;
  const def = tile.biome === "hub" ? null : content.biomes[tile.biome];
  const owner = tile.owner ? state.players.find((p) => p.id === tile.owner) : null;
  const present = state.players.filter((p) => p.pos === tileId);
  const rules = content.rules.metre;
  const path = reach.get(tileId);
  const inPlay = !!state.turn && !state.pending;
  const stranded = here && inPlay && engine.isStranded(state, actor.id);
  const status = tile.status === "removed" ? "Lost" : tile.status === "vulnerable" ? "Vulnerable" : "Healthy";

  return (
    <Sheet title={tile.biome === "hub" ? content.hub.name : biomeName(tile.biome)} subtitle={def ? def.danger : content.hub.note} onClose={onClose} docked={docked}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <Chip label={status} tone={tile.status === "healthy" ? "good" : tile.status === "removed" ? "bad" : "neutral"} />
        {tile.shield ? <Chip label="Shielded" tone="good" /> : null}
        {tile.stabilised ? <Chip label="Stabilised" tone="good" /> : null}
        {owner ? <Chip label={`Owned by ${owner.name}`} /> : null}
      </View>
      {present.length ? <Text variant="small" color={colors.muted}>{`Here: ${present.map((p) => p.name).join(", ")}`}</Text> : null}

      {tile.status === "removed" ? <Text>This tile has been lost and cannot be used.</Text> : null}

      {inPlay && !here && path ? (
        <Button kind="primary" label={`Move here, ${path.length} ${path.length === 1 ? "step" : "steps"}`} onPress={() => onAct({ type: "Move", path })} disabled={!canAct} />
      ) : null}
      {inPlay && !here && !path && tile.status !== "removed" && actor.pos !== null ? (
        <Text color={colors.muted}>{`${stepsBetween(state, actor.pos, tileId)} steps away. Not reachable this turn.`}</Text>
      ) : null}

      {inPlay && here ? (
        <View style={{ gap: 8 }}>
          {tile.status === "vulnerable" ? (
            <Button
              label="Stabilise"
              hint={stabiliseError(state, actor) ? explainError(stabiliseError(state, actor)) : "No Tool needed. The marker absorbs the next hit."}
              disabled={!canAct || stabiliseError(state, actor) !== null}
              onPress={() => onAct({ type: "Stabilise" })}
            />
          ) : null}
          {actor.hand.map((h, i) => {
            const card = cardById(h.cardId);
            if (!card || tile.biome === "hub" || tile.status === "removed") return null;
            const o = toolOptions(state, actor, i);
            const kind = tile.status === "vulnerable" ? "restore" : "fortify";
            const err = kind === "restore" ? o.restore : o.fortify;
            const down = kind === "restore" ? rules.restore_ticks_down : rules.fortify_ticks_down;
            return (
              <Button
                key={`${h.cardId}-${i}`}
                kind={err ? "secondary" : "primary"}
                label={`${kind === "restore" ? "Restore" : "Fortify"} with ${card.name}`}
                hint={err ? explainError(err) : kind === "restore" ? `Flips the tile to Healthy and claims it. Metre down ${down}.` : `Adds a Shield. Metre down ${down}.`}
                disabled={!canAct || err !== null}
                onPress={() => onAct({ type: "UseTool", handIndex: i, kind })}
              />
            );
          })}
          {tile.biome !== "hub" && tile.status !== "removed" && actor.hand.length === 0 && tile.status === "healthy" ? <Text color={colors.muted}>No Tools in hand.</Text> : null}
          {stranded ? actor.hand.map((h, i) => (
            <Button key={`imp-${i}`} label={`Improvise with ${cardById(h.cardId)?.name ?? "a Tool"}`} hint="Spend this Tool to hop over one lost tile this turn." disabled={!canAct} onPress={() => onAct({ type: "Improvise", handIndex: i })} />
          )) : null}
        </View>
      ) : null}
    </Sheet>
  );
}
