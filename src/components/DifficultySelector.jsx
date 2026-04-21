import { DIFFICULTIES, DIFFICULTY_ORDER } from '../lib/difficulties'

/*
  DifficultySelector
  ------------------
  Four pill-shaped cards. Clicking one picks that difficulty.
  The "Extreme Hard" card is locked until the player beats Hard.

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
            disabled={locked}
            className={classes}
            onClick={() => !locked && onSelect(id)}
          >
            {locked && <span className="lock-pill">Locked</span>}
            <span className="difficulty-label">{level.label}</span>
            <span className="difficulty-description">{level.description}</span>
          </button>
        )
      })}
    </div>
  )
}
