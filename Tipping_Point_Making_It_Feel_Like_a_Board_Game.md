# Tipping Point: Making It Feel Like a Board Game

6 Nov 2026 · @Meatloaf · progress updated 7 Nov 2026

## Where we are

The game works, but nothing in it has weight: every surface is flat, every control is the same pill, and nothing moves or makes a sound. That, more than any single ugly thing, is what reads as an afternoon project.

| Area | What is there now | Why it reads as a prototype |
| --- | --- | --- |
| Type | System fonts (Fredoka and Nunito are planned, licence check still open) | Looks like a web form, not a printed game |
| Surfaces | Flat white rounded rectangles on one beige background | No material: nothing looks like card, wood or cloth |
| Buttons | One black or white pill, used for everything | A Restore and a Quit look equally important |
| Board | Flat SVG hexes, thin outline, no thickness or shadow | A diagram of a board, not a board |
| Pieces | Pawns, tokens, Shields and markers are small flat shapes | Nothing to pick up, stack or place |
| Cards | Flat Uno-style band plus text, no illustration or frame | Fine as data, forgettable as objects |
| Metre | A coloured bar with a marker | The game's central tension has no presence |
| Motion and sound | None. Only haptics, and only on phones. No animation or audio library is installed | Every consequence happens silently and instantly |
| Turn changes | The title text changes | No moment where the table hands over |
| Explaining | Text boxes and sheets (the play guide, the rulebook) | The screen explains itself in paragraphs instead of through the objects |

**Worth keeping:** each biome already has its own colour, symbol and edge pattern, so identity does not depend on colour alone. There is a text-scale and reduced-motion setting, and the rules engine is separate from the screens, so the whole look can change without touching a rule.

## Progress (7 Nov)

Phases 1 to 5 are built. The rules engine and content package were not touched. Checked on a real install: `npm run typecheck` clean, engine 40, content 3, app 186 tests passing, `build:web` bundles. Phase 5 has since been looked at in a browser (see below). Nobody has listened to any sound.

| Phase | State | Open items |
| --- | --- | --- |
| 1. Foundations | Built, checked | Licence record for each font file; confirm the stamp face (Special Elite is a provisional pick) |
| 2. The table | Built, checked in Chromium | Tap target fixed on phones: the board opens zoomed on your pawn so tiles are at least 44 px (Fit shows all). Tune pawn size, kraft vs tile contrast, fan angle by eye |
| 3. Motion and sound | Built. Ended up with a small `requestAnimationFrame` tween hook, not Reanimated (the board is SVG, so the native driver would not help). Sounds are synthesised, so no third-party licence | Nobody has listened to the sounds or felt the motion on a phone. Retune by ear |
| 4. Cards and Ravage | Built, driven through full games in Chromium | Cascade, Extinction and Skip-all beats not watched. Draw pile does not pulse yet. Surge test needs real players |
| 5. Teaching and screens | Built and looked at in Chromium at phone and desktop size (two result-screen Metre bugs found and fixed) | The tutorial's nine coach steps were clicked through by script without the rulebook. Done-when still needs a person: someone new to the game finishing it unaided. |
| 6. Art upgrade | Built in vector, no commissioned art: 6 biome headers, 24 Ravage scenes, 6 role emblems, box-lid panorama. 6 Event scenes, card back with biome row | Looked at in Chromium. Open: a no-colour and 200% text check of the new art, the other Ravage scenes seen on a card in play, a look on a real phone. Any scene can be replaced by commissioned art with no layout change |

### Next steps, in order

1. **Done: looked at it.** Title, lobby, tutorial, rulebook specimens, Trophy and Collapse were checked in Chromium at phone and desktop size.
2. **Listen and play.** Audition the 16 sounds and play a game on a real phone for frame rate, since the tweens are JS-driven.
3. **Decision 3 is made: hands are public** (7 Nov). No pass-the-device cover screen is needed. The Forecast peek stays private (the log and sheet already treat it so) and the in-app rulebook now says hands are open. Still to confirm: that the printed rules in `Tipping_Point.md` say the same.
4. **Run the person-with-fresh-eyes checks** (five-second, photograph, Surge, and finishing the tutorial without the rulebook). These cannot be run by a script.
5. **Fix the known gaps:** the 44 px tap size is done on phones. Per-Event icons are done. Owner tokens and pawns now stay put until their tile's badge shows it lost (7 Nov); seen only in tests, not yet in a running game. Judge by eye whether a phone board that no longer shows every tile at once still passes the squint test.
6. **Then decide on Phase 6** (commissioned art) with a real screenshot in hand.

## Direction: a field survey on punchboard

I recommend one look that mixes two of the three options below: chunky die-cut components (option B) carrying the labels, stamps and specimen-card styling of a naturalist's field kit (option A). It suits the theme (Stewards, a Research Station, real facts on cards) and it is the cheapest to build well in vector, because thickness and shadow can be drawn with layered shapes instead of commissioned paintings.

| Option | Feel | Materials | Cost to build | Risk |
| --- | --- | --- | --- | --- |
| A. Field survey | Warm, scientific, hand-assembled | Kraft paper, linen, ink stamps, typewriter labels | Medium | Can feel dry or muted if colour is timid |
| B. Punchboard | Chunky, friendly, tactile | Thick die-cut tiles, felt mat, wooden meeples | Low to medium | Can feel childish if the type and colour are not disciplined |
| C. Illustrated atlas | Beautiful, storybook | Watercolour tiles, serif type, painted cards | High (needs real illustration) | Stalls on art; hard to keep consistent |
| **Recommended: A+B** | Chunky pieces on a survey table, labelled like specimens | Felt or linen mat, thick tiles with a printed face, wooden pawns, stamped labels | Medium | Needs one firm style guide so the two do not fight |

### Five rules for every decision

1. **Objects, not panels.** If something is a game piece, it looks like a piece: thick, edged, casting a shadow. If it is a rule or a status, it is printed on a piece instead of floating in a white box.
2. **Everything has weight.** Anything that moves has a start, an end and a landing. Nothing just changes.
3. **Colour carries game state only.** The table, mat, wood and paper stay in a calm neutral range so biome colours, danger red and the Trophy gold stand out.
4. **Words live on the components.** Labels, stamps and tags on the objects replace paragraphs beside them. The play guide becomes a notebook page, not a box.
5. **Quiet by default, loud for big moments.** A Restore is a small, satisfying thunk. A Surge is the loudest thing that can happen in the game.

## Foundations

Before any screen changes, the shared kit changes: type, a materials palette, a shadow scale and six base components. Every later phase is built from these, so this is the highest-leverage work in the plan.

### Type

The project data already names Fredoka (display) and Nunito (body), both under the SIL Open Font Licence, which allows bundling in an app. The open item is only to confirm that and bundle them with expo-font. I would add one third face for stamps and labels (a typewriter or mono style, also open-licensed). Rules: display only for titles and card names, body for everything readable, stamp face only for short uppercase labels such as YOUR TURN.

### Materials palette

Table and paper tones are new. Ink, danger red and Trophy gold already exist in the content data and stay as they are. Values below are starting points to tune on a real screen.

| Role | Proposed | Used for |
| --- | --- | --- |
| Felt mat | #2E3B3F (slate green-grey) | The table behind the board. Dark on purpose, so biome colours glow |
| Card stock | #F3ECDC | Cards, notebook pages, rulebook |
| Kraft | #C8A878 | Punchboard rims, trays, the Metre frame |
| Wood | #B98A5B | Pawns, marker |
| Tile side | Biome colour darkened about 18% | The thickness of each tile, derived, not hand-picked |
| Ink, danger, Trophy | existing tokens | Text, damage and Surge, the Trophy |

### Depth

Three elevations, used consistently. **Resting:** small, tight shadow (pieces on the board). **Lifted:** larger shadow plus a 2 to 4 px rise (selected tile or card). **Held:** the biggest shadow (a card being revealed). Android needs its own elevation values, so the scale lives in one file.

### Surface recipes

Four recipes, each a small reusable component: **felt** (flat colour plus a tiled grain texture of a few KB), **card stock** (off-white, inner keyline, faint grain), **punchboard** (face, a visible side, a bevel line, and a die-cut corner radius), **wood** (a two-stop gradient and a soft highlight).

### Component kit

| New component | Replaces | Spec |
| --- | --- | --- |
| Plate | White rounded panel | Card-stock surface with a keyline and resting shadow |
| Key | The pill Button | A raised key with a visible base. Pressing sinks it 2 px. Three kinds: primary (ink face), secondary (stock), danger (red). Rest state shows what is possible, disabled state looks unprinted |
| Token chip | Chip | A round or hex counter with a number, like a cube or disc from the box |
| Label | Small grey text | Typewriter stamp on a tag, for status words |
| Sheet | White slide-up sheet | A card laid on the table over a dimmed mat, with the held shadow |
| Toast | Floating rectangle | A paper slip that slides in and settles |

## The table

The game screen becomes a tabletop seen from slightly above: a dark felt mat, the board on it, the Metre standing beside it, the deck and discard on the near edge, and your hand fanned along the bottom. Every piece is drawn as a physical object.

| Piece | Today | Target |
| --- | --- | --- |
| Tile | Flat hex with thin outline | Thick punchboard hex: a printed face, a visible side in a darker tone, a bevel line, a soft shadow. Biome symbol and edge pattern stay on the face |
| Vulnerable tile | Paler fill, dashed outline, red flag | Same tile with a faded, scuffed face and the red flag kept as a small folded tab. It looks worn, not just recoloured |
| Lost tile | Empty dashed outline | A hole in the board: the felt shows through, with an inner shadow. Reads instantly as missing, and keeps shapes and not only colour |
| Shield | Blue ring | A raised translucent blue dome or collar sitting on the tile |
| Stabilise marker | White square with a plus | A small cube with a plus stamped on its top |
| Token | Small flat shape | A disc in the Steward's colour with their shape stamped on it, placed with a slight offset so stacked tokens look handled |
| Pawn | Flat shape with a letter | A wooden meeple with a highlight and shadow. The shape and initial stay, so identity never depends on colour |
| Research Station | Pale tile with a house glyph | A taller central piece with a small building on it, slightly raised |
| Pressure Metre | A coloured bar with a marker | A kraft frame holding a glass-tube gauge. Five printed bands, a brass slider for the marker, a Trophy cup at the base and a Skull plate at the top |
| Deck and discard | Not shown | A visible draw pile with a count, and a discard pile showing the last card. Gives the Draw button something to draw from |
| Hand | Small tiles in a row | A fan of cards at the bottom edge. The selected card lifts and enlarges; the rest tuck down |
| Steward mat | Side panel of text rows | A mat per Steward: Role card, three Tool slots, a token tray of 12, and a Legacy tally. Your mat is full size; others are compact |

### Why the lost tile as a hole matters

It is the single change that does the most for readability. A glance at the board then tells you how much has been taken from it, without reading anything.

### Constraints

- Texture stays low in contrast so it never fights the biome symbols.
- Pawn and token shapes and letters are kept exactly as they are now.
- The board must stay readable at phone size, so thickness is a few pixels, not a full 3D tilt.
- Zoom and pan keep working, and tiles stay at least 44 px to tap at the default zoom.

## Cards and the Ravage moment

Cards are where a board game feels most like itself, and the Ravage reveal is the game's drumroll. Both get real design time.

### Card anatomy

One card design, drawn at three sizes (hand, sheet, reveal). Top to bottom: a biome-coloured header with the illustration; the card name in the display face; a stamped type label (TOOL, RAVAGE, EVENT); use pips for Programme Tools (two dots, one fills when spent); the rules text; and, on Ravage cards, the real-world fact with its source as a small footnote. The content data already holds that fact, year and source for every Ravage card, so it costs no writing. A Surge shows as a red corner ribbon. The deck has one shared card back with the game's mark.

At hand size only the name, icon and pips show. Rules text appears when the card is selected or opened.

### Illustration budget

Tool cards share art by biome, so the real count is much smaller than the 60-card deck.

| Asset | Count | Minimum version | Full version |
| --- | --- | --- | --- |
| Biome headers (also cover all 30 Tool cards) | 6 | Pattern plus large glyph on a textured band (what exists, polished) | Spot illustration per biome |
| Ravage cards | 24 | Biome header plus the danger icon | One spot illustration per card (4 per biome) |
| Event cards | 6 | Glyph on a neutral band | One illustration each |
| Role cards | 6 | Initial on an ID badge | Portrait or emblem each |
| Card back, logo, title art | 3 | Typeset wordmark | Illustrated box-lid scene |

The minimum column ships the whole game looking cohesive with no commissioned art. The full column is 42 illustrations plus 3 pieces of branding, and can arrive later without any layout change.

### The Ravage reveal

One sequence for every Ravage card, tuned to about six seconds at default speed, with a tap to skip any step.

1. The top card of the deck lifts, flips and slides to the centre with the held shadow.
2. Tiles of the named biome pulse once. The count stamps appear on each called tile, one at a time (this already exists as numbered badges).
3. Each hit resolves in order: a Shield cracks and pops off, a Healthy tile scuffs, a Vulnerable tile drops out of the board into a hole.
4. A Surge, Cascade or extinction moves the Metre slider with a delay, a short shake of the frame, and a red flash. These are the only effects that shake.
5. The card slides to the discard pile.

Fast animations halves the timings. Reduced motion replaces every move with a crossfade and removes the shake, as the existing setting already promises.

## Sound and motion

Today every consequence is silent and instant. This is the second-biggest gap after the surfaces, and it is where rule 2 (everything has weight) and rule 5 (quiet by default, loud for big moments) get paid off.

### What already exists

- `motionMs()` in `core/settings.ts` is the one function every duration should go through. It already returns 0 for reduced motion and halves the time for fast animations.
- `cue()` in `platform/feedback.ts` is the one place screens ask for feedback, and its comment already says sound slots in behind the same calls. Haptics (tap, confirm, warn) are wired there, phones only.
- Settings already has `sound` and `haptics` switches. No animation or audio library is installed.

So the plan adds libraries and a table of names. It does not change how screens ask for motion or feedback.

### Motion

Add one `theme/motion.ts` holding named moves with a duration and an easing, so no screen invents its own timing. Starting values, to be tuned by feel:

| Move | Time | Easing and feel |
| --- | --- | --- |
| Key press | 80 ms | Sinks 2 px, springs back |
| Lift (select a tile or card) | 150 ms | Rises 2 to 4 px, shadow grows |
| Place (piece lands) | 220 ms | Drops from 6 px up, small settle, shadow tightens |
| Card flip | 350 ms | Scale across the middle, face swaps at the half |
| Card slide (deck to centre, centre to discard) | 400 ms | Ease out |
| Tile scuff | 250 ms | Face crossfades to the worn version |
| Tile drop out | 450 ms | Tile sinks and fades, hole inner shadow fades in |
| Metre slider | 700 ms | Slow start, slight overshoot, settles |
| Frame shake | 300 ms | Three quick offsets, decaying. Surge, Cascade and extinction only |

For the library, I would try Reanimated first and confirm it runs in Expo Go and in the web build before committing to it. If it does not, the built-in Animated API with the native driver covers every move in the table except the card flip's half-way face swap, which needs a small workaround. This is a ten-minute spike at the start of the motion phase, not a decision to make now.

### Sound

A short list, mostly foley (cardboard, wooden blocks, a brass slider), because real material sounds are what make a screen read as a table. The existing asset list in UI_Spec section 10 budgets about 15 effects and one or two optional music loops; this plan keeps to that.

| Cue | When | Character | Level |
| --- | --- | --- | --- |
| Key press | Any Key | Soft cardboard tap | Quiet |
| Lift and place | Select, drop a piece | Wood on felt | Quiet |
| Card draw, flip, slide | Draw and Ravage | Paper snap, slide | Quiet |
| Restore | Restore a tile | A small, satisfying thunk | Quiet |
| Shield on and off | Shield placed, cracked | Click, then a crack and pop | Medium |
| Tile scuff, tile drop | Ravage hits | Dry scrape, then a hollow knock | Medium |
| Metre notch | Pressure moves | Brass tick per band | Medium |
| Turn handoff | Active Steward changes | Wooden disc set down | Quiet |
| Surge | Surge, Cascade, extinction | Low rumble, the loudest cue | Loud |
| Trophy, Collapse | End of game | A short cup chime, a long low note | Loud |

Rules for sound:

- Loudness follows the table above, and nothing is louder than the Surge. If two cues land together, the louder one wins and the other ducks.
- Music is off until someone asks for it. Silence is the default texture of a table.
- On the web, browsers only allow audio after a tap, so the first sound plays after the first real press. Nothing needs to fight this.
- Like the fonts, every sound file needs a licence on record before it ships. Prefer recording your own or CC0 sources.
- Keep the total under about 1 MB so the web build stays light.

Haptics keep the three calls they have: tap for lift and place, confirm for Restore and a held Metre, warn for a Surge.

## Turn handoff

The lobby allows two to five Stewards, and any seat can be a human or a bot (easy, normal or hard). That means the screen is often passed between people, or a bot takes several turns in a row. Today the only signal is the title text changing. The handoff should be a moment at the table.

1. The active pawn lifts slightly and a wooden turn disc in the new Steward's colour slides to their mat.
2. A stamp reads YOUR TURN (or the bot's name and level) for about a second.
3. The play guide's "Do this now" updates after the stamp, not before it, so the eye lands on the disc first.

Bots should play at a readable pace. Each bot action uses the same moves as a human one (lift, place, stamp), with a short pause between actions, and a Skip control that jumps to the end of the bot's turn. Skip is an accessibility feature as much as a convenience.

**Decided (7 Nov): hands are public.** Tool cards in hand are open information, so a shared device needs no cover between turns and there is no "Pass to Ren" screen. One thing to confirm: the Forecast peek at the top of the deck is the only private information in the engine, and it stays private to the player who used it.

## Teaching through objects

Rule 4 says words live on the components. The guide, rulebook and tutorial already exist and are good content, so the work is to move them onto the table and out of boxes.

| Piece | Today | Target |
| --- | --- | --- |
| Play guide | A box above the board: whose turn, "Do this now", More | A notebook page pinned at the table edge. "Do this now" keeps the same text, but it also lights what it names: legal tiles glow, the deck pulses when Draw is the move. Hide stays, and remembers |
| Rulebook | 12 chapters of text. Tile symbols are described in words, which STATUS lists as not done | A booklet with page turns. The tile symbols are drawn using the real Tile, Shield, marker and token components, so the book teaches from the same objects the board uses |
| Tutorial | A coach with a spotlight on parts of the screen | The same steps. The spotlight becomes a dim mat with the named piece lifted into the light (the Lift recipe again), so it shows the object instead of boxing a region |
| Status chips | Move 1, Tool 1, Ability 1, Gift 1 | Four small counters on your mat. A used one flips face-down, so a glance shows what is left |
| Event log | A text list | Stays as text. It is a record, and it also serves anyone who prefers reading or uses a screen reader |

All the text, numbers and names in the rulebook already come from the content package, with tests that catch drift. That must stay true for any drawn symbols, so each is built from the same components and the same content, not copied.

## Other screens

These matter less than the table, but they are the first and last things a player sees.

| Screen | Target |
| --- | --- |
| Title | The box lid: the wordmark on felt, one illustrated scene in the full version, a typeset wordmark in the minimum. "Learn to play" stays the primary Key on a first visit |
| Lobby | A setup mat. Each seat is a slot with a pawn; tapping it swaps the pawn for a small robot disc, then cycles Easy, Normal, Hard, back to Human. The youngest-goes-first choice is a drawn lot, not a text line |
| Settings | Stays plain on a Plate. It must stay easy to read at 200% text. The only change is the new look |
| Result: Trophy | The cup rises on the Metre, Legacy scores are counted out in tokens onto each Steward's tally, and the winner's mat is lifted. This is the loudest happy moment in the game |
| Result: Collapse | The same board with its holes, the felt showing through, a red Skull plate, a long low note. Quiet and heavy, not flashy |

## Build order

Each phase leaves the game playable and the tests green, and each ends with something a person can look at. The rules engine and the content package are not touched. Totals to protect, from STATUS: engine 40, content 3, app 53, typecheck clean, web build bundles.

| Phase | Work | Size | Done when |
| --- | --- | --- | --- |
| 1. Foundations | Bundle fonts (after the licence check), add the materials palette, shadow scale, felt, card stock, punchboard and wood recipes, then build Plate, Key, Token chip, Label, Sheet and Toast | Medium | No white panel and no black pill remains on any screen. Everything else is unchanged |
| 2. The table | Felt mat, thick tiles, the hole, Shield, marker, tokens, pawns, Research Station, Metre, deck and discard, hand fan, Steward mats | Large | A still screenshot of a mid-game board looks like a photograph of a table. Zoom, pan, 44 px taps and 200% text still work |
| 3. Motion and sound | Spike the animation library, add `motion.ts`, add sound behind `cue()`, then do Lift, Place, Restore and the turn handoff | Medium | The Restore thunk feels good, and a full game plays with reduced motion on, with no moves and no shake |
| 4. Cards and Ravage | One card design at three sizes, card back, the six-second Ravage reveal, the Surge treatment | Large | A Ravage card plays through all five steps, every step skippable, and a Surge is clearly the biggest moment in the game |
| 5. Teaching and screens | Notebook guide, drawn rulebook symbols, tutorial lift, title, lobby, results | Medium | A new player finishes the tutorial without opening the rulebook |
| 6. Art upgrade (optional) | Spot illustrations, role portraits, box-lid scene | Large, open-ended | Drop-in replacement of the minimum art. No layout changes |

Phases 1 and 2 are the part to protect: they do the most for the least risk, and everything after them looks wrong on the old surfaces. Phase 6 can wait or never happen without the game looking unfinished.

## Risks

| Risk | Why it matters | What to do |
| --- | --- | --- |
| Shadows and layers get slow on phones | The board is many SVG shapes; native shadow support in SVG is limited | Draw thickness and shadow as layered shapes, build the single Tile first and measure on a mid-range phone before making the rest |
| Android and web shadows look different from iOS | A single scale will not match across platforms | Keep the scale in one file with per-platform values, and check all three early in Phase 1 |
| It tips into childish | The punchboard half of the direction invites bright, toy-like colour | Hold to rule 3: the table stays neutral, and only game state gets colour. Keep the stamp face and the card-stock tone doing the grown-up work |
| The two halves fight | Chunky pieces and a naturalist's labels can clash | One short style guide written in Phase 1, with a page of dos and don'ts, before any screen is redone |
| Accessibility regresses | New texture and motion could undo the existing text scale, reduced motion and the pattern-not-only-colour work | Every phase's done-when includes 200% text, reduced motion and a no-colour check |
| Dark felt hurts text contrast | Light text on a dark mat is easy to get slightly wrong | Put all readable text on Plates or cards, never directly on the felt. Check contrast on the real screen |
| Sound and font licences | The font licence check is already open | Record the licence for each file as it is added, and block the phase on it |
| Art stalls the project | Illustration is the one cost not controlled by code | The minimum column ships the whole game, so art can never block a release |

## Decisions needed

Status as built, so the answers are visible: 1 assumed yes (the whole build follows it). 2 Fredoka, Nunito and Special Elite are bundled, licence record still to be written. 3 decided: hands are public, so no cover screen. 4 sound is on by default today. 5 the minimum art shipped. 6 built phone first, tablet and desktop adapt by size.

1. **Direction.** Is A+B (a field survey on punchboard) the look? The rest of the plan assumes yes.
2. **Fonts.** Confirm Fredoka and Nunito are under the SIL Open Font Licence for bundling, and pick the third (stamp) face.
3. **Secret hands.** Decided: no, hands are public, so the handoff needs no cover screen.
4. **Sound default.** The setting is on by default today. Keep it, or start with sound off and offer it on the title screen?
5. **Art ambition.** Ship the minimum column first and decide on commissioned art later, or commission before Phase 4?
6. **First target.** Design for phone first with tablet as an extension, or the reverse? The UI spec has wireframes for both, and the board's tap size and zoom rules depend on it.

## How we will know it worked

Run these checks at the end of Phases 2, 4 and 5, with someone who has not seen the game.

- **The squint test.** Blur the screenshot. You can still tell which tiles are lost, which are in danger, and where the Metre stands.
- **The silent test.** Mute the sound and turn on reduced motion. Every state change is still understandable.
- **The five-second test.** Someone looks at a mid-game screen for five seconds and can say whose turn it is and whether the game is going well.
- **The photograph test.** Someone who has not been told it is an app is shown a screenshot and asked what it is. The answer should be a board game.
- **The Surge test.** In a full game, the Surge is the moment players remember, and nothing else competes with it.
- **The old rules still hold.** 200% text, reduced motion, pattern as well as colour, 44 px taps, and all tests green.
