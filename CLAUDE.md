# CLAUDE.md — 'Maizing Challenging Chess

## What this is
A React + Vite single-page chess app. Human plays White, Stockfish (WASM, runs in a Web Worker in the browser) plays Black. No backend, no server-side logic. Everything ships as static assets.

## Tech stack
- React 19 + Vite 8 (`@vitejs/plugin-react`)
- `react-chessboard` v5 — uses the `options` prop object; `Chessboard` is a named export
- `chess.js` v1.4 — `.move()` throws on illegal moves; wrap in try/catch
- Stockfish 18 lite single-threaded WASM (~7MB) served from `/public/stockfish/`
- Web Audio API for sound (oscillators + envelopes, no audio files)
- `localStorage` for persistence (unlocks + sound preference)

## Deploy rule — **read this every session**

GitHub auto-deploy on Vercel is **Blocked** (Hobby-tier policy issue — every auto-deploy since the initial import has landed in the `Blocked` state and the live site sits stale). Pushing to GitHub alone does NOT update production. Two steps are required after any change:

```bash
git add -A && git commit -m "…" && git push origin main
npx vercel --prod
```

Always do both. Verify the live site afterwards:

```bash
curl -sS https://challenging-chess.vercel.app/ | grep -Eo '<title>[^<]+</title>'
```

If the title or a key recent change isn't visible, the deploy didn't propagate — investigate before declaring done.

## Local dev
```bash
npm run dev      # http://localhost:5173, host: true (LAN-accessible for iPad testing)
```
Vite is configured with `server.host: true` and `strictPort: true` — same port every time so saved bookmarks keep working.

## Don'ts
- **Don't** add backend code, Node runtimes, or serverless functions. The whole point is static-only deploy.
- **Don't** commit `.vercel/project.json` (already gitignored — it's machine-local link data).
- **Don't** commit `Archive.zip` or `.bak` files (also gitignored).
- **Don't** mock the Stockfish engine in tests — use the real WASM worker. The UCI flow is the actual product surface.
- **Don't** assume `git push` deployed anything. See "Deploy rule" above.

## Key files
- `src/components/ChessGame.jsx` — main game component, engine lifecycle, check-flash state, restart gen counter
- `src/lib/stockfishEngine.js` — UCI Worker wrapper (`ready()`, `getBestMove({skill, movetimeMs})`, `stop()`, `quit()`)
- `src/lib/difficulties.js` — skill/movetime mapping: Easy(3/400ms), Medium(10/800ms), Hard(16/1200ms), Extreme(20/2500ms)
- `src/lib/pieceGuides.js` — visual-only diagram data (no text descriptions)
- `src/lib/sounds.js` — `SoundPlayer` with iOS AudioContext `unlock()` pattern
- `src/App.css` — theme variables, CHECK banner animation, game-over overlay, mini-board diagrams

## UI invariants that have caused bugs before
- `.board-wrapper` must be `box-sizing: border-box` and must NOT have `aspect-ratio: 1/1` — those together made the board overflow the wooden frame. If you re-add aspect-ratio, re-test at multiple viewport sizes.
- CHECK banner is centered on the board (`left: 50%; transform: translate(-50%, -50%)`), auto-hides after 2.5s via the `check-flash` animation + a `setTimeout` in the component. Don't revert to the left-side position.
- iOS Safari requires `AudioContext` to be resumed inside a user gesture. The `unlock()` method + `pointerdown/touchstart/keydown` listeners are load-bearing for iPad sound.
