import type { GameContent } from "./types";
import { BIOME_IDS, ROLE_IDS } from "./types";

/** Returns a list of problems (empty = fine). Mirrors Content/validate_cards.py counts. */
export function validateContent(c: GameContent): string[] {
  const p: string[] = [];
  const r = c.rules;
  if (c.board.tiles.length !== r.tiles.total) p.push(`board has ${c.board.tiles.length} tiles, rules say ${r.tiles.total}`);
  if (c.board.version !== r.version) p.push(`board.json version ${c.board.version} != rules ${r.version}`);

  const ids = new Set<string>();
  const count = { ravage: 0, tool: 0, event: 0 };
  for (const card of c.cards) {
    if (ids.has(card.id)) p.push(`duplicate card id ${card.id}`);
    ids.add(card.id);
    count[card.type]++;
  }
  if (c.cards.length !== r.deck.ravage + r.deck.tool + r.deck.event) p.push(`deck has ${c.cards.length} cards`);
  for (const t of ["ravage", "tool", "event"] as const) {
    if (count[t] !== r.deck[t]) p.push(`${t}: ${count[t]} cards, rules say ${r.deck[t]}`);
  }
  for (const b of BIOME_IDS) {
    const rav = c.cards.filter((x) => x.type === "ravage" && x.biome === b).length;
    const tools = c.cards.filter((x) => x.type === "tool" && x.biome === b);
    const prog = tools.filter((x) => x.type === "tool" && x.programme).length;
    if (rav !== r.deck.ravage_per_biome) p.push(`${b}: ${rav} ravage cards`);
    if (tools.length !== r.deck.tool_per_biome) p.push(`${b}: ${tools.length} tool cards`);
    if (prog !== r.deck.programme_per_biome) p.push(`${b}: ${prog} programme cards`);
    if (!c.biomes[b]) p.push(`biomes.json missing ${b}`);
  }
  for (const role of ROLE_IDS) if (!c.roles.some((x) => x.key === role)) p.push(`missing role ${role}`);
  const surges = c.cards.filter((x) => x.type === "ravage" && x.surge).length;
  if (surges !== r.difficulty.normal.surge_cards) p.push(`${surges} surge cards, rules say ${r.difficulty.normal.surge_cards}`);

  // Board: neighbours are symmetric and match axial distance 1.
  const byId = new Map(c.board.tiles.map((t) => [t.id, t]));
  for (const t of c.board.tiles) {
    for (const n of t.neighbours) {
      const o = byId.get(n);
      if (!o) { p.push(`tile ${t.id} lists unknown neighbour ${n}`); continue; }
      if (!o.neighbours.includes(t.id)) p.push(`neighbour ${t.id}->${n} is not symmetric`);
      const dq = o.q - t.q, dr = o.r - t.r;
      if (Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) !== 1) p.push(`tile ${t.id} and ${n} are not adjacent`);
    }
  }
  return p;
}
