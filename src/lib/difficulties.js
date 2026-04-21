/*
  Difficulty levels
  -----------------
  One place that describes every level. The selector shows them
  in DIFFICULTY_ORDER, and the engine reads `skill` and `movetimeMs`.

  Stockfish "skill" is a built-in weakening dial:
    0  = very weak (plays bad moves on purpose)
    20 = full strength
  "movetimeMs" is how long the engine is allowed to think, in milliseconds.
  Longer thinking = stronger play (and a slower feel for you).
*/

export const DIFFICULTIES = {
  hard: {
    id: 'hard',
    label: 'Hard',
    description: 'Recommended for people who want a challenge.',
    skill: 16,
    movetimeMs: 1200,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    description: 'Not too easy, not too hard!',
    skill: 10,
    movetimeMs: 800,
  },
  easy: {
    id: 'easy',
    label: 'Easy',
    description: 'Recommended for beginners.',
    skill: 3,
    movetimeMs: 400,
  },
  extremeHard: {
    id: 'extremeHard',
    label: 'Extreme Hard',
    description: 'Beat Hard mode to unlock.',
    skill: 20,
    movetimeMs: 2500,
    requiresUnlock: true,
  },
}

// Order shown on screen (matches the drawing: Hard, Medium, Easy, Extreme Hard).
export const DIFFICULTY_ORDER = ['hard', 'medium', 'easy', 'extremeHard']

export const DEFAULT_DIFFICULTY_ID = 'medium'

// The level that must be beaten to unlock Extreme Hard.
export const UNLOCK_AFTER_BEATING = 'hard'
