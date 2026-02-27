import { ref, set, get, onValue, update, off } from 'firebase/database'
import { db } from './firebase'

// ─── Room helpers ─────────────────────────────────────────────────────────────

export function roomRef(code) {
  return ref(db, `rooms/${code}`)
}

export function lobbyRef(code) {
  return ref(db, `rooms/${code}/lobby`)
}

export function pubRef(code) {
  return ref(db, `rooms/${code}/pub`)
}

export function handRef(code, playerName) {
  // Each player's hand is stored under their own key — only they read it
  return ref(db, `rooms/${code}/hands/${encodeURIComponent(playerName)}`)
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createRoom(code, hostName) {
  await set(roomRef(code), {
    lobby: {
      code,
      host: hostName,
      players: { [encodeURIComponent(hostName)]: hostName },
      status: 'waiting',
      createdAt: Date.now(),
    },
  })
}

export async function joinRoom(code, playerName) {
  const key = encodeURIComponent(playerName)
  await update(ref(db, `rooms/${code}/lobby/players`), { [key]: playerName })
}

export async function startGame(code, gameState) {
  const { hands, ...pub } = gameState
  const updates = {}

  // Save each player's hand privately
  for (const [player, hand] of Object.entries(hands)) {
    updates[`rooms/${code}/hands/${encodeURIComponent(player)}`] = hand
  }
  // Save public state (no hands)
  updates[`rooms/${code}/pub`] = pub
  // Update lobby status
  updates[`rooms/${code}/lobby/status`] = 'started'

  await update(ref(db), updates)
}

export async function savePublicState(code, pubState) {
  await set(pubRef(code), pubState)
}

export async function saveHand(code, playerName, hand) {
  await set(handRef(code, playerName), hand)
}

export async function saveGameMove(code, pubState, myName, myHand, victimName, victimHand) {
  const updates = {}
  updates[`rooms/${code}/pub`] = pubState
  updates[`rooms/${code}/hands/${encodeURIComponent(myName)}`] = myHand
  if (victimName && victimHand) {
    updates[`rooms/${code}/hands/${encodeURIComponent(victimName)}`] = victimHand
  }
  await update(ref(db), updates)
}

// ─── Read once ────────────────────────────────────────────────────────────────

export async function getRoom(code) {
  const snap = await get(roomRef(code))
  return snap.exists() ? snap.val() : null
}

export async function getHand(code, playerName) {
  const snap = await get(handRef(code, playerName))
  return snap.exists() ? snap.val() : null
}

// ─── Realtime listeners ───────────────────────────────────────────────────────

export function subscribeLobby(code, callback) {
  const r = lobbyRef(code)
  onValue(r, snap => callback(snap.exists() ? snap.val() : null))
  return () => off(r)
}

export function subscribePub(code, callback) {
  const r = pubRef(code)
  onValue(r, snap => callback(snap.exists() ? snap.val() : null))
  return () => off(r)
}

export function subscribeHand(code, playerName, callback) {
  const r = handRef(code, playerName)
  onValue(r, snap => callback(snap.exists() ? snap.val() : null))
  return () => off(r)
}
