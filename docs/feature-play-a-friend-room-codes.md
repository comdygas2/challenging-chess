# Feature: Play A Friend With A 3-Digit Room Code

## Summary

Add a new multiplayer mode called `Play a friend`.

This mode lets two players join the same game by typing the same 3-digit room code. The first player chooses the code. If that code does not exist yet, the app asks them to enter it a second time to confirm room creation. If the code already exists and is waiting for an opponent, the app joins that room immediately.

The same room code should also support reconnecting to an in-progress game from the same browser/session.

Example:

- Player 1 enters friend mode, picks name + character, types `567`
- Room `567` does not exist yet, so the app asks them to type `567` again
- On matching confirmation, room `567` is created and Player 1 waits
- Player 2 enters friend mode, picks name + character, types `567`
- Because room `567` exists and is waiting, Player 2 joins immediately
- If Player 1 leaves mid-game and later returns, they can type `567` again and reconnect to their existing seat

## Why

The current app is single-player only: one browser tab owns the local `Chess` state and Stockfish provides the opponent.

`Play a friend` would add a simple, beginner-friendly way for two real people to play each other without accounts, passwords, profiles, or matchmaking complexity.

This is intentionally a low-friction social flow:

- easy to explain out loud
- easy to type on desktop or iPad
- no long invite links
- no separate "create room" vs "join room" mental model

## Goals

- Add a `Play a friend` mode alongside the existing AI mode
- Let players choose a name and character before joining a room
- Use a host-chosen 3-digit room code
- Use a 3-slot numeric code entry UI, similar to a 2FA code input
- Auto-submit as soon as the 3rd digit is entered
- If the room exists and is waiting, join it immediately
- If the room does not exist, require the same 3 digits to be entered a second time before creating it
- Allow a player to reconnect to their seat in an existing game by typing the same room code later
- Keep the existing single-player AI experience intact

## Non-Goals

- Random matchmaking
- Accounts, logins, or profiles
- Spectators
- Chat
- Clocks / timers
- Rankings or ratings
- Cross-device account recovery
- Anti-cheat beyond basic move/turn validation

## User Experience

### Entry flow

1. User chooses `Play a friend`
2. User enters:
   - name
   - character
3. User sees a 3-digit room code entry screen
4. Each digit fills a visible slot as they type
5. Entering the 3rd digit submits automatically

### Join vs create flow

After the user enters 3 digits:

- If a room with that code exists and has exactly one waiting player, join that room immediately
- If a room with that code does not exist, ask the user to enter the same 3 digits again to confirm room creation
- If the confirmation matches, create the room and place the user in a waiting lobby
- If the confirmation does not match, show a mismatch error and restart the code entry flow

### Reconnect flow

If a player previously created or joined room `XYZ` and later returns:

- They can type the same 3-digit code again
- If the app can identify them as one of the stored players for that room, it should reconnect them to their existing seat
- Reconnect should take priority over joining as a new player

### Waiting state

After room creation, the host should see:

- the room code clearly displayed
- their own name + character
- a waiting message such as `Waiting for opponent...`
- a way to leave the room

### Game state

Once both players are present:

- White / Black are assigned and shown clearly
- Board orientation follows the player seat
- Status text should read like multiplayer, not AI mode
- Example text:
  - `Your move`
  - `Waiting for Maya`
  - `Check on Black`
  - `Opponent disconnected`

## Product Rules

- Room codes are exactly 3 digits
- Leading zeroes should be allowed, so `005` is a valid room code
- Room code should be stored as text, not integer
- A room may have at most 2 players
- Only a `waiting` room may be joined by a new second player
- If a room is already full and the current browser does not own one of its seats, show a clear `Room full` / `Game already has two players` message
- The same browser/session that already owns a seat may re-enter the code and reconnect
- Stale rooms must expire so codes can be reused

## Technical Direction

### Backend

This feature requires shared online state and therefore intentionally breaks the project's current `static-only` constraint at the product architecture level.

The frontend can still remain a static Vite site on Vercel, but multiplayer will need a managed backend service for:

- room records
- player seat ownership
- current game state
- realtime updates

Recommended approach:

- Supabase for database + realtime subscriptions
- Anonymous auth or an equivalent lightweight per-browser identity

### Why identity is still needed

The public room code is enough to locate the game, but not enough to safely determine which player is reconnecting.

To support reconnect properly, each player needs a lightweight private identity:

- anonymous auth user id, or
- a stored reconnect token tied to that seat

Without that, anyone who knows the room code could claim either seat after a refresh.

## Proposed Data Model

One room record is enough for the MVP.

Suggested fields:

- `id`
- `code` (3-character string)
- `status` (`waiting`, `active`, `finished`, `abandoned`)
- `white_player_id`
- `black_player_id`
- `white_name`
- `black_name`
- `white_character`
- `black_character`
- `white_connected`
- `black_connected`
- `white_last_seen_at`
- `black_last_seen_at`
- `fen`
- `move_history`
- `created_at`
- `updated_at`
- `expires_at`

## State Transitions

- Room created -> `waiting`
- Second player joins -> `active`
- Game ends normally -> `finished`
- One player leaves before match starts -> `abandoned`
- Active player disconnects -> room remains `active`, but seat is marked disconnected
- Disconnected player returns and is recognized -> seat is reconnected
- Old inactive rooms expire and are deleted or ignored

## Client Behavior

### Single-player mode

The current AI mode should remain available and should keep its current Stockfish lifecycle.

### Multiplayer mode

Friend mode should not start Stockfish at all.

Current single-player assumptions that need to become mode-aware:

- human is always White
- Stockfish always loads on mount
- after each human move, AI is asked for a move
- board orientation is always White
- status text always references "computer" or "AI"
- restart means "new local game"

In multiplayer mode:

- player color is assigned dynamically
- no Stockfish worker is created
- legal moves are applied to shared room state
- status copy becomes player-vs-player language
- restart is replaced by `Leave room` and later possibly `Rematch`

## Edge Cases

- User enters a code for a room that is full
- User enters a code for a finished room
- Host enters a new code, then mistypes the confirmation code
- Two people try to join the last seat at nearly the same time
- Player refreshes while waiting in lobby
- Player refreshes during an active game
- Opponent disconnects mid-game
- Both players leave and later attempt to reuse the same code

## Expiration / Reuse Rules

Because there are only 1000 possible room codes, rooms cannot live forever.

Suggested MVP behavior:

- `waiting` rooms expire after 30 minutes with no second player
- `finished` or `abandoned` rooms expire after a short retention window
- `active` rooms remain restorable for a limited time so reconnect works

Exact time windows can be tuned, but expiration must be part of the design.

## Acceptance Criteria

- The app offers both `Play the computer` and `Play a friend`
- Friend mode asks for a name and character before room entry
- Friend mode uses a visible 3-slot numeric code input
- Entering the 3rd digit submits automatically
- Entering a valid waiting room code joins that room immediately
- Entering a non-existent code prompts for the same code again before creating the room
- A mismatched confirmation does not create a room
- The host sees a waiting lobby after room creation
- A second player can join the room by typing the same code
- Once both players are present, the game starts with synchronized board state
- Multiplayer mode does not boot Stockfish
- A player who refreshes or leaves and returns from the same browser/session can re-enter the room code and reconnect to their seat
- A third player cannot join an already-full room
- Stale rooms expire so room codes can be reused

## Implementation Plan

1. Add top-level mode selection: AI vs Friend
2. Add friend setup screen for name + character
3. Build reusable 3-digit code entry component
4. Implement room lookup / confirm-create flow
5. Add waiting lobby UI
6. Add room persistence and realtime subscriptions
7. Split single-player and multiplayer game logic
8. Add reconnect handling for returning players
9. Add room expiration / cleanup rules
10. Test desktop + iPad flows, especially reconnect and code-entry UX

## Open Questions

- Should White/Black be assigned automatically, or should the host get first color choice?
- How long should an active room remain reconnectable before expiring?
- Should a player be allowed to reconnect from a different device later, or is MVP same-browser reconnect only?
- Should there be a simple `Rematch` flow after game end, or should players create a new room?

## Recommended MVP Decisions

To keep this feature small and dependable:

- assign White / Black automatically
- support reconnect from the same browser/session only
- do not add rematch in v1
- end the room cleanly if a player leaves mid-game and does not return within the expiration window
