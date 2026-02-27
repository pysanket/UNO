import { useState, useEffect, useRef, useCallback } from 'react'
import UnoCard from './UnoCard'
import { ColorPicker, Toast, CopyBtn, Spinner, spinKeyframes } from './components'
import { COLORS, COLOR_HEX, canPlay, makeGameState, shuffle } from './gameLogic'
import {
  createRoom, joinRoom, startGame as fbStartGame,
  saveGameMove, getRoom, getHand,
  subscribeLobby, subscribePub, subscribeHand,
} from './firebaseSync'

// ─── URL helpers ──────────────────────────────────────────────────────────────
function getRoomFromUrl() {
  try {
    return new URL(window.location.href).searchParams.get('room') || ''
  } catch { return '' }
}
function setRoomInUrl(code) {
  try {
    const url = new URL(window.location.href)
    if (code) url.searchParams.set('room', code)
    else url.searchParams.delete('room')
    window.history.replaceState({}, '', url)
  } catch {}
}
function buildJoinUrl(code) {
  try {
    const url = new URL(window.location.href)
    url.searchParams.set('room', code)
    return url.toString()
  } catch { return window.location.href + '?room=' + code }
}
function makeRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

// ─── Shared button style ──────────────────────────────────────────────────────
function bigBtn(bg, shadow, disabled) {
  return {
    width: '100%', padding: '13px', border: 'none', borderRadius: 12,
    background: disabled ? 'rgba(255,255,255,0.07)' : bg,
    color: disabled ? 'rgba(255,255,255,0.25)' : '#fff',
    fontSize: 19, fontFamily: "'Fredoka One',cursive",
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : `0 4px 18px ${shadow}`,
    transition: 'transform 0.15s, box-shadow 0.15s',
    opacity: disabled ? 0.6 : 1,
  }
}

const inp = {
  width: '100%', padding: '11px 16px',
  background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,255,255,0.12)',
  borderRadius: 11, color: '#fff', fontSize: 17,
  fontFamily: "'Fredoka One',cursive", outline: 'none',
  transition: 'border-color 0.2s',
}

const cardBox = {
  background: 'rgba(255,255,255,0.04)', border: '2px solid rgba(255,255,255,0.09)',
  borderRadius: 22, padding: '40px 36px', width: 'min(460px,95vw)',
}

const pageBg = {
  minHeight: '100vh', background: '#0d0d1a',
  backgroundImage: 'radial-gradient(ellipse at 20% 60%,rgba(231,76,60,0.13) 0%,transparent 55%),radial-gradient(ellipse at 80% 20%,rgba(41,128,185,0.13) 0%,transparent 55%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: "'Fredoka One',cursive",
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('lobby')   // lobby | waiting | game | winner | error
  const [nameInput, setNameInput] = useState('')
  const [roomInput, setRoomInput] = useState(() => getRoomFromUrl())
  const [myName, setMyName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [lobby, setLobby] = useState(null)
  const [pub, setPub] = useState(null)
  const [myHand, setMyHand] = useState([])
  const [colorPicking, setColorPicking] = useState(false)
  const [pendingCard, setPendingCard] = useState(null)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const unsubRef = useRef([])
  const myNameRef = useRef('')
  const roomCodeRef = useRef('')
  const pubRef2 = useRef(null)

  useEffect(() => { myNameRef.current = myName }, [myName])
  useEffect(() => { roomCodeRef.current = roomCode }, [roomCode])
  useEffect(() => { pubRef2.current = pub }, [pub])

  // Pre-fill room from URL
  useEffect(() => {
    const code = getRoomFromUrl()
    if (code) setRoomInput(code)
  }, [])

  function showToast(msg, duration = 2500) {
    setToast(msg)
    setTimeout(() => setToast(''), duration)
  }

  function stopListeners() {
    unsubRef.current.forEach(fn => fn())
    unsubRef.current = []
  }

  // ── Subscribe to lobby + pub + my hand ─────────────────────────────────────
  function subscribe(code, name) {
    stopListeners()

    const u1 = subscribeLobby(code, data => {
      if (!data) return
      setLobby(data)
      if (data.status === 'started') {
        setScreen(s => s === 'waiting' ? 'game' : s)
      }
    })

    const u2 = subscribePub(code, data => {
      if (!data) return
      setPub(data)
      if (data.status === 'finished') setScreen('winner')
      else if (data.status === 'playing') setScreen(s => s === 'waiting' ? 'game' : s)
    })

    const u3 = subscribeHand(code, name, data => {
      if (data) setMyHand(data)
    })

    unsubRef.current = [u1, u2, u3]
  }

  useEffect(() => () => stopListeners(), [])

  // ── Create room ─────────────────────────────────────────────────────────────
  async function handleCreate() {
    const name = nameInput.trim()
    if (!name) return showToast('Enter your name first')
    setLoading(true)
    try {
      const code = makeRoomCode()
      await createRoom(code, name)
      setRoomCode(code)
      setMyName(name)
      setRoomInUrl(code)
      subscribe(code, name)
      setScreen('waiting')
    } catch (e) {
      setErrorMsg('Could not connect to Firebase. Did you set up firebase.js with your credentials?')
      setScreen('error')
    }
    setLoading(false)
  }

  // ── Join room ───────────────────────────────────────────────────────────────
  async function handleJoin() {
    const name = nameInput.trim()
    const code = roomInput.trim().toUpperCase()
    if (!name) return showToast('Enter your name first')
    if (!code) return showToast('Enter a room code')
    setLoading(true)
    try {
      const room = await getRoom(code)
      if (!room) { setLoading(false); return showToast('Room not found — check the code') }
      if (room.lobby?.status === 'started') { setLoading(false); return showToast('Game already started') }
      const existingPlayers = Object.values(room.lobby?.players || {})
      if (existingPlayers.map(p => p.toLowerCase()).includes(name.toLowerCase())) {
        setLoading(false); return showToast('Name already taken in this room')
      }
      if (existingPlayers.length >= 4) { setLoading(false); return showToast('Room is full (max 4 players)') }
      await joinRoom(code, name)
      setRoomCode(code)
      setMyName(name)
      setRoomInUrl(code)
      subscribe(code, name)
      setScreen('waiting')
    } catch (e) {
      setErrorMsg('Could not connect to Firebase. Did you set up firebase.js with your credentials?')
      setScreen('error')
    }
    setLoading(false)
  }

  // ── Start game ──────────────────────────────────────────────────────────────
  async function handleStart() {
    const players = Object.values(lobby?.players || {})
    if (players.length < 2) return showToast('Need at least 2 players')
    setLoading(true)
    try {
      const gs = makeGameState(players)
      await fbStartGame(roomCode, gs)
      setMyHand(gs.hands[myName])
    } catch (e) {
      showToast('Error starting game — try again')
    }
    setLoading(false)
  }

  // ── Draw card ────────────────────────────────────────────────────────────────
  async function handleDraw() {
    const curPub = pubRef2.current
    if (!curPub || curPub.players[curPub.currentPlayerIdx] !== myName) return
    if (curPub.status !== 'playing') return

    let drawPile = [...(curPub.drawPile || [])]
    let discard = [...curPub.discard]
    if (drawPile.length === 0) {
      const top = discard[discard.length - 1]
      drawPile = shuffle(discard.slice(0, -1))
      discard = [top]
    }
    const drawn = drawPile[0]
    const newPile = drawPile.slice(1)
    const newHand = [...myHand, drawn]
    const nextIdx = (curPub.currentPlayerIdx + curPub.direction + curPub.players.length) % curPub.players.length

    const newPub = {
      ...curPub,
      drawPile: newPile,
      discard,
      currentPlayerIdx: nextIdx,
      handSizes: { ...curPub.handSizes, [myName]: newHand.length },
      log: [`${myName} drew a card`, ...(curPub.log || []).slice(0, 29)],
      turn: (curPub.turn || 0) + 1,
      version: Date.now(),
    }

    setMyHand(newHand)
    setPub(newPub)
    await saveGameMove(roomCode, newPub, myName, newHand, null, null)
  }

  // ── Play card ────────────────────────────────────────────────────────────────
  async function executePlay(card, chosenColor) {
    const curPub = pubRef2.current
    if (!curPub || curPub.players[curPub.currentPlayerIdx] !== myName) return
    const top = curPub.discard[curPub.discard.length - 1]
    if (!canPlay(card, top, curPub.currentColor)) return showToast("That card can't be played!")

    const color = chosenColor || card.color
    let direction = curPub.direction
    let skip = false
    let drawCount = 0

    if (card.value === 'Reverse') {
      direction *= -1
      if (curPub.players.length === 2) skip = true
    } else if (card.value === 'Skip') {
      skip = true
    } else if (card.value === 'Draw Two') {
      drawCount = 2; skip = true
    } else if (card.value === 'Wild Draw Four') {
      drawCount = 4; skip = true
    }

    const nextRaw = (curPub.currentPlayerIdx + direction + curPub.players.length) % curPub.players.length
    const nextIdx = skip
      ? (nextRaw + direction + curPub.players.length) % curPub.players.length
      : nextRaw

    const newHand = myHand.filter(c => c.id !== card.id)
    let drawPile = [...(curPub.drawPile || [])]
    const handSizes = { ...curPub.handSizes, [myName]: newHand.length }

    let victimName = null
    let updatedVictimHand = null

    if (drawCount > 0) {
      victimName = curPub.players[nextRaw]
      if (drawPile.length < drawCount) {
        const top2 = curPub.discard[curPub.discard.length - 1]
        drawPile = [...shuffle(curPub.discard.slice(0, -1)), ...drawPile]
      }
      const penaltyCards = drawPile.slice(0, drawCount)
      drawPile = drawPile.slice(drawCount)
      const victimCurrentHand = await getHand(roomCode, victimName) || []
      updatedVictimHand = [...victimCurrentHand, ...penaltyCards]
      handSizes[victimName] = updatedVictimHand.length
    }

    const won = newHand.length === 0
    const logMsg = won
      ? `🎉 ${myName} wins!`
      : `${myName} played ${card.color !== 'wild' ? card.color + ' ' : ''}${card.value}${chosenColor ? ' → ' + chosenColor : ''}`

    const newPub = {
      ...curPub,
      discard: [...curPub.discard, card],
      drawPile,
      currentColor: color,
      currentPlayerIdx: won ? curPub.currentPlayerIdx : nextIdx,
      direction,
      status: won ? 'finished' : 'playing',
      winner: won ? myName : null,
      handSizes,
      log: [logMsg, ...(curPub.log || []).slice(0, 29)],
      turn: (curPub.turn || 0) + 1,
      version: Date.now(),
    }

    setMyHand(newHand)
    setPub(newPub)
    await saveGameMove(roomCode, newPub, myName, newHand, victimName, updatedVictimHand)
    if (won) setScreen('winner')
  }

  function handleCardClick(card) {
    if (!pub || pub.status !== 'playing') return
    if (pub.players[pub.currentPlayerIdx] !== myName) return showToast("It's not your turn!")
    const top = pub.discard[pub.discard.length - 1]
    if (!canPlay(card, top, pub.currentColor)) return showToast("That card can't be played here!")
    if (card.color === 'wild') { setPendingCard(card); setColorPicking(true) }
    else executePlay(card)
  }

  function handleColorPick(c) {
    setColorPicking(false)
    if (pendingCard) executePlay(pendingCard, c)
    setPendingCard(null)
  }

  function goHome() {
    stopListeners()
    setScreen('lobby'); setPub(null); setMyHand([])
    setLobby(null); setRoomCode(''); setMyName('')
    setToast(''); setRoomInUrl('')
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const isMyTurn = pub?.status === 'playing' && pub.players?.[pub.currentPlayerIdx] === myName
  const topCard = pub?.discard?.[pub.discard.length - 1]
  const lobbyPlayers = Object.values(lobby?.players || {})
  const isHost = lobby?.host === myName
  const canStart = lobbyPlayers.length >= 2

  // ────────────────────────────────────────────────────────────────────────────
  // ERROR SCREEN
  // ────────────────────────────────────────────────────────────────────────────
  if (screen === 'error') return (
    <div style={{ ...pageBg, flexDirection: 'column', padding: 24, textAlign: 'center' }}>
      <style>{spinKeyframes}</style>
      <div style={{ color: '#e94560', fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <div style={{ fontFamily: "'Fredoka One',cursive", color: '#fff', fontSize: 24, marginBottom: 12 }}>
        Firebase Not Configured
      </div>
      <div style={{
        background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.35)',
        borderRadius: 14, padding: '20px 24px', maxWidth: 480, marginBottom: 24,
        color: 'rgba(255,255,255,0.7)', fontFamily: "'Nunito',sans-serif", lineHeight: 1.7, fontSize: 14,
      }}>
        <strong style={{ color: '#fff', fontSize: 15 }}>To play online across devices:</strong>
        <br /><br />
        1. Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener" style={{ color: '#e94560' }}>console.firebase.google.com</a><br />
        2. Create a new project (free Spark plan)<br />
        3. Add a Web App → copy the config values<br />
        4. Go to Realtime Database → Create database (test mode)<br />
        5. Paste your config into <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>src/firebase.js</code><br />
        6. Deploy to GitHub Pages / Netlify / Vercel
      </div>
      <button onClick={() => setScreen('lobby')}
        style={{ ...bigBtn('linear-gradient(135deg,#e74c3c,#c0392b)', 'rgba(231,76,60,0.4)'), width: 'auto', padding: '12px 32px' }}>
        ← Back
      </button>
    </div>
  )

  // ────────────────────────────────────────────────────────────────────────────
  // LOBBY
  // ────────────────────────────────────────────────────────────────────────────
  if (screen === 'lobby') return (
    <div style={pageBg}>
      <style>{spinKeyframes}</style>
      <Toast msg={toast} />
      <div style={cardBox}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontSize: 88, lineHeight: 1, letterSpacing: -2,
            background: 'conic-gradient(#e74c3c 0 90deg,#e6b800 90deg 180deg,#27ae60 180deg 270deg,#2980b9 270deg 360deg)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>UNO</div>
          <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, fontFamily: "'Nunito',sans-serif", marginTop: 4 }}>
            Real-time Multiplayer · Play from anywhere 🌍
          </div>
        </div>

        {/* Name input */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, letterSpacing: 1.5, fontFamily: "'Nunito',sans-serif", marginBottom: 8 }}>
            YOUR NAME
          </div>
          <input value={nameInput} onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Enter your name…" style={inp}
            onFocus={e => e.target.style.borderColor = '#e94560'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
          />
        </div>

        {/* Create game */}
        <button onClick={handleCreate} disabled={loading}
          style={bigBtn('linear-gradient(135deg,#e74c3c,#c0392b)', 'rgba(231,76,60,0.4)', loading)}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 26px rgba(231,76,60,0.55)' } }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(231,76,60,0.4)' }}
        >
          {loading ? '⏳ Connecting…' : '🃏 Create New Game'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          <span style={{ color: 'rgba(255,255,255,0.2)', fontFamily: "'Nunito',sans-serif", fontSize: 11, letterSpacing: 1 }}>OR JOIN EXISTING</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        </div>

        <input value={roomInput}
          onChange={e => setRoomInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          placeholder="Room Code (e.g. AB3X9K)" maxLength={6}
          style={{ ...inp, textAlign: 'center', letterSpacing: 4, marginBottom: 10 }}
          onFocus={e => e.target.style.borderColor = '#2980b9'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
        />
        <button onClick={handleJoin} disabled={loading}
          style={bigBtn('linear-gradient(135deg,#2980b9,#1a5f8a)', 'rgba(41,128,185,0.4)', loading)}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 26px rgba(41,128,185,0.55)' } }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(41,128,185,0.4)' }}
        >
          🎮 Join Game
        </button>
      </div>
    </div>
  )

  // ────────────────────────────────────────────────────────────────────────────
  // WAITING ROOM
  // ────────────────────────────────────────────────────────────────────────────
  if (screen === 'waiting') {
    const joinUrl = buildJoinUrl(roomCode)
    return (
      <div style={pageBg}>
        <style>{spinKeyframes}</style>
        <Toast msg={toast} />
        <div style={{ ...cardBox, textAlign: 'center', maxWidth: 520 }}>
          <div style={{ color: '#e94560', fontSize: 30, marginBottom: 4 }}>Waiting Room</div>
          <div style={{ color: 'rgba(255,255,255,0.28)', fontFamily: "'Nunito',sans-serif", fontSize: 13, marginBottom: 24 }}>
            Share this link with friends — they can join from any device!
          </div>

          {/* Room code + copy buttons */}
          <div style={{
            background: 'rgba(233,69,96,0.1)', border: '2px dashed rgba(233,69,96,0.45)',
            borderRadius: 16, padding: '18px 24px', marginBottom: 14,
          }}>
            <div style={{ color: 'rgba(255,255,255,0.32)', fontSize: 11, fontFamily: "'Nunito',sans-serif", letterSpacing: 2, marginBottom: 6 }}>
              ROOM CODE
            </div>
            <div style={{ color: '#e94560', fontSize: 52, letterSpacing: 10, marginBottom: 14 }}>
              {roomCode}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <CopyBtn text={roomCode} label="📋 Copy Code" />
              <CopyBtn text={joinUrl} label="🔗 Copy Join Link" />
            </div>
          </div>

          {/* Link box */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🔗</span>
            <span style={{
              flex: 1, fontFamily: "'Nunito',sans-serif", fontSize: 12,
              color: 'rgba(255,255,255,0.35)', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left',
            }}>{joinUrl}</span>
          </div>

          {/* Players */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: 'rgba(255,255,255,0.32)', fontSize: 11, letterSpacing: 1, fontFamily: "'Nunito',sans-serif", marginBottom: 10 }}>
              PLAYERS ({lobbyPlayers.length}/4)
            </div>
            {lobbyPlayers.map((p, i) => (
              <div key={p} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', marginBottom: 7, borderRadius: 10,
                background: p === myName ? 'rgba(233,69,96,0.12)' : 'rgba(255,255,255,0.05)',
                border: p === myName ? '1px solid rgba(233,69,96,0.3)' : '1px solid rgba(255,255,255,0.06)',
                color: '#fff', fontSize: 17,
              }}>
                <span>{['🟥', '🟨', '🟩', '🟦'][i]}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{p}{p === myName ? ' (you)' : ''}</span>
                {lobby?.host === p && <span style={{ fontSize: 12, opacity: 0.5 }}>👑 host</span>}
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: 4 - lobbyPlayers.length }).map((_, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', marginBottom: 7, borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.2)', fontSize: 14, fontFamily: "'Nunito',sans-serif",
              }}>
                <span style={{ opacity: 0.3 }}>⬜</span>
                <span>Waiting for player…</span>
              </div>
            ))}
          </div>

          {/* Start / waiting */}
          {isHost ? (
            <div>
              {!canStart && (
                <div style={{
                  marginBottom: 10, padding: '8px 14px',
                  background: 'rgba(255,255,255,0.04)', borderRadius: 8,
                  color: 'rgba(255,255,255,0.35)', fontFamily: "'Nunito',sans-serif", fontSize: 13,
                }}>
                  ⚠️ Need at least 2 players — share the link above!
                </div>
              )}
              <button onClick={canStart ? handleStart : undefined} disabled={!canStart || loading}
                style={bigBtn('linear-gradient(135deg,#27ae60,#1e8449)', 'rgba(39,174,96,0.4)', !canStart || loading)}
                onMouseEnter={e => { if (canStart && !loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 26px rgba(39,174,96,0.55)' } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = canStart ? '0 4px 18px rgba(39,174,96,0.4)' : 'none' }}
              >
                {loading ? '⏳ Starting…' : canStart ? `▶ Start Game (${lobbyPlayers.length} players)` : '▶ Start Game'}
              </button>
            </div>
          ) : (
            <div style={{
              padding: '14px', background: 'rgba(255,255,255,0.04)',
              borderRadius: 12, color: 'rgba(255,255,255,0.38)',
              fontFamily: "'Nunito',sans-serif", fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            }}>
              <Spinner />
              <span>Waiting for host to start…</span>
            </div>
          )}

          <div onClick={goHome} style={{
            marginTop: 18, color: 'rgba(255,255,255,0.2)', fontSize: 13,
            fontFamily: "'Nunito',sans-serif", cursor: 'pointer', textDecoration: 'underline',
          }}>← Leave Room</div>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────────
  // WINNER
  // ────────────────────────────────────────────────────────────────────────────
  if (screen === 'winner') return (
    <div style={{
      ...pageBg, flexDirection: 'column',
      backgroundImage: 'radial-gradient(ellipse at center,rgba(241,196,15,0.18) 0%,transparent 65%)',
    }}>
      <style>{spinKeyframes}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 96, marginBottom: 10 }}>🎉</div>
        <div style={{ fontSize: 56, color: '#f1c40f', marginBottom: 8 }}>
          {pub?.winner === myName ? 'You Win!!' : `${pub?.winner} Wins!`}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Nunito',sans-serif", fontSize: 17, marginBottom: 32 }}>
          {pub?.winner === myName ? 'Incredible! 🏆' : 'Better luck next time!'}
        </div>
        <button onClick={goHome}
          style={{ ...bigBtn('linear-gradient(135deg,#e94560,#c0392b)', 'rgba(233,69,96,0.5)'), width: 'auto', padding: '14px 48px', fontSize: 22 }}>
          Play Again
        </button>
      </div>
    </div>
  )

  // ────────────────────────────────────────────────────────────────────────────
  // GAME
  // ────────────────────────────────────────────────────────────────────────────
  if (screen === 'game' && pub) {
    const players = pub.players || []
    const curColor = pub.currentColor
    const curPlayerName = players[pub.currentPlayerIdx]

    return (
      <div style={{
        minHeight: '100vh', background: '#0d0d1a',
        backgroundImage: `radial-gradient(ellipse at center,${COLOR_HEX[curColor] || '#333'}22 0%,transparent 55%)`,
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Fredoka One',cursive", overflow: 'hidden',
        transition: 'background-image 0.5s',
      }}>
        <style>{spinKeyframes}</style>
        <Toast msg={toast} />
        {colorPicking && <ColorPicker onPick={handleColorPick} />}

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.45)', gap: 8, flexWrap: 'wrap',
        }}>
          <div style={{ color: '#e94560', fontSize: 24, letterSpacing: 1 }}>UNO</div>

          <div style={{
            padding: '4px 14px', borderRadius: 18,
            background: isMyTurn ? 'rgba(241,196,15,0.2)' : 'rgba(255,255,255,0.05)',
            border: isMyTurn ? '1.5px solid #f1c40f' : '1.5px solid transparent',
            color: isMyTurn ? '#f1c40f' : 'rgba(255,255,255,0.4)',
            fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 700,
          }}>
            {isMyTurn ? '✨ Your Turn!' : `${curPlayerName}'s turn`}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              background: 'rgba(255,255,255,0.06)', borderRadius: 7, padding: '3px 10px',
              color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: "'Nunito',sans-serif",
            }}>
              Room: <span style={{ color: '#fff', fontWeight: 800 }}>{roomCode}</span>
            </div>
            <button onClick={goHome} style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8, color: 'rgba(255,255,255,0.4)',
              fontFamily: "'Nunito',sans-serif", fontSize: 12, cursor: 'pointer', padding: '4px 10px',
            }}>Leave</button>
          </div>
        </div>

        {/* ── Players strip ── */}
        <div style={{ display: 'flex', gap: 7, padding: '8px 14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {players.map((p, i) => {
            const cur = pub.currentPlayerIdx === i
            const cnt = pub.handSizes?.[p] ?? '?'
            return (
              <div key={p} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 18, transition: 'all 0.3s',
                background: cur ? 'rgba(241,196,15,0.16)' : 'rgba(255,255,255,0.05)',
                border: cur ? '2px solid #f1c40f' : '2px solid transparent',
                color: cur ? '#f1c40f' : 'rgba(255,255,255,0.55)',
                fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 700,
              }}>
                {p === myName && <span>🎯</span>}
                <span>{p}</span>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: cur ? '#f1c40f' : 'rgba(255,255,255,0.18)',
                  color: cur ? '#000' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                }}>{cnt}</span>
                {cnt === 1 && <span style={{ color: '#e74c3c', fontSize: 11 }}>UNO!</span>}
              </div>
            )
          })}
        </div>

        {/* ── Table ── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16, padding: '8px 16px',
        }}>

          {/* Last action log */}
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: '7px 20px',
            color: 'rgba(255,255,255,0.55)', fontFamily: "'Nunito',sans-serif", fontSize: 14,
            textAlign: 'center', maxWidth: 440,
          }}>
            {pub.log?.[0] || 'Game in progress…'}
          </div>

          {/* Discard + Draw piles */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {/* Color glow bar */}
            <div style={{
              width: 13, height: 92, borderRadius: 7,
              background: COLOR_HEX[curColor] || '#555',
              boxShadow: `0 0 28px ${COLOR_HEX[curColor] || '#555'}bb`,
              transition: 'background 0.4s, box-shadow 0.4s',
            }} />

            {/* Discard pile */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontFamily: "'Nunito',sans-serif", letterSpacing: 1 }}>DISCARD</div>
              {topCard && <UnoCard card={topCard} playable={false} />}
            </div>

            {/* Draw pile */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontFamily: "'Nunito',sans-serif", letterSpacing: 1 }}>DRAW</div>
              <UnoCard faceDown playable={isMyTurn} onClick={isMyTurn ? handleDraw : undefined} />
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: "'Nunito',sans-serif" }}>
                {pub.drawPile?.length ?? 0} left
              </div>
            </div>

            <div style={{
              width: 13, height: 92, borderRadius: 7,
              background: COLOR_HEX[curColor] || '#555',
              boxShadow: `0 0 28px ${COLOR_HEX[curColor] || '#555'}bb`,
              transition: 'background 0.4s, box-shadow 0.4s',
            }} />
          </div>

          {/* Direction */}
          <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, fontFamily: "'Nunito',sans-serif" }}>
            {pub.direction === 1 ? '➡ Clockwise' : '⬅ Counter-clockwise'}
          </div>
        </div>

        {/* ── My hand ── */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.5)', padding: '12px 14px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: "'Nunito',sans-serif", letterSpacing: 1 }}>
              YOUR HAND · {myHand.length} cards
            </span>
            {isMyTurn ? (
              <span style={{
                background: 'rgba(241,196,15,0.15)', border: '1px solid #f1c40f',
                borderRadius: 8, padding: '2px 10px',
                color: '#f1c40f', fontSize: 11, fontFamily: "'Nunito',sans-serif", fontWeight: 800,
              }}>Tap a card · or tap Draw pile</span>
            ) : (
              <span style={{
                background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '2px 10px',
                color: 'rgba(255,255,255,0.28)', fontSize: 11, fontFamily: "'Nunito',sans-serif",
              }}>Waiting for {curPlayerName}…</span>
            )}
          </div>

          <div style={{
            display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4,
            justifyContent: myHand.length <= 7 ? 'center' : 'flex-start',
            minHeight: 110,
          }}>
            {myHand.map(c => (
              <UnoCard key={c.id} card={c}
                playable={isMyTurn && !!topCard && canPlay(c, topCard, pub.currentColor)}
                onClick={() => handleCardClick(c)}
              />
            ))}
            {myHand.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.28)', fontFamily: "'Nunito',sans-serif", padding: '24px 0', alignSelf: 'center' }}>
                No cards!
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Loading / connecting
  return (
    <div style={{ ...pageBg, flexDirection: 'column', gap: 20 }}>
      <style>{spinKeyframes}</style>
      <Spinner />
      <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Nunito',sans-serif" }}>Connecting…</div>
    </div>
  )
}
