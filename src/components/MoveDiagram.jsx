/*
  MoveDiagram
  -----------
  A small 8x8 chess board that shows, for a single piece type:
    - where the piece sits (center-ish)
    - where it can MOVE (green dots)
    - where it can CAPTURE (red rings)
    - optional "ghost" enemy pieces drawn on capture squares
      (used for the pawn's diagonal capture rule)
*/

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] // top to bottom

// White-piece and black-piece Unicode glyphs, keyed by chess.js type letter.
const WHITE_GLYPHS = { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' }
const BLACK_GLYPHS = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' }

function isLightSquare(file, rank) {
  const fileIndex = FILES.indexOf(file)
  const rankIndex = parseInt(rank, 10)
  // Light if the sum is even
  return (fileIndex + rankIndex) % 2 === 0
}

// A lookup: piece id in pieceGuides -> chess.js-style type letter.
const PIECE_TYPE_BY_ID = {
  pawn: 'p',
  rook: 'r',
  knight: 'n',
  bishop: 'b',
  queen: 'q',
  king: 'k',
}

export default function MoveDiagram({ guide }) {
  const pieceType = PIECE_TYPE_BY_ID[guide.id]
  const moveSet = new Set(guide.moves)
  const captureSet = new Set(guide.captures)
  const ghosts = guide.ghosts || {}

  return (
    <div className="move-diagram" aria-label={`How the ${guide.name} moves`}>
      {RANKS.map((rank) =>
        FILES.map((file) => {
          const square = `${file}${rank}`
          const light = isLightSquare(file, rank)
          const isPiece = square === guide.pieceSquare
          const ghostType = ghosts[square]
          const hasMoveDot = moveSet.has(square)
          const hasCaptureRing = captureSet.has(square)

          const classes = ['diagram-square']
          classes.push(light ? 'is-light' : 'is-dark')
          if (hasMoveDot) classes.push('has-move')
          if (hasCaptureRing) classes.push('has-capture')

          let content = null
          if (isPiece) {
            const glyph =
              guide.pieceSide === 'b'
                ? BLACK_GLYPHS[pieceType]
                : WHITE_GLYPHS[pieceType]
            content = (
              <span className="diagram-piece diagram-piece-white">{glyph}</span>
            )
          } else if (ghostType) {
            content = (
              <span className="diagram-piece diagram-piece-black">
                {BLACK_GLYPHS[ghostType]}
              </span>
            )
          }

          return (
            <div key={square} className={classes.join(' ')}>
              {content}
            </div>
          )
        }),
      )}
    </div>
  )
}
