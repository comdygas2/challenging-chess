/*
  Piece guides (visual)
  ---------------------
  For each piece we describe:
    - where the piece sits on the mini-board
    - which squares it can MOVE to (shown with a green dot)
    - which squares it can CAPTURE on (shown with a red ring)
    - which squares have a "ghost" enemy piece drawn on them
      (used for the pawn, so the diagonal-capture rule is obvious)
*/

export const PIECE_GUIDES = {
  pawn: {
    id: 'pawn',
    name: 'Pawn',
    glyph: '♙',
    // Pawn shown on its starting square so we can include the two-square
    // first-move option. Ghost enemy pawns on the diagonal capture squares.
    pieceSquare: 'd2',
    pieceSide: 'w',
    moves: ['d3', 'd4'],
    captures: ['c3', 'e3'],
    ghosts: { c3: 'p', e3: 'p' },
  },
  rook: {
    id: 'rook',
    name: 'Rook',
    glyph: '♖',
    pieceSquare: 'd4',
    pieceSide: 'w',
    moves: [
      'd1', 'd2', 'd3', 'd5', 'd6', 'd7', 'd8',
      'a4', 'b4', 'c4', 'e4', 'f4', 'g4', 'h4',
    ],
    captures: [],
    ghosts: {},
  },
  knight: {
    id: 'knight',
    name: 'Knight',
    glyph: '♘',
    pieceSquare: 'd4',
    pieceSide: 'w',
    moves: ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'],
    captures: [],
    ghosts: {},
  },
  bishop: {
    id: 'bishop',
    name: 'Bishop',
    glyph: '♗',
    pieceSquare: 'd4',
    pieceSide: 'w',
    moves: [
      'a1', 'b2', 'c3', 'e5', 'f6', 'g7', 'h8',
      'a7', 'b6', 'c5', 'e3', 'f2', 'g1',
    ],
    captures: [],
    ghosts: {},
  },
  queen: {
    id: 'queen',
    name: 'Queen',
    glyph: '♕',
    pieceSquare: 'd4',
    pieceSide: 'w',
    moves: [
      // straight (rook moves)
      'd1', 'd2', 'd3', 'd5', 'd6', 'd7', 'd8',
      'a4', 'b4', 'c4', 'e4', 'f4', 'g4', 'h4',
      // diagonals (bishop moves)
      'a1', 'b2', 'c3', 'e5', 'f6', 'g7', 'h8',
      'a7', 'b6', 'c5', 'e3', 'f2', 'g1',
    ],
    captures: [],
    ghosts: {},
  },
  king: {
    id: 'king',
    name: 'King',
    glyph: '♔',
    pieceSquare: 'd4',
    pieceSide: 'w',
    moves: ['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5'],
    captures: [],
    ghosts: {},
  },
}

export const PIECE_ORDER = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king']
