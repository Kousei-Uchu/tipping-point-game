import type { BiomeId, GameContent, RoleId } from "@tipping-point/content";
import { BIOME_IDS, ROLE_IDS } from "@tipping-point/content";
import { cardMap, emit, newHeldTool, type Ctx } from "./ctx";
import { resolveRavage } from "./ravage";
import { mulberry32, type RngFactory } from "./rng";
import { enterTurn } from "./turn";
import type { GameEvent, NewGameOptions, Player, State, Tile } from "./types";

/** Placeholder seat colours (colour-blind separable). The UI may restyle; pattern+initial carry identity. */
export const PLAYER_COLOURS = ["#D1495B", "#2E86AB", "#EDAE49", "#6A4C93", "#3A7D44"] as const;

/** Engine Spec section 3. The ORDER of RNG use is part of the contract. */
export function createGame(content: GameContent, opt: NewGameOptions, rngFactory: RngFactory = mulberry32): { state: State; events: GameEvent[] } {
  const rules = content.rules;
  const n = opt.players.length;
  if (n < 2 || n > 5) throw new Error("Tipping Point needs 2 to 5 Stewards");
  if (new Set(opt.players.map((p) => p.id)).size !== n) throw new Error("player ids must be unique");
  const startSeat = opt.startSeat ?? 0;
  const rng = rngFactory(opt.seed >>> 0);
  const hubId = content.board.hubId;

  // 1. Shuffle the 60 biome tiles into the 60 non-hub positions.
  const biomeList: BiomeId[] = BIOME_IDS.flatMap((b) => Array<BiomeId>(rules.tiles.per_biome).fill(b));
  rng.shuffle(biomeList);
  let k = 0;
  const tiles: Tile[] = content.board.tiles.map((bt) => ({
    id: bt.id, q: bt.q, r: bt.r,
    biome: bt.id === hubId ? "hub" : biomeList[k++]!,
    status: "healthy", shield: false, stabilised: false, owner: null,
  }));

  const players: Player[] = opt.players.map((p, seat) => ({
    id: p.id, name: p.name, seat, colour: PLAYER_COLOURS[seat]!, isBot: !!p.isBot,
    botLevel: p.botLevel, botMode: p.botMode,
    roles: [], pos: hubId, awayTurns: 0, hand: [], tokensInSupply: rules.limits.steward_tokens_each,
  }));

  const zero = () => Object.fromEntries(BIOME_IDS.map((b) => [b, 0])) as Record<BiomeId, number>;
  const no = () => Object.fromEntries(BIOME_IDS.map((b) => [b, false])) as Record<BiomeId, boolean>;
  const s: State = {
    rulesVersion: rules.rules_version, seed: opt.seed, rngState: 0, difficulty: opt.difficulty,
    tiles, players, deck: content.cards.map((c) => c.id),
    metreTicks: 0, stabiliseSupply: rules.limits.stabilise_markers, shieldSupply: rules.limits.shield_tokens,
    removedByBiome: zero(), cascaded: no(), extinct: no(), extinctCount: 0, lobbyCharges: 0,
    calmCoverCardId: null, round: 1, startSeat, activeSeat: startSeat, turn: null, pending: null,
    continuations: [], phase: "setup", trophyReachedBySeat: null, finalLapRemaining: [], eventSeq: 0, result: null,
  };
  const x: Ctx = { s, c: content, rng, ev: [], cards: cardMap(content), suppress: false, trophyJustReached: false };
  emit(x, "GameStarted", { seed: opt.seed, difficulty: opt.difficulty, players: n, rules: rules.rules_version });
  emit(x, "TilesPlaced", { biomes: tiles.map((t) => t.biome) });

  // 2. Deck. Easy: one random Surge card gets the Calm cover (one RNG draw). Then shuffle.
  if (opt.difficulty === "easy") {
    const surges = content.cards.filter((c) => c.type === "ravage" && c.surge).map((c) => c.id);
    s.calmCoverCardId = rng.choice(surges);
    emit(x, "CalmCoverPlaced", { cardId: s.calmCoverCardId });
  }
  rng.shuffle(s.deck);

  // 3. Metre.
  s.metreTicks = rules.metre.start_ticks[opt.difficulty] + (n === 2 ? rules.metre.ticks_per_band : 0);
  emit(x, "MetreSet", { ticks: s.metreTicks });

  // 4. Roles from a seeded shuffle. Easy with up to 3 Stewards: two distinct roles each (D4).
  const roles: RoleId[] = [...ROLE_IDS];
  rng.shuffle(roles);
  const per = opt.difficulty === "easy" && n <= 3 ? 2 : 1;
  players.forEach((p, i) => { p.roles = roles.slice(i * per, i * per + per); });
  emit(x, "RolesDealt", { roles: players.map((p) => p.roles) });

  // 5. Opening Strike: resolve Ravage cards from the top (they stay in the deck), then reshuffle.
  x.suppress = true;
  let strikes = 0;
  for (const id of [...s.deck]) {
    if (strikes >= rules.difficulty[opt.difficulty].opening_strike) break;
    const card = x.cards.get(id)!;
    if (card.type !== "ravage") continue;
    emit(x, "OpeningStrikeCard", { cardId: id, opening: true });
    resolveRavage(x, card);
    strikes++;
  }
  x.suppress = false;
  rng.shuffle(s.deck);

  // 6. One Tool each (first Tool in the deck, seat order). 7. Easy catch-up Tools.
  const deal = (seat: number) => {
    const i = s.deck.findIndex((id) => x.cards.get(id)!.type === "tool");
    const [id] = s.deck.splice(i, 1);
    players[seat]!.hand.push(newHeldTool(x, id!));
  };
  players.forEach((_, seat) => deal(seat));
  if (opt.difficulty === "easy") {
    if (n === 4) deal(3);
    if (n === 5) { deal(3); deal(4); }
  }
  emit(x, "SetupComplete", {});

  // 8. First turn (the lobby decides who is youngest).
  s.phase = "turn";
  enterTurn(x, startSeat);
  s.rngState = rng.state;
  return { state: s, events: x.ev };
}
