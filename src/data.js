export const STAT_DEFS = [
  { key: 'ppg', label: 'Points per game', short: 'PPG', unit: '', step: 0.1, kind: 'count' },
  { key: 'rpg', label: 'Rebounds per game', short: 'RPG', unit: '', step: 0.1, kind: 'count' },
  { key: 'apg', label: 'Assists per game', short: 'APG', unit: '', step: 0.1, kind: 'count' },
  { key: 'spg', label: 'Steals per game', short: 'SPG', unit: '', step: 0.1, kind: 'defense' },
  { key: 'bpg', label: 'Blocks per game', short: 'BPG', unit: '', step: 0.1, kind: 'defense' },
  { key: 'fgPct', label: 'Field goal percentage', short: 'FG%', unit: '%', step: 0.1, kind: 'pct' },
  { key: 'tpPct', label: 'Three-point percentage', short: '3P%', unit: '%', step: 0.1, kind: 'pct' },
  { key: 'ftPct', label: 'Free throw percentage', short: 'FT%', unit: '%', step: 0.1, kind: 'pct' },
]

export function formatSeasonDisplay(season) {
  if (!season) return ''
  const [a, b] = season.split('-')
  if (!a || !b) return season
  return `${a}–${b}`
}

export function formatStat(value, def) {
  if (value == null) return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const s = Number.isInteger(n) ? String(n) : n.toFixed(1)
  return def?.unit === '%' ? `${s}%` : s
}

export function availableStats(record) {
  return STAT_DEFS.filter(d => record.stats[d.key] != null)
}

export function scoreGuess(guess, actual, kind) {
  if (actual == null) return { points: 0, max: 0, delta: null, tier: 'na' }
  if (guess == null || guess === '' || Number.isNaN(Number(guess))) {
    return { points: 0, max: 10, delta: null, tier: 'miss' }
  }
  const g = Number(guess)
  const a = Number(actual)
  const delta = Math.abs(g - a)
  let points = 0
  let tier = 'miss'
  if (kind === 'pct') {
    if (delta < 0.05) { points = 10; tier = 'exact' }
    else if (delta <= 1) { points = 7; tier = 'close' }
    else if (delta <= 2.5) { points = 4; tier = 'near' }
    else if (delta <= 5) { points = 2; tier = 'far' }
  } else if (kind === 'defense') {
    if (delta < 0.05) { points = 10; tier = 'exact' }
    else if (delta <= 0.2) { points = 7; tier = 'close' }
    else if (delta <= 0.5) { points = 4; tier = 'near' }
    else if (delta <= 1) { points = 2; tier = 'far' }
  } else {
    if (delta < 0.05) { points = 10; tier = 'exact' }
    else if (delta <= 0.5) { points = 7; tier = 'close' }
    else if (delta <= 1.5) { points = 4; tier = 'near' }
    else if (delta <= 3) { points = 2; tier = 'far' }
  }
  return { points, max: 10, delta, tier }
}

export function scoreRound(guesses, record) {
  const stats = availableStats(record)
  let points = 0
  let max = 0
  const detail = {}
  for (const def of stats) {
    const r = scoreGuess(guesses[def.key], record.stats[def.key], def.kind)
    detail[def.key] = r
    points += r.points
    max += r.max
  }
  return { points, max, detail, pct: max ? Math.round((points / max) * 100) : 0 }
}

function parseCsvLine(line) {
  const out = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++ }
      else q = !q
    } else if (c === ',' && !q) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out
}

function numOrNull(v) {
  if (v == null) return null
  const t = String(v).trim()
  if (t === '' || t.toLowerCase() === 'null' || t === '—') return null
  const cleaned = t.replace(/%/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Import CSV with headers matching seasons.json fields. */
export function parseImportCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) throw new Error('CSV needs a header row and at least one data row')
  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase())
  const idx = (names) => {
    for (const n of names) {
      const i = headers.indexOf(n)
      if (i >= 0) return i
    }
    return -1
  }
  const need = {
    player: idx(['player', 'name', 'player_name']),
    season: idx(['season', 'year']),
    team: idx(['team', 'team_name']),
    sourceUrl: idx(['sourceurl', 'source_url', 'url', 'source']),
    ppg: idx(['ppg', 'pts', 'points']),
    rpg: idx(['rpg', 'trb', 'reb', 'rebounds']),
    apg: idx(['apg', 'ast', 'assists']),
    spg: idx(['spg', 'stl', 'steals']),
    bpg: idx(['bpg', 'blk', 'blocks']),
    fgPct: idx(['fgpct', 'fg%', 'fg_pct', 'fg']),
    tpPct: idx(['tppct', '3p%', 'fg3_pct', '3p', 'tp_pct']),
    ftPct: idx(['ftpct', 'ft%', 'ft_pct', 'ft']),
  }
  if (need.player < 0 || need.season < 0 || need.ppg < 0) {
    throw new Error('CSV must include player, season, and ppg columns (plus other stats). Include source_url from Basketball Reference.')
  }
  const records = []
  const skipped = []
  for (let li = 1; li < lines.length; li++) {
    const cols = parseCsvLine(lines[li])
    const get = (i) => (i >= 0 ? cols[i] : '')
    const player = String(get(need.player) || '').trim()
    const season = String(get(need.season) || '').trim()
    const sourceUrl = String(get(need.sourceUrl) || '').trim()
    const ppg = numOrNull(get(need.ppg))
    const rpg = numOrNull(get(need.rpg))
    const apg = numOrNull(get(need.apg))
    if (!player || !season || ppg == null || rpg == null || apg == null) {
      skipped.push({ line: li + 1, reason: 'missing required fields (player, season, ppg, rpg, apg)' })
      continue
    }
    if (!sourceUrl || !/basketball-reference\.com/i.test(sourceUrl)) {
      skipped.push({ line: li + 1, reason: 'missing or invalid Basketball Reference source_url' })
      continue
    }
    const id = `${player.toLowerCase().replace(/[^a-z0-9]+/g, '-')}_${season}`
    records.push({
      id,
      player,
      season,
      team: String(get(need.team) || '').trim() || 'Unknown',
      position: null,
      games: null,
      stats: {
        ppg,
        rpg,
        apg,
        spg: numOrNull(get(need.spg)),
        bpg: numOrNull(get(need.bpg)),
        fgPct: numOrNull(get(need.fgPct)),
        tpPct: numOrNull(get(need.tpPct)),
        ftPct: numOrNull(get(need.ftPct)),
      },
      sourceUrl,
      source: 'Basketball Reference',
      verified: true,
      imported: true,
    })
  }
  return { records, skipped }
}

export async function loadSeasons() {
  const res = await fetch('/data/seasons.json')
  if (!res.ok) throw new Error(`Failed to load seasons.json (${res.status})`)
  const data = await res.json()
  const seasons = (data.seasons || []).filter(s => s.verified && s.stats && s.sourceUrl)
  return { meta: data.meta, seasons }
}

export function shuffle(arr, rng = Math.random) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function emptyGuesses() {
  return Object.fromEntries(STAT_DEFS.map(d => [d.key, '']))
}
