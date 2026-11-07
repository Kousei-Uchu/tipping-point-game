# Style guide: a field survey on punchboard

One page. Read it before adding any screen or piece. It exists so the two halves of the look (chunky die-cut pieces, naturalist's labels) do not fight. Background and reasoning: `Tipping_Point_Making_It_Feel_Like_a_Board_Game.md`.

## The five rules

1. Objects, not panels. A game piece looks like a piece (thick, edged, shadowed). A rule or status is printed on a piece, not floating in a box.
2. Everything has weight. Anything that moves has a start, an end and a landing.
3. Colour carries game state only. Table, paper, wood stay neutral so biome colours, danger red and Trophy gold stand out.
4. Words live on the components.
5. Quiet by default, loud for big moments. The Surge is the loudest thing in the game.

## Kit (src/ui)

| Use | Component | Notes |
| --- | --- | --- |
| Any panel, row, card-like box | `Plate` | Card stock, keyline, grain, resting shadow. `tone="deep"` for a recessed row, `accent` for a tab edge, `elevation="flat"` inside another plate |
| Any button | `Key` (`Button` is an alias) | primary (ink), secondary (stock), danger (red), quiet (flat). Disabled looks unprinted: dashed outline, no base |
| Status word | `Label` / `Chip` | Stamp face, uppercase, on a paper tag. Short words only |
| Counter with a number | `TokenChip` | A disc with a side. Zero turns it face down (dashed ring) |
| Slide-up or centred card | `Sheet` | A Plate at `held` elevation over the felt-tinted scrim |
| Message | `useToast` | A paper slip, slightly crooked |
| The table | `Felt` / `Screen felt` | Dark mat behind the board. Never put text straight on it |
| Ledge, peg | `Wood` | Wood face, pale top edge, dark lower edge |
| Tile, pawn, Shield, hole | `game/Tile.tsx` | Thickness is a few px of side plus a shadow, never a 3D tilt. Geometry helpers live in `core/boardArt.ts` |
| Pressure gauge | `game/Metre.tsx` | Kraft frame, glass tube, brass slider, Trophy and Skull plates |
| Pile, hand, mat | `game/Piles.tsx`, `HandTray.tsx`, `StewardMat.tsx` | Draw and discard, fanned hand on a ledge, per-Steward tray |

## Tokens (src/theme)

- `materials.ts`: felt, stock, stockDeep, keyline, kraft, wood. Starting values, tune on a real screen.
- `tokens.ts`: `colors` (ink, danger, trophy come from the content package), `elevation` (resting, lifted, held; each carries Android `elevation` too), `RISE`, `fonts`, `type`.
- `colour.ts`: `darken`, `lighten`, `mix`, `contrast`. The tile side is `darken(biomeColour, 0.18)`.

## Type

- Display face (Fredoka): titles and card names only. Variants `display` and `title`.
- Body face (Nunito): everything readable.
- Stamp face (Special Elite): short uppercase labels only (YOUR TURN). Variant `stamp`.
- Licences: Fredoka and Nunito are SIL OFL, Special Elite is Apache 2.0. The stamp face is a provisional pick, open for a decision.

## Do

- Put readable text on a Plate or card, never straight on the felt.
- Use `colors.dangerText` for red text, `colors.danger` for red fills.
- Check any new text and surface pairing in `test/materials.test.ts`.
- Keep texture low contrast so it never fights biome symbols.
- Draw a lost tile as a hole (felt showing), not a coloured or dashed shape.
- Paint tiles upper rows first (`paintOrder`) so sides and shadows fall under the row below.
- Keep 200% text, reduced motion, pattern-plus-colour and 44 px taps working.

## Do not

- Do not use pure white, or a bare `View` with a border and a background, for a panel. Use `Plate`.
- Do not add a new button style. Add a `kind` to `Key`.
- Do not invent shadows or durations in a screen. Use `elevation` and (from Phase 3) `motion.ts`.
- Do not use colour alone for state. Keep shape, letter or pattern.
- Do not use the display face for body text, or the stamp face for sentences.


## Motion (Phase 3)

All timings live in `src/theme/motion.ts`; nothing else invents a duration. They pass through `motionMs()`: Fast animations halves them, Reduced motion makes them 0, so the value jumps to its end.

| Move | ms | Easing | What moves |
|---|---|---|---|
| keyPress | 80 | out | A Key's face sinks 2 px and springs back |
| lift | 150 | out | A picked-up tile or card rises 2 to 4 px, its shadow grows; the fan straightens it |
| place | 220 | settle | A piece drops about 6 px, dips a little past, settles (pawn, Shield, cube, token) |
| cardFlip | 350 | inOut | The card scales across its middle; the face swaps at the half |
| cardSlide | 400 | out | A card from the deck to the centre, to the notebook panel, and to the discard pile; the panel slides away for a Surge |
| scuff | 250 | inOut | Healthy face and worn face cross-fade |
| drop | 450 | in | A lost tile sinks and fades, the hole fades in |
| metre | 700 | overshoot | The brass slider glides and ticks at each band line |
| shake | 300 | linear | Metre frame, three decaying offsets, only for a Surge, Cascade or extinction |
| discSlide | 400 | out | The turn disc |

Rules: pieces already on the table at load appear in place (they only animate once the board has been drawn); under reduced motion nothing may show its starting position, even for one frame; information that used to arrive by motion (the YOUR TURN stamp) stays, static.

## Sound

`cue(name, settings)` from `platform/feedback.ts` is the only way a screen makes sound or haptics. The cue list, levels and haptics are in `core/soundPlan.ts`; the files are made by `scripts/make-sounds.py` (see `docs/SOUNDS.md`). Quiet by default, medium for tile outcomes, loud only for the Surge, Trophy and Collapse. Cues inside 160 ms of each other: the louder one wins, the quieter ones duck.

## Cards and the Ravage reveal (Phase 4)

One card design, three sizes: hand (name, icon, pips only), sheet, reveal (everything). Top to bottom: picture window, name in the display face, stamped type label (TOOL, RAVAGE, EVENT), use pips (Programme Tools), rules text, and on a Ravage the real-world fact with its source as a footnote. A Surge is a red corner ribbon; never rely on the colour alone, the word SURGE is on it. One shared card back.

- A card is a fixed object: its print is capped (`maxScale`) and never overflows. The same words are in the panel beside it, which does grow with the text size setting.
- The reveal is five beats (lift and flip, biome pulse and stamps, each hit, the Metre, away). Every beat is skippable. Only a Surge, Cascade or extinction shakes, flashes red or gets a stamp; nothing else may compete with them.
- The panel is a notebook page on a Plate. Hits are one short line each, so the real-world fact stays in view; at rest it scrolls to its end if it overflows.
- Reduced motion: no moves, no shake, no flash; the reveal opens at rest. Fast animations halves every timing.
- A tile in danger must still read when blurred: dark red rim, a larger tab, scrapes. Do not rely on fine detail alone.
- Do not give a Tool or Event its own motion until it has its own design; they share the Ravage flow with a shorter panel.

## Teaching and screens (Phase 5)

- Words live on objects. The play guide and the tutorial coach are `Notebook` pages (kraft binding, holes, pin, ribbon in the active Steward's colour); do not put a rule or status in a bare Plate beside the board.
- "Do this now" must also light what it names: `glow` on the hand, `pulseDeck` on the draw pile, reach and ring highlights on tiles. Tune the strength by eye on a real screen.
- The rulebook shows pieces with `Specimen`, which renders the real `Tile`. Never redraw a tile, Shield, marker or token for the book.
- The tutorial spotlight is `Spot`: dim the table, lift the named piece (Lift tween, `elevation.lifted`). Do not draw a box round a region.
- A counter that is used turns face down (`TokenChip`, dashed ring); do not remove it.
- Seats in the lobby are pieces: a peg for a human, `RobotDisc` for a bot. The first player is a drawn lot (`core/lobby.ts`).
- Results: a Trophy is loud and gold; a Collapse is quiet, heavy and dark red, with the board's holes showing. Never reuse the Trophy treatment for a Collapse.
- Titles that name a Steward may wrap to two lines at any width; never truncate to one line.
