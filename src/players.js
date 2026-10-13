import Papa from 'papaparse'

// Player data lives in public/players.csv — edit it in any spreadsheet app.
// Columns: name, positions, team, height (inches), overall (blank = unrated), image (optional path/URL)
// Any extra column whose header matches an attribute name below (e.g. "Shot 3PT") is used as that rating.

export const ATTRS = [
  'Shot Close', 'Shot Mid', 'Shot 3PT', 'Free Throw', 'Driving Layup', 'Driving Dunk',
  'Standing Dunk', 'Post Control', 'Pass Accuracy', 'Ball Handle', 'Speed', 'Acceleration',
  'Strength', 'Vertical', 'Stamina', 'Interior Defense', 'Perimeter Defense', 'Steal',
  'Block', 'Off. Rebound', 'Def. Rebound',
]

export const slug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
export const fmtHeight = h => h ? `${Math.floor(h / 12)}'${h % 12}"` : '—'

// Generic positions (G/F/C) count as both specific spots for filtering.
const EXPAND = { G: ['PG', 'SG'], F: ['SF', 'PF'], 'G-F': ['SG', 'SF'], 'F-C': ['PF', 'C'] }
export const posList = pos => pos.split('/').flatMap(p => EXPAND[p] || [p])

const num = v => (v === undefined || v === null || String(v).trim() === '' ? null : Number(v))

export async function loadPlayers() {
  const text = await fetch('/players.csv').then(r => r.text())
  const { data, errors } = Papa.parse(text, { header: true, skipEmptyLines: true })
  if (errors.length) console.warn('players.csv parse warnings:', errors.slice(0, 5))
  const seen = {}
  return data.filter(r => r.name).map((r, i) => {
    let s = slug(r.name)
    seen[s] = (seen[s] || 0) + 1
    if (seen[s] > 1) s += '-' + seen[s]
    return {
      id: i, name: r.name.trim(), pos: (r.positions || '').trim(), team: (r.team || '').trim(),
      height: num(r.height), ovr: num(r.overall), img: (r.image || '').trim(), slug: s,
      attrs: Object.fromEntries(ATTRS.map(a => [a, num(r[a])])),
    }
  })
}
