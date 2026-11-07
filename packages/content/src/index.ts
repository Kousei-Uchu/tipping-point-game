import rulesJson from "../data/rules.json";
import cardsJson from "../data/cards.json";
import biomesJson from "../data/biomes.json";
import boardJson from "../data/board.json";
import type { BiomeDef, BiomeId, BoardTile, Card, GameContent, RoleCard, Rules } from "./types";
import { validateContent } from "./validate";

export * from "./types";
export { validateContent } from "./validate";

function build(): GameContent {
  const biomes = {} as Record<BiomeId, BiomeDef>;
  for (const b of biomesJson.biomes as unknown as BiomeDef[]) biomes[b.key] = b;
  const tiles = (boardJson.layout as unknown as BoardTile[]).slice().sort((a, b) => a.id - b.id);
  const hub = tiles.find((t) => t.q === 0 && t.r === 0);
  if (!hub) throw new Error("board.json has no tile at (0,0) for the Hub");
  return {
    version: rulesJson.version,
    rules: rulesJson as unknown as Rules,
    cards: cardsJson.cards as unknown as Card[],
    roles: cardsJson.roles as unknown as RoleCard[],
    biomes,
    hub: biomesJson.hub,
    ui: biomesJson.ui,
    board: { version: boardJson.version, tiles, hubId: hub.id },
  };
}

/** The shipped content, validated once at import time. */
export const content: GameContent = build();
const problems = validateContent(content);
if (problems.length) throw new Error("Content failed validation:\n- " + problems.join("\n- "));
