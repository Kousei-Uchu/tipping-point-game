# Tipping Point (digital)

A React Native (Expo) app that runs on **web first** and is structured so iOS and Android can follow without a rewrite.
It plays the rules v1.3 draft in `Game Design Plan/Digital Spec`.

```
packages/content   typed game data (rules, cards, biomes, board, sources) + validation. No platform code.
packages/engine    pure rules engine: apply(state, action) -> state + events. Seeded RNG. No UI, no platform code.
apps/game          Expo app (react-native-web on the web). UI only.
scripts/           sync-content copies the design-plan JSON into packages/content/data
```

## Run it

```
npm install
npm run web            # dev server in the browser
npm run build:web      # static export to apps/game/dist (host anywhere)
npm test               # engine + content tests
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

## What is built (milestones from UI_Spec section 12)

- **M1 engine:** done, 36 rule tests (the spec review answer key Q1 to Q23) plus 300 random seeded games checked against invariants after every action.
- **M2 board and hot-seat play:** done. Title, lobby, game, result, settings, how to play.
- **M3 hand, cards, Ravage overlay, Metre, end screens:** done in first form (placeholder art, see UI_Spec section 10).
- **Bots (first cut of M4):** `packages/engine/src/bot.ts` follows Bot_Spec section 1 to 4 (restore, fortify, stabilise, Ecologist, Activist, walk to work, `care` per level). Courier, Pilot, Gifts and personality modes are not played by bots yet. Bot seats are set in the lobby. Rough win rates, 4 players: Normal difficulty 63% with Hard bots, 35% with Normal bots; Hard difficulty 36% with Hard bots. Not yet calibrated against the sim grid.
- **Not yet:** golden-log replay against the Python sim (needs `--export-log` output wired into a test, see `Golden_Log_Format.md`), the tutorial, online rooms (M5), sound and music, real fonts (licence check TD-6), screen-reader and keyboard pass (M6).

## Known gaps and choices

- The engine's open choices are the confirmed SD-1 to SD-10 in `Open_Decisions.md`. Anything the engine had to decide beyond them is in `docs/SPEC_GAPS.md` if present.
- Bots never Gift, use Courier or Pilot, or take personality modes. Bot cards still pause on the Ravage overlay so humans can read the fact; tap Next to continue.
- `LocalSession` undo stack is in memory; after a reload the undo window is closed (saves are taken between actions, so nothing is lost).
- When a game ends mid-card (Skull or second extinction) the card in flight is dropped with the queue. The deck-count invariant is therefore only checked for live games.
- Fonts: system fonts until the Fredoka and Nunito licence check is done.
