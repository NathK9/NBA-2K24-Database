/**
 * Fetch verified regular-season per-game stats from Basketball Reference.
 * Rate-limited; only curated player pages. Do not run aggressively.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../public/data/seasons.json')
const CACHE = join(__dirname, '../.cache/bbr')
mkdirSync(CACHE, { recursive: true })

// Curated iconic seasons — player slug is BBR id path segment after /players/X/
const TARGETS = [
  { id: 'bryanko01', name: 'Kobe Bryant', seasons: ['2008-09', '2005-06', '2007-08'] },
  { id: 'jordami01', name: 'Michael Jordan', seasons: ['1988-89', '1995-96', '1986-87'] },
  { id: 'jamesle01', name: 'LeBron James', seasons: ['2012-13', '2008-09', '2017-18'] },
  { id: 'curryst01', name: 'Stephen Curry', seasons: ['2015-16', '2020-21', '2013-14'] },
  { id: 'onealsh01', name: 'Shaquille O\'Neal', seasons: ['1999-00', '1993-94', '2000-01'] },
  { id: 'johnsma02', name: 'Magic Johnson', seasons: ['1986-87', '1989-90'] },
  { id: 'birdla01', name: 'Larry Bird', seasons: ['1984-85', '1987-88'] },
  { id: 'duncati01', name: 'Tim Duncan', seasons: ['2002-03', '1997-98'] },
  { id: 'duranke01', name: 'Kevin Durant', seasons: ['2013-14', '2012-13'] },
  { id: 'antetgi01', name: 'Giannis Antetokounmpo', seasons: ['2019-20', '2021-22'] },
  { id: 'nowitdi01', name: 'Dirk Nowitzki', seasons: ['2010-11', '2005-06'] },
  { id: 'olajuha01', name: 'Hakeem Olajuwon', seasons: ['1993-94', '1994-95'] },
  { id: 'iversal01', name: 'Allen Iverson', seasons: ['2000-01', '2005-06'] },
  { id: 'wadedw01', name: 'Dwyane Wade', seasons: ['2008-09', '2005-06'] },
  { id: 'leonaka01', name: 'Kawhi Leonard', seasons: ['2018-19', '2015-16'] },
  { id: 'jokicni01', name: 'Nikola Jokić', seasons: ['2021-22', '2023-24'] },
  { id: 'doncilu01', name: 'Luka Dončić', seasons: ['2023-24', '2022-23'] },
  { id: 'abdursh01', name: 'Shareef Abdur-Rahim', seasons: [] }, // skip
  { id: 'chambwi01', name: 'Wilt Chamberlain', seasons: ['1961-62', '1966-67'] },
  { id: 'abdulka01', name: 'Kareem Abdul-Jabbar', seasons: ['1971-72', '1975-76'] },
  { id: 'malonka01', name: 'Karl Malone', seasons: ['1996-97', '1989-90'] },
  { id: 'stockjo01', name: 'John Stockton', seasons: ['1989-90', '1990-91'] },
  { id: 'robinda01', name: 'David Robinson', seasons: ['1993-94', '1994-95'] },
  { id: 'garneke01', name: 'Kevin Garnett', seasons: ['2003-04', '2007-08'] },
  { id: 'piercpa01', name: 'Paul Pierce', seasons: ['2001-02', '2007-08'] },
  { id: 'mcgratr01', name: 'Tracy McGrady', seasons: ['2002-03', '2000-01'] },
  { id: 'nashst01', name: 'Steve Nash', seasons: ['2004-05', '2005-06'] },
  { id: 'westbru01', name: 'Russell Westbrook', seasons: ['2016-17', '2014-15'] },
  { id: 'hardeja01', name: 'James Harden', seasons: ['2018-19', '2014-15'] },
  { id: 'embiijo01', name: 'Joel Embiid', seasons: ['2022-23', '2023-24'] },
  { id: 'tatumja01', name: 'Jayson Tatum', seasons: ['2022-23', '2023-24'] },
  { id: 'gilgesh01', name: 'Shai Gilgeous-Alexander', seasons: ['2023-24'] },
  { id: 'edwaran01', name: 'Anthony Edwards', seasons: ['2023-24'] },
  { id: 'davisan02', name: 'Anthony Davis', seasons: ['2017-18', '2019-20'] },
  { id: 'paulch01', name: 'Chris Paul', seasons: ['2007-08', '2013-14'] },
  { id: 'howardw01', name: 'Dwight Howard', seasons: ['2010-11', '2008-09'] },
  { id: 'wallara01', name: 'Rasheed Wallace', seasons: [] },
  { id: 'cartevi01', name: 'Vince Carter', seasons: ['2000-01', '2006-07'] },
  { id: 'allenra02', name: 'Ray Allen', seasons: ['2005-06', '2000-01'] },
  { id: 'millere01', name: 'Reggie Miller', seasons: ['1993-94', '1999-00'] },
  { id: 'thomais01', name: 'Isiah Thomas', seasons: ['1984-85', '1988-89'] },
  { id: 'ewingpa01', name: 'Patrick Ewing', seasons: ['1989-90', '1993-94'] },
  { id: 'mutomdi01', name: 'Dikembe Mutombo', seasons: ['1999-00', '1995-96'] },
  { id: 'rodmade01', name: 'Dennis Rodman', seasons: ['1991-92', '1997-98'] },
  { id: 'pippesc01', name: 'Scottie Pippen', seasons: ['1993-94', '1995-96'] },
  { id: 'georgpa01', name: 'Paul George', seasons: ['2018-19', '2013-14'] },
  { id: 'butleji01', name: 'Jimmy Butler', seasons: ['2020-21', '2016-17'] },
  { id: 'lillada01', name: 'Damian Lillard', seasons: ['2019-20', '2022-23'] },
  { id: 'bookede01', name: 'Devin Booker', seasons: ['2021-22', '2023-24'] },
  { id: 'moranja01', name: 'Ja Morant', seasons: ['2021-22'] },
  { id: 'youngtr01', name: 'Trae Young', seasons: ['2021-22', '2019-20'] },
  { id: 'gilmoch01', name: 'Artis Gilmore', seasons: [] },
  { id: 'ervinju01', name: 'Julius Erving', seasons: ['1980-81', '1982-83'] },
  { id: 'willibu01', name: 'Buck Williams', seasons: [] },
  { id: 'barklch01', name: 'Charles Barkley', seasons: ['1992-93', '1987-88'] },
  { id: 'wilkido01', name: 'Dominique Wilkins', seasons: ['1985-86', '1992-93'] },
  { id: 'drexlcl01', name: 'Clyde Drexler', seasons: ['1991-92', '1987-88'] },
  { id: 'paytoga01', name: 'Gary Payton', seasons: ['1995-96', '1999-00'] },
  { id: 'malonmo01', name: 'Moses Malone', seasons: ['1981-82', '1982-83'] },
  { id: 'walkean02', name: 'Antoine Walker', seasons: [] },
  { id: 'bryanko01', name: 'Kobe Bryant', seasons: ['2008-09'] }, // already have
]

// Dedupe by id and merge seasons
const byId = new Map()
for (const t of TARGETS) {
  if (!t.seasons.length) continue
  const prev = byId.get(t.id)
  if (prev) {
    prev.seasons = [...new Set([...prev.seasons, ...t.seasons])]
  } else {
    byId.set(t.id, { ...t, seasons: [...t.seasons] })
  }
}
const PLAYERS = [...byId.values()]

const sleep = ms => new Promise(r => setTimeout(r, ms))

function teamName(code) {
  const map = {
    ATL: 'Atlanta Hawks', BOS: 'Boston Celtics', BRK: 'Brooklyn Nets', NJN: 'New Jersey Nets',
    CHA: 'Charlotte Hornets', CHH: 'Charlotte Hornets', CHO: 'Charlotte Hornets',
    CHI: 'Chicago Bulls', CLE: 'Cleveland Cavaliers', DAL: 'Dallas Mavericks',
    DEN: 'Denver Nuggets', DET: 'Detroit Pistons', GSW: 'Golden State Warriors',
    HOU: 'Houston Rockets', IND: 'Indiana Pacers', LAC: 'Los Angeles Clippers',
    LAL: 'Los Angeles Lakers', MEM: 'Memphis Grizzlies', VAN: 'Vancouver Grizzlies',
    MIA: 'Miami Heat', MIL: 'Milwaukee Bucks', MIN: 'Minnesota Timberwolves',
    NOH: 'New Orleans Hornets', NOP: 'New Orleans Pelicans', NOK: 'New Orleans/Oklahoma City Hornets',
    NYK: 'New York Knicks', OKC: 'Oklahoma City Thunder', SEA: 'Seattle SuperSonics',
    ORL: 'Orlando Magic', PHI: 'Philadelphia 76ers', PHO: 'Phoenix Suns', PHX: 'Phoenix Suns',
    POR: 'Portland Trail Blazers', SAC: 'Sacramento Kings', KCK: 'Kansas City Kings',
    SAS: 'San Antonio Spurs', TOR: 'Toronto Raptors', UTA: 'Utah Jazz',
    WAS: 'Washington Wizards', WSB: 'Washington Bullets', BAL: 'Baltimore Bullets',
    BUF: 'Buffalo Braves', SDC: 'San Diego Clippers', SFW: 'San Francisco Warriors',
    SDR: 'San Diego Rockets', CIN: 'Cincinnati Royals', SYR: 'Syracuse Nationals',
    ROC: 'Rochester Royals', FTW: 'Fort Wayne Pistons', MNL: 'Minneapolis Lakers',
    TOT: '2TM', '2TM': 'Multiple Teams', '3TM': 'Multiple Teams',
  }
  return map[code] || code
}

function parseNum(s) {
  if (s == null) return null
  const t = String(s).trim()
  if (t === '' || t === '-') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function pctToDisplay(decimal) {
  if (decimal == null) return null
  // BBR stores as .467 — display as 46.7
  return Math.round(decimal * 1000) / 10
}

async function fetchHtml(id) {
  const cachePath = join(CACHE, `${id}.html`)
  if (existsSync(cachePath)) {
    return readFileSync(cachePath, 'utf8')
  }
  const letter = id[0]
  const url = `https://www.basketball-reference.com/players/${letter}/${id}.html`
  console.error(`Fetching ${url}`)
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'GuessTheNumbersNBA/1.0 (educational stats game; respectful crawl; contact: local-dev)',
      'Accept': 'text/html',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${id}`)
  const html = await res.text()
  writeFileSync(cachePath, html)
  await sleep(3500) // rate limit
  return html
}

function extractPerGameTable(html) {
  // Tables are often comment-wrapped on BBR
  const uncommented = html.replace(/<!--([\s\S]*?)-->/g, '$1')
  // Prefer regular-season per_game_stats (not playoffs)
  let m = uncommented.match(/<table[^>]*id="per_game_stats"[^>]*>([\s\S]*?)<\/table>/i)
  if (!m) m = uncommented.match(/<table[^>]*id="per_game"[^>]*>([\s\S]*?)<\/table>/i)
  if (!m) return null
  return m[1]
}

function parseRows(tableInner) {
  const rows = []
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let tr
  while ((tr = trRe.exec(tableInner))) {
    const inner = tr[1]
    if (/thead|colhead|over_header/i.test(tr[0]) && !/<td/i.test(inner)) continue
    const get = (stat) => {
      const re = new RegExp(`data-stat="${stat}"[^>]*>([\\s\\S]*?)</t[dh]>`, 'i')
      const mm = inner.match(re)
      if (!mm) return null
      return mm[1].replace(/<[^>]+>/g, '').trim()
    }
    const season = get('year_id') || get('season')
    if (!season || !/^\d{4}-\d{2}$/.test(season)) continue
    const team = get('team_name_abbr') || get('team_id')
    rows.push({
      season,
      team: team || null,
      g: parseNum(get('games') || get('g')),
      pts: parseNum(get('pts_per_g') || get('pts')),
      trb: parseNum(get('trb_per_g') || get('trb')),
      ast: parseNum(get('ast_per_g') || get('ast')),
      stl: parseNum(get('stl_per_g') || get('stl')),
      blk: parseNum(get('blk_per_g') || get('blk')),
      fg_pct: parseNum(get('fg_pct')),
      fg3_pct: parseNum(get('fg3_pct')),
      ft_pct: parseNum(get('ft_pct')),
      pos: get('pos'),
      mp: parseNum(get('mp_per_g') || get('mp')),
    })
  }
  return rows
}

function pickSeason(rows, season) {
  const matches = rows.filter(r => r.season === season)
  if (!matches.length) return null
  // Prefer TOT / 2TM / 3TM for multi-team
  const tot = matches.find(r => r.team === 'TOT' || r.team === '2TM' || r.team === '3TM')
  if (tot) return tot
  // If multiple team rows without TOT, pick the one with most games
  if (matches.length > 1) {
    return matches.reduce((a, b) => (a.g || 0) >= (b.g || 0) ? a : b)
  }
  return matches[0]
}

function displayTeam(code, rows, season) {
  if (!code || code === 'TOT' || code === '2TM' || code === '3TM') {
    const parts = rows.filter(r => r.season === season && r.team && !['TOT','2TM','3TM'].includes(r.team))
    if (parts.length) return parts.map(p => teamName(p.team)).join(' / ')
    return 'Multiple Teams'
  }
  return teamName(code)
}

async function main() {
  const records = []
  const errors = []

  for (const p of PLAYERS) {
    try {
      const html = await fetchHtml(p.id)
      const table = extractPerGameTable(html)
      if (!table) {
        errors.push({ id: p.id, error: 'no per_game table' })
        continue
      }
      const rows = parseRows(table)
      const letter = p.id[0]
      const sourceUrl = `https://www.basketball-reference.com/players/${letter}/${p.id}.html`

      for (const season of p.seasons) {
        const row = pickSeason(rows, season)
        if (!row) {
          errors.push({ id: p.id, season, error: 'season not found' })
          continue
        }
        // Validate required counting stats present
        if (row.pts == null || row.trb == null || row.ast == null) {
          errors.push({ id: p.id, season, error: 'missing core stats', row })
          continue
        }
        // STL/BLK may be null for very old eras (pre-1973) — keep as null (missing, not zero)
        records.push({
          id: `${p.id}_${season}`,
          player: p.name,
          playerId: p.id,
          season,
          team: displayTeam(row.team, rows, season),
          teamCode: row.team,
          position: row.pos || null,
          games: row.g,
          minutes: row.mp,
          stats: {
            ppg: row.pts,
            rpg: row.trb,
            apg: row.ast,
            spg: row.stl, // may be null
            bpg: row.blk, // may be null
            fgPct: pctToDisplay(row.fg_pct),
            tpPct: pctToDisplay(row.fg3_pct), // may be null if no 3PA
            ftPct: pctToDisplay(row.ft_pct),
          },
          sourceUrl,
          source: 'Basketball Reference',
          verified: true,
        })
        console.error(`OK ${p.name} ${season} PPG=${row.pts}`)
      }
    } catch (e) {
      errors.push({ id: p.id, error: String(e) })
      console.error(`ERR ${p.id}`, e.message)
    }
  }

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'https://www.basketball-reference.com/',
      note: 'Regular-season per-game statistics. Percentages stored as e.g. 46.7 meaning 46.7%. null means missing/unavailable, not zero. Multi-team seasons use TOT row.',
      count: records.length,
    },
    seasons: records,
    errors,
  }
  writeFileSync(OUT, JSON.stringify(payload, null, 2))
  console.error(`Wrote ${records.length} records to ${OUT}`)
  if (errors.length) console.error('Errors:', JSON.stringify(errors, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
