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
  easy: {
    id: 'easy',
    label: 'Easy',
    emoji: '🤪',
    skill: 3,
    movetimeMs: 400,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    emoji: '🙂',
    skill: 10,
    movetimeMs: 800,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    emoji: '🧐',
    skill: 16,
    movetimeMs: 1200,
  },
  extremeHard: {
    id: 'extremeHard',
    label: 'Extreme',
    emoji: '🧠',
    skill: 20,
    movetimeMs: 2500,
    requiresUnlock: true,
  },
}

// Order shown on screen, left to right: Easy → Medium → Hard → Extreme (locked).
export const DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'extremeHard']

export const DEFAULT_DIFFICULTY_ID = 'medium'

// The level that must be beaten to unlock Extreme.
export const UNLOCK_AFTER_BEATING = 'hard'
