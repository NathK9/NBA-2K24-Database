import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  STATS, TARGETS, dailyTarget, targetAt, pickHand, scoreBeat, grade, didBeat,
  initials, todayKey, hashStr,
} from './data.js'

const C = {
  bg: '#0a0c14',
  panel: '#12162a',
  panel2: '#181d36',
  border: '#2a3150',
  text: '#eef1ff',
  mute: '#8b93b8',
  gold: '#f5b942',
  goldDim: '#c48a1a',
  green: '#34d399',
  red: '#f87171',
  blue: '#60a5fa',
  purple: '#a78bfa',
  hero: 'linear-gradient(135deg, #1a1040 0%, #2d1b69 45%, #0f172a 100%)',
  accent: '#f5b942',
}

const STORAGE_DAILY = 'beat-the-legend-daily-v1'
const STORAGE_UNLIM = 'beat-the-legend-unlim-v1'
const ONBOARD = 'beat-the-legend-onboard'
const MODE_KEY = 'beat-the-legend-mode'

const DEFAULT_POWERS = { shuffle: 2, scout: 1, sleuth: 1, plus: 1, minus: 1 }
const UNLIM_POWERS = { shuffle: 99, scout: 99, sleuth: 99, plus: 99, minus: 99 }

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box }
  button, input { font: inherit; color: inherit }
  button { cursor: pointer }
  button:disabled { cursor: not-allowed; opacity: .45 }
  ::selection { background: ${C.gold}; color: #111 }
  .stat-btn { transition: transform .12s, border-color .12s, background .12s, box-shadow .12s }
  .stat-btn:hover:not(:disabled) { transform: translateY(-1px); border-color: ${C.gold} }
  .stat-btn.on { border-color: ${C.gold}; background: rgba(245,185,66,.12); box-shadow: 0 0 0 1px ${C.gold} }
  .stat-btn.locked { opacity: .7 }
  .player-btn {
    transition: border-color .12s, background .12s, transform .12s, box-shadow .12s;
    border: 2px solid ${C.border} !important;
    background: ${C.panel2};
  }
  .player-btn:hover:not(:disabled):not(.on) { border-color: rgba(245,185,66,.55) !important; background: #1c2240 }
  .player-btn.on,
  .player-btn.on:hover {
    border-color: ${C.gold} !important;
    background: rgba(245,185,66,.14) !important;
    box-shadow: 0 0 0 2px ${C.gold}, 0 0 18px rgba(245,185,66,.35);
  }
  .power { transition: border-color .12s, background .12s }
  .power:hover:not(:disabled) { border-color: ${C.purple}; background: rgba(167,139,250,.1) }
  .lock-btn { transition: filter .12s, transform .12s }
  .lock-btn:not(:disabled):hover { filter: brightness(1.08); transform: translateY(-1px) }
  .mode-tab { transition: background .12s, color .12s, border-color .12s }
  @keyframes pop { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
  .pop { animation: pop .28s ease both }
  @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .7 } }
  .pulse { animation: pulse 1.6s ease infinite }
`

function loadSave(key, match) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (match && data.dateKey !== match) return null
    return data
  } catch { return null }
}

function saveGame(key, state) {
  try { localStorage.setItem(key, JSON.stringify(state)) } catch {}
}

function freshState(seedKey, unlimited) {
  return {
    dateKey: seedKey,
    locks: {},
    usedIds: [],
    powers: unlimited ? { ...UNLIM_POWERS } : { ...DEFAULT_POWERS },
    round: 0,
    handSeed: 0,
    done: false,
    unlimited,
    targetIndex: unlimited ? Math.floor(Math.random() * TARGETS.length) : null,
  }
}

function Avatar({ name, size = 48, glow }) {
  const colors = ['#7c3aed', '#2563eb', '#db2777', '#059669', '#d97706', '#dc2626']
  const bg = colors[hashStr(name) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22, flexShrink: 0,
      background: `linear-gradient(145deg, ${bg}, #0f172a)`,
      display: 'grid', placeItems: 'center', fontWeight: 800,
      fontSize: size * 0.34, color: '#fff', letterSpacing: '-.02em',
      boxShadow: glow ? `0 0 24px ${bg}66` : 'none',
      border: '1px solid rgba(255,255,255,.12)',
    }}>{initials(name)}</div>
  )
}

function Header({ onHow, dateKey, mode, setMode }) {
  return (
    <header style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(10,12,20,.85)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 20 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.gold}, #f97316)`,
            display: 'grid', placeItems: 'center', fontWeight: 900, color: '#111', fontSize: 14,
          }}>BT</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.02em', fontFamily: 'Archivo, sans-serif' }}>
              Beat the <span style={{ color: C.gold }}>Legend</span>
            </div>
            <div style={{ fontSize: 11, color: C.mute, marginTop: -1 }}>
              {mode === 'unlimited' ? 'Unlimited free play' : 'Daily NBA challenge'}
            </div>
          </div>
        </div>
        <div style={{
          display: 'flex', padding: 3, borderRadius: 10, border: `1px solid ${C.border}`, background: C.panel,
        }}>
          {[['daily', 'Daily'], ['unlimited', 'Unlimited']].map(([k, label]) => (
            <button
              key={k}
              className="mode-tab"
              onClick={() => setMode(k)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700,
                background: mode === k ? C.gold : 'transparent',
                color: mode === k ? '#111' : C.mute,
              }}
            >{label}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: C.mute, fontVariantNumeric: 'tabular-nums' }}>
            {mode === 'daily' ? dateKey : '∞ free play'}
          </span>
          <button onClick={onHow} style={{
            padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.panel, color: C.text, fontSize: 13, fontWeight: 600,
          }}>How to play</button>
        </div>
      </div>
    </header>
  )
}

function Onboarding({ target, onDone }) {
  const [step, setStep] = useState(0)
  const steps = [
    {
      title: 'Beat the Legend',
      body: `Today’s legend is ${target.name} (${target.season}). You’ll see nine stats from that season. Your job isn’t to match them — it’s to build a composite player that BEATS them.`,
    },
    {
      title: 'Pick a player, lock a stat',
      body: 'Each round deals five random seasons. Choose one player and assign them to an open stat. Locks are final. You don’t see their numbers until you lock — trust your hoop IQ.',
    },
    {
      title: 'Higher wins (mostly)',
      body: 'For PPG, APG, rebounds, steals, blocks, and shooting %, higher beats the target. For turnovers, lower is better. Exceed the bar for top scores.',
    },
    {
      title: 'Chase a perfect 100',
      body: 'Each lock scores 0–100. Your final score is the average of all nine. Beat the legend across the board and claim the crown.',
    },
  ]
  const s = steps[step]
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(5,7,14,.82)', zIndex: 50,
      display: 'grid', placeItems: 'center', padding: 20, backdropFilter: 'blur(8px)',
    }}>
      <div className="pop" style={{
        width: '100%', maxWidth: 480, background: C.panel, border: `1px solid ${C.border}`,
        borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 18,
        boxShadow: '0 24px 80px rgba(0,0,0,.5)',
      }}>
        <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, letterSpacing: '.08em' }}>
          {String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
        </div>
        <h2 style={{ margin: 0, fontSize: 26, fontFamily: 'Archivo, sans-serif', letterSpacing: '-.02em' }}>{s.title}</h2>
        <p style={{ margin: 0, color: C.mute, lineHeight: 1.55, fontSize: 15 }}>{s.body}</p>
        {step === 0 && (
          <div style={{
            display: 'flex', gap: 14, alignItems: 'center', padding: 14, borderRadius: 14,
            background: C.hero, border: `1px solid ${C.border}`,
          }}>
            <Avatar name={target.name} size={52} glow />
            <div>
              <div style={{ fontSize: 11, color: C.mute, textTransform: 'uppercase', letterSpacing: '.06em' }}>Today’s legend</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{target.name}</div>
              <div style={{ color: C.mute, fontSize: 13 }}>{target.pos} · {target.team} · {target.season}</div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? C.gold : C.border }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          <button onClick={onDone} style={{ background: 'none', border: 'none', color: C.mute, fontSize: 13 }}>Skip</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} style={{
                padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', fontWeight: 600,
              }}>Back</button>
            )}
            <button onClick={() => step === steps.length - 1 ? onDone() : setStep(step + 1)} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none', background: C.gold, color: '#111', fontWeight: 800,
            }}>{step === steps.length - 1 ? "Let's play" : 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function HowModal({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(5,7,14,.75)', zIndex: 40,
      display: 'grid', placeItems: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} className="pop" style={{
        width: '100%', maxWidth: 520, background: C.panel, border: `1px solid ${C.border}`,
        borderRadius: 18, padding: 28, maxHeight: '85vh', overflow: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontFamily: 'Archivo, sans-serif' }}>How to play</h2>
          <button onClick={onClose} style={{ background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32 }}>×</button>
        </div>
        <ol style={{ margin: 0, paddingLeft: 18, color: C.mute, lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <li><strong style={{ color: C.text }}>Beat, don’t match.</strong> Build a better line than today’s legendary season.</li>
          <li><strong style={{ color: C.text }}>Five cards each round.</strong> Pick one player and assign them to one open stat.</li>
          <li><strong style={{ color: C.text }}>Stats stay hidden</strong> until you lock (unless you use a power-up).</li>
          <li><strong style={{ color: C.text }}>Higher is better</strong> on everything except turnovers (lower TOV wins).</li>
          <li><strong style={{ color: C.text }}>Power-ups:</strong> Shuffle (new hand), Scout (full line), Sleuth (one stat for all), ±1 nudge before lock.</li>
          <li><strong style={{ color: C.text }}>Final score</strong> = average of nine pick scores (0–100 each).</li>
          <li><strong style={{ color: C.text }}>Unlimited mode</strong> lets you pick any legend, replay freely, and use infinite power-ups.</li>
        </ol>
      </div>
    </div>
  )
}

function ProgressBar({ score, locks }) {
  const pct = locks === 0 ? 0 : Math.min(100, score)
  return (
    <div style={{ height: 6, background: 'rgba(255,255,255,.12)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`, height: '100%', borderRadius: 99,
        background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold}, ${C.green})`,
        transition: 'width .4s ease',
      }} />
    </div>
  )
}

function TargetBanner({ target, avg, locks, done }) {
  return (
    <div style={{
      background: C.hero, border: `1px solid ${C.border}`, borderRadius: 18,
      padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14,
      boxShadow: '0 12px 40px rgba(45,27,105,.35)',
    }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Avatar name={target.name} size={64} glow />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: C.gold, fontWeight: 700 }}>
            Today’s legend — beat this line
          </div>
          <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 26, letterSpacing: '-.02em', marginTop: 2 }}>
            {target.name}<span style={{ color: C.mute, fontWeight: 600, fontSize: 18 }}> · {target.pos}</span>
          </div>
          <div style={{ color: C.mute, fontSize: 14 }}>{target.team} · {target.season}</div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 90 }}>
          <div style={{ fontSize: 11, color: C.mute, textTransform: 'uppercase', letterSpacing: '.08em' }}>Score</div>
          <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 28, color: locks ? C.gold : C.mute }}>
            {locks ? grade(avg) : '—'}
          </div>
          <div style={{ fontSize: 14, color: C.mute, fontVariantNumeric: 'tabular-nums' }}>
            {locks ? `${Math.round(avg)}/100` : '—/100'}
          </div>
        </div>
      </div>
      <ProgressBar score={avg} locks={locks} />
      {done && (
        <div style={{
          fontSize: 13, fontWeight: 600,
          color: avg >= 85 ? C.green : avg >= 70 ? C.gold : C.red,
        }}>
          {avg >= 90 ? 'You crushed the legend.' : avg >= 80 ? 'Solid — the legend felt that.' : avg >= 70 ? 'Close, but the legend still leads.' : 'The legend wins today. Run it back tomorrow.'}
        </div>
      )}
    </div>
  )
}

function StatGrid({ target, locks, selected, onSelect, scouted }) {
  const groups = ['Offense', 'Defense']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'Archivo, sans-serif' }}>Pick a stat</h2>
        <span style={{ color: C.mute, fontSize: 13, fontWeight: 600 }}>{Object.keys(locks).length}/9</span>
      </div>
      {groups.map(g => (
        <div key={g}>
          <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: C.green, fontWeight: 700, marginBottom: 8 }}>{g}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {STATS.filter(s => s.group === g).map(s => {
              const lock = locks[s.key]
              const on = selected === s.key
              const beat = lock && didBeat(s.key, lock.value, target.stats[s.key])
              return (
                <button
                  key={s.key}
                  className={`stat-btn${on ? ' on' : ''}${lock ? ' locked' : ''}`}
                  disabled={!!lock}
                  onClick={() => onSelect(s.key)}
                  style={{
                    padding: '14px 10px', borderRadius: 12, textAlign: 'center',
                    border: `1px solid ${lock ? (beat ? C.green + '66' : C.red + '55') : C.border}`,
                    background: lock ? (beat ? 'rgba(52,211,153,.08)' : 'rgba(248,113,113,.06)') : C.panel2,
                    minHeight: 78,
                  }}
                >
                  {lock ? (
                    <>
                      <div style={{ fontWeight: 800, fontSize: 18, color: beat ? C.green : C.red }}>
                        {s.fmt(lock.value)}
                      </div>
                      <div style={{ fontSize: 11, color: C.mute, marginTop: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: C.mute, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lock.player.name.split(' ').slice(-1)[0]} · {lock.score}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 800, fontSize: 20 }}>{s.fmt(target.stats[s.key])}</div>
                      <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>{s.label}</div>
                      {s.lowerBetter && <div style={{ fontSize: 10, color: C.purple, marginTop: 2 }}>lower wins</div>}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function PlayerList({ hand, selected, onSelect, scoutedId, sleuthStat, nudge, target }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {hand.map(p => {
        const on = selected?.id === p.id
        const showAll = scoutedId === p.id
        const showOne = sleuthStat && p.stats[sleuthStat] != null
        return (
          <button
            key={p.id}
            className={`player-btn${on ? ' on' : ''}`}
            onClick={() => onSelect(p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              borderRadius: 12, textAlign: 'left', width: '100%',
            }}
          >
            <Avatar name={p.name} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.name}{' '}
                <span style={{ color: C.mute, fontWeight: 500, fontSize: 12 }}>{p.pos}</span>
              </div>
              <div style={{ fontSize: 12, color: C.mute }}>{p.team} · {p.season}</div>
              {(showAll || showOne) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {(showAll ? STATS : STATS.filter(s => s.key === sleuthStat)).map(s => {
                    const v = p.stats[s.key]
                    const beat = didBeat(s.key, v, target.stats[s.key])
                    return (
                      <span key={s.key} style={{
                        fontSize: 11, padding: '2px 6px', borderRadius: 6, fontWeight: 600,
                        background: beat ? 'rgba(52,211,153,.15)' : 'rgba(248,113,113,.12)',
                        color: beat ? C.green : C.red,
                      }}>{s.label} {s.fmt(v)}</span>
                    )
                  })}
                </div>
              )}
            </div>
            {on && nudge !== 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: C.purple }}>
                {nudge > 0 ? '+1' : '−1'} ready
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function PowerBar({ powers, onUse, disabled, unlimited }) {
  const fmt = n => unlimited && n > 20 ? '∞' : n
  const items = [
    { key: 'shuffle', label: `Shuffle · ${fmt(powers.shuffle)}`, tip: 'New hand of 5' },
    { key: 'scout', label: `Scout · ${fmt(powers.scout)}`, tip: 'Reveal full line' },
    { key: 'sleuth', label: `Sleuth · ${fmt(powers.sleuth)}`, tip: 'Reveal one stat for all' },
    { key: 'plus', label: `+1 · ${fmt(powers.plus)}`, tip: 'Nudge up before lock' },
    { key: 'minus', label: `−1 · ${fmt(powers.minus)}`, tip: 'Nudge down before lock' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: C.purple, fontWeight: 700 }}>Power-ups</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map(it => (
          <button
            key={it.key}
            className="power"
            title={it.tip}
            disabled={disabled || powers[it.key] <= 0}
            onClick={() => onUse(it.key)}
            style={{
              padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.panel, fontSize: 12, fontWeight: 700, minWidth: 64,
            }}
          >{it.label}</button>
        ))}
      </div>
    </div>
  )
}

function Results({ target, locks, avg, onReplayNote, onPlayAgain, unlimited, onPickLegend }) {
  const beaten = STATS.filter(s => locks[s.key] && didBeat(s.key, locks[s.key].value, target.stats[s.key])).length
  return (
    <div className="pop" style={{
      background: C.panel, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24,
      display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: C.mute, letterSpacing: '.1em', textTransform: 'uppercase' }}>Final score</div>
        <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: 56, fontWeight: 800, color: C.gold, lineHeight: 1.1 }}>
          {grade(avg)}
        </div>
        <div style={{ fontSize: 20, color: C.text, fontWeight: 600 }}>{Math.round(avg)} / 100</div>
        <div style={{ color: C.mute, marginTop: 8, fontSize: 14 }}>
          Beat {beaten}/9 stats vs {target.name} · {target.season}
        </div>
      </div>
      {unlimited && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onPlayAgain} style={{
            padding: '12px 22px', borderRadius: 12, border: 'none', fontWeight: 800,
            background: `linear-gradient(135deg, ${C.gold}, #f97316)`, color: '#111',
          }}>Play again</button>
          <button onClick={onPickLegend} style={{
            padding: '12px 22px', borderRadius: 12, border: `1px solid ${C.border}`,
            background: C.panel2, fontWeight: 700, color: C.text,
          }}>Pick a legend</button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STATS.map((s, i) => {
          const lock = locks[s.key]
          const beat = didBeat(s.key, lock.value, target.stats[s.key])
          return (
            <div key={s.key} style={{
              display: 'grid', gridTemplateColumns: '28px 48px 1fr auto', gap: 10, alignItems: 'center',
              padding: '10px 12px', borderRadius: 10, background: C.panel2, border: `1px solid ${C.border}`,
            }}>
              <span style={{ color: C.mute, fontSize: 12, fontWeight: 700 }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ fontWeight: 800, fontSize: 13 }}>{s.label}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lock.player.name}
                </div>
                <div style={{ fontSize: 12, color: C.mute }}>
                  {s.fmt(lock.value)}
                  <span style={{ color: beat ? C.green : C.red }}> vs {s.fmt(target.stats[s.key])}</span>
                  {beat ? ' · beat' : ' · missed'}
                </div>
              </div>
              <span style={{
                fontWeight: 800, fontSize: 14, color: lock.score >= 88 ? C.green : lock.score >= 72 ? C.gold : C.red,
              }}>{grade(lock.score)}/{lock.score}</span>
            </div>
          )
        })}
      </div>
      <p style={{ margin: 0, textAlign: 'center', color: C.mute, fontSize: 13 }}>{onReplayNote}</p>
    </div>
  )
}

function applyNudge(statKey, value, nudge) {
  if (!nudge) return value
  if (statKey.includes('%')) return Math.max(0, Math.min(100, value + nudge))
  if (['SPG', 'BPG', '3PM', 'TOV'].includes(statKey)) return Math.max(0, Math.round((value + nudge * 0.1) * 10) / 10)
  return Math.max(0, Math.round((value + nudge * 0.5) * 10) / 10)
}

function LegendPicker({ onPick, onClose }) {
  const [q, setQ] = useState('')
  const list = TARGETS.filter(t =>
    !q || `${t.name} ${t.team} ${t.season}`.toLowerCase().includes(q.toLowerCase())
  )
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(5,7,14,.8)', zIndex: 50,
      display: 'grid', placeItems: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} className="pop" style={{
        width: '100%', maxWidth: 520, maxHeight: '80vh', background: C.panel,
        border: `1px solid ${C.border}`, borderRadius: 18, padding: 20,
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontFamily: 'Archivo, sans-serif', fontSize: 20 }}>Pick a legend</h2>
          <button onClick={onClose} style={{ background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32 }}>×</button>
        </div>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search player, team, season…"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`,
            background: C.bg, color: C.text,
          }}
        />
        <div style={{ overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {list.map((t, i) => {
            const idx = TARGETS.indexOf(t)
            return (
              <button
                key={t.name + t.season + i}
                onClick={() => onPick(idx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  borderRadius: 10, border: `1px solid ${C.border}`, background: C.panel2, textAlign: 'left',
                }}
              >
                <Avatar name={t.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: C.mute }}>{t.pos} · {t.team} · {t.season}</div>
                </div>
                <span style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>{t.stats.PPG} PPG</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Game() {
  const dateKey = todayKey()
  const [mode, setModeState] = useState(() => {
    try { return localStorage.getItem(MODE_KEY) === 'unlimited' ? 'unlimited' : 'daily' } catch { return 'daily' }
  })
  const unlimited = mode === 'unlimited'

  const setMode = m => {
    try { localStorage.setItem(MODE_KEY, m) } catch {}
    setModeState(m)
  }

  const [showOnboard, setShowOnboard] = useState(() => {
    try { return localStorage.getItem(ONBOARD) !== '1' } catch { return true }
  })
  const [showHow, setShowHow] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [runId, setRunId] = useState(0)

  const storageKey = unlimited ? STORAGE_UNLIM : STORAGE_DAILY

  const initForMode = (m, opts = {}) => {
    if (m === 'daily') {
      const saved = loadSave(STORAGE_DAILY, dateKey)
      if (saved && !opts.force) return saved
      return freshState(dateKey, false)
    }
    const saved = loadSave(STORAGE_UNLIM)
    if (saved && !opts.force && saved.unlimited) return saved
    const s = freshState(`u-${Date.now()}-${runId}`, true)
    if (opts.targetIndex != null) s.targetIndex = opts.targetIndex
    return s
  }

  const [state, setState] = useState(() => initForMode(mode))
  const [selPlayer, setSelPlayer] = useState(null)
  const [selStat, setSelStat] = useState(null)
  const [scoutedId, setScoutedId] = useState(null)
  const [sleuthStat, setSleuthStat] = useState(null)
  const [nudge, setNudge] = useState(0)
  const [sleuthPickMode, setSleuthPickMode] = useState(false)
  const [toast, setToast] = useState('')

  // Switch mode → load that mode's state
  useEffect(() => {
    setState(initForMode(mode))
    setSelPlayer(null)
    setSelStat(null)
    setScoutedId(null)
    setSleuthStat(null)
    setNudge(0)
    setSleuthPickMode(false)
  }, [mode])

  const target = useMemo(() => {
    if (unlimited) return targetAt(state.targetIndex ?? 0)
    return dailyTarget(dateKey)
  }, [unlimited, state.targetIndex, dateKey])

  const seedKey = unlimited ? (state.dateKey || `u-${runId}`) : dateKey
  const usedSet = useMemo(() => new Set(state.usedIds), [state.usedIds])
  const hand = useMemo(
    () => pickHand(seedKey, state.round + state.handSeed * 17, usedSet),
    [seedKey, state.round, state.handSeed, usedSet],
  )

  const lockList = Object.values(state.locks)
  const avg = lockList.length ? lockList.reduce((a, l) => a + l.score, 0) / lockList.length : 0
  const done = state.done || Object.keys(state.locks).length >= 9

  useEffect(() => {
    saveGame(storageKey, { ...state, done, unlimited })
  }, [state, done, storageKey, unlimited])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const finishOnboard = () => {
    try { localStorage.setItem(ONBOARD, '1') } catch {}
    setShowOnboard(false)
  }

  const flash = msg => setToast(msg)

  const resetSelection = () => {
    setSelPlayer(null)
    setSelStat(null)
    setScoutedId(null)
    setSleuthStat(null)
    setNudge(0)
    setSleuthPickMode(false)
  }

  const startUnlimited = (targetIndex) => {
    setRunId(r => r + 1)
    const s = freshState(`u-${Date.now()}`, true)
    if (targetIndex != null) s.targetIndex = targetIndex
    setState(s)
    resetSelection()
    setShowPicker(false)
  }

  const onPower = key => {
    if (done) return
    const cost = key === 'scout' || key === 'sleuth' || key === 'plus' || key === 'minus' ? key : key
    if (key === 'shuffle' && state.powers.shuffle > 0) {
      setState(s => ({ ...s, powers: { ...s.powers, shuffle: s.powers.shuffle - 1 }, handSeed: s.handSeed + 1 }))
      setSelPlayer(null)
      setScoutedId(null)
      setSleuthStat(null)
      setNudge(0)
      flash('Hand shuffled')
    } else if (key === 'scout' && state.powers.scout > 0) {
      if (!selPlayer) { flash('Select a player to scout'); return }
      setScoutedId(selPlayer.id)
      setState(s => ({ ...s, powers: { ...s.powers, scout: s.powers.scout - 1 } }))
      flash(`Scouted ${selPlayer.name}`)
    } else if (key === 'sleuth' && state.powers.sleuth > 0) {
      setSleuthPickMode(true)
      flash('Pick a stat to reveal for all players')
    } else if (key === 'plus' && state.powers.plus > 0) {
      if (!selPlayer || !selStat) { flash('Pick player + stat first'); return }
      setNudge(1)
      setState(s => ({ ...s, powers: { ...s.powers, plus: s.powers.plus - 1 } }))
      flash('+1 nudge armed')
    } else if (key === 'minus' && state.powers.minus > 0) {
      if (!selPlayer || !selStat) { flash('Pick player + stat first'); return }
      setNudge(-1)
      setState(s => ({ ...s, powers: { ...s.powers, minus: s.powers.minus - 1 } }))
      flash('−1 nudge armed')
    }
    void cost
  }

  const onSelectStat = key => {
    if (state.locks[key]) return
    if (sleuthPickMode && state.powers.sleuth > 0) {
      setSleuthStat(key)
      setSleuthPickMode(false)
      setState(s => ({ ...s, powers: { ...s.powers, sleuth: s.powers.sleuth - 1 } }))
      flash(`Sleuth: ${key} revealed`)
      return
    }
    setSelStat(key)
  }

  const canLock = selPlayer && selStat && !state.locks[selStat] && !done

  const lockIn = () => {
    if (!canLock) return
    const raw = selPlayer.stats[selStat]
    const value = applyNudge(selStat, raw, nudge)
    const score = scoreBeat(selStat, value, target.stats[selStat])
    const beat = didBeat(selStat, value, target.stats[selStat])
    const nextLocks = {
      ...state.locks,
      [selStat]: { player: selPlayer, value, raw, score, nudge },
    }
    const nextUsed = [...state.usedIds, selPlayer.id]
    const finished = Object.keys(nextLocks).length >= 9
    setState(s => ({
      ...s,
      locks: nextLocks,
      usedIds: nextUsed,
      round: s.round + 1,
      handSeed: 0,
      done: finished,
    }))
    resetSelection()
    flash(beat ? `Locked — you beat ${selStat}!` : `Locked — short on ${selStat}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>
      <style>{css}</style>
      <Header onHow={() => setShowHow(true)} dateKey={dateKey} mode={mode} setMode={setMode} />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: '0 0 6px', fontFamily: 'Archivo, sans-serif', fontSize: 28, letterSpacing: '-.03em' }}>
              Beat the Legend
            </h1>
            <p style={{ margin: 0, color: C.mute, fontSize: 15 }}>
              {unlimited
                ? 'Unlimited mode — play any legend, infinite power-ups, replay anytime.'
                : 'Draft seasons that out-stat today’s perfect player. Higher wins — except turnovers.'}
            </p>
          </div>
          {unlimited && !done && (
            <button onClick={() => setShowPicker(true)} style={{
              padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`,
              background: C.panel, fontWeight: 700, fontSize: 13, color: C.gold,
            }}>Change legend</button>
          )}
        </div>

        <TargetBanner target={target} avg={avg} locks={lockList.length} done={done} />

        {done ? (
          <Results
            target={target}
            locks={state.locks}
            avg={avg}
            unlimited={unlimited}
            onPlayAgain={() => startUnlimited(state.targetIndex)}
            onPickLegend={() => setShowPicker(true)}
            onReplayNote={unlimited
              ? 'Unlimited — play again or pick a new legend anytime.'
              : 'Come back tomorrow for a new legend. Your score is saved for today.'}
          />
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start',
          }} className="game-grid">
            <style>{`@media (max-width: 860px) { .game-grid { grid-template-columns: 1fr !important } }`}</style>

            <div style={{
              background: C.panel, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20,
            }}>
              <StatGrid
                target={target}
                locks={state.locks}
                selected={selStat}
                onSelect={onSelectStat}
                scouted={scoutedId}
              />
            </div>

            <aside style={{
              background: C.panel, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18,
              display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 72,
            }}>
              <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'Archivo, sans-serif' }}>Pick a player</h2>
              <PowerBar powers={state.powers} onUse={onPower} disabled={done} unlimited={unlimited} />
              {sleuthPickMode && (
                <div className="pulse" style={{
                  padding: '10px 12px', borderRadius: 10, background: 'rgba(167,139,250,.12)',
                  border: `1px solid ${C.purple}55`, fontSize: 13, color: C.purple, fontWeight: 600,
                }}>Tap a stat above to sleuth it for this hand</div>
              )}
              <PlayerList
                hand={hand}
                selected={selPlayer}
                onSelect={setSelPlayer}
                scoutedId={scoutedId}
                sleuthStat={sleuthStat}
                nudge={nudge}
                target={target}
              />
            </aside>
          </div>
        )}
      </main>

      {!done && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
          background: 'rgba(10,12,20,.92)', backdropFilter: 'blur(12px)',
          borderTop: `1px solid ${C.border}`, padding: '14px 20px',
        }}>
          <div style={{
            maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 12, color: C.mute, fontWeight: 600 }}>
                {!selPlayer && !selStat && 'Pick a player · Pick a stat'}
                {selPlayer && !selStat && `Player: ${selPlayer.name} · pick a stat`}
                {!selPlayer && selStat && `Stat: ${selStat} · pick a player`}
                {selPlayer && selStat && (
                  <>Ready: <span style={{ color: C.text }}>{selPlayer.name}</span> → <span style={{ color: C.gold }}>{selStat}</span>
                    {nudge !== 0 && <span style={{ color: C.purple }}> ({nudge > 0 ? '+1' : '−1'})</span>}
                  </>
                )}
              </div>
              <div style={{ fontSize: 13, color: C.mute, marginTop: 2 }}>
                {canLock
                  ? 'Lock to reveal their number and score the beat'
                  : 'Select one player and one open stat'}
              </div>
            </div>
            <button
              className="lock-btn"
              disabled={!canLock}
              onClick={lockIn}
              style={{
                padding: '14px 28px', borderRadius: 12, border: 'none',
                background: canLock ? `linear-gradient(135deg, ${C.gold}, #f97316)` : C.panel2,
                color: canLock ? '#111' : C.mute, fontWeight: 800, fontSize: 15,
                minWidth: 140,
              }}
            >Lock in</button>
          </div>
        </div>
      )}

      {toast && (
        <div className="pop" style={{
          position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 60,
          background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '10px 16px', fontSize: 13, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,.4)',
        }}>{toast}</div>
      )}

      {showOnboard && <Onboarding target={target} onDone={finishOnboard} />}
      {showHow && <HowModal onClose={() => setShowHow(false)} />}
      {showPicker && (
        <LegendPicker
          onClose={() => setShowPicker(false)}
          onPick={idx => startUnlimited(idx)}
        />
      )}
    </div>
  )
}

createRoot(document.getElementById('root')).render(<Game />)
