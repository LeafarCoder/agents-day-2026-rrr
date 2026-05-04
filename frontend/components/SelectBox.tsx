'use client'
import { useState } from 'react'

type Props = {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
  onClick?: (e: React.MouseEvent) => void
  size?: number
}

export default function SelectBox({ checked, indeterminate = false, onChange, onClick, size = 15 }: Props) {
  const [hovered, setHovered] = useState(false)
  const filled = checked || indeterminate

  return (
    <label
      style={{ display: 'inline-flex', cursor: 'pointer', flexShrink: 0, userSelect: 'none', verticalAlign: 'middle' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <input
        type="checkbox"
        checked={checked}
        aria-checked={indeterminate ? 'mixed' : checked}
        onChange={onChange}
        onClick={onClick}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
      />
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size,
        borderRadius: Math.round(size * 0.27),
        border: filled ? 'none' : `1.5px solid ${hovered ? 'rgba(0,212,170,0.55)' : 'rgba(255,255,255,0.16)'}`,
        background: filled
          ? indeterminate ? 'rgba(0,212,170,0.5)' : 'var(--text-accent)'
          : hovered ? 'rgba(0,212,170,0.06)' : 'transparent',
        transition: 'background 140ms ease, border-color 140ms ease',
        flexShrink: 0,
      }}>
        {checked && !indeterminate && (
          <svg width={size * 0.6} height={size * 0.47} viewBox="0 0 9 7" fill="none" aria-hidden="true">
            <path d="M1 3.5L3.5 6L8 1" stroke="#040b18" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {indeterminate && (
          <svg width={size * 0.53} height="2" viewBox="0 0 8 2" fill="none" aria-hidden="true">
            <path d="M1 1h6" stroke="#040b18" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        )}
      </span>
    </label>
  )
}
