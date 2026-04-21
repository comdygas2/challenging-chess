# Challenging chess!!!

A simple chess web app you play in your browser, against a real chess AI (Stockfish).
You play White, the computer plays Black. Pick from four difficulty levels.

---

## How to start the app

1. Open the **Terminal** app.
2. Move into the project folder:
   ```
   cd ~/Documents/Challenging-chess
   ```
3. (Only the very first time) install the packages:
   ```
   npm install
   ```
4. Start the app:
   ```
   npm run dev
   ```
5. Leave that terminal window open. Closing it stops the app.

After step 4, the terminal will print two lines that look like this:

```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.167:5173/
```

(Your Network address might be a slightly different number — that's normal.)

## How to open it in your desktop browser

1. Click (or type) the **Local** URL: `http://localhost:5173/`
2. The app opens in your default browser.

## How to open it on your iPad

1. Make sure your iPad and your Mac are on the **same Wi‑Fi network**.
2. On your Mac, start the app (see above) and copy the **Network** URL.
3. On your iPad, open **Safari** and type the whole URL into the address bar — for example:
   ```
   http://192.168.1.167:5173/
   ```
   Make sure you include the `http://` part.
4. Press Go. The app should open. You can drag pieces or tap-tap to move.

**Tip:** In Safari, tap the Share icon → "Add to Home Screen" to get a Challenging Chess icon on your iPad home screen. It opens the app full-screen. (Only works while your Mac is running `npm run dev`.)

**If the iPad can't load the page:**

- Check that both devices are on the same Wi‑Fi.
- Your Mac's firewall may be blocking incoming connections. Go to **System Settings → Network → Firewall** and either turn it off or allow Node to accept connections.
- Some Wi‑Fi routers have "client isolation" turned on — devices can reach the internet but not each other. Turn that off in your router.
- Your Mac's Network IP can change. Re‑run `npm run dev` and look at the new Network URL.

## How to stop the app

In the terminal where `npm run dev` is running, press **Ctrl + C**.

---

## What this app can do

- A full chess board with all the standard rules (castling, promotion, en passant — all handled by chess.js).
- You play White. Stockfish plays Black.
- **Difficulty selector:** Hard, Medium, Easy, and Extreme Hard (locked until you beat Hard — the unlock saves in your browser).
- **Click a piece to see its legal moves.** Plain moves show a green dot. Captures show a red ring.
- You can move pieces by **dragging** or by **click‑then‑click**.
- Your king's square glows red when you're in check.
- Clear messages for check, checkmate, stalemate, and draw.
- A **Restart game** button below the board.
- **Piece learning guide** on the side — tap any piece (Pawn, Rook, Knight, Bishop, Queen, King) to see a beginner-friendly explanation of how it moves, including special rules like pawn promotion, en passant, and castling.

---

## Packages used, in plain English

| Package | What it does |
|---|---|
| **Vite** | A tiny local web server that shows your app in the browser and instantly refreshes when a file changes. Like the front door of the app. |
| **React** | The library that draws the page and reacts to clicks. Everything you see is built from small React building blocks. |
| **react-chessboard** | A ready-made chess board component. Handles the 64 squares, piece images, dragging, and square styling for us. |
| **chess.js** | The "rule book". It knows every chess rule: legal moves, check, checkmate, draw, en passant, castling, promotion. |
| **stockfish** | The chess engine (an AI that plays very strong chess). A WebAssembly build of the real Stockfish runs inside your browser, so there's no separate server to set up. |

---

## Project layout (for when you want to tinker later)

```
Challenging-chess/
├─ index.html                   -- the page wrapper; sets the tab title
├─ vite.config.js               -- tells Vite to allow LAN connections
├─ package.json                 -- list of packages
├─ public/
│  └─ stockfish/                -- the chess engine files (JS + WASM)
└─ src/
   ├─ main.jsx                  -- app entry point
   ├─ App.jsx                   -- top-level layout (header + board + guide)
   ├─ App.css                   -- styles
   ├─ index.css                 -- base page styles
   ├─ components/
   │  ├─ ChessGame.jsx          -- the board, engine, restart, messages
   │  ├─ DifficultySelector.jsx -- the four pill-shaped cards
   │  └─ PieceGuide.jsx         -- the side panel with 6 piece buttons
   └─ lib/
      ├─ stockfishEngine.js     -- small wrapper around Stockfish (talks to it)
      ├─ difficulties.js        -- one place that defines all 4 difficulty levels
      └─ pieceGuides.js         -- the text that shows up when you tap a piece
```

Want to make the AI weaker or stronger at a given level? Edit `src/lib/difficulties.js` and change the `skill` (0-20) or `movetimeMs` (how long it thinks, in milliseconds).

Want to change the piece descriptions? Edit `src/lib/pieceGuides.js`.
