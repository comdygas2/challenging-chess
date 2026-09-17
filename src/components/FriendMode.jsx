import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { playSoundsForMove, soundPlayer } from '../lib/sounds'
import {
  buildInviteUrl,
  createRoom,
  getRoomByCode,
  getSeatColor,
  resolveRoomEntry,
  sanitizeRoomCodeInput,
  submitRoomMove,
  subscribeToRooms,
} from '../lib/localMultiplayer'

const PROFILE_KEY = 'cc.friendProfile.v1'
const SOUND_KEY = 'cc.sound.v1'

const CHARACTER_CHOICES = [
  { id: 'maize-queen', label: 'Queen', emoji: '👑' },
  { id: 'castle-rook', label: 'Rook', emoji: '🏰' },
  { id: 'swift-knight', label: 'Knight', emoji: '🐴' },
  { id: 'wise-bishop', label: 'Bishop', emoji: '🪄' },
]

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

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return { name: '', character: CHARACTER_CHOICES[0].id }
    const parsed = JSON.parse(raw)
    return {
      name: typeof parsed?.name === 'string' ? parsed.name : '',
      character:
        CHARACTER_CHOICES.some((choice) => choice.id === parsed?.character)
          ? parsed.character
          : CHARACTER_CHOICES[0].id,
    }
  } catch {
    return { name: '', character: CHARACTER_CHOICES[0].id }
  }
}

function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    /* ignore */
  }
}

function loadSoundEnabled() {
  try {
    const raw = localStorage.getItem(SOUND_KEY)
    if (raw === null) return true
    return raw === 'true'
  } catch {
    return true
  }
}

function findKingSquare(game, color) {
  const board = game.board()
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = board[row][col]
      if (square && square.type === 'k' && square.color === color) {
        return square.square
      }
    }
  }
  return null
}

function getColorLabel(color) {
  return color === 'w' ? 'White' : 'Black'
}

function getOpponentName(room, playerColor) {
  return playerColor === 'w'
    ? room.blackName || 'your opponent'
    : room.whiteName || 'your opponent'
}

function describeStatus(room, game, playerColor) {
  if (!room) return { text: 'Open a room to start a friend game.', tone: 'info' }
  if (!playerColor) return { text: 'This room already has two players.', tone: 'lose' }

  if (room.status === 'waiting') {
    return { text: `Waiting for someone to join room ${room.code}.`, tone: 'info' }
  }

  if (game.isCheckmate()) {
    const youWon = game.turn() !== playerColor
    return {
      text: youWon ? 'Checkmate! You win! 🎉' : 'Checkmate! You lose.',
      tone: youWon ? 'win' : 'lose',
    }
  }
  if (game.isStalemate()) return { text: 'Stalemate — it’s a draw.', tone: 'draw' }
  if (game.isInsufficientMaterial()) {
    return { text: 'Draw — not enough pieces to checkmate.', tone: 'draw' }
  }
  if (game.isThreefoldRepetition()) return { text: 'Draw by repetition.', tone: 'draw' }
  if (game.isDraw()) return { text: 'Draw.', tone: 'draw' }

  const inCheck = game.isCheck()
  const isYourTurn = game.turn() === playerColor
  if (inCheck) {
    return isYourTurn
      ? { text: 'Check! Your move.', tone: 'warn' }
      : { text: `Check! Waiting for ${getOpponentName(room, playerColor)}.`, tone: 'warn' }
  }

  return isYourTurn
    ? { text: `Your move (${getColorLabel(playerColor)}).`, tone: 'info' }
    : { text: `Waiting for ${getOpponentName(room, playerColor)}.`, tone: 'info' }
}

function buildGameOverMessage(game, playerColor) {
  if (game.isCheckmate()) {
    return game.turn() !== playerColor
      ? { title: 'Game over', subtitle: 'Checkmate — you win!' }
      : { title: 'Game over', subtitle: 'Checkmate — your friend wins.' }
  }
  if (game.isStalemate()) return { title: 'Game over', subtitle: 'Stalemate — it’s a draw.' }
  if (game.isInsufficientMaterial()) {
    return { title: 'Game over', subtitle: 'Draw — not enough pieces to checkmate.' }
  }
  if (game.isThreefoldRepetition()) {
    return { title: 'Game over', subtitle: 'Draw by repetition.' }
  }
  if (game.isDraw()) return { title: 'Game over', subtitle: 'Draw.' }
  return null
}

export default function FriendMode({ inviteCode, onRoomUrlChange, inviteError }) {
  const [profile, setProfile] = useState(loadProfile)
  const [draftName, setDraftName] = useState(loadProfile().name)
  const [draftCharacter, setDraftCharacter] = useState(loadProfile().character)
  const [soundOn, setSoundOn] = useState(loadSoundEnabled)
  const [roomCodeInput, setRoomCodeInput] = useState(inviteCode ?? '')
  const [pendingCreateCode, setPendingCreateCode] = useState(null)
  const [message, setMessage] = useState(inviteError ?? '')
  const [messageTone, setMessageTone] = useState(inviteError ? 'warn' : 'info')
  const [activeRoomCode, setActiveRoomCode] = useState(inviteCode ?? null)
  const [roomVersion, setRoomVersion] = useState(0)
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [checkFlashCount, setCheckFlashCount] = useState(0)
  const [checkVisible, setCheckVisible] = useState(false)

  const attemptedInviteRef = useRef(null)
  const prevCheckRef = useRef(false)
  const lastMoveAtRef = useRef(null)
  const checkTimerRef = useRef(null)

  const hasProfile = profile.name.trim().length > 0
  const room = useMemo(() => {
    void roomVersion
    return activeRoomCode ? getRoomByCode(activeRoomCode) : null
  }, [activeRoomCode, roomVersion])
  const game = useMemo(() => new Chess(room?.fen ?? undefined), [room?.fen])
  const playerColor = room ? getSeatColor(room, profile) : null
  const status = describeStatus(room, game, playerColor)

  useEffect(() => {
    soundPlayer.setEnabled(soundOn)
    try {
      localStorage.setItem(SOUND_KEY, String(soundOn))
    } catch {
      /* ignore */
    }
  }, [soundOn])

  useEffect(() => {
    const unlock = () => soundPlayer.unlock()
    const options = { once: true, passive: true }
    window.addEventListener('pointerdown', unlock, options)
    window.addEventListener('touchstart', unlock, options)
    window.addEventListener('keydown', unlock, options)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('touchstart', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => () => clearTimeout(checkTimerRef.current), [])

  useEffect(() => {
    if (!activeRoomCode) return undefined
    const unsubscribe = subscribeToRooms(() => {
      setRoomVersion((version) => version + 1)
    })
    return unsubscribe
  }, [activeRoomCode])

  useEffect(() => {
    if (!room?.lastMoveAt || room.lastMoveAt === lastMoveAtRef.current) return
    lastMoveAtRef.current = room.lastMoveAt
    if (room.lastMove) {
      playSoundsForMove(room.lastMove, new Chess(room.fen))
    }
  }, [room?.lastMoveAt, room?.lastMove, room?.fen])

  useEffect(() => {
    if (!room || !playerColor) {
      prevCheckRef.current = false
      return
    }

    const inCheckForPlayer =
      room.status === 'active' && !game.isGameOver() && game.isCheck() && game.turn() === playerColor
    const wasInCheck = prevCheckRef.current
    prevCheckRef.current = inCheckForPlayer

    if (inCheckForPlayer && !wasInCheck) {
      setCheckFlashCount((count) => count + 1)
      setCheckVisible(true)
      clearTimeout(checkTimerRef.current)
      checkTimerRef.current = setTimeout(() => setCheckVisible(false), 2500)
    } else if (!inCheckForPlayer) {
      clearTimeout(checkTimerRef.current)
      queueMicrotask(() => setCheckVisible(false))
    }
  }, [game, playerColor, room])

  const setBanner = useCallback((text, tone = 'info') => {
    setMessage(text)
    setMessageTone(tone)
  }, [])

  const applyRoomResult = useCallback((result) => {
    if (result.type === 'invalid') {
      setBanner(result.message, 'warn')
      return
    }

    if (result.type === 'needs-confirm') {
      setPendingCreateCode(result.code)
      setRoomCodeInput('')
      setBanner(`Room ${result.code} does not exist yet. Enter it again to create it.`, 'info')
      return
    }

    if (result.type === 'full') {
      setPendingCreateCode(null)
      setActiveRoomCode(null)
      setRoomCodeInput(result.room?.code ?? '')
      setBanner(result.message, 'warn')
      return
    }

    if (result.type === 'created' || result.type === 'joined') {
      setPendingCreateCode(null)
      setActiveRoomCode(result.room.code)
      setRoomVersion((version) => version + 1)
      setSelectedSquare(null)
      setRoomCodeInput(result.room.code)
      setBanner(
        result.type === 'created'
          ? `Room ${result.room.code} is ready. Share the link with your friend.`
          : result.reconnected
            ? `Rejoined room ${result.room.code}.`
            : `Joined room ${result.room.code}.`,
        'info',
      )
    }
  }, [setBanner])

  const submitRoomCode = useCallback((code) => {
    if (!hasProfile) {
      setBanner('Pick your name and character before joining a room.', 'warn')
      return
    }

    if (pendingCreateCode) {
      if (code !== pendingCreateCode) {
        setPendingCreateCode(null)
        setRoomCodeInput('')
        setBanner(`That did not match ${pendingCreateCode}. Try the room code again.`, 'warn')
        return
      }
      applyRoomResult(createRoom(code, profile))
      return
    }

    applyRoomResult(resolveRoomEntry(code, profile))
  }, [applyRoomResult, hasProfile, pendingCreateCode, profile, setBanner])

  useEffect(() => {
    if (!hasProfile || !inviteCode || attemptedInviteRef.current === inviteCode) return
    attemptedInviteRef.current = inviteCode
    submitRoomCode(inviteCode)
  }, [hasProfile, inviteCode, submitRoomCode])

  useEffect(() => {
    onRoomUrlChange(activeRoomCode)
  }, [activeRoomCode, onRoomUrlChange])

  function handleProfileSubmit(event) {
    event.preventDefault()
    const nextProfile = {
      name: draftName.trim(),
      character: draftCharacter,
    }
    if (!nextProfile.name) {
      setBanner('Pick a name before joining a room.', 'warn')
      return
    }

    saveProfile(nextProfile)
    setProfile(nextProfile)
    setBanner(inviteCode ? `Trying room ${inviteCode}...` : 'Now pick a room code.', 'info')
  }

  const handleCopyInvite = useCallback(() => {
    if (!activeRoomCode) return
    const inviteUrl = buildInviteUrl(activeRoomCode)
    navigator.clipboard
      .writeText(inviteUrl)
      .then(() => setBanner(`Invite link copied for room ${activeRoomCode}.`, 'info'))
      .catch(() => setBanner('Could not copy the invite link on this device.', 'warn'))
  }, [activeRoomCode, setBanner])

  const handleExitRoom = useCallback(() => {
    setActiveRoomCode(null)
    setPendingCreateCode(null)
    setRoomCodeInput('')
    setSelectedSquare(null)
    setCheckVisible(false)
    prevCheckRef.current = false
    setBanner('You left the room view. Enter a code to rejoin later.', 'info')
  }, [setBanner])

  const tryMove = useCallback((fromSquare, toSquare) => {
    if (!activeRoomCode || !room || room.status !== 'active' || !playerColor) return false
    const result = submitRoomMove(activeRoomCode, profile, fromSquare, toSquare)
    if (!result.ok) {
      if (result.error === 'not-your-turn') {
        setBanner(`It is ${getOpponentName(room, playerColor)}'s turn.`, 'warn')
      } else if (result.error === 'missing-room') {
        setBanner('That room no longer exists.', 'warn')
      }
      return false
    }
    setSelectedSquare(null)
    setRoomVersion((version) => version + 1)
    return true
  }, [activeRoomCode, playerColor, profile, room, setBanner])

  const handlePieceDrop = useCallback(({ sourceSquare, targetSquare }) => {
    if (!targetSquare) return false
    return tryMove(sourceSquare, targetSquare)
  }, [tryMove])

  const handleSquareClick = useCallback(({ square, piece }) => {
    if (!playerColor || room?.status !== 'active' || game.isGameOver()) return

    if (selectedSquare) {
      if (square === selectedSquare) {
        setSelectedSquare(null)
        return
      }
      const moved = tryMove(selectedSquare, square)
      if (moved) return
      if (piece && isPlayersPiece(piece, playerColor)) setSelectedSquare(square)
      else setSelectedSquare(null)
      return
    }

    if (piece && isPlayersPiece(piece, playerColor) && game.turn() === playerColor) {
      setSelectedSquare(square)
    }
  }, [game, playerColor, room?.status, selectedSquare, tryMove])

  const squareStyles = useMemo(() => {
    const styles = {}

    if (game.isCheck()) {
      const kingSquare = findKingSquare(game, game.turn())
      if (kingSquare) styles[kingSquare] = CHECK_STYLE
    }

    if (selectedSquare) {
      styles[selectedSquare] = SELECTED_STYLE
      const moves = game.moves({ square: selectedSquare, verbose: true })
      for (const move of moves) {
        styles[move.to] = move.captured ? CAPTURE_RING_STYLE : MOVE_DOT_STYLE
      }
    }

    return styles
  }, [game, selectedSquare])

  const boardOptions = useMemo(
    () => ({
      position: game.fen(),
      onPieceDrop: handlePieceDrop,
      onSquareClick: handleSquareClick,
      boardOrientation: playerColor === 'b' ? 'black' : 'white',
      id: 'challenging-chess-board-friend',
      allowDragging:
        room?.status === 'active' &&
        !game.isGameOver() &&
        !!playerColor &&
        game.turn() === playerColor,
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
    [game, handlePieceDrop, handleSquareClick, playerColor, room?.status, squareStyles],
  )

  const gameOverMessage = playerColor ? buildGameOverMessage(game, playerColor) : null
  const showCheckWarning = checkVisible && !game.isGameOver()

  return (
    <div className="chess-game friend-mode">
      <div className="mode-card-header">
        <div>
          <h2 className="mode-card-title">Play A Friend</h2>
          <p className="mode-card-hint">
            This prototype keeps the current static app intact and syncs rooms locally in the
            browser, including invite links with `?room=123`.
          </p>
        </div>
      </div>

      {!hasProfile ? (
        <form className="friend-setup" onSubmit={handleProfileSubmit}>
          <label className="friend-label" htmlFor="friend-name">
            Your name
          </label>
          <input
            id="friend-name"
            className="friend-text-input"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            maxLength={24}
            placeholder="Player name"
          />

          <div className="friend-label">Pick a character</div>
          <div className="character-grid" role="radiogroup" aria-label="Character">
            {CHARACTER_CHOICES.map((choice) => {
              const selected = draftCharacter === choice.id
              return (
                <button
                  key={choice.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`character-card ${selected ? 'is-selected' : ''}`}
                  onClick={() => setDraftCharacter(choice.id)}
                >
                  <span className="character-emoji" aria-hidden="true">
                    {choice.emoji}
                  </span>
                  <span className="character-label">{choice.label}</span>
                </button>
              )
            })}
          </div>

          <button type="submit" className="restart-button is-primary">
            Continue to room code
          </button>
        </form>
      ) : (
        <>
          <div className="friend-profile-bar">
            <div>
              <div className="friend-profile-name">{profile.name}</div>
              <div className="friend-profile-character">
                {CHARACTER_CHOICES.find((choice) => choice.id === profile.character)?.emoji}{' '}
                {CHARACTER_CHOICES.find((choice) => choice.id === profile.character)?.label}
              </div>
            </div>
            <button
              type="button"
              className="restart-button"
              onClick={() => {
                setProfile({ name: '', character: CHARACTER_CHOICES[0].id })
                setDraftName(profile.name)
                setDraftCharacter(profile.character)
                setActiveRoomCode(null)
                setPendingCreateCode(null)
                setSelectedSquare(null)
              }}
            >
              Edit player
            </button>
          </div>

          {!activeRoomCode && (
            <div className="friend-room-entry">
              <div className="friend-label">
                {pendingCreateCode
                  ? `Enter ${pendingCreateCode} again to create it`
                  : 'Enter a 3-digit room code'}
              </div>
              <RoomCodeEntry
                value={roomCodeInput}
                onChange={setRoomCodeInput}
                onComplete={submitRoomCode}
              />
              <p className="friend-entry-hint">
                Manual entry and invite links use the same room validation. Invalid or full rooms
                stop here with a clear message.
              </p>
            </div>
          )}

          {message && (
            <div className={`status-line tone-${messageTone === 'warn' ? 'warn' : 'draw'}`}>
              {message}
            </div>
          )}

          {activeRoomCode && room && (
            <>
              <div className="room-summary">
                <div>
                  <div className="room-summary-label">Room</div>
                  <div className="room-summary-code">{room.code}</div>
                </div>
                <div>
                  <div className="room-summary-label">Invite link</div>
                  <button type="button" className="restart-button" onClick={handleCopyInvite}>
                    Copy invite link
                  </button>
                </div>
              </div>

              {room.status === 'waiting' ? (
                <div className="friend-lobby">
                  <p className="friend-lobby-title">Waiting for your friend to join room {room.code}.</p>
                  <p className="friend-lobby-text">
                    Share the invite link or tell them the room code out loud. When they enter the
                    same code, this room will become active automatically.
                  </p>
                </div>
              ) : (
                <>
                  <div className="board-wrapper">
                    {showCheckWarning && (
                      <div key={checkFlashCount} className="check-warning" role="alert">
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
                            onClick={handleExitRoom}
                          >
                            Leave room
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`status-line tone-${status.tone}`}>{status.text}</div>
                </>
              )}

              <div className="game-toolbar">
                <button type="button" className="restart-button" onClick={handleExitRoom}>
                  Leave room
                </button>
                <button
                  type="button"
                  className={`sound-toggle ${soundOn ? 'is-on' : 'is-off'}`}
                  onClick={() => setSoundOn((value) => !value)}
                  aria-pressed={soundOn}
                  aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
                  title={soundOn ? 'Sound on' : 'Sound off'}
                >
                  <span aria-hidden="true">{soundOn ? '🔊' : '🔇'}</span>
                  <span className="sound-toggle-label">{soundOn ? 'Sound on' : 'Sound off'}</span>
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function RoomCodeEntry({ value, onChange, onComplete }) {
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (value.length !== 3) return undefined
    const timer = setTimeout(() => onComplete(value), 40)
    return () => clearTimeout(timer)
  }, [onComplete, value])

  return (
    <div
      className="room-code-entry"
      onClick={() => inputRef.current?.focus()}
      role="group"
      aria-label="Room code"
    >
      <div className="room-code-slots" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className={`room-code-slot ${value[index] ? 'is-filled' : ''}`}>
            {value[index] ?? ''}
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        className="room-code-hidden-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={3}
        value={value}
        onChange={(event) => onChange(sanitizeRoomCodeInput(event.target.value))}
      />
    </div>
  )
}

function isPlayersPiece(piece, playerColor) {
  const pieceType = piece?.pieceType ?? piece
  return typeof pieceType === 'string' && pieceType.startsWith(playerColor)
}
