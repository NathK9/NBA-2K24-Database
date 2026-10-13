import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { players, ATTRS, fmtHeight } from './players.js'

const C = { bg: '#0b0d12', panel: '#141821', border: '#232836', text: '#e8eaf0', mute: '#8b93a7', accent: '#f5a524' }
const PER_PAGE = 24
const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C']
const ROSTERS = ['Current NBA (September 2023)', 'Offseason NBA (September 2023)', 'WNBA (September 2023)']
const SORTS = [['roster', 'Roster order'], ['ovr-d', 'OVR ↓'], ['ovr-a', 'OVR ↑'], ['name', 'Name'], ['h-d', 'Height ↓'], ['h-a', 'Height ↑'], ...ATTRS.map(a => ['attr:' + a, a])]

const tier = o => o >= 90 ? '#c084fc' : o >= 85 ? '#38bdf8' : o >= 80 ? '#f5a524' : o >= 75 ? '#94a3b8' : '#a16207'
const initials = n => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const css = `
  * { box-sizing: border-box }
  a { color: inherit; text-decoration: none }
  .card { transition: border-color .15s, background .15s }
  .card:hover { border-color: ${C.accent} !important; background: #1a1f2b !important }
  .chip:hover, .pg:hover { border-color: ${C.accent} !important }
  .row:hover td { background: #1a1f2b }
  .layout { display: grid; grid-template-columns: 260px 1fr; gap: 24px }
  @media (max-width: 860px) { .layout { grid-template-columns: 1fr } }
  input, select, button { font: inherit; color: inherit }
`
const field = { width: '100%', padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text }
const label = { fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', color: C.mute, fontWeight: 600 }

function useHash() {
  const [h, setH] = useState(location.hash)
  useEffect(() => { const f = () => { setH(location.hash); scrollTo(0, 0) }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  return h
}

function Header() {
  return (
    <header style={{ background: '#07090d', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 18 }}>
          <span style={{ width: 28, height: 28, borderRadius: 6, background: C.accent, color: '#111', display: 'grid', placeItems: 'center' }}>2K</span>
          Hoops<span style={{ color: C.accent }}>DB</span>
        </a>
        <nav style={{ display: 'flex', gap: 4 }}>
          {['MyTEAM', 'MyNBA'].map(t => (
            <a key={t} href="#" style={{ padding: '6px 12px', borderRadius: 6, fontWeight: 600, fontSize: 14, background: t === 'MyNBA' ? C.panel : 'transparent', color: t === 'MyNBA' ? C.text : C.mute }}>{t}</a>
          ))}
        </nav>
        <nav style={{ display: 'flex', gap: 16, fontSize: 14, color: C.mute, marginLeft: 8 }}>
          {['Home', 'Players', 'Teams', 'Rosters', 'Compare', 'Lineup Builder', 'Tier List'].map(t => (
            <a key={t} href="#" style={{ color: t === 'Players' ? C.text : C.mute }}>{t}</a>
          ))}
        </nav>
        <button style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer' }}>Sign in</button>
      </div>
    </header>
  )
}

function Footer() {
  const cols = { MyNBA: ['Home', 'Players', 'Teams', 'Rosters'], Tools: ['Compare', 'Lineup Builder', 'Tier List'], Site: ['About', 'Contact', 'Site Updates', 'Privacy Policy', 'Terms of Service'] }
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, marginTop: 48, background: '#07090d' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 24 }}>
        {Object.entries(cols).map(([h, ls]) => (
          <div key={h} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>{h}</h3>
            {ls.map(l => <a key={l} href="#" style={{ color: C.mute, fontSize: 14 }}>{l}</a>)}
          </div>
        ))}
      </div>
      <p style={{ textAlign: 'center', color: C.mute, fontSize: 12, padding: '0 0 24px', margin: 0 }}>HoopsDB — NBA 2K24 MyNBA player ratings</p>
    </footer>
  )
}

function Avatar({ p, size, fill }) {
  return (
    <div style={{ width: fill ? '100%' : size, height: size, borderRadius: 8, background: `linear-gradient(160deg, #222838, #151922)`, display: 'grid', placeItems: 'center', fontSize: size / 3, fontWeight: 800, color: '#5b6478' }}>
      {initials(p.name)}
    </div>
  )
}

function Ovr({ v, big }) {
  return <span style={{ background: tier(v), color: '#0b0d12', fontWeight: 800, borderRadius: 6, padding: big ? '6px 12px' : '2px 8px', fontSize: big ? 28 : 15 }}>{v}</span>
}

function Filters({ f, set, teams, reset }) {
  return (
    <aside style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 18, alignSelf: 'start' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Filters</h2>
        <button onClick={reset} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 13 }}>Reset</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={label}>Roster</span>
        {ROSTERS.map((r, i) => (
          <label key={r} style={{ display: 'flex', gap: 8, fontSize: 14, color: i ? C.mute : C.text }}>
            <input type="radio" checked={i === 0} disabled={i > 0} readOnly /> {r} <span style={{ color: C.mute }}>({i ? 0 : players.length})</span>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={label}>Team</span>
        <select value={f.team} onChange={e => set({ team: e.target.value })} style={field}>
          <option value="">All teams</option>
          {teams.map(([t, n]) => <option key={t} value={t}>{t} ({n})</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={label}>Position</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {POSITIONS.map(p => {
            const on = f.pos.includes(p)
            return <button key={p} className="chip" onClick={() => set({ pos: on ? f.pos.filter(x => x !== p) : [...f.pos, p] })}
              style={{ flex: 1, padding: '6px 0', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.accent : C.bg, color: on ? '#111' : C.text }}>{p}</button>
          })}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={label}>Search</span>
        <input placeholder="Player name" value={f.q} onChange={e => set({ q: e.target.value })} style={field} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={label}>Overall</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="number" placeholder="Min" value={f.min} onChange={e => set({ min: e.target.value })} style={field} />–
          <input type="number" placeholder="Max" value={f.max} onChange={e => set({ max: e.target.value })} style={field} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={label}>Min height</span>
        <select value={f.h} onChange={e => set({ h: e.target.value })} style={field}>
          <option value="">Any</option>
          {Array.from({ length: 16 }, (_, i) => 70 + i).map(h => <option key={h} value={h}>{fmtHeight(h)}+</option>)}
        </select>
      </div>
    </aside>
  )
}

function Card({ p }) {
  return (
    <a href={`#/players/${p.slug}`} className="card" style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ position: 'relative' }}>
        <Avatar p={p} size={150} fill />
        <span style={{ position: 'absolute', top: 8, left: 8 }}><Ovr v={p.ovr} /></span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <strong style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</strong>
        <span style={{ fontSize: 13, color: C.mute }}>{p.pos} · {p.team}</span>
        <span style={{ fontSize: 13, color: C.mute }}>{fmtHeight(p.height)}</span>
      </div>
    </a>
  )
}

function Table({ rows }) {
  const td = { padding: '10px 12px', borderBottom: `1px solid ${C.border}`, textAlign: 'left', fontSize: 14 }
  const cols = ['Shot 3PT', 'Driving Dunk', 'Ball Handle', 'Perimeter Defense', 'Block']
  return (
    <div style={{ overflowX: 'auto', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{['OVR', 'Player', 'Pos', 'Team', 'Height', ...cols].map(h => <th key={h} style={{ ...td, color: C.mute, fontSize: 12, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map(p => (
          <tr key={p.id} className="row" style={{ cursor: 'pointer' }} onClick={() => location.hash = `#/players/${p.slug}`}>
            <td style={td}><Ovr v={p.ovr} /></td><td style={{ ...td, fontWeight: 600 }}>{p.name}</td><td style={td}>{p.pos}</td>
            <td style={{ ...td, color: C.mute }}>{p.team}</td><td style={td}>{fmtHeight(p.height)}</td>
            {cols.map(c => <td key={c} style={td}>{p.attrs[c]}</td>)}
          </tr>))}</tbody>
      </table>
    </div>
  )
}

function Pager({ page, pages, go }) {
  const [to, setTo] = useState('')
  const btn = (on, dis) => ({ minWidth: 36, padding: '6px 10px', borderRadius: 6, cursor: dis ? 'default' : 'pointer', opacity: dis ? .4 : 1, border: `1px solid ${on ? C.accent : C.border}`, background: on ? C.accent : C.panel, color: on ? '#111' : C.text, fontWeight: 600 })
  const nums = [...new Set([1, page - 1, page, page + 1, pages])].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b)
  return (
    <nav style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
      <button className="pg" style={btn(false, page === 1)} disabled={page === 1} onClick={() => go(page - 1)}>Previous</button>
      {nums.map((n, i) => <React.Fragment key={n}>{i && n - nums[i - 1] > 1 ? <span style={{ color: C.mute }}>…</span> : null}
        <button className="pg" style={btn(n === page)} onClick={() => go(n)}>{n}</button></React.Fragment>)}
      <button className="pg" style={btn(false, page === pages)} disabled={page === pages} onClick={() => go(page + 1)}>Next</button>
      <span style={{ marginLeft: 12, color: C.mute, fontSize: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
        Go to <input value={to} onChange={e => setTo(e.target.value)} style={{ ...field, width: 56 }} /> of {pages}
        <button className="pg" style={btn(false)} onClick={() => { const n = +to; if (n >= 1 && n <= pages) go(n) }}>Go</button>
      </span>
    </nav>
  )
}

const empty = { team: '', pos: [], q: '', min: '', max: '', h: '' }

function Browse() {
  const [f, setF] = useState(empty)
  const [sort, setSort] = useState('roster')
  const [view, setView] = useState('grid')
  const [page, setPage] = useState(1)
  const set = o => { setF({ ...f, ...o }); setPage(1) }

  const teams = useMemo(() => Object.entries(players.reduce((m, p) => (m[p.team] = (m[p.team] || 0) + 1, m), {})).sort(), [])
  const rows = useMemo(() => {
    let r = players.filter(p =>
      (!f.team || p.team === f.team) &&
      (!f.pos.length || f.pos.some(x => p.pos.split('/').includes(x))) &&
      p.name.toLowerCase().includes(f.q.toLowerCase()) &&
      (!f.min || p.ovr >= +f.min) && (!f.max || p.ovr <= +f.max) && (!f.h || p.height >= +f.h))
    const by = {
      'ovr-d': (a, b) => b.ovr - a.ovr, 'ovr-a': (a, b) => a.ovr - b.ovr, name: (a, b) => a.name.localeCompare(b.name),
      'h-d': (a, b) => b.height - a.height, 'h-a': (a, b) => a.height - b.height,
    }[sort] || (sort.startsWith('attr:') ? (a, b) => b.attrs[sort.slice(5)] - a.attrs[sort.slice(5)] : null)
    return by ? [...r].sort(by) : r
  }, [f, sort])
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const shown = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const active = JSON.stringify(f) !== JSON.stringify(empty)

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        <div style={{ fontSize: 14, color: C.mute }}>MyNBA / Rosters / <span style={{ color: C.text }}>Current NBA (September 2023)</span></div>
        <h1 style={{ margin: 0, fontSize: 32 }}>Current NBA (September 2023)</h1>
        <div style={{ color: C.mute, fontSize: 14 }}>NBA · {players.length} players · {teams.length} teams · captured Sep 8, 2023</div>
      </div>
      <div className="layout">
        <Filters f={f} set={set} teams={teams} reset={() => set(empty)} />
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14 }}><strong>{rows.length.toLocaleString()}</strong> players
              {!active && <span style={{ color: C.mute }}> · No filters applied — pick a team or position to narrow it down.</span>}</div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: C.mute }}>Sort</span>
              <select value={sort} onChange={e => { setSort(e.target.value); setPage(1) }} style={{ ...field, width: 180 }}>
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <div style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
                {['grid', 'table'].map(v => <button key={v} onClick={() => setView(v)} style={{ padding: '8px 14px', border: 'none', cursor: 'pointer', textTransform: 'capitalize', background: view === v ? C.accent : C.panel, color: view === v ? '#111' : C.text, fontWeight: 600 }}>{v}</button>)}
              </div>
            </div>
          </div>
          {shown.length === 0 ? <p style={{ color: C.mute, textAlign: 'center', padding: 48 }}>No players match these filters.</p>
            : view === 'grid'
              ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(174px,1fr))', gap: 12 }}>{shown.map(p => <Card key={p.id} p={p} />)}</div>
              : <Table rows={shown} />}
          <Pager page={page} pages={pages} go={n => { setPage(n); scrollTo(0, 0) }} />
        </section>
      </div>
    </>
  )
}

function Detail({ slug }) {
  const p = players.find(x => x.slug === slug)
  if (!p) return <p>Player not found. <a href="#" style={{ color: C.accent }}>Back to players</a></p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ fontSize: 14, color: C.mute }}><a href="#">MyNBA / Players</a> / <span style={{ color: C.text }}>{p.name}</span></div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <Avatar p={p} size={140} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 36 }}>{p.name}</h1>
          <div style={{ color: C.mute }}>{p.pos} · {p.team} · {fmtHeight(p.height)}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}><Ovr v={p.ovr} big /></div>
      </div>
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Attributes</h2>
        <p style={{ margin: '0 0 16px', color: C.mute, fontSize: 13 }}>Placeholder values — replace in src/players.js with real ratings.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '12px 24px' }}>
          {ATTRS.map(a => (
            <div key={a} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>{a}</span><strong>{p.attrs[a]}</strong></div>
              <div style={{ height: 6, background: C.bg, borderRadius: 3 }}><div style={{ width: `${p.attrs[a]}%`, height: '100%', borderRadius: 3, background: tier(p.attrs[a]) }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function App() {
  const h = useHash()
  const m = h.match(/^#\/players\/(.+)$/)
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{css}</style>
      <Header />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px' }}>{m ? <Detail slug={m[1]} /> : <Browse />}</main>
      <Footer />
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
