import { useMemo, useState } from 'react'
import './App.css'
import ChessGame from './components/ChessGame'
import FriendMode from './components/FriendMode'
import PieceGuide from './components/PieceGuide'
import { normalizeRoomCode } from './lib/localMultiplayer'

function readInviteFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const rawRoom = params.get('room')
  if (!rawRoom) return { roomCode: null, error: '' }

  const roomCode = normalizeRoomCode(rawRoom)
  if (roomCode) return { roomCode, error: '' }
  return {
    roomCode: null,
    error: 'This invite link is missing a valid 3-digit room code.',
  }
}

function App() {
  const inviteState = useMemo(() => readInviteFromUrl(), [])
  const [mode, setMode] = useState(
    inviteState.roomCode || inviteState.error ? 'friend' : 'computer',
  )

  function updateRoomUrl(roomCode) {
    const url = new URL(window.location.href)
    if (roomCode) url.searchParams.set('room', roomCode)
    else url.searchParams.delete('room')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }

  function handleModeSelect(nextMode) {
    setMode(nextMode)
    if (nextMode !== 'friend') updateRoomUrl(null)
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>'Maizing Challenging Chess</h1>
        <p className="tagline">Play the computer, or try a friend room with a 3-digit invite code.</p>
      </header>

      <div className="layout">
        <div className="game-column">
          <div className="mode-switcher" role="tablist" aria-label="Play mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'computer'}
              className={`mode-switcher-button ${mode === 'computer' ? 'is-selected' : ''}`}
              onClick={() => handleModeSelect('computer')}
            >
              Vs Computer
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'friend'}
              className={`mode-switcher-button ${mode === 'friend' ? 'is-selected' : ''}`}
              onClick={() => handleModeSelect('friend')}
            >
              Play A Friend
            </button>
          </div>

          {mode === 'friend' ? (
            <FriendMode
              inviteCode={inviteState.roomCode}
              inviteError={inviteState.error}
              onRoomUrlChange={updateRoomUrl}
            />
          ) : (
            <ChessGame />
          )}
        </div>
        <PieceGuide />
      </div>
    </main>
  )
}

export default App
