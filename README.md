# Tipping Point (digital)

A React Native (Expo) app that runs on **web first** and is structured so iOS and Android can follow without a rewrite.
It plays the rules v1.3 draft in `Game Design Plan/Digital Spec`.

```
packages/content   typed game data (rules, cards, biomes, board, sources) + validation. No platform code.
packages/engine    pure rules engine: apply(state, action) -> state + events. Seeded RNG. No UI, no platform code.
apps/game          Expo app (react-native-web on the web). UI only.
scripts/           sync-content copies the design-plan JSON into packages/content/data
docs/              STATUS.md (newest entry first), STYLE_GUIDE.md, SOUNDS.md
```

## Run it

```
npm install
npm run web            # dev server in the browser
npm run build:web      # static export to apps/game/dist (host anywhere)
npm test               # engine + content + app tests
npm run typecheck
```

iOS and Android later: `npm run ios` / `npm run android -w @tipping-point/game` (needs Xcode / Android Studio or Expo Go). No code change is expected for a first mobile build.

## Where the mobile-readiness lives

| Rule | How it is kept |
|---|---|
| Rules never touch the UI | `packages/engine` has no React or RN imports. A server (UI_Spec TD-4) or bots can import it as is. |
| One seam between UI and rules | `apps/game/src/core/session.ts`: `GameSession` interface. `LocalSession` runs the engine in-process (hot-seat). A `RemoteSession` over websockets can replace it with no screen changes. |
| Platform code is isolated | `src/platform/*` only. Files use the `.web.ts` convention where web and native differ (`exportText`). Everything else uses `react-native` primitives only: no DOM, no CSS files, no `window`. |
| Board is SVG via `react-native-svg` | Works on web and native. Geometry and zoom/pan maths are pure (`core/boardGeometry.ts`, `core/viewport.ts`) and unit-tested. |
| Layout adapts by size, not by platform | `core/layout.ts`: phone / tablet / desktop breakpoints, `dense` for short landscape screens. 44 px minimum tap targets. |
| Saves are seed + action log | `core/session.ts` `SavedGame`. Stored via AsyncStorage (localStorage on web, native storage on device). Rebuilt by replay, and rejected if `rulesVersion` differs. |
| Accessibility built in | Text scale to 200%, reduced motion, labelled tiles, live-region log, colour + icon + pattern for every biome. |

## What is built

- **Engine (M1):** done. 40 engine tests plus 300 random seeded games checked against invariants after every action. Content has 3 tests. The app has 195.
- **Play (M2, M3):** title, lobby, game, result, settings, rulebook, guided tutorial, in-game play guide, hand, cards, Ravage reveal, Metre, end screens.
- **Look and feel (plan phases 1 to 5):** done in the minimum-art form. See `Tipping_Point_Making_It_Feel_Like_a_Board_Game.md` and `docs/STYLE_GUIDE.md`. Fonts are bundled, sounds are synthesised (`docs/SOUNDS.md`), motion goes through one table (`theme/motion.ts`).
- **Bots:** `packages/engine/src/bot.ts` follows Bot_Spec sections 1 to 4 (restore, fortify, stabilise, Ecologist, Activist, walk to work, `care` per level). Courier, Pilot, Gifts and personality modes are not played by bots yet. Bot seats are set in the lobby.
- **Not yet:** golden-log replay against the Python sim (needs `--export-log` output wired into a test, see `Golden_Log_Format.md`), online rooms (M5), screen-reader and keyboard pass (M6), commissioned art (plan phase 6, optional).
- **Needs a person:** nobody has listened to the sounds or played on a real phone, and the fresh-eyes checks in the plan (five-second, photograph, Surge, tutorial without the rulebook) have not been run.

## Known gaps and choices

- The engine's open choices are the confirmed SD-1 to SD-10 in `Open_Decisions.md`. Anything the engine had to decide beyond them is in `docs/SPEC_GAPS.md` if present.
- Hands are public (Decision 3), so there is no pass-the-device cover screen. The Forecast peek stays private.
- Bots never Gift, use Courier or Pilot, or take personality modes. Bot cards still pause on the Ravage overlay so humans can read the fact; tap Next to continue.
- `LocalSession` undo stack is in memory; after a reload the undo window is closed (saves are taken between actions, so nothing is lost).
- When a game ends mid-card (Skull or second extinction) the card in flight is dropped with the queue. The deck-count invariant is therefore only checked for live games.
- On a phone a game opens zoomed on the active pawn so tiles reach 44 px; the Fit key shows the whole board.
- Font licence record for each bundled file is still to be written.
