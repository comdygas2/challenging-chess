import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { StockfishEngine } from '../lib/stockfishEngine'
import {
  DIFFICULTIES,
  DEFAULT_DIFFICULTY_ID,
  UNLOCK_AFTER_BEATING,
} from '../lib/difficulties'
import DifficultySelector from './DifficultySelector'
import { soundPlayer, playSoundsForMove } from '../lib/sounds'

/*
  ChessGame
  ---------
  Main game. Holds the board, the Stockfish engine, the difficulty
  selector, move highlighting, status messages, and the Restart button.
*/

const PLAYER_COLOR = 'w' // human plays white
const UNLOCKS_KEY = 'cc.unlocks.v1'
const SOUND_KEY = 'cc.sound.v1'

const SELECTED_STYLE = { background: 'rgba(255, 215, 0, 0.45)' }
const MOVE_DOT_STYLE = {
  background:
    'radial-gradient(circle, rgba(40,120,40,0.55) 18%, rgba(0,0,0,0) 20%)',
}
const CAPTURE_RING_STYLE = {
  background:
    'radial-gradient(circle, rgba(0,0,0,0) 58%, rgba(200,40,40,0.75) 60%, rgba(200,40,40,0.75) 70%, rgba(0,0,0,0) 72%)',
}
const CHECK_STYLE = {
  background:
    'radial-gradient(circle, rgba(220,40,40,0.6) 0%, rgba(220,40,40,0.25) 55%, rgba(0,0,0,0) 80%)',
}

function loadUnlocks() {
  try {
    const raw = localStorage.getItem(UNLOCKS_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

function saveUnlocks(set) {
  try {
    localStorage.setItem(UNLOCKS_KEY, JSON.stringify([...set]))
  } catch {
    /* ignore */
  }
}

function loadSoundEnabled() {
  try {
    const raw = localStorage.getItem(SOUND_KEY)
    if (raw === null) return true // default ON
    return raw === 'true'
  } catch {
    return true
  }
}

// Finds the square of the side-to-move's king. Used for the check highlight.
function findKingSquare(game, color) {
  const board = game.board()
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c]
      if (sq && sq.type === 'k' && sq.color === color) {
        return sq.square
      }
    }
  }
  return null
}

// Build the plain-English status message based on the current game state.
function describeStatus(game, engineReady, engineThinking) {
  if (!engineReady) return { text: 'Loading AI…', tone: 'info' }

  if (game.isCheckmate()) {
    const loser = game.turn()
    const youWon = loser !== PLAYER_COLOR
    return {
      text: youWon
        ? 'Checkmate! You win! 🎉'
        : 'Checkmate! The computer wins.',
      tone: youWon ? 'win' : 'lose',
    }
  }
  if (game.isStalemate()) {
    return { text: 'Stalemate — it’s a draw.', tone: 'draw' }
  }
  if (game.isInsufficientMaterial()) {
    return { text: 'Draw — not enough pieces to checkmate.', tone: 'draw' }
  }
  if (game.isThreefoldRepetition()) {
    return { text: 'Draw by repetition.', tone: 'draw' }
  }
  if (game.isDraw()) {
    return { text: 'Draw.', tone: 'draw' }
  }

  if (engineThinking) return { text: 'AI is thinking…', tone: 'info' }

  const inCheck = game.isCheck()
  const isPlayerTurn = game.turn() === PLAYER_COLOR
  if (inCheck) {
    return isPlayerTurn
      ? { text: 'Check! Your move.', tone: 'warn' }
      : { text: 'Check! Computer’s move.', tone: 'warn' }
  }
  return isPlayerTurn
    ? { text: 'Your move (White).', tone: 'info' }
    : { text: 'Computer’s move.', tone: 'info' }
}

export default function ChessGame() {
  const gameRef = useRef(new Chess())
  const [fen, setFen] = useState(gameRef.current.fen())
  const [engineThinking, setEngineThinking] = useState(false)
  const [engineReady, setEngineReady] = useState(false)
  const [difficultyId, setDifficultyId] = useState(DEFAULT_DIFFICULTY_ID)
  const [unlockedIds, setUnlockedIds] = useState(loadUnlocks)
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [soundOn, setSoundOn] = useState(loadSoundEnabled)
  const [checkFlashCount, setCheckFlashCount] = useState(0)
  const [checkVisible, setCheckVisible] = useState(false)
  const checkTimerRef = useRef(null)

  const engineRef = useRef(null)
  // Bumped on every Restart so that any in-flight AI reply is ignored.
  const gameGenRef = useRef(0)

  useEffect(() => {
    const engine = new StockfishEngine()
    engineRef.current = engine
    engine
      .ready()
      .then(() => setEngineReady(true))
      .catch((err) => console.error('Stockfish failed to load', err))
    return () => {
      engineRef.current = null
      engine.quit()
    }
  }, [])

  useEffect(() => {
    saveUnlocks(unlockedIds)
  }, [unlockedIds])

  // Keep the sound player and localStorage in sync with the toggle.
  useEffect(() => {
    soundPlayer.setEnabled(soundOn)
    try {
      localStorage.setItem(SOUND_KEY, String(soundOn))
    } catch {
      /* ignore */
    }
  }, [soundOn])

  const difficultyRef = useRef(difficultyId)
  difficultyRef.current = difficultyId

  const playAiMove = useCallback(async () => {
    const game = gameRef.current
    const engine = engineRef.current
    if (!engine) return
    if (game.isGameOver()) return
    if (game.turn() === PLAYER_COLOR) return

    const gen = gameGenRef.current
    const level = DIFFICULTIES[difficultyRef.current]
    setEngineThinking(true)
    try {
      const uci = await engine.getBestMove(game.fen(), {
        skill: level.skill,
        movetimeMs: level.movetimeMs,
      })
      // If a restart happened while the engine was thinking, drop this move.
      if (gen !== gameGenRef.current) return
      if (!uci) return
      const from = uci.slice(0, 2)
      const to = uci.slice(2, 4)
      const promotion = uci.length > 4 ? uci[4] : undefined
      const aiMove = game.move({ from, to, promotion })
      setFen(game.fen())
      playSoundsForMove(aiMove, game)
    } catch (err) {
      console.error('AI move failed', err)
    } finally {
      if (gen === gameGenRef.current) setEngineThinking(false)
    }
  }, [])

  // Flash the CHECK warning whenever your king newly enters check.
  // We bump a counter on every transition into check -- that counter
  // becomes a React `key` so the CSS animation restarts from scratch
  // even if two consecutive AI moves both leave you in check.
  // After ~2.5 s the banner hides itself so it doesn't cover the board.
  const prevCheckRef = useRef(false)
  useEffect(() => {
    const game = gameRef.current
    const inCheckForPlayer =
      !game.isGameOver() && game.isCheck() && game.turn() === PLAYER_COLOR
    const wasInCheck = prevCheckRef.current
    prevCheckRef.current = inCheckForPlayer

    if (inCheckForPlayer && !wasInCheck) {
      setCheckFlashCount((n) => n + 1)
      setCheckVisible(true)
      clearTimeout(checkTimerRef.current)
      checkTimerRef.current = setTimeout(
        () => setCheckVisible(false),
        2500,
      )
    } else if (!inCheckForPlayer) {
      // Player escaped or game ended -- hide immediately.
      clearTimeout(checkTimerRef.current)
      setCheckVisible(false)
    }
  }, [fen])

  // Clean up the flash timer on unmount.
  useEffect(() => () => clearTimeout(checkTimerRef.current), [])

  // iOS/iPad sound unlock: the AudioContext can't play until it's been
  // resumed inside a user gesture. We listen once for the first tap,
  // click, or key press, then unlock the sound system.
  useEffect(() => {
    const unlock = () => soundPlayer.unlock()
    const opts = { once: true, passive: true }
    window.addEventListener('pointerdown', unlock, opts)
    window.addEventListener('touchstart', unlock, opts)
    window.addEventListener('keydown', unlock, opts)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('touchstart', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // Unlock Extreme Hard if the player just beat Hard by checkmate.
  useEffect(() => {
    const game = gameRef.current
    if (!game.isCheckmate()) return
    const loser = game.turn()
    const winner = loser === 'w' ? 'b' : 'w'
    if (winner !== PLAYER_COLOR) return
    if (difficultyRef.current !== UNLOCK_AFTER_BEATING) return
    setUnlockedIds((prev) => {
      if (prev.has('extremeHard')) return prev
      const next = new Set(prev)
      next.add('extremeHard')
      return next
    })
  }, [fen])

  function tryMove(fromSquare, toSquare) {
    const game = gameRef.current
    if (engineThinking) return false
    if (game.isGameOver()) return false
    if (game.turn() !== PLAYER_COLOR) return false
    try {
      const move = game.move({
        from: fromSquare,
        to: toSquare,
        promotion: 'q',
      })
      if (!move) return false
      setFen(game.fen())
      setSelectedSquare(null)
      playSoundsForMove(move, game)
      setTimeout(playAiMove, 30)
      return true
    } catch {
      return false
    }
  }

  function handlePieceDrop({ sourceSquare, targetSquare }) {
    if (!targetSquare) return false
    return tryMove(sourceSquare, targetSquare)
  }

  function handleSquareClick({ square, piece }) {
    const game = gameRef.current
    if (engineThinking || game.isGameOver()) return
    if (selectedSquare) {
      if (square === selectedSquare) {
        setSelectedSquare(null)
        return
      }
      const moved = tryMove(selectedSquare, square)
      if (moved) return
      if (piece && isMyPiece(piece)) setSelectedSquare(square)
      else setSelectedSquare(null)
      return
    }
    if (piece && isMyPiece(piece) && game.turn() === PLAYER_COLOR) {
      setSelectedSquare(square)
    }
  }

  function handleRestart() {
    const engine = engineRef.current
    if (engine) engine.stop()
    gameGenRef.current += 1
    gameRef.current = new Chess()
    setFen(gameRef.current.fen())
    setSelectedSquare(null)
    setEngineThinking(false)
    clearTimeout(checkTimerRef.current)
    setCheckVisible(false)
    prevCheckRef.current = false
  }

  const squareStyles = useMemo(() => {
    const game = gameRef.current
    const styles = {}

    // Highlight the king in check.
    if (game.isCheck()) {
      const kingSq = findKingSquare(game, game.turn())
      if (kingSq) styles[kingSq] = CHECK_STYLE
    }

    if (selectedSquare) {
      styles[selectedSquare] = SELECTED_STYLE
      const moves = game.moves({ square: selectedSquare, verbose: true })
      for (const m of moves) {
        styles[m.to] = m.captured ? CAPTURE_RING_STYLE : MOVE_DOT_STYLE
      }
    }
    return styles
  }, [selectedSquare, fen])

  const boardOptions = useMemo(
    () => ({
      position: fen,
      onPieceDrop: handlePieceDrop,
      onSquareClick: handleSquareClick,
      boardOrientation: 'white',
      id: 'challenging-chess-board',
      allowDragging: !engineThinking && !gameRef.current.isGameOver(),
      squareStyles,
      lightSquareStyle: { backgroundColor: '#e9d7b0' },
      darkSquareStyle: { backgroundColor: '#7a5432' },
      alphaNotationStyle: {
        color: 'rgba(26,18,6,0.65)',
        fontSize: '11px',
        fontWeight: 600,
        position: 'absolute',
        bottom: 2,
        right: 4,
        userSelect: 'none',
      },
      numericNotationStyle: {
        color: 'rgba(26,18,6,0.65)',
        fontSize: '11px',
        fontWeight: 600,
        position: 'absolute',
        top: 2,
        left: 4,
        userSelect: 'none',
      },
    }),
    [fen, engineThinking, squareStyles, selectedSquare],
  )

  const game = gameRef.current
  const status = describeStatus(game, engineReady, engineThinking)

  // The CHECK banner is gated by the 2.5 s auto-hide timer in the
  // useEffect above, not by the live check state. That way it flashes
  // briefly and disappears even if the player hasn't moved yet.
  const showCheckWarning = checkVisible && !game.isGameOver()

  // Game over message shown in the popup.
  const gameOverMessage = game.isCheckmate()
    ? game.turn() !== PLAYER_COLOR
      ? { title: 'Game over', subtitle: 'Checkmate — you win!' }
      : { title: 'Game over', subtitle: 'Checkmate — the computer wins.' }
    : game.isStalemate()
      ? { title: 'Game over', subtitle: 'Stalemate — it’s a draw.' }
      : game.isInsufficientMaterial()
        ? { title: 'Game over', subtitle: 'Draw — not enough pieces to checkmate.' }
        : game.isThreefoldRepetition()
          ? { title: 'Game over', subtitle: 'Draw by repetition.' }
          : game.isDraw()
            ? { title: 'Game over', subtitle: 'Draw.' }
            : null

  return (
    <div className="chess-game">
      <DifficultySelector
        selected={difficultyId}
        onSelect={setDifficultyId}
        unlockedIds={unlockedIds}
      />

      <div className="board-wrapper">
        {showCheckWarning && (
          <div
            key={checkFlashCount}
            className="check-warning"
            role="alert"
          >
            <span className="check-warning-text">CHECK!!!</span>
          </div>
        )}

        <Chessboard options={boardOptions} />

        {gameOverMessage && (
          <div className="game-over-overlay" role="dialog" aria-modal="true">
            <div className="game-over-popup">
              <h2>{gameOverMessage.title}</h2>
              <p>{gameOverMessage.subtitle}</p>
              <button
                type="button"
                className="restart-button is-primary"
                onClick={handleRestart}
              >
                New game
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={`status-line tone-${status.tone}`}>{status.text}</div>

      <div className="game-toolbar">
        <button
          type="button"
          className="restart-button"
          onClick={handleRestart}
        >
          Restart game
        </button>
        <button
          type="button"
          className={`sound-toggle ${soundOn ? 'is-on' : 'is-off'}`}
          onClick={() => setSoundOn((v) => !v)}
          aria-pressed={soundOn}
          aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
          title={soundOn ? 'Sound on' : 'Sound off'}
        >
          <span aria-hidden="true">{soundOn ? '🔊' : '🔇'}</span>
          <span className="sound-toggle-label">{soundOn ? 'Sound on' : 'Sound off'}</span>
        </button>
      </div>
    </div>
  )
}

function isMyPiece(piece) {
  const pieceType = piece?.pieceType ?? piece
  if (typeof pieceType !== 'string') return false
  return pieceType.startsWith(PLAYER_COLOR)
}
