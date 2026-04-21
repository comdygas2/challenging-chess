# AGENTS.md — Review guide for 'Maizing Challenging Chess

Audience: Codex (or any reviewer) arriving with no prior conversation context.

## 30-second project overview
A static, browser-only React chess app. Human (White) vs. Stockfish-WASM (Black). Stockfish runs in a Web Worker. No backend. Deploys as static files to Vercel.

## What to prioritize when reviewing

1. **Does the engine lifecycle still work?** Every game, from page load through restart, should:
   - Load `/stockfish/stockfish.js` in a Web Worker
   - Emit `uci`, wait for `uciok`, send `isready`, wait for `readyok`
   - After the human moves, ask for a best move with the current skill/movetime
   - On restart, the previous pending AI move must not land on the new game (see `gameGenRef` counter in `src/components/ChessGame.jsx`)
2. **Does the UI still fit the frame?** `.board-wrapper` is a known foot-gun. If you see `aspect-ratio: 1/1` or non-`border-box` sizing re-introduced, check the board doesn't overflow (test at desktop + iPad viewports).
3. **iOS sound.** The `unlock()` path in `src/lib/sounds.js` and the one-shot listeners in `ChessGame.jsx` are load-bearing on iPad. Don't let a refactor remove them silently.
4. **Deploy parity.** The live site at https://challenging-chess.vercel.app/ should match `main`. If it doesn't, the manual `npx vercel --prod` step was skipped (see CLAUDE.md "Deploy rule").
5. **No backend creep.** This project is intentionally static-only. Any new dependency that requires server-side rendering, a Node runtime, or an API route should raise a flag.

## Key files
- `src/components/ChessGame.jsx` — main component; engine lifecycle, check banner, restart
- `src/components/DifficultySelector.jsx` — 4 pill-card selector; respects `unlockedIds` (Extreme Hard is gated until Hard is beaten)
- `src/components/PieceGuide.jsx` + `src/components/MoveDiagram.jsx` — visual-only learn-the-pieces panel
- `src/lib/stockfishEngine.js` — UCI Worker wrapper
- `src/lib/difficulties.js` — skill/movetime mapping; don't change these numbers without playtesting
- `src/lib/sounds.js` — Web Audio SoundPlayer + iOS unlock
- `src/lib/pieceGuides.js` — diagram data (piece square, move squares, capture squares, ghost pieces for pawn captures)
- `vite.config.js` — `server.host: true, port: 5173, strictPort: true`
- `public/stockfish/stockfish.{js,wasm}` — vendored WASM build
- `index.html` — title and Google Fonts preconnect; don't add CORS/COOP/COEP headers (lite WASM doesn't need them)

## Known constraints
- **Vercel Hobby auto-deploy is blocked for this project.** Fix = run `npx vercel --prod` manually after pushing. This is the single most common way the live site drifts from main.
- **Stockfish WASM is 7 MB** — already vendored in `/public/stockfish/`. Don't fetch from CDN.
- **chess.js `.move()` throws on illegal input** — always wrap in try/catch; don't rely on `null` returns.

## How to verify locally
```bash
npm install
npm run dev
# → open http://localhost:5173 on desktop, http://<your-lan-ip>:5173 on iPad
```

## What the user cares about
The user is a self-described beginner. Keep changes small, explained in plain English, and verified before declaring done. The user communicates via "What I'm working on / What I changed / What the result was / What I want to test next" updates — keep that format when handing off.
