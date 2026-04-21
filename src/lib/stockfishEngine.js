/*
  StockfishEngine
  ---------------
  A tiny helper around the Stockfish chess engine.

  Why this exists:
  Stockfish is written in C++ and compiled to WebAssembly so it can run in
  your browser. We run it inside a "Web Worker" — a background thread —
  so the page stays smooth while the engine thinks.

  You don't need to know any of that to use this file. Just call:

    const engine = new StockfishEngine()
    await engine.ready()
    const move = await engine.getBestMove(fen, { skill: 10, movetimeMs: 800 })
    engine.quit()

  The returned move is a string like "e2e4" or "g7g8q" (promotion).
*/

// The path is served from public/stockfish/ — works on any host/port.
const ENGINE_URL = '/stockfish/stockfish.js'

export class StockfishEngine {
  constructor() {
    this.worker = new Worker(ENGINE_URL)
    this.listeners = []

    // Every line Stockfish prints comes back here. We broadcast it to any
    // listeners that are currently waiting for a specific reply.
    this.worker.onmessage = (event) => {
      const line = typeof event.data === 'string' ? event.data : event.data?.data
      if (typeof line !== 'string') return
      for (const listener of this.listeners) listener(line)
    }
  }

  // Internal: send one UCI command line to the engine.
  _send(cmd) {
    this.worker.postMessage(cmd)
  }

  // Internal: wait for a line that matches `predicate`, then resolve.
  _waitFor(predicate, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners = this.listeners.filter((l) => l !== listener)
        reject(new Error('Stockfish timeout'))
      }, timeoutMs)

      const listener = (line) => {
        const match = predicate(line)
        if (match) {
          clearTimeout(timer)
          this.listeners = this.listeners.filter((l) => l !== listener)
          resolve(match === true ? line : match)
        }
      }
      this.listeners.push(listener)
    })
  }

  // Boots the engine. Call once after creating.
  async ready() {
    this._send('uci')
    await this._waitFor((line) => line === 'uciok')
    this._send('isready')
    await this._waitFor((line) => line === 'readyok')
  }

  // Asks the engine for the best move in the current position.
  // skill: 0-20 (Stockfish "Skill Level" — low makes it play weaker on purpose)
  // movetimeMs: how long the engine is allowed to think
  async getBestMove(fen, { skill = 10, movetimeMs = 800 } = {}) {
    // Tell Stockfish to play at this strength.
    this._send(`setoption name Skill Level value ${skill}`)
    // Give it the position and ask for a move.
    this._send(`position fen ${fen}`)
    this._send(`go movetime ${movetimeMs}`)

    const moveLine = await this._waitFor((line) =>
      line.startsWith('bestmove') ? line : null,
    )
    // moveLine looks like: "bestmove e2e4 ponder e7e5"
    const parts = moveLine.split(/\s+/)
    const move = parts[1]
    if (!move || move === '(none)') return null
    return move
  }

  // Tell the engine to abandon its current search (we start a new game).
  stop() {
    try {
      this._send('stop')
    } catch {
      /* ignore */
    }
  }

  // Clean up when we're done.
  quit() {
    try {
      this._send('quit')
    } catch {
      /* ignore */
    }
    this.worker.terminate()
    this.listeners = []
  }
}
