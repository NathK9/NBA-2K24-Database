import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { players } from './players.js'

const cols = [
  ['name', 'Player'], ['team', 'Team'], ['pos', 'Pos'],
  ['ovr', 'OVR'], ['three', '3PT'], ['dunk', 'Dunk'], ['def', 'Defense'],
]
const cell = { padding: '10px 12px', borderBottom: '1px solid #262a33', textAlign: 'left' }

function App() {
  const [q, setQ] = useState('')
  const [pos, setPos] = useState('All')
  const [sort, setSort] = useState(['ovr', -1])

  const rows = useMemo(() => {
    const [k, d] = sort
    return players
      .filter(p => (pos === 'All' || p.pos === pos) &&
        (p.name + p.team).toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * d)
  }, [q, pos, sort])

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ margin: 0, color: '#f5a524' }}>NBA 2K24 Player Database</h1>
      <div style={{ display: 'flex', gap: 12 }}>
        <input placeholder="Search player or team" value={q} onChange={e => setQ(e.target.value)}
          style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #333', background: '#1a1d24', color: 'inherit' }} />
        <select value={pos} onChange={e => setPos(e.target.value)}
          style={{ padding: 10, borderRadius: 6, background: '#1a1d24', color: 'inherit', border: '1px solid #333' }}>
          {['All', 'PG', 'SG', 'SF', 'PF', 'C'].map(p => <option key={p}>{p}</option>)}
        </select>
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', background: '#161920', borderRadius: 8 }}>
        <thead>
          <tr>{cols.map(([k, l]) => (
            <th key={k} style={{ ...cell, cursor: 'pointer', color: '#9aa0aa' }}
              onClick={() => setSort([k, sort[0] === k ? -sort[1] : -1])}>
              {l}{sort[0] === k ? (sort[1] < 0 ? ' ▼' : ' ▲') : ''}
            </th>))}</tr>
        </thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.name}>{cols.map(([k]) => (
              <td key={k} style={{ ...cell, fontWeight: k === 'ovr' ? 700 : 400 }}>{p[k]}</td>))}</tr>
          ))}
        </tbody>
      </table>
      <p style={{ color: '#9aa0aa', margin: 0 }}>{rows.length} players</p>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
