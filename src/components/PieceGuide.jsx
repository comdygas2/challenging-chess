import { useState } from 'react'
import { PIECE_GUIDES, PIECE_ORDER } from '../lib/pieceGuides'
import MoveDiagram from './MoveDiagram'

/*
  PieceGuide
  ----------
  A row of 6 piece buttons. Tap one to open a visual diagram that shows
  how that piece can move (green dots = move, red rings = capture).
*/
export default function PieceGuide() {
  const [openId, setOpenId] = useState(null)
  const open = openId ? PIECE_GUIDES[openId] : null

  return (
    <section className="piece-guide">
      <h2 className="piece-guide-title">Learn the pieces</h2>
      <p className="piece-guide-hint">Tap a piece to see how it moves.</p>

      <div className="piece-buttons">
        {PIECE_ORDER.map((id) => {
          const piece = PIECE_GUIDES[id]
          const active = openId === id
          return (
            <button
              key={id}
              type="button"
              className={`piece-button${active ? ' is-active' : ''}`}
              onClick={() => setOpenId(active ? null : id)}
              aria-pressed={active}
            >
              <span className="piece-glyph" aria-hidden="true">
                {piece.glyph}
              </span>
              <span className="piece-name">{piece.name}</span>
            </button>
          )
        })}
      </div>

      {open && (
        <div className="piece-detail">
          <div className="piece-detail-header">
            <span className="piece-detail-glyph" aria-hidden="true">
              {open.glyph}
            </span>
            <h3>{open.name}</h3>
            <button
              type="button"
              className="piece-detail-close"
              onClick={() => setOpenId(null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <MoveDiagram guide={open} />
        </div>
      )}
    </section>
  )
}
