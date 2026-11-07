import React, { useState } from "react";
import { cardById } from "../../core/content";
import { explainError } from "../../core/errors";
import { abilityStatus, courierTargets, pilotDestinations } from "../../core/selectors";
import { biomeName } from "../../core/content";
import { Button } from "../../ui/Button";
import { Sheet } from "../../ui/Sheet";
import { Text } from "../../ui/Text";
import { colors } from "../../theme/tokens";
import { RoleCardView } from "../RoleCardView";
import type { SheetProps } from "./common";

const ACTION_LABEL = { ecologist: "Use Forecast", activist: "Reduce the next Ravage by 1", courier: "Give a Tool anywhere", pilot: "Fly to another Steward" } as const;

export function RoleSheet({ state, actor, canAct, docked, onAct, onClose }: SheetProps) {
  const [courierCard, setCourierCard] = useState<number | null>(null);
  const [mode, setMode] = useState<"courier" | "pilot" | null>(null);

  return (
    <Sheet title={actor.roles.length > 1 ? "Roles" : "Role"} subtitle={`${actor.name}'s abilities`} onClose={onClose} docked={docked}>
      {actor.roles.map((role) => {
        const st = abilityStatus(state, actor, role);
        return (
          <RoleCardView key={role} role={role}>
            {st.kind === "ready" && (role === "ecologist" || role === "activist") ? (
              <Button kind="primary" label={ACTION_LABEL[role]} disabled={!canAct} onPress={() => onAct({ type: "UseAbility", role })} />
            ) : null}
            {st.kind === "choice" ? (
              <Button kind="primary" label={ACTION_LABEL[st.needs]} disabled={!canAct} onPress={() => { setMode(st.needs); setCourierCard(null); }} />
            ) : null}
            {st.kind === "blocked" ? <Text variant="small" color={colors.muted}>{st.error === "E_BAD_PAYLOAD" ? "Nothing to use this on right now." : explainError(st.error)}</Text> : null}
          </RoleCardView>
        );
      })}

      {mode === "courier" ? (
        <>
          <Text variant="heading">{courierCard === null ? "Which Tool?" : "Give it to whom?"}</Text>
          {courierCard === null
            ? actor.hand.map((h, i) => <Button key={i} label={cardById(h.cardId)?.name ?? "Tool"} onPress={() => setCourierCard(i)} />)
            : courierTargets(state, actor).map((t) => (
              <Button key={t.id} label={t.name} onPress={() => onAct({ type: "UseAbility", role: "courier", payload: { toPlayer: t.id, handIndex: courierCard } })} />
            ))}
        </>
      ) : null}

      {mode === "pilot" ? (
        <>
          <Text variant="heading">Fly to</Text>
          {pilotDestinations(state, actor).map((tile) => {
            const names = state.players.filter((p) => p.id !== actor.id && p.pos === tile).map((p) => p.name).join(" and ");
            return <Button key={tile} label={`${names}'s tile`} hint={biomeName(state.tiles[tile]!.biome)} onPress={() => onAct({ type: "UseAbility", role: "pilot", payload: { to: tile } })} />;
          })}
        </>
      ) : null}
    </Sheet>
  );
}
