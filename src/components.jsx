import { useState } from 'react'
import { COLORS, COLOR_HEX } from './gameLogic'

export function ColorPicker({ onPick }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0f0f1e', border: '2px solid #e94560',
        borderRadius: 22, padding: '32px 44px', textAlign: 'center',
      }}>
        <div style={{ fontFamily: "'Fredoka One',cursive", color: '#fff', fontSize: 28, marginBottom: 26 }}>
          Choose a Color
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => onPick(c)} style={{
              width: 66, height: 66, borderRadius: '50%',
              background: COLOR_HEX[c], cursor: 'pointer',
              border: '3px solid rgba(255,255,255,0.25)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.25)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function Toast({ msg }) {
  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(20,20,40,0.97)', color: '#fff',
      fontFamily: "'Fredoka One',cursive", fontSize: 15,
      padding: '10px 24px', borderRadius: 12, zIndex: 700,
      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      border: '1px solid rgba(255,255,255,0.12)',
      pointerEvents: 'none', whiteSpace: 'nowrap',
    }}>
      {msg}
    </div>
  )
}

export function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false)
  function doCopy() {
    try { navigator.clipboard.writeText(text) } catch {
      const ta = document.createElement('textarea')
      ta.value = text; document.body.appendChild(ta)
      ta.select(); document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={doCopy} style={{
      padding: '8px 18px', borderRadius: 9,
      background: copied ? 'rgba(39,174,96,0.25)' : 'rgba(255,255,255,0.09)',
      border: copied ? '1px solid #27ae60' : '1px solid rgba(255,255,255,0.18)',
      color: copied ? '#27ae60' : 'rgba(255,255,255,0.75)',
      fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 700,
      cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
    }}>
      {copied ? '✓ Copied!' : label}
    </button>
  )
}

export function Spinner() {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      border: '3px solid rgba(255,255,255,0.1)',
      borderTopColor: '#e94560',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}

export const spinKeyframes = `@keyframes spin { to { transform: rotate(360deg); } }`
