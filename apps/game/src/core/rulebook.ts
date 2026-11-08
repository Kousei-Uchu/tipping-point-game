// The rulebook: every rule in plain words, as data. No React, no platform code.
//
// Numbers (tiles per biome, ticks, hand size, difficulty settings) and names (biomes, Tools, Roles, Events) are read
// from the content package, so the book cannot drift from the game. Test: test/rulebook.test.ts.
// Copy rules: no em dashes, no emoji, short sentences, say what happens.
import { content } from "./content";

export type Block =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "list"; items: string[] }
  | { t: "steps"; items: string[] }
  | { t: "tip"; text: string }
  | { t: "table"; head: string[]; rows: string[][] }
  /** Real pieces drawn with the same components the board uses. The words come from here; the drawing from game/Specimen.tsx. */
  | { t: "specimens"; items: { kind: SpecimenKind; look: string; means: string }[] };

/** Every piece the book draws. Each is built from the real Tile, so the book teaches from the objects on the table. */
export const SPECIMEN_KINDS = ["healthy", "vulnerable", "shield", "stabilised", "lost", "token", "pawn", "reach"] as const;
export type SpecimenKind = (typeof SPECIMEN_KINDS)[number];

export interface Chapter {
  id: string;
  title: string;
  /** One line under the title in the contents list. */
  summary: string;
  blocks: Block[];
}

const { rules, biomes, roles } = content;
const { metre, limits, turn, tiles, difficulty, legacy, deck } = rules;
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const biomeList = Object.values(biomes);
const events = content.cards.filter((c) => c.type === "event");

/** Metre start, as the Pressure band it begins in (ticks over ticks per band, rounded up). */
const startBand = (ticks: number) => Math.ceil(ticks / metre.ticks_per_band);

export const CHAPTERS: readonly Chapter[] = [
  {
    id: "goal",
    title: "The goal",
    summary: "How the game is won and lost.",
    blocks: [
      { t: "p", text: "Tipping Point is a team game. The Stewards (the players) win or lose together. A win also gives each Steward a Legacy score, so you can see who did the most good." },
      { t: "h", text: "How you win" },
      { t: "p", text: "Pull the Pressure Metre all the way down to the Trophy. When that happens, every Steward plays one last turn (the final lap), then Legacy points are counted." },
      { t: "h", text: "How you lose" },
      { t: "list", items: [
        "The Metre rises to the Skull (shown as Collapse at the top of the Metre).",
        `A second biome goes extinct. A biome is extinct when all ${tiles.per_biome} of its tiles are lost.`,
      ] },
      { t: "tip", text: "The whole game in one line: each turn you repair damaged tiles to push the Metre down, and each card you draw may damage the board and push it back up." },
    ],
  },
  {
    id: "screen",
    title: "Reading the screen",
    summary: "Whose turn it is, what the chips, tiles and Metre mean.",
    blocks: [
      { t: "h", text: "Whose turn is it?" },
      { t: "p", text: "The title bar at the top names the Steward whose turn it is, with their colour dot. The notebook page pinned below it is the play guide. It carries a YOUR TURN stamp and tells you what to do next, and it lights the tile, the Tool cards or the draw pile it is talking about. In a game with a bot, the stamp says BOT TURN while a bot plays." },
      { t: "h", text: "What can I still do this turn?" },
      { t: "p", text: "The four round counters under the title show what is left: Move (tiles you can still walk), Tool, Ability and Gift. A counter turned face down (an empty dashed ring) is used up for this turn." },
      { t: "h", text: "The board" },
      { t: "p", text: "The board is made of hexagon tiles. The raised tile in the middle with a small building on it is the Research Station, where everyone starts. Tap any tile to see what it is and what you can do there. The + and - buttons zoom, and Fit shows the whole board again." },
      { t: "specimens", items: [
        { kind: "healthy", look: "Full colour, a symbol and an edge pattern", means: "A Healthy tile. Each biome has its own colour, symbol and edge pattern." },
        { kind: "vulnerable", look: "Faded and scuffed, a dark red rim, a folded red tab", means: "A Vulnerable (damaged) tile. Restore it to fix it." },
        { kind: "shield", look: "A raised blue collar", means: "A Shield. It soaks up the next hit on a Healthy tile." },
        { kind: "stabilised", look: "A small cube with a plus on top", means: "A Stabilise marker. It soaks up the next hit on a Vulnerable tile." },
        { kind: "lost", look: "A hole in the board, the dark mat showing through", means: "A lost tile. It cannot be walked on." },
        { kind: "token", look: "A disc in a Steward's colour with their shape on it, top right of a tile", means: "That Steward's token. They own the tile and score for it if it is Healthy at the end." },
        { kind: "pawn", look: "A painted wooden piece with a shape and a letter, bottom of a tile", means: "A Steward's pawn: where that Steward is standing." },
        { kind: "reach", look: "A teal ring", means: "A tile you can walk to this turn." },
      ] },
      { t: "h", text: "The Pressure Metre" },
      { t: "p", text: "The tall gauge on the right. The brass slider shows where the Metre is. The Trophy cup is at the bottom, the Skull plate at the top, and the numbers 1 to 5 are the Pressure." },
      { t: "h", text: "Your hand and the Draw button" },
      { t: "p", text: "Your Tool cards are along the bottom. Tap one to use it. The Draw button ends your turn." },
      { t: "h", text: "Role, Stewards and Log" },
      { t: "p", text: "Role shows what your special power does. Stewards shows everyone's role, Tools and Legacy score. Log lists everything that has happened, newest first. Undo (top right) takes back your last action until you press Draw." },
    ],
  },
  {
    id: "turn",
    title: "Your turn",
    summary: "The five things you can do, in order.",
    blocks: [
      { t: "p", text: "On your turn you can do these in any order, except Draw, which always comes last and ends your turn. You never have to use everything." },
      { t: "h", text: "1. Move" },
      { t: "p", text: `Walk up to ${plural(turn.move, "tile")} in total each turn, one neighbouring tile at a time. You can split it up: walk, repair, then walk on. Lost tiles cannot be crossed.` },
      { t: "h", text: "2. Tool action (once)" },
      { t: "p", text: "Use a Tool card on the tile you stand on to Restore or Fortify it, or Stabilise a damaged tile without any card. You get one Tool action per turn. See Tools and repairing." },
      { t: "h", text: "3. Ability (once)" },
      { t: "p", text: "Use your Role's power. See Roles." },
      { t: "h", text: "4. Gift (once)" },
      { t: "p", text: `Give one Tool to a Steward standing on the same tile as you. They must have room (a hand holds ${limits.hand} Tools). At the Research Station you can Gift as often as you like.` },
      { t: "h", text: "5. Draw (always last)" },
      { t: "p", text: "Reveal the top card of the deck and do what it says. This ends your turn. See The Draw." },
      { t: "tip", text: "If you reach the Trophy during your turn, your turn ends straight away and you do not draw." },
    ],
  },
  {
    id: "tools",
    title: "Tools and repairing",
    summary: "Restore, Fortify, Stabilise, and which Tool fits where.",
    blocks: [
      { t: "p", text: "A Tool card only works on its own biome, so you must be standing on a tile of that biome. You use it on the tile you are standing on." },
      { t: "h", text: "Restore" },
      { t: "p", text: `Use on a Vulnerable tile. It becomes Healthy and you place one of your tokens on it (any earlier owner gets their token back). The Metre goes down ${metre.restore_ticks_down} ticks. This is how you win.` },
      { t: "h", text: "Fortify" },
      { t: "p", text: `Use on a Healthy tile that has no Shield. It gets a Shield, which absorbs the next hit. The Metre goes down ${metre.fortify_ticks_down} tick. There are ${limits.shield_tokens} Shields in the supply.` },
      { t: "h", text: "Stabilise" },
      { t: "p", text: `Use on a Vulnerable tile, with no card. A marker absorbs the next hit on it, so the tile is not lost yet. It does not repair the tile and does not move the Metre. It uses your Tool action. There are ${limits.stabilise_markers} markers in the supply.` },
      { t: "h", text: "Single use and Programme Tools" },
      { t: "p", text: `Each biome has a single-use Tool, which goes back into the deck after one use, and a Programme Tool, which can be used ${deck.programme_uses} times, each on a different tile.` },
      { t: "table", head: ["Biome", "Tool", "Programme"], rows: biomeList.map((b) => [b.name, b.tool, b.programme]) },
      { t: "h", text: "Your hand" },
      { t: "p", text: `You can hold ${limits.hand} Tools. If you draw a Tool with a full hand, it goes back into the deck. Hands are open: any Steward may look at another Steward's Tools, and the table is meant to plan together.` },
      { t: "h", text: "Tokens" },
      { t: "p", text: `Each Steward has ${limits.steward_tokens_each} tokens. A token on a tile means you own it. If you have none left, you can still Restore a tile, but you do not claim it.` },
      { t: "h", text: "Stuck behind lost tiles" },
      { t: "p", text: "If every tile around you is lost, you are stranded. Use Improvise: spend any Tool to hop over one lost tile this turn. You can never end a move on a lost tile." },
    ],
  },
  {
    id: "draw",
    title: "The Draw",
    summary: "What each kind of card does.",
    blocks: [
      { t: "p", text: "The deck has three kinds of card. You reveal one at the end of your turn." },
      { t: "h", text: "Tool card" },
      { t: "p", text: "You keep it if your hand has room. If not, it goes back into the deck." },
      { t: "h", text: "Ravage card" },
      { t: "p", text: "It damages tiles of one biome. See Ravage and damage. Tap Next to read each card as it plays out." },
      { t: "h", text: "Event card" },
      { t: "p", text: "Do what it says, then it is shuffled back into the deck." },
      { t: "table", head: ["Event", "What it does"], rows: events.map((e) => [e.name, e.effect]) },
      { t: "tip", text: "In the final lap there are no draws. Pressing End turn just passes play to the next Steward." },
    ],
  },
  {
    id: "ravage",
    title: "Ravage and damage",
    summary: "How tiles get hurt, and what a lost tile costs.",
    blocks: [
      { t: "steps", items: [
        "The Ravage card names a biome.",
        "It calls as many tiles of that biome as the current Pressure (1 to 5).",
        "Each called tile gets one step worse.",
        "If the card has a Surge, the Metre then rises one band.",
      ] },
      { t: "table", head: ["Called tile is", "It becomes"], rows: [
        ["Healthy with a Shield", "Healthy, Shield removed"],
        ["Healthy", "Vulnerable"],
        ["Vulnerable with a marker", "Vulnerable, marker removed"],
        ["Vulnerable", "Lost"],
      ] },
      { t: "p", text: "A card never calls the same tile twice until every standing tile of that biome has been called." },
      { t: "h", text: "When a tile is lost" },
      { t: "list", items: [
        "The token on it goes back to its owner.",
        `Any Steward standing on it is evacuated. They miss ${plural(difficulty.easy.evacuation_rounds, "turn")} on Easy, ${difficulty.normal.evacuation_rounds} on Normal and ${difficulty.hard.evacuation_rounds} on Hard, then come back at the Research Station.`,
      ] },
      { t: "h", text: "Surge" },
      { t: "p", text: `Some Ravage cards carry a Surge. After the tiles are hit, the Metre rises one band (${metre.surge_ticks_up} ticks).` },
      { t: "h", text: "Cascade" },
      { t: "p", text: "When a biome loses its 5th tile, a Cascade fires and the Metre rises one band. It happens once per biome." },
      { t: "h", text: "Extinction" },
      { t: "p", text: `When a biome loses all ${tiles.per_biome} tiles it is extinct. The first extinction raises the Metre one band. The second ends the game: everyone loses. Ravage cards for an extinct biome call nothing.` },
      { t: "h", text: "Opening Strike" },
      { t: "p", text: "Before the first turn, a few Ravage cards damage the board so there is something to fix. They never move the Metre." },
    ],
  },
  {
    id: "metre",
    title: "The Pressure Metre",
    summary: "Bands, ticks, and what moves the marker.",
    blocks: [
      { t: "p", text: `The Metre has ${metre.bands} bands of ${metre.ticks_per_band} ticks, ${metre.total_ticks} ticks in all. The band the marker is in is the Pressure: how many tiles each Ravage card calls. Trophy is at the bottom and the Skull above the top.` },
      { t: "table", head: ["What happens", "The Metre"], rows: [
        ["Restore a tile", `Down ${metre.restore_ticks_down} ticks`],
        ["Fortify a tile", `Down ${metre.fortify_ticks_down} tick`],
        ["Surge on a Ravage card", `Up ${metre.surge_ticks_up} ticks (one band)`],
        ["Cascade (a biome's 5th lost tile)", `Up ${metre.surge_ticks_up} ticks`],
        ["First extinction", `Up ${metre.surge_ticks_up} ticks`],
        ["Opening Strike", "Does not move"],
      ] },
      { t: "p", text: "Once the Trophy is reached the Metre stays at the bottom for the final lap." },
      { t: "tip", text: "In a 2 Steward game the Metre starts one band higher." },
    ],
  },
  {
    id: "roles",
    title: "Roles",
    summary: "Each Steward's special power.",
    blocks: [
      { t: "p", text: "Each Steward has a Role. Ranger and Engineer work all the time. The others are used once per turn, as your Ability action." },
      { t: "table", head: ["Role", "What it does"], rows: roles.map((r) => [r.name, r.ability]) },
      { t: "tip", text: "The Ecologist's Forecast also uses up your Tool action, which is why it only works if you have not used a Tool or Stabilise yet." },
      { t: "p", text: "On Easy, games with up to 3 Stewards give each Steward two Roles." },
    ],
  },
  {
    id: "end",
    title: "Final lap and scoring",
    summary: "What happens at the Trophy, and how Legacy is counted.",
    blocks: [
      { t: "h", text: "The final lap" },
      { t: "p", text: "When the Metre reaches the Trophy, that turn ends at once. Every other Steward then plays one last turn, and the Steward who reached the Trophy plays last. No cards are drawn, so nothing gets damaged. Use the final lap to repair and score." },
      { t: "h", text: "Legacy" },
      { t: "list", items: [
        `${plural(legacy.healthy_token, "point")} for each of your tokens on a Healthy tile.`,
        `+${legacy.guardian_bonus} for each biome where you are the Guardian: you own more than half of the owned tiles of that biome that still stand (Vulnerable tiles count here).`,
      ] },
      { t: "p", text: "The highest Legacy wins. If tied, the Steward with tokens on the most different biomes wins, then the one with the most tokens on Healthy tiles. If still tied, the win is shared." },
      { t: "tip", text: "If the game ends in Collapse there is no Legacy score. Everyone loses together." },
    ],
  },
  {
    id: "setup",
    title: "Difficulty and setup",
    summary: "What the game sets up for you, and the three levels.",
    blocks: [
      { t: "p", text: `The board has ${tiles.total} tiles: ${tiles.per_biome} tiles for each of the ${tiles.biomes} biomes, and the Research Station. Everyone starts at the Station with one Tool and one Role. The app sets all this up.` },
      { t: "table", head: ["", "Easy", "Normal", "Hard"], rows: [
        ["Starting Pressure", ...(["easy", "normal", "hard"] as const).map((d) => String(startBand(metre.start_ticks[d])))],
        ["Opening Strike cards", ...(["easy", "normal", "hard"] as const).map((d) => String(difficulty[d].opening_strike))],
        ["Turns missed if evacuated", ...(["easy", "normal", "hard"] as const).map((d) => String(difficulty[d].evacuation_rounds))],
      ] },
      { t: "p", text: "On Easy, one Surge card is covered by a Calm cover, so its Surge never fires. With 4 or 5 Stewards on Easy, the last seat or two start with an extra Tool." },
    ],
  },
  {
    id: "faq",
    title: "Questions",
    summary: "Quick answers when something looks wrong.",
    blocks: [
      { t: "table", head: ["Question", "Answer"], rows: [
        ["Whose turn is it?", "Look at the title bar and the notebook page below it. Both name the Steward."],
        ["Why can't I Restore?", "You need to stand on a Vulnerable tile of the same biome as your Tool, and not have used your Tool action. The small text under the button says what is missing."],
        ["Why did the Metre jump up?", "A Surge, a Cascade or the first extinction. The Log says which."],
        ["Can I take a move back?", "Yes. Undo, top right, works until you press Draw."],
        ["What does a bot do?", "It plays by itself. Tap Next to read each card it draws."],
        ["Where did a Steward go?", "Their tile was lost, so they are evacuated and will come back at the Research Station."],
        ["I have actions left. Should I Draw?", "The app asks you to confirm. If nothing useful is left, yes."],
        ["Nothing I hold matches a damaged tile.", "Move towards a Steward with the right Tool and Gift yours, or Draw and hope for a match."],
      ] },
    ],
  },
  {
    id: "words",
    title: "Words used in the game",
    summary: "A short dictionary.",
    blocks: [
      { t: "table", head: ["Word", "Meaning"], rows: [
        ["Steward", "A player."],
        ["Biome", `One of the ${tiles.biomes} kinds of land: ${biomeList.map((b) => b.name).join(", ")}.`],
        ["Healthy", "A tile in good shape."],
        ["Vulnerable", "A damaged tile. One more hit and it is lost."],
        ["Lost", "A tile that is gone. It cannot be walked on."],
        ["Shield", "Soaks up one hit on a Healthy tile."],
        ["Stabilise marker", "Soaks up one hit on a Vulnerable tile."],
        ["Token", "Your mark on a tile you restored."],
        ["Tool", "A card that repairs or protects one biome."],
        ["Programme", "A Tool that can be used twice, on different tiles."],
        ["Ravage", "A card that damages tiles."],
        ["Pressure", "The band of the Metre: how many tiles a Ravage card calls."],
        ["Surge", "A mark on some Ravage cards: the Metre rises one band."],
        ["Cascade", "A biome's 5th lost tile: the Metre rises one band."],
        ["Extinct", "A biome with no tiles left."],
        ["Trophy", "The bottom of the Metre. Reaching it starts the final lap."],
        ["Skull", "The top of the Metre. Reaching it means everyone loses."],
        ["Legacy", "Your score at the end of a won game."],
        ["Guardian", `Owning most of a biome's tiles: +${legacy.guardian_bonus} Legacy.`],
        ["Evacuated", "Off the board for a few turns after your tile is lost."],
        ["Research Station", "The middle tile. It is never damaged."],
      ] },
    ],
  },
];

export const chapterIndex = (id: string): number => Math.max(0, CHAPTERS.findIndex((c) => c.id === id));

// A one-shot note from the screen that opens the book ("open it at this chapter").
let target: string | null = null;
export const setRulebookTarget = (id: string | null): void => { target = id; };
export const takeRulebookTarget = (): string | null => { const t = target; target = null; return t; };
