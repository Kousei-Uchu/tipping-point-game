# Status, 2026-11-08 (Phase 6 finished: Event scenes and a card back with the six biomes)

Closes the gaps left in the Phase 6 art. Nothing in the engine or content package changed.
- **Event cards** (6) now have their own scene each, in `core/illustrations.ts`: Citizen Science (binoculars and a clipboard), Grant Funding (a coin stack with a seedling and an envelope), Volunteer Day (three walkers, one carrying a sapling), Industrial Lobby (smokestacks beside a briefcase), Supply Squeeze (crates and a card dropping onto a deck), Heat Dome (a sun over cracked ground). The old mark from `game/eventIcons.tsx` stays as the small seal in the corner, so an Event is still told apart by more than the picture.
- **Card back:** the hex mark gets a row of six small hexes in the biome colours (from card width 120 up; smaller backs are unchanged).
- Every card type in the deck now has a scene. The tests were widened to match: all 6 Events have one, no scene is left over, no two scenes draw the same picture. Typecheck clean; engine 40, content 3, app 202; `build:web` bundles.
- Looked at in headless Chromium: all six Event scenes on a contact sheet, and a Heat Dome Event in a running game (picture and seal). Not seen: the other five Events on a card in play, the new card-back row (the card backs on screen so far are below the 120 px width where it shows), 200% text, a no-colour check, a real phone.

---- earlier status ----

# Status, 2026-11-08 (plan Phase 6: the art upgrade, drawn in vector)

Phase 6 is in, without commissioned art. Every scene is vector data in `core/illustrations.ts`, drawn by `game/Illustration.tsx`, so a commissioned picture can replace any one of them later with no layout change. Nothing in the engine or content package changed.
- **Biome headers** (6): one scene per biome, shared by that biome's Tool cards. **Ravage cards** (24): each has its own scene, four per biome, drawn from the card names (a saw among stumps, a road cut through trees, a sunk dam wall, and so on). The hazard triangle, the Surge ribbon and the stamp are unchanged. A small seal in the corner of the picture keeps the biome symbol, so a biome is still told apart by more than colour.
- **Events** keep their own marks (`game/eventIcons.tsx`) on the neutral band; they have no scene on purpose.
- **Role emblems** (6) on a round badge beside the role's name (`RoleCardView`, so the Role sheet and the role panel). **Box lid**: a drawn panorama of the six biomes above the title label (`LidPanorama` in `screens/TitleScreen.tsx`).
- Scenes are cropped, never stretched, to the picture window at hand, sheet and reveal size, so everything that matters sits in the middle band. If a card has no scene it falls back to the old pattern and symbol.
- Verified: typecheck clean; engine 40, content 3, app 202 (7 new in `test/illustrations.test.ts`: every biome and all 24 Ravage cards have a scene and no scene is left over, every role has an emblem, shapes stay in the box, no two scenes draw the same picture, drawing is deterministic); `build:web` bundles. Looked at in headless Chromium: a contact sheet of all 30 card scenes, the six emblems and the panorama; then the built app at 1280x800 and 390x844 (title with the panorama), a hand card (Rotational Grazing), a Ravage reveal (Drainage Scheme) and the Engineer, Courier and Activist emblems. No console or page errors.
- Not verified: the other 22 Ravage scenes on a card in a running game (seen only on the contact sheet), the card art at 200% text, a no-colour check of the new art, phone-size reveal cards, iOS and Android (react-native-svg nested views are used for the picture window). The drawings are my own and plain by design; whether they are good enough to ship or should be replaced is a call for your eyes.

---- earlier status ----

# Status, 2026-11-08 (repo audit and housekeeping)

Cloned the repo fresh and ran everything on a clean `npm install`. Nothing in the engine, content or game code changed.
- Verified: typecheck clean in all three packages; engine 40, content 3, app 195, all passing; `build:web` bundles. This matches the 2026-11-07 entry below.
- Removed six byte-identical Finder copies that had been committed (`NavProvider 2.tsx`, `SessionProvider 2.tsx`, `SettingsProvider 2.tsx`, `sheets/PendingSheet 2.tsx`, `sheets/RoleSheet 2.tsx`, `sheets/common 2.ts`). Nothing imported them.
- `.expo/` is now in `.gitignore`.
- README brought up to date (test counts, tutorial and rulebook built, fonts and sounds present, what still needs a person).
- Still open, unchanged: listen to the 16 sounds; play on a real phone for frame rate; the fresh-eyes checks; confirm the printed rules in `Tipping_Point.md` say hands are public (that file is not in this repo); font licence record; Phase 6 art decision.

---- earlier status ----

# Status, 2026-11-07 (reveal holds tokens and pawns)

During a Ravage reveal the board already showed each hit as its badge appeared; owner tokens and pawn evacuations still changed at once, behind the card. Now a token stays on a tile, and a pawn stays standing on it, until that tile's badge shows it lost (`displayPlayers` and the owner in `displayTiles`, `core/reveal.ts`). Nothing in the engine or content changed.
- `buildStory` takes an optional third argument, the state from before the action (the Draw handler passes it). With it, a "removed" hit also records whose token was on the tile, and each step lists `evacuations` (seat and tile). Without it the story is as before and nothing is held, so the tutorial and the bot skip are unaffected.
- The board's pawns and tokens now read the held state. The Steward mats (and their token trays) still use the real state, so a tray count can move slightly before the board shows the loss; on a phone the mats live in a sheet, so this is rarely visible.
- Rulebook "Your hand" now says hands are open (Decision 3). The Forecast peek stays private: the log says only that a Steward looked at the top card, and the sheet says only that Steward should look.
- Verified: typecheck clean; engine 40, content 3, app 195 (6 new: 5 unit tests for the hold, and one that plays 12 whole bot games on Hard and checks, for every action that revealed cards, that before the first badge each lost tile keeps its owner and each evacuated pawn is back on its tile, and that after the last badge the same array comes back).
- Not verified: the hold in a running game (no browser in this sandbox), the other open items in the plan (sounds, phone frame rate, the people checks).

---- earlier status ----

# Status, 2026-11-07 (Event card marks)

Each of the six Event cards now has its own mark instead of the one shared burst (`game/eventIcons.tsx`): Citizen Science a magnifier, Grant Funding a coin with a sprout, Volunteer Day three walkers, Industrial Lobby a smokestack beside a briefcase, Supply Squeeze a card dropping onto a stack, Heat Dome a half-sun over cracked ground. (The first drafts were redrawn after a look: a dome round a disc read as an eye, arrows meeting at a bar as a snowflake, a bare factory as nothing in particular.) A test (`test/eventIcons.test.ts`) fails if an Event is added without a mark. Verified: typecheck clean, engine 40, content 3, app 189, `build:web` bundles; the six marks were rendered and looked at at large and small size. Not yet seen on an actual card in a running game. The mark is decoration; the name and stamp still carry the card's identity.

---- earlier status ----

# Status, 2026-11-07 (tutorial click-through)

A script drove the guided tutorial in Chromium at 390x844 using only the on-screen controls and never opened the rulebook: all nine coach steps (Metre, board, your turn, role, walk to the damaged tile, Restore with the Tool, Restored, Draw, What just happened) advance correctly, the walk and the Restore take effect (Move chip 3 to 0, Tool chip 1 to 0), and the turn passes to Raj. It stopped there; the five "Good to know" cards and the final "You are ready" card were not clicked through. This shows the flow works, not that a new player understands it: "a new player finishes the tutorial without opening the rulebook" still needs a real person.

---- earlier status ----

# Status, 2026-11-07 (phone tap size)

- On phones a game now opens zoomed in on the active pawn so a tile face is at least 44 px (`comfortZoom` in `core/viewport.ts`, used by `game/BoardView.tsx`). The Fit key still shows the whole board. Desktop and tablet keep the whole board; the tutorial also keeps the whole board, because its steps point at things across it.
- Trade-off to judge by eye: on a phone the board no longer shows every tile at once, so the squint test (lost tiles and danger at a glance) now relies on the Fit key, the Metre and the piles. If that feels wrong, set `comfortable` false in `GameScreen.tsx`, or lower the target.
- Verified: typecheck clean; engine 40, content 3, app 188 (2 new for `comfortZoom`); `build:web` bundles; checked in Chromium at 390x844 and 1280x800.

---- earlier status ----

# Status, 2026-11-07 (Phase 5 finished and looked at)

Phase 5 was driven in headless Chromium at 390x844 and 1280x800 (and 200% text for the Trophy screen), no console or page errors.
- Seen and fine: title, lobby with Human, Easy, Normal and Hard seats and the first-player lots, the tutorial through its steps (the table dims and the named tile is lit on the walking step), the rulebook "Reading the screen" chapter with all eight drawn specimens, a Trophy result and a Collapse result (generated by playing bot games to the end and loading them as saves).
- Fixed: on both result screens the Metre was blank (its wrapper had no height). Fixed by making the wrapper a row.
- Fixed: at the end the Metre reading is 0 (Trophy) or 41 (Skull), where the brass slider is hidden by design, so it never visibly reached the cup or the Skull. The result screen now rests it on the last notch (1 or 40).
- Verified: typecheck clean; engine 40, content 3, app 186; `build:web` bundles.
- Still needs a person: the five-second and photograph tests, and "finish the tutorial without opening the rulebook" (Phase 5's done-when). Not seen: the animation itself (only stills), the sounds, iOS and Android. A tile is still about 26 px at the default phone fit, so the tutorial's gold tile is small to tap there.

---- earlier status ----

# Status, 2026-11-07 (verified: Phase 5 on a real install)

Decision: hands are public. No cover screen.

`npm install` worked. `npm run typecheck` clean. `npm test`: engine 40, content 3, app 186, all passing. `npm run build:web` bundles. Still not looked at in a browser: the Phase 5 screens. Not listened to: any sound. See the progress section of `Tipping_Point_Making_It_Feel_Like_a_Board_Game.md` for next steps.

---- earlier status ----

# Status, 2026-11-07 (updated: look-and-feel Phase 5, teaching and screens)

Phase 5 of the plan is in the code. Nothing in the rules engine or content package changed. This entry was written after reading the code; the sandbox had no `node_modules` and no network, so most of it has NOT been run (see below).
- **Notebook guide** (`ui/Notebook.tsx`, used by `game/PlayGuide.tsx` and the tutorial coach): card stock with a kraft binding, punched holes, a red pin and a ribbon in the active Steward's colour. "Do this now" keeps its text and also lights what it names (`glow` on the hand, `pulseDeck` on the draw pile, ring and reach highlights on tiles).
- **Rulebook symbols** (`game/Specimen.tsx`, `SpecimenKind` in `core/rulebook.ts`): healthy, vulnerable, Shield, stabilised, lost, token, pawn and reach are drawn by the real `Tile`, so the book shows the same objects as the board.
- **Tutorial** (`game/Tutorial.tsx`, `Spot`): the spotlight is now a dimmed table with the named piece lifted (the Lift tween and `elevation.lifted`), not a box round a region.
- **Status counters**: `TokenChip` turns face down (dashed ring) at zero. They stay in the turn banner, not on the Steward mat, on purpose: on a phone the mats live in the Stewards sheet, so moving them would hide what is left this turn.
- **Title** (`screens/TitleScreen.tsx`, `core/titleBoard.ts`, `game/MiniBoard.tsx`): a kraft box lid with a typeset wordmark and a board already starting to tip; "Learn to play" is the primary key on a first visit.
- **Lobby** (`screens/LobbyScreen.tsx`, `core/lobby.ts`, `game/RobotDisc.tsx`): a seat's piece is a peg; tapping cycles Human, Easy, Normal, Hard; the first player is drawn by lot (`drawLots`, `lotsPath`).
- **Results** (`screens/ResultScreen.tsx`): Trophy: the Metre glides to the cup, Legacy is counted out in tokens onto each tally, the winner's mat lifts, loud cue. Collapse: the board with its holes (`MiniBoard`), a dark red Skull plate, a shake, the long low note.
- Fixed: the turn banner name ("Round 1: Mia's turn") was cut to one line at phone width; it now wraps to two lines at any size.
- Reported by the earlier review, still true: the result screens (Trophy, Collapse, token count-up, winner lift) were never seen because a scripted bot game did not reach the end; desktop screenshots, rulebook specimens, tutorial lift and the lobby with bots were not looked at; whether the glow and the draw-pile ring are visible is unconfirmed (tune by eye).
- Verified here: `core/lobby.ts` tests 5/5 through a small stand-in for vitest.
- NOT verified: `npm install`, `npm run typecheck`, the full `npm test` (expected app total is not known; run it), `build:web`, anything seen in a browser, iOS and Android. The Phase 5 screens have not been looked at rendered here.
- Still open from the plan: the five-second, photograph and "finish the tutorial without the rulebook" checks need someone who has not seen the game. Decision 3 is made: hands are public, so no pass-device cover screen is needed (Forecast peek stays private to its player). Settings only got the new look.
- Please run first: `npm install && npm run typecheck && npm test && npm run web`, then check the title, lobby, a Trophy and a Collapse at 390x844 and 1280x800, and at 200% text.

---- earlier status ----

# Status, 2026-11-07 (updated: look-and-feel Phase 4, cards and the Ravage reveal)

Phase 4 of the plan is in. Nothing in the rules engine or content package changed.
- **Cards** (`game/CardFace.tsx`, `core/cardArt.ts`): one design at three sizes (hand, sheet, reveal). Picture window with biome pattern and glyph, display-face name, stamped type label, use pips for Programme Tools, rules text, and on Ravage cards the real-world fact with its source as a footnote. Surge cards carry a red corner ribbon. One shared card back with the game's mark. Card print stops growing at a cap (`maxScale`), so a card stays a card at 200% text; the same words are in the panel beside it.
- **The Ravage reveal** (`core/revealPlan.ts` is the tested state machine, `game/useReveal.ts` runs it, `game/RevealLayer.tsx` draws it). The card lifts off the real deck, flips and slides to the centre, settles into a notebook panel, the named biome pulses, each called tile is stamped and resolves in order, then the Metre waits for its own beat and moves with the frame shake, a red flash and a SURGE, CASCADE or EXTINCTION stamp. The card slides to the real discard pile, which updates only when it lands. Every beat is skippable by tapping; the panel has Skip for the whole draw. Reduced motion opens the reveal at rest (no moves, no shake, no flash); Fast animations halves every timing.
- **Fixed after the first real run in a browser** (all found by watching it): the panel text did not scroll, it was clipped (the row needed `minHeight: 0`); at rest the panel now scrolls to its end so the real-world fact and the keys are in view. The panel fades in only once the card is nearly docked, so the board and the buttons no longer show through it. Tool and Event panels are shorter (`revealPanelHeight`). Each hit is one short line ("1. Glacier: now vulnerable."). Continue and Skip sit side by side. A tile in danger now has a dark red rim and a larger tab, because the scrapes and the old tab vanished when blurred. At 200% text the turn banner wraps (name on two lines, buttons under it) and Role, Stewards and Log wrap instead of overlapping.
- Verified here: typecheck clean; engine 40, content 3, app 171 (169 before, plus 2 for the panel height); `build:web` bundles; the built app was driven in headless Chromium at 390x844 and 1280x800 through whole games with bots: a Ravage reveal, a Surge (stamp, flash, slider moves, panel clears off the Metre), the card landing on the discard, a Tool draw, a Collapse. No console or page errors. Also run with Reduced motion (reaches the panel in 0.3 s, no moves), Fast animations (about 1.1 s to the panel against about 3 s at default) and 200% text. A greyscale copy still shows the Surge ribbon (the word and the shape carry it), the type label outline, the hazard triangle and the Metre.
- Squint test: partly passes. Blurred, lost tiles (holes) and the Metre read clearly, and tiles in danger now show as washed-out patches with a reddish edge. Whether that is enough is a judgement for a person looking, not something a script can settle. Tiles are still about 26 px at the default phone fit.
- NOT verified: the sounds have never been listened to; the timing, weight and feel of the motion (I looked at sampled frames, not the motion); iOS and Android; the five-second, photograph and Surge tests (they need someone who has not seen the game, and the Surge test needs a full game played by people); a Cascade or Extinction beat and the Skip-all key; the `Next card` step when several cards are drawn in one go (the code path is tested, I did not watch it).
- Known gaps: only the minimum-art card (pattern plus glyph, no commissioned illustrations); one generic burst icon for all six Event cards; Tool and Event draws use the Ravage flow with a shorter panel and no treatment of their own; the draw pile does not pulse yet.
- Tune by eye: the in-danger rim (`WORN_RIM_SCALE`, `WORN_RIM_WIDTH` in `game/Tile.tsx`), how long the reveal lasts at default speed (`theme/motion.ts`; the plan says about six seconds), the Surge stamp size and position, card print sizes.

---- earlier status ----

# Status, 2026-11-07 (updated: look-and-feel Phase 3, motion and sound)

Phase 3 of the plan is in. Nothing in the rules engine or content changed.
- **Motion** (`theme/motion.ts`, `ui/useTween.ts`): every duration and easing is in one table and goes through `motionMs()`, so Fast animations halve it and Reduced motion makes every move 0 ms (the value jumps to its end, no frame at the start). No animation library: a small `requestAnimationFrame` tween hook, because the board is SVG and its attributes cannot use the native driver anyway.
  - Keys sink 80 ms. Picking up a tile or a card lifts it 150 ms (the hand fan glides to its slots). Pieces land 220 ms: pawns, Shield collars, Stabilise cubes and owner tokens drop in with a small settle, but only changes after the first picture (pieces already there at load do not all drop in). Healthy to Vulnerable cross-fades the worn face 250 ms. A tile that is lost sinks and fades while the hole fades in, 450 ms. The Metre slider glides 700 ms with a slight overshoot and ticks as it passes each band line. A Surge, Cascade or extinction shakes the Metre frame 300 ms.
  - Turn handoff (`game/TurnHandoff.tsx`): a wooden turn disc in the Steward's colour and a stamp, YOUR TURN or the bot's name and level, about 1 s (kept, static, under reduced motion). It waits until any card being read is closed, never blocks touches, and the guide strip shows once it has gone. Bots wait for it. A new "Skip to the end of the turn" key on a bot's turn jumps through it (the log keeps everything).
  - Reveal (`core/reveal.ts`): during a Ravage reveal the table now shows each called tile as it was before the hit until its numbered badge appears, so the scuff, shield loss or drop happens as it is revealed, not unseen behind the sheet. Not covered: owner tokens and pawn evacuations still change at once.
- **Sound** (`platform/sound.ts`, `platform/feedback.ts`, `core/soundPlan.ts`): `cue()` is now the one call for sound and haptics, `cue(name, settings)`. 16 cues, quiet by default, medium for tile outcomes and the Metre tick, loud only for Surge, Trophy and Collapse. When cues land within 160 ms the louder one wins and the quieter ones duck. Files are synthesised by `scripts/make-sounds.py` (noise, sine tones and filters, nothing sampled), so there is no third-party licence; see `docs/SOUNDS.md`. `expo-audio` is the one new dependency.
- Verified here: 48 pure tests pass through a small stand-in for vitest (12 board art, 17 motion, 12 sound plan and mixer, 7 reveal); the real `Tile` and `useTween` were bundled and run in Chromium: a lost tile cross-fades over 450 ms, Vulnerable over 250 ms, a pawn drops in over about 200 ms, and under reduced motion all three jump instantly; the 16 sound files exist, are 380 KB in total, peak evenly and contain no NaN.
- NOT verified: `npm install` (it must fetch `expo-audio`; I pinned `~1.0.0`, so run `npx expo install expo-audio` to let Expo choose the exact SDK 54 version and refresh the lock file), typecheck (no React Native types here), the real vitest run, the web build, anything on a device, and **nobody has listened to the sounds**. I can only check length, level and shape. Expect to retune them by ear.
- Tune by ear and eye: all sound character and levels (`LEVEL_GAIN` in `core/soundPlan.ts`, the recipes in `scripts/make-sounds.py`), the Restore thunk, the Metre tick count (one per band line, so a big jump is a flurry), the tween feel on a real phone (JS-driven, so watch the frame rate with many tiles changing at once), and the stamp's position and length.
- Browsers hold back sound until the first tap; the first cue on web may be silent. The app never errors on this.
- Not wired yet: the card draw, flip and slide sounds beyond a single draw cue (Phase 4 gives them their moves), the draw pile pulse, Metre shake and sounds for a Heat Dome follow-up. Hard-won decision still open: whether sound should default to on (it does today).

---- earlier status ----

# Status, 2026-11-06 (updated: look-and-feel Phase 2, the table)

Phase 2 of the "Making It Feel Like a Board Game" plan is in. Nothing in the rules engine, content package or game logic changed.
- The game screen is now a table: `Felt` mat behind everything (`Screen felt`), a kraft punchboard under the tiles, and every readable word on a Plate or Label, never on the felt.
- Tiles (`game/Tile.tsx`): thick die-cut hexes (side in `darken(biome, 0.18)`, bevel, drop shadow), painted upper rows first (`paintOrder`). Vulnerable = faded, scuffed face plus a folded red tab. Lost = a real hole in the board with an inner shadow and a lit lip. Shield = raised blue collar. Stabilise = a cube with a plus on top. Owner token = a disc with the Steward's shape stamped on it, placed slightly off centre. Pawns = painted wooden pieces on a peg (same shape and initial as before). The Research Station is a taller tile with a small building. A selected tile rises.
- Metre (`game/Metre.tsx`): kraft frame, glass tube with the five printed bands, brass slider, Trophy cup plate at the base, Skull plate at the top. Same props and accessibility label.
- `game/Piles.tsx`: draw pile with a count, discard showing the last card. The engine keeps no discard, so the app remembers the last Ravage or Event card it showed; it is empty after a reload. Tool cards that bounce go back to the deck, not the discard.
- `game/HandTray.tsx`: the hand is fanned on a `Wood` ledge; the selected card straightens, lifts and enlarges.
- `game/StewardMat.tsx` (used by `PlayersPanel`): peg, role, three Tool slots, a tray of 12 tokens (what is left in supply), Legacy tally. The active Steward's mat is full size, the others compact.
- New: `ui/Felt.tsx`, `ui/Wood.tsx`, `core/boardArt.ts` (pure geometry, 12 tests), table contrast tests in `test/materials.test.ts`. `TurnBanner` now sits on a Plate. Zoom buttons are raised keys.
- Verified here: `boardArt` tests 12/12 (run through a small stand-in for vitest); all changed files parse; the real `Tile`, `BoardBase` and `Metre` code was rendered to SVG with react-native-svg stubbed out and looked at in Chromium (found and fixed an overlap of the Metre plate text and icons); contrast between every biome face and the felt is at least 3:1, a hole against the kraft is at least 3:1.
- NOT verified: `npm install`, `npm run typecheck` (the sandbox has no React Native types, so TSX type errors are possible), the full `npm test` (the 9 new table tests in `materials.test.ts` and the 12 in `boardArt.test.ts` should bring the app to 88), `npm run build:web`, the real hand fan, piles, Steward mats and Felt grain in a browser, and iOS and Android. Please run `npm run typecheck && npm test && npm run web` first.
- Tune by eye: pawn size and peg (small at phone zoom), kraft vs tile-face separation (faces and kraft are close in brightness; the dark rim and hue carry it), shadow strength, the hand fan angle and overlap, Steward mat density on a phone.
- Known, not new: at the default fit on a phone a tile is about 26 px across, under the plan's 44 px tap target; zoom is how it is reached today. Worth deciding in Phase 3.
- Deferred on purpose: motion and sound (Phase 3), the card redesign and Ravage reveal (Phase 4), moving the Move/Tool/Ability/Gift chips onto the mat and the notebook guide (Phase 5). Draw pile does not pulse yet.

---- earlier status ----

# Status, 2026-11-06 (updated: look-and-feel Phase 1, foundations)

Phase 1 of the "Making It Feel Like a Board Game" plan is in. Nothing in the rules engine, content package or game logic changed.
- Fonts bundled with expo-font: Fredoka (display), Nunito (body), Special Elite (stamp, provisional pick). If a font fails to load the game starts in the system face.
- New kit in `src/ui`: `Plate`, `Key` (`Button` is now an alias of it), `Label`, `TokenChip`; `Chip`, `Sheet`, `Screen` and the toast were rebuilt on it. Materials palette, elevation scale and colour helpers in `src/theme`.
- Every white panel that went through a bare `View` now uses `Plate` (play guide, tutorial coach and card, Stewards panel, result rows and facts, role card, rulebook tips and tables, story sheet, game bars and log). Pure white is gone from the surface tokens.
- Added `colors.dangerText`: the content package's danger red measured 4.18:1 on the new card stock, under the 4.5 target, so red *text* uses a version darkened 15% and red *fills* are unchanged.
- `docs/STYLE_GUIDE.md` written.
- Verified: `npm run typecheck` clean; engine 40/40, content 3/3, app 67/67 (14 new: colour maths and a contrast check for every text-on-surface pair); `npm run build:web` bundles with fonts and the 2.9 KB grain tile.
- Not done: nobody has looked at it. No browser was available in the build sandbox, so none of this has been seen rendered. Please run `npm run web` and check phone and desktop sizes first, then tune `materials.ts` and the shadow values by eye. Also not checked on iOS or Android.
- Deferred to Phase 2 on purpose: the felt table, `Felt` and `Wood` surfaces and the board pieces (their first use is there; adding them now would be dead code). The Rulebook contents rows and the board and Metre frames still use the flat stock tone until then.
- Still open: confirm the stamp face, and the licence record for each font file.

---- earlier status ----

Guided tutorial merged and verified with a real `npm install`:
- `npm run typecheck` clean against the real React Native types (all three packages).
- `npm test`: engine 40/40, content 3/3, app 38/38 (21 of them are the new tutorial tests, run through the real engine).
- `npm run build:web` bundles (319 modules); the exported build was opened in Chromium, "Learn to play" starts the tutorial with no console errors.
- Entry points: "Learn to play" on the title screen (primary button on a first visit with no save) and "Play the guided tutorial" in How to play. The tutorial is never saved and cannot touch a real save.
- Not done: a full click-through of all 16 steps on a device, and the real-world feel of the copy. Please play it once.

Play guide added (in-game, normal games only; the tutorial has its own coach):
- A box above the board always says whose turn it is, then "Do this now" (worked out from the live state and the engine's own legality checks), with More for other options, what to do next, and what just happened. "How a turn works" opens a short rules-in-order sheet; it is also in the Menu.
- It can be folded away with Hide and remembers that.
- Code: core/guide.ts (pure, 8 tests), game/PlayGuide.tsx, wiring in screens/GameScreen.tsx. Totals now: engine 40, content 3, app 46, typecheck clean, web build bundles and was checked in Chromium at phone and desktop sizes.
- Not done: checking every kind of pending decision in the browser, and the bot-turn wording on screen.

Rulebook screen added (replaces the old short How to play screen):
- 12 chapters: goal, reading the screen (what every tile mark means), your turn, tools, the Draw (with every Event card), Ravage and damage, the Metre, Roles, final lap and scoring, difficulty and setup, quick questions, glossary.
- Opens from the title screen (Rulebook), the in-game Menu, and the play guide's "How a turn works" sheet (which opens it at Your turn). Wide screens show the chapter list beside the chapter; phones show a contents page, then one chapter at a time. The guided tutorial button is on the contents page.
- Code: core/rulebook.ts (all text, numbers and names come from the content package; 7 tests catch drift), screens/RulebookScreen.tsx. Route "howto" is now "rules"; HowToScreen.tsx is deleted.
- Totals now: engine 40, content 3, app 53, typecheck clean, web build bundles, checked in Chromium at phone and desktop sizes.
- Not done: tile symbols drawn inside the book (it describes them in words), search, and a read-through of the wording by someone who knows the printed rules.

---- earlier status ----

Verified in the build sandbox (no network, so Expo and the bundler were NOT run):
- Engine: 36/36 tests, content 3/3, 300 random games hold every invariant (25,951 actions).
- App core (session, undo, save/replay, narration, story, viewport, layout, settings): 17/17 tests, including a full autoplayed game.
- UI files: type-checked against stubbed React Native modules only. Run `npm run typecheck` after `npm install` for the real check.

First thing to do on your machine: `npm install && npm run typecheck && npm test && npm run web`.
Fix anything the real RN types flag; the logic underneath is tested.

Fixed while merging:
- `engine.moveTargets` ignored the step limit the UI passes for Volunteer Day (2 steps). Now honoured, and Improvise no longer leaks to other Stewards.
- `CardFace` did not narrow Event cards before reading `biome` (type error).
- Property-test invariant counted a dropped in-flight card after a game-ending Skull. Now checked for live games only.
