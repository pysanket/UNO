import { useState } from 'react'
import { COLOR_HEX } from './gameLogic'

export default function UnoCard({ card, playable, faceDown, onClick, size = 'normal' }) {
  const [hov, setHov] = useState(false)
  const w = size === 'small' ? 52 : size === 'large' ? 80 : 66
  const h = size === 'small' ? 78 : size === 'large' ? 120 : 99
  const clickable = !!onClick && (playable || faceDown)

  const bg = faceDown
    ? 'linear-gradient(145deg,#1a1a2e,#0d0d18)'
    : card?.color === 'wild'
    ? 'conic-gradient(#e74c3c 0 90deg,#e6b800 90deg 180deg,#27ae60 180deg 270deg,#2980b9 270deg 360deg)'
    : COLOR_HEX[card?.color] || '#444'

  const valueLen = card?.value?.length || 0
  const fs = faceDown
    ? (size === 'small' ? 11 : 14)
    : valueLen > 4 ? (size === 'small' ? 8 : 10)
    : valueLen > 2 ? (size === 'small' ? 9 : 12)
    : (size === 'small' ? 16 : size === 'large' ? 28 : 22)

  return (
    <div
      onClick={clickable ? onClick : undefined}
      onMouseEnter={() => clickable && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: w, height: h, borderRadius: 10, flexShrink: 0,
        userSelect: 'none', position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg,
        border: faceDown
          ? '2.5px solid #e94560'
          : hov && playable ? '3px solid #fff' : '2.5px solid rgba(255,255,255,0.65)',
        cursor: clickable ? 'pointer' : 'default',
        opacity: playable === false && !faceDown ? 0.35 : 1,
        transform: hov && clickable ? 'translateY(-12px) scale(1.08)' : 'none',
        transition: 'transform 0.18s cubic-bezier(.34,1.56,.64,1), box-shadow 0.18s, opacity 0.15s',
        boxShadow: hov && clickable ? '0 18px 36px rgba(0,0,0,0.7)' : '0 3px 12px rgba(0,0,0,0.45)',
      }}
    >
      <div style={{
        position: 'absolute', width: '75%', height: '130%',
        background: 'rgba(255,255,255,0.14)', borderRadius: '50%', transform: 'rotate(-30deg)',
      }} />
      <span style={{
        fontFamily: "'Fredoka One',cursive", fontSize: fs,
        color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.9)',
        position: 'relative', zIndex: 1, textAlign: 'center',
        lineHeight: 1.1, padding: '0 2px',
      }}>
        {faceDown ? 'UNO' : card?.value}
      </span>
    </div>
  )
}
