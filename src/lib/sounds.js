/*
  Sound player
  ------------
  Wraps the browser's Web Audio API. No audio files needed --
  every sound is a few short synthesized tones.

  iPad / iOS Safari notes:

    The AudioContext is created in a "suspended" state on iOS and will
    stay that way until it is resumed inside a user gesture (tap, click,
    or key press). If we try to play a sound before that unlock, the
    sound is silently dropped.

    To handle this we expose `unlock()`. The ChessGame component calls
    it on the first pointerdown / touchstart / keydown on the window,
    which guarantees the AudioContext is running before any move sound
    ever needs to play.

    We also play a one-sample silent buffer during unlock -- an old
    Safari quirk that some builds still need to fully release audio.
*/

class SoundPlayer {
  constructor() {
    this._ctx = null
    this._unlocked = false
    this.enabled = true
  }

  _ensureContext() {
    if (!this._ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      try {
        this._ctx = new AC()
      } catch {
        return null
      }
    }
    return this._ctx
  }

  // Call from a user gesture. Safe to call repeatedly.
  unlock() {
    const ctx = this._ensureContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    if (this._unlocked) return
    this._unlocked = true

    // One-sample silent buffer -- Safari's "seal the deal" trick.
    try {
      const buffer = ctx.createBuffer(1, 1, 22050)
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.connect(ctx.destination)
      src.start(0)
    } catch {
      /* ignore */
    }
  }

  _tone(frequency, durationMs, type = 'sine', peakGain = 0.18, delayMs = 0) {
    const ctx = this._ensureContext()
    if (!ctx) return
    // On iOS, if the unlock hasn't happened yet (e.g., the user hasn't
    // tapped anything), bail out instead of scheduling a lost sound.
    if (ctx.state !== 'running') {
      // Last-ditch: try to resume. On desktop this usually succeeds.
      ctx.resume().catch(() => {})
      if (ctx.state !== 'running') return
    }

    const startAt = ctx.currentTime + delayMs / 1000
    const durationS = durationMs / 1000

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = frequency

    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationS)

    osc.connect(gain).connect(ctx.destination)
    osc.start(startAt)
    osc.stop(startAt + durationS + 0.02)
  }

  setEnabled(enabled) {
    this.enabled = !!enabled
  }

  playMove() {
    if (!this.enabled) return
    this._tone(520, 80, 'sine', 0.16)
  }

  playCapture() {
    if (!this.enabled) return
    this._tone(220, 120, 'triangle', 0.22)
    this._tone(140, 140, 'triangle', 0.18, 30)
  }

  playCheck() {
    if (!this.enabled) return
    this._tone(660, 90, 'square', 0.15)
    this._tone(880, 140, 'square', 0.15, 110)
  }

  playGameOver() {
    if (!this.enabled) return
    this._tone(523, 130, 'triangle', 0.2)
    this._tone(440, 130, 'triangle', 0.2, 140)
    this._tone(330, 260, 'triangle', 0.2, 280)
  }
}

export const soundPlayer = new SoundPlayer()

/*
  Given a chess.js move result and the game state after the move is
  applied, play the right sequence of sounds.
*/
export function playSoundsForMove(move, gameAfter) {
  if (!move) return
  if (move.captured) soundPlayer.playCapture()
  else soundPlayer.playMove()

  if (gameAfter.isGameOver()) {
    setTimeout(() => soundPlayer.playGameOver(), 180)
  } else if (gameAfter.isCheck()) {
    setTimeout(() => soundPlayer.playCheck(), 140)
  }
}
