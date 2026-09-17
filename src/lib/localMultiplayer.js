import { Chess } from 'chess.js'

const ROOMS_KEY = 'cc.localRooms.v1'
const CLIENT_ID_KEY = 'cc.sessionClientId.v1'

const subscribers = new Set()
let storageEventsBound = false
let roomChannel = null

function createId() {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID()
  return `cc-${Math.random().toString(36).slice(2, 10)}`
}

export function sanitizeRoomCodeInput(raw) {
  return String(raw ?? '').replace(/\D/g, '').slice(0, 3)
}

export function normalizeRoomCode(raw) {
  const code = sanitizeRoomCodeInput(raw)
  return code.length === 3 ? code : null
}

function namesMatch(a, b) {
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase()
}

function loadRoomMap() {
  try {
    const raw = localStorage.getItem(ROOMS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveRoomMap(roomMap) {
  localStorage.setItem(ROOMS_KEY, JSON.stringify(roomMap))
  notifySubscribers()
  if (roomChannel) {
    roomChannel.postMessage({ type: 'rooms-updated' })
  }
}

function notifySubscribers() {
  for (const callback of subscribers) callback()
}

function bindStorageEvents() {
  if (storageEventsBound || typeof window === 'undefined') return
  storageEventsBound = true

  window.addEventListener('storage', (event) => {
    if (event.key === ROOMS_KEY) notifySubscribers()
  })

  if (typeof BroadcastChannel === 'function') {
    roomChannel = new BroadcastChannel('challenging-chess-rooms')
    roomChannel.addEventListener('message', () => notifySubscribers())
  }
}

function getStartingFen() {
  return new Chess().fen()
}

export function getSessionClientId() {
  try {
    const existing = sessionStorage.getItem(CLIENT_ID_KEY)
    if (existing) return existing
    const next = createId()
    sessionStorage.setItem(CLIENT_ID_KEY, next)
    return next
  } catch {
    return createId()
  }
}

function getSeatForProfile(room, profile, clientId) {
  if (!room || !profile) return null

  if (room.whiteClientId === clientId) return 'white'
  if (room.blackClientId === clientId) return 'black'

  if (
    room.whiteName &&
    room.whiteCharacter &&
    namesMatch(room.whiteName, profile.name) &&
    room.whiteCharacter === profile.character
  ) {
    return 'white'
  }

  if (
    room.blackName &&
    room.blackCharacter &&
    namesMatch(room.blackName, profile.name) &&
    room.blackCharacter === profile.character
  ) {
    return 'black'
  }

  return null
}

function touchRoomSeat(room, seat, profile, clientId) {
  room[`${seat}Name`] = profile.name
  room[`${seat}Character`] = profile.character
  room[`${seat}ClientId`] = clientId
}

function cloneRoom(room) {
  return room ? JSON.parse(JSON.stringify(room)) : null
}

function buildRoom(code, profile, clientId) {
  return {
    code,
    status: 'waiting',
    fen: getStartingFen(),
    moveHistory: [],
    lastMove: null,
    lastMoveAt: null,
    whiteName: profile.name,
    whiteCharacter: profile.character,
    whiteClientId: clientId,
    blackName: '',
    blackCharacter: '',
    blackClientId: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function getRoomByCode(code) {
  const normalized = normalizeRoomCode(code)
  if (!normalized) return null
  return cloneRoom(loadRoomMap()[normalized] ?? null)
}

export function subscribeToRooms(callback) {
  bindStorageEvents()
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

export function buildInviteUrl(code) {
  const normalized = normalizeRoomCode(code)
  if (!normalized) return ''

  const url = new URL(window.location.href)
  url.searchParams.set('room', normalized)
  return url.toString()
}

export function resolveRoomEntry(code, profile) {
  const normalized = normalizeRoomCode(code)
  if (!normalized) {
    return { type: 'invalid', message: 'Room codes must be exactly 3 digits.' }
  }

  const rooms = loadRoomMap()
  const room = rooms[normalized]
  if (!room) {
    return { type: 'needs-confirm', code: normalized }
  }

  const clientId = getSessionClientId()
  const seat = getSeatForProfile(room, profile, clientId)
  if (seat) {
    touchRoomSeat(room, seat, profile, clientId)
    room.updatedAt = Date.now()
    rooms[normalized] = room
    saveRoomMap(rooms)
    return {
      type: 'joined',
      room: cloneRoom(room),
      seat,
      reconnected: true,
    }
  }

  if (room.status === 'waiting' && !room.blackName) {
    touchRoomSeat(room, 'black', profile, clientId)
    room.status = 'active'
    room.updatedAt = Date.now()
    rooms[normalized] = room
    saveRoomMap(rooms)
    return {
      type: 'joined',
      room: cloneRoom(room),
      seat: 'black',
      reconnected: false,
    }
  }

  return {
    type: 'full',
    room: cloneRoom(room),
    message:
      room.status === 'finished'
        ? `Room ${normalized} already finished.`
        : `Room ${normalized} already has two players.`,
  }
}

export function createRoom(code, profile) {
  const normalized = normalizeRoomCode(code)
  if (!normalized) {
    return { type: 'invalid', message: 'Room codes must be exactly 3 digits.' }
  }

  const rooms = loadRoomMap()
  if (rooms[normalized]) {
    return resolveRoomEntry(normalized, profile)
  }

  const room = buildRoom(normalized, profile, getSessionClientId())
  rooms[normalized] = room
  saveRoomMap(rooms)
  return {
    type: 'created',
    room: cloneRoom(room),
    seat: 'white',
  }
}

export function getSeatColor(room, profile) {
  const seat = getSeatForProfile(room, profile, getSessionClientId())
  if (seat === 'white') return 'w'
  if (seat === 'black') return 'b'
  return null
}

export function submitRoomMove(code, profile, from, to, promotion = 'q') {
  const normalized = normalizeRoomCode(code)
  if (!normalized) return { ok: false, error: 'missing-room' }

  const rooms = loadRoomMap()
  const room = rooms[normalized]
  if (!room) return { ok: false, error: 'missing-room' }

  const seat = getSeatForProfile(room, profile, getSessionClientId())
  if (!seat) return { ok: false, error: 'not-in-room' }

  const playerColor = seat === 'white' ? 'w' : 'b'
  const game = new Chess(room.fen)
  if (game.isGameOver()) return { ok: false, error: 'game-over' }
  if (game.turn() !== playerColor) return { ok: false, error: 'not-your-turn' }

  try {
    const move = game.move({ from, to, promotion })
    if (!move) return { ok: false, error: 'illegal-move' }

    room.fen = game.fen()
    room.status = game.isGameOver() ? 'finished' : 'active'
    room.moveHistory = [...(room.moveHistory ?? []), move.san]
    room.lastMove = {
      from: move.from,
      to: move.to,
      promotion: move.promotion ?? null,
      captured: move.captured ?? null,
      san: move.san,
    }
    room.lastMoveAt = Date.now()
    room.updatedAt = room.lastMoveAt

    rooms[normalized] = room
    saveRoomMap(rooms)
    return { ok: true, room: cloneRoom(room), move: room.lastMove }
  } catch {
    return { ok: false, error: 'illegal-move' }
  }
}
