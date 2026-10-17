import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  STAT_DEFS,
  availableStats,
  emptyGuesses,
  formatSeasonDisplay,
  formatStat,
  loadSeasons,
  parseImportCsv,
  scoreRound,
  shuffle,
} from './data.js'

const C = {
  bg: '#070b14',
  bg2: '#0c1220',
  panel: '#121a2b',
  panel2: '#182238',
  border: '#243049',
  borderHot: '#3d5a8a',
  text: '#eef2ff',
  mute: '#8b9bb8',
  accent: '#f97316',
  accent2: '#fb923c',
  good: '#34d399',
  goodBg: 'rgba(52,211,153,.12)',
  warn: '#fbbf24',
  bad: '#f87171',
  badBg: 'rgba(248,113,113,.12)',
  blue: '#60a5fa',
  court: '#1a2740',
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box }
  html, body, #root { min-height: 100% }
  body { margin: 0; background: ${C.bg}; color: ${C.text}; font-family: 'IBM Plex Sans', system-ui, sans-serif }
  button, input { font: inherit; color: inherit }
  button { cursor: pointer }
  button:disabled { cursor: not-allowed; opacity: .45 }
  a { color: ${C.blue} }
  .stat-input:focus { outline: none; border-color: ${C.accent} !important; box-shadow: 0 0 0 3px rgba(249,115,22,.25) }
  .stat-input::-webkit-outer-spin-button, .stat-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0 }
  .stat-input { -moz-appearance: textfield }
  .btn-primary:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px) }
  .btn-ghost:hover:not(:disabled) { border-color: ${C.accent}; color: ${C.text} }
  .card-lift { transition: border-color .15s, transform .15s }
  .card-lift:hover { border-color: ${C.borderHot} }
  .pulse { animation: pulse 1.6s ease-in-out infinite }
  @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .55 } }
  .fade-in { animation: fadeIn .35s ease }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
  .court-bg {
    background:
      radial-gradient(ellipse 80% 50% at 50% -10%, rgba(249,115,22,.18), transparent 55%),
      radial-gradient(ellipse 60% 40% at 100% 100%, rgba(96,165,250,.08), transparent 50%),
      linear-gradient(180deg, ${C.bg2} 0%, ${C.bg} 40%, #05080f 100%);
  }
  .grid-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  @media (min-width: 720px) {
    .grid-stats { grid-template-columns: repeat(4, 1fr); gap: 14px }
  }
  @media (max-width: 560px) {
    .hero-title { font-size: 28px !important }
    .player-name { font-size: 28px !important }
  }
`

function Badge({ children, color = C.accent, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
      letterSpacing: '.04em', textTransform: 'uppercase',
      color, background: bg || `${color}22`, border: `1px solid ${color}55`,
    }}>{children}</span>
  )
}

function Btn({ children, onClick, variant = 'primary', disabled, style, type = 'button' }) {
  const base = {
    primary: {
      background: `linear-gradient(180deg, ${C.accent2}, ${C.accent})`,
      color: '#111', border: 'none', fontWeight: 700,
      boxShadow: '0 8px 24px rgba(249,115,22,.25)',
    },
    ghost: {
      background: 'transparent', color: C.mute,
      border: `1px solid ${C.border}`, fontWeight: 600,
    },
    dark: {
      background: C.panel2, color: C.text,
      border: `1px solid ${C.border}`, fontWeight: 600,
    },
  }[variant]
  const cls = variant === 'primary' ? 'btn-primary' : 'btn-ghost'
  return (
    <button type={type} className={cls} disabled={disabled} onClick={onClick} style={{
      padding: '12px 20px', borderRadius: 10, transition: 'all .15s',
      ...base, ...style,
    }}>{children}</button>
  )
}

function Header({ onHome, mode }) {
  return (
    <header style={{
      borderBottom: `1px solid ${C.border}`,
      background: 'rgba(7,11,20,.85)',
      backdropFilter: 'blur(10px)',
      position: 'sticky', top: 0, zIndex: 20,
    }}>
      <div style={{
        maxWidth: 960, margin: '0 auto', padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <button onClick={onHome} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        }}>
          <span style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(145deg, ${C.accent2}, #c2410c)`,
            display: 'grid', placeItems: 'center',
            fontWeight: 900, color: '#111', fontSize: 14,
            boxShadow: '0 4px 14px rgba(249,115,22,.35)',
          }}>GTN</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, letterSpacing: '.02em', lineHeight: 1.1 }}>
              GUESS THE NUMBERS
            </div>
            <div style={{ fontSize: 11, color: C.mute, fontWeight: 600, letterSpacing: '.08em' }}>NBA EDITION</div>
          </div>
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {mode && <Badge color={C.blue}>{mode}</Badge>}
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, marginTop: 'auto', padding: '28px 20px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', color: C.mute, fontSize: 13, lineHeight: 1.6 }}>
        <p style={{ margin: '0 0 8px' }}>
          Stats sourced from{' '}
          <a href="https://www.basketball-reference.com/" target="_blank" rel="noreferrer">
            Basketball Reference
          </a>
          . Regular-season per-game averages. Percentages shown as e.g. 46.7%. Missing stats are never treated as zero.
        </p>
        <p style={{ margin: 0, fontSize: 12 }}>
          Not affiliated with the NBA or Basketball Reference. For educational trivia use only.
        </p>
      </div>
    </footer>
  )
}

function Home({ count, onStart, onImport }) {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 28, padding: '32px 0 48px' }}>
      <section style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 20,
        padding: '36px 28px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(circle at 85% 20%, rgba(249,115,22,.15), transparent 45%)',
        }} />
        <Badge color={C.accent}>Basketball trivia</Badge>
        <h1 className="hero-title" style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: 42, margin: '16px 0 12px', lineHeight: 1.05,
          letterSpacing: '-.02em', maxWidth: 560,
        }}>
          Guess the player&apos;s stats
        </h1>
        <p style={{ margin: '0 0 24px', color: C.mute, fontSize: 17, maxWidth: 520, lineHeight: 1.55 }}>
          We reveal the <strong style={{ color: C.text }}>player</strong>, <strong style={{ color: C.text }}>season</strong>, and{' '}
          <strong style={{ color: C.text }}>team</strong>. You fill in the numbers. How well do you know NBA history?
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <Btn onClick={() => onStart('classic')}>Play classic · 5 rounds</Btn>
          <Btn variant="dark" onClick={() => onStart('endless')}>Endless mode</Btn>
          <Btn variant="ghost" onClick={onImport}>Import stats CSV</Btn>
        </div>
        <p style={{ margin: '18px 0 0', color: C.mute, fontSize: 13 }}>
          {count} verified player-seasons loaded from Basketball Reference
        </p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
        {[
          { t: 'Player always shown', d: 'Never guess who it is — only their numbers for that season.' },
          { t: 'Real BBR stats', d: 'Every answer links back to the Basketball Reference player page.' },
          { t: 'Eight categories', d: 'PPG, RPG, APG, SPG, BPG, FG%, 3P%, and FT%.' },
          { t: 'Partial credit', d: 'Close guesses still score. Exact matches earn full points.' },
        ].map(x => (
          <div key={x.t} className="card-lift" style={{
            background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>{x.t}</div>
            <div style={{ color: C.mute, fontSize: 13, lineHeight: 1.5 }}>{x.d}</div>
          </div>
        ))}
      </section>

      <section style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22,
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>Example prompt</h2>
        <div style={{
          background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 12,
          padding: 18, fontFamily: 'ui-monospace, monospace', fontSize: 14, lineHeight: 1.7,
        }}>
          <div style={{ color: C.accent, fontWeight: 700, letterSpacing: '.06em', fontSize: 12 }}>GUESS THE PLAYER&apos;S STATS</div>
          <div>Player: <span style={{ color: C.text, fontWeight: 600 }}>Kobe Bryant</span></div>
          <div>Season: <span style={{ color: C.text, fontWeight: 600 }}>2008–09</span></div>
          <div>Team: <span style={{ color: C.text, fontWeight: 600 }}>Los Angeles Lakers</span></div>
        </div>
      </section>
    </div>
  )
}

function ImportPanel({ onClose, onImported }) {
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const fileRef = useRef(null)

  const handleFile = async (file) => {
    setErr(''); setMsg('')
    try {
      const text = await file.text()
      const { records, skipped } = parseImportCsv(text)
      if (!records.length) throw new Error('No valid rows. Each row needs player, season, ppg/rpg/apg, and a basketball-reference.com source_url.')
      onImported(records)
      setMsg(`Imported ${records.length} season${records.length === 1 ? '' : 's'}${skipped.length ? ` · skipped ${skipped.length}` : ''}.`)
    } catch (e) {
      setErr(String(e.message || e))
    }
  }

  return (
    <div className="fade-in" style={{
      background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, margin: '28px 0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>Import Basketball Reference stats</h2>
          <p style={{ margin: 0, color: C.mute, fontSize: 14, lineHeight: 1.5, maxWidth: 560 }}>
            When live fetch isn&apos;t available, add seasons via CSV. Required columns:
            <code style={{ color: C.accent }}> player, season, team, ppg, rpg, apg, spg, bpg, fg%, 3p%, ft%, source_url</code>.
            Only rows with a Basketball Reference URL are accepted. Missing stats leave the cell blank (not 0).
          </p>
        </div>
        <Btn variant="ghost" onClick={onClose} style={{ padding: '8px 12px' }}>Close</Btn>
      </div>
      <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        <Btn onClick={() => fileRef.current?.click()}>Choose CSV file</Btn>
        <a href="/data/import-template.csv" download="guess-the-numbers-template.csv" style={{ fontSize: 14 }}>
          Download template
        </a>
      </div>
      {msg && <p style={{ color: C.good, margin: '14px 0 0', fontSize: 14 }}>{msg}</p>}
      {err && <p style={{ color: C.bad, margin: '14px 0 0', fontSize: 14 }}>{err}</p>}
    </div>
  )
}

function tierColor(tier) {
  return { exact: C.good, close: C.good, near: C.warn, far: C.accent, miss: C.bad, na: C.mute }[tier] || C.mute
}

function tierLabel(tier) {
  return { exact: 'Exact', close: 'Close', near: 'Near', far: 'Far', miss: 'Miss', na: 'N/A' }[tier] || ''
}

function GameRound({ record, round, total, score, streak, onSubmit, onNext, revealed }) {
  const [guesses, setGuesses] = useState(emptyGuesses)
  const [result, setResult] = useState(null)
  const stats = useMemo(() => availableStats(record), [record])

  useEffect(() => {
    setGuesses(emptyGuesses())
    setResult(null)
  }, [record.id])

  const set = (key, v) => setGuesses(g => ({ ...g, [key]: v }))

  const submit = (e) => {
    e?.preventDefault()
    if (result) return
    const r = scoreRound(guesses, record)
    setResult(r)
    onSubmit(r)
  }

  const filled = stats.filter(d => String(guesses[d.key]).trim() !== '').length

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '24px 0 40px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge color={C.blue}>Round {round}{total ? ` / ${total}` : ''}</Badge>
          <Badge color={C.accent}>Score {score}</Badge>
          {streak > 1 && <Badge color={C.good}>Streak ×{streak}</Badge>}
        </div>
        <div style={{ color: C.mute, fontSize: 13 }}>{filled}/{stats.length} filled</div>
      </div>

      <section style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 18, padding: '24px 22px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -20, top: -20, width: 140, height: 140, borderRadius: '50%',
          border: `3px solid ${C.border}`, opacity: .35,
        }} />
        <div style={{ color: C.accent, fontWeight: 800, letterSpacing: '.12em', fontSize: 12, marginBottom: 10 }}>
          GUESS THE PLAYER&apos;S STATS
        </div>
        <h2 className="player-name" style={{
          margin: '0 0 14px', fontFamily: "'Archivo Black', sans-serif",
          fontSize: 36, letterSpacing: '-.02em', lineHeight: 1.1,
        }}>{record.player}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <div style={{
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: '10px 14px', minWidth: 120,
          }}>
            <div style={{ fontSize: 11, color: C.mute, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>Season</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{formatSeasonDisplay(record.season)}</div>
          </div>
          <div style={{
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: '10px 14px', flex: 1, minWidth: 160,
          }}>
            <div style={{ fontSize: 11, color: C.mute, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>Team</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{record.team}</div>
          </div>
          {record.position && (
            <div style={{
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
              padding: '10px 14px',
            }}>
              <div style={{ fontSize: 11, color: C.mute, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>Pos</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{record.position}</div>
            </div>
          )}
          {record.games != null && (
            <div style={{
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
              padding: '10px 14px',
            }}>
              <div style={{ fontSize: 11, color: C.mute, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>Games</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{record.games}</div>
            </div>
          )}
        </div>
        <p style={{ margin: '14px 0 0', color: C.mute, fontSize: 13 }}>
          Enter regular-season per-game averages for this season. Use percentages like <strong style={{ color: C.text }}>46.7</strong> for FG%.
        </p>
      </section>

      <form onSubmit={submit}>
        <div className="grid-stats">
          {stats.map(def => {
            const detail = result?.detail?.[def.key]
            const border = detail ? tierColor(detail.tier) : C.border
            return (
              <label key={def.key} style={{
                background: C.panel, border: `1px solid ${border}`, borderRadius: 14,
                padding: 14, display: 'flex', flexDirection: 'column', gap: 8,
                backgroundColor: detail?.tier === 'exact' || detail?.tier === 'close' ? C.goodBg
                  : detail?.tier === 'miss' ? C.badBg : C.panel,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '.04em' }}>{def.short}</span>
                  {detail && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: tierColor(detail.tier) }}>
                      {tierLabel(detail.tier)} · {detail.points}/{detail.max}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.mute }}>{def.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    className="stat-input"
                    type="number"
                    inputMode="decimal"
                    step={def.step}
                    min={0}
                    max={def.kind === 'pct' ? 100 : 100}
                    disabled={!!result}
                    value={guesses[def.key]}
                    onChange={e => set(def.key, e.target.value)}
                    placeholder={def.unit === '%' ? 'e.g. 46.7' : 'e.g. 26.8'}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 8,
                      background: C.bg, border: `1px solid ${C.border}`,
                      fontSize: 18, fontWeight: 600, width: '100%',
                    }}
                  />
                  {def.unit === '%' && <span style={{ color: C.mute, fontWeight: 700 }}>%</span>}
                </div>
                {result && (
                  <div style={{ fontSize: 13, color: C.mute }}>
                    Actual: <strong style={{ color: C.text }}>{formatStat(record.stats[def.key], def)}</strong>
                    {detail?.delta != null && (
                      <span> · Δ {detail.delta.toFixed(1)}{def.unit}</span>
                    )}
                  </div>
                )}
              </label>
            )
          })}
        </div>

        {STAT_DEFS.some(d => record.stats[d.key] == null) && (
          <p style={{ margin: '14px 0 0', color: C.mute, fontSize: 13 }}>
            Some stats were not tracked or are unavailable for this season (shown only when verified). Missing ≠ zero.
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20, alignItems: 'center' }}>
          {!result ? (
            <Btn type="submit">Lock in guesses</Btn>
          ) : (
            <>
              <div style={{
                padding: '10px 16px', borderRadius: 10, background: C.panel2,
                border: `1px solid ${C.border}`, fontWeight: 700,
              }}>
                Round score: <span style={{ color: C.accent }}>{result.points}</span>
                <span style={{ color: C.mute, fontWeight: 500 }}> / {result.max}</span>
                <span style={{ color: C.mute, fontWeight: 500 }}> · {result.pct}%</span>
              </div>
              <Btn onClick={onNext}>{revealed ? 'Finish' : 'Next player'}</Btn>
            </>
          )}
        </div>
      </form>

      {result && (
        <div style={{
          background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16,
          fontSize: 13, color: C.mute,
        }}>
          Source:{' '}
          <a href={record.sourceUrl} target="_blank" rel="noreferrer">
            {record.source || 'Basketball Reference'} — {record.player} {formatSeasonDisplay(record.season)}
          </a>
          {record.imported && ' (imported)'}
        </div>
      )}
    </div>
  )
}

function Results({ history, totalScore, maxScore, onHome, onReplay }) {
  const avg = history.length ? Math.round(history.reduce((s, h) => s + h.result.pct, 0) / history.length) : 0
  return (
    <div className="fade-in" style={{ padding: '32px 0 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 18, padding: 28, textAlign: 'center',
      }}>
        <Badge color={C.accent}>Game over</Badge>
        <h2 style={{
          fontFamily: "'Archivo Black', sans-serif", fontSize: 36, margin: '14px 0 8px',
        }}>Final score</h2>
        <div style={{ fontSize: 48, fontWeight: 800, color: C.accent, lineHeight: 1 }}>
          {totalScore}
          <span style={{ fontSize: 20, color: C.mute, fontWeight: 600 }}> / {maxScore}</span>
        </div>
        <p style={{ color: C.mute, margin: '10px 0 0' }}>Average accuracy {avg}% across {history.length} rounds</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 22, flexWrap: 'wrap' }}>
          <Btn onClick={onReplay}>Play again</Btn>
          <Btn variant="ghost" onClick={onHome}>Home</Btn>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: C.mute, letterSpacing: '.06em', textTransform: 'uppercase' }}>Round breakdown</h3>
        {history.map((h, i) => (
          <div key={h.record.id + i} style={{
            background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
          }}>
            <div style={{ fontWeight: 700, minWidth: 28, color: C.mute }}>#{i + 1}</div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 700 }}>{h.record.player}</div>
              <div style={{ fontSize: 13, color: C.mute }}>
                {formatSeasonDisplay(h.record.season)} · {h.record.team}
              </div>
            </div>
            <div style={{ fontWeight: 700 }}>
              {h.result.points}<span style={{ color: C.mute, fontWeight: 500 }}>/{h.result.max}</span>
            </div>
            <div style={{ color: h.result.pct >= 70 ? C.good : h.result.pct >= 40 ? C.warn : C.bad, fontWeight: 700, minWidth: 48, textAlign: 'right' }}>
              {h.result.pct}%
            </div>
            <a href={h.record.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>BBR ↗</a>
          </div>
        ))}
      </section>
    </div>
  )
}

function App() {
  const [pool, setPool] = useState([])
  const [meta, setMeta] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState('home') // home | play | results | import
  const [mode, setMode] = useState('classic')
  const [queue, setQueue] = useState([])
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [maxScore, setMaxScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [history, setHistory] = useState([])
  const classicLen = 5

  useEffect(() => {
    loadSeasons()
      .then(({ meta, seasons }) => { setMeta(meta); setPool(seasons) })
      .catch(e => setErr(String(e.message || e)))
      .finally(() => setLoading(false))
  }, [])

  const start = useCallback((m) => {
    if (!pool.length) return
    const shuffled = shuffle(pool)
    const q = m === 'classic' ? shuffled.slice(0, Math.min(classicLen, shuffled.length)) : shuffled
    setMode(m)
    setQueue(q)
    setIdx(0)
    setScore(0)
    setMaxScore(0)
    setStreak(0)
    setHistory([])
    setScreen('play')
  }, [pool])

  const onSubmit = (result) => {
    setScore(s => s + result.points)
    setMaxScore(m => m + result.max)
    setStreak(s => (result.pct >= 50 ? s + 1 : 0))
    setHistory(h => [...h, { record: queue[idx], result }])
  }

  const onNext = () => {
    if (idx + 1 >= queue.length) {
      setScreen('results')
      return
    }
    setIdx(i => i + 1)
  }

  const onImported = (records) => {
    setPool(prev => {
      const map = new Map(prev.map(r => [r.id, r]))
      for (const r of records) map.set(r.id, r)
      return [...map.values()]
    })
  }

  const record = queue[idx]
  const modeLabel = screen === 'play'
    ? (mode === 'classic' ? 'Classic' : 'Endless')
    : screen === 'results' ? 'Results' : null

  return (
    <div className="court-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{css}</style>
      <Header onHome={() => setScreen('home')} mode={modeLabel} />
      <main style={{ flex: 1, maxWidth: 960, width: '100%', margin: '0 auto', padding: '0 20px' }}>
        {loading && (
          <p className="pulse" style={{ color: C.mute, textAlign: 'center', padding: 64 }}>Loading verified seasons…</p>
        )}
        {err && (
          <p style={{ color: C.bad, padding: 32, textAlign: 'center' }}>
            Couldn&apos;t load stats: {err}
          </p>
        )}
        {!loading && !err && screen === 'home' && (
          <Home count={pool.length} onStart={start} onImport={() => setScreen('import')} />
        )}
        {!loading && screen === 'import' && (
          <ImportPanel onClose={() => setScreen('home')} onImported={onImported} />
        )}
        {!loading && screen === 'play' && record && (
          <GameRound
            key={record.id + '-' + idx}
            record={record}
            round={idx + 1}
            total={mode === 'classic' ? queue.length : 0}
            score={score}
            streak={streak}
            onSubmit={onSubmit}
            onNext={onNext}
            revealed={idx + 1 >= queue.length}
          />
        )}
        {!loading && screen === 'results' && (
          <Results
            history={history}
            totalScore={score}
            maxScore={maxScore}
            onHome={() => setScreen('home')}
            onReplay={() => start(mode)}
          />
        )}
      </main>
      <Footer />
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
