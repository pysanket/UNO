// ─── Card & deck logic ────────────────────────────────────────────────────────

export const COLORS = ['red', 'yellow', 'green', 'blue']
export const COLOR_HEX = {
  red: '#e74c3c',
  yellow: '#e6b800',
  green: '#27ae60',
  blue: '#2980b9',
}
export const SPECIAL = ['Skip', 'Reverse', 'Draw Two']
export const WILDS = ['Wild', 'Wild Draw Four']

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildDeck() {
  let id = 0
  const deck = []
  for (const color of COLORS) {
    deck.push({ id: id++, color, value: '0' })
    for (let n = 1; n <= 9; n++) {
      deck.push({ id: id++, color, value: `${n}` })
      deck.push({ id: id++, color, value: `${n}` })
    }
    for (const s of SPECIAL) {
      deck.push({ id: id++, color, value: s })
      deck.push({ id: id++, color, value: s })
    }
  }
  for (const w of WILDS) {
    for (let i = 0; i < 4; i++) deck.push({ id: id++, color: 'wild', value: w })
  }
  return shuffle(deck)
}

export function canPlay(card, topCard, currentColor) {
  if (card.color === 'wild') return true
  if (card.color === currentColor) return true
  if (card.value === topCard.value) return true
  return false
}

export function makeGameState(players) {
  const deck = buildDeck()
  const hands = {}
  let idx = 0
  for (const p of players) {
    hands[p] = deck.slice(idx, idx + 7)
    idx += 7
  }
  // First card can't be wild
  while (deck[idx]?.color === 'wild') idx++
  const top = deck[idx]
  const drawPile = deck.filter((c, i) => i >= players.length * 7 && c.id !== top.id)
  return {
    players,
    hands,
    drawPile,
    discard: [top],
    currentColor: top.color,
    currentPlayerIdx: 0,
    direction: 1,
    status: 'playing',
    winner: null,
    log: [`Game started! ${players[0]} goes first.`],
    handSizes: Object.fromEntries(players.map(p => [p, 7])),
    turn: 0,
    version: Date.now(),
  }
}
