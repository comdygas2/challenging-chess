import { DIFFICULTIES, DIFFICULTY_ORDER } from '../lib/difficulties'

/*
  DifficultySelector
  ------------------
  Four cards across, each showing a big emoji face plus the difficulty
  name. The "Extreme" card is locked (desaturated + padlock) until the
  player beats Hard.

  Props:
    selected     - id of the currently chosen difficulty
    onSelect     - function called with the new id
    unlockedIds  - Set of ids the player has unlocked (besides defaults)
*/
export default function DifficultySelector({ selected, onSelect, unlockedIds }) {
  return (
    <div className="difficulty-selector" role="radiogroup" aria-label="Difficulty">
      {DIFFICULTY_ORDER.map((id) => {
        const level = DIFFICULTIES[id]
        const locked = level.requiresUnlock && !unlockedIds.has(id)
        const isSelected = selected === id

        const classes = [
          'difficulty-card',
          isSelected ? 'is-selected' : '',
          locked ? 'is-locked' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-disabled={locked}
            aria-label={locked ? `${level.label} (locked — beat Hard to unlock)` : level.label}
            disabled={locked}
            className={classes}
            onClick={() => !locked && onSelect(id)}
            title={locked ? 'Beat Hard mode to unlock' : level.label}
          >
            <span className="difficulty-emoji" aria-hidden="true">
              {level.emoji}
            </span>
            <span className="difficulty-label">{level.label}</span>
            {locked && (
              <span className="lock-badge" aria-hidden="true">
                🔒
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
