// Roster: Current NBA (September 2023). Basic facts per player:
// [name, positions, team, height in inches, overall]
// Extend this list (or replace with an imported CSV/JSON) to add more players.
const raw = [
  ['James Harden', 'PG/SG', 'Philadelphia 76ers', 77, 89],
  ['Tyrese Maxey', 'SG/PG', 'Philadelphia 76ers', 74, 85],
  ['Tobias Harris', 'SF/PF', 'Philadelphia 76ers', 79, 81],
  ['P.J. Tucker', 'PF/SF', 'Philadelphia 76ers', 77, 75],
  ['Joel Embiid', 'C', 'Philadelphia 76ers', 84, 96],
  ['Furkan Korkmaz', 'SG/SF', 'Philadelphia 76ers', 79, 70],
  ['Patrick Beverley', 'PG/SG', 'Philadelphia 76ers', 74, 76],
  ["De'Anthony Melton", 'SG/PG', 'Philadelphia 76ers', 74, 78],
  ['Mohamed Bamba', 'C', 'Philadelphia 76ers', 84, 76],
  ['Danuel House', 'SF/PF', 'Philadelphia 76ers', 78, 73],
  ['Montrezl Harrell', 'C', 'Philadelphia 76ers', 79, 75],
  ['Paul Reed', 'PF/C', 'Philadelphia 76ers', 81, 76],
  ['Jaden Springer', 'SG/PG', 'Philadelphia 76ers', 76, 70],
  ['Filip Petrusev', 'PF/C', 'Philadelphia 76ers', 83, 70],
  ['Jrue Holiday', 'PG/SG', 'Milwaukee Bucks', 77, 87],
  ['Grayson Allen', 'SG/SF', 'Milwaukee Bucks', 76, 75],
  ['Khris Middleton', 'SF/PF', 'Milwaukee Bucks', 79, 85],
  ['Giannis Antetokounmpo', 'PF/SF', 'Milwaukee Bucks', 84, 96],
  ['Brook Lopez', 'C', 'Milwaukee Bucks', 85, 84],
  ['Bobby Portis Jr.', 'C/PF', 'Milwaukee Bucks', 83, 82],
  ['Pat Connaughton', 'SF/SG', 'Milwaukee Bucks', 77, 75],
  ['Jae Crowder', 'PF/SF', 'Milwaukee Bucks', 78, 75],
  ['Malik Beasley', 'SG/SF', 'Milwaukee Bucks', 76, 75],
  ['MarJon Beauchamp', 'SF/SG', 'Milwaukee Bucks', 79, 73],
  ['Robin Lopez', 'C', 'Milwaukee Bucks', 84, 73],
  ['A.J. Green', 'SG/SF', 'Milwaukee Bucks', 77, 71],
  ['Andre Jackson Jr.', 'SG/SF', 'Milwaukee Bucks', 78, 70],
  ['Chris Livingston', 'SF/PF', 'Milwaukee Bucks', 78, 69],
  ['Lindell Wigginton', 'PG/SG', 'Milwaukee Bucks', 73, 70],
  ['Lonzo Ball', 'PG/SG', 'Chicago Bulls', 78, 81],
  ['Alex Caruso', 'SG/SF', 'Chicago Bulls', 77, 78],
  ['Zach LaVine', 'SF/SG', 'Chicago Bulls', 77, 86],
  ['DeMar DeRozan', 'PF/SF', 'Chicago Bulls', 78, 86],
  ['Nikola Vucevic', 'C', 'Chicago Bulls', 82, 84],
  ['Andre Drummond', 'C', 'Chicago Bulls', 83, 77],
  ['Ayo Dosunmu', 'PG/SG', 'Chicago Bulls', 77, 74],
  ['Jevon Carter', 'PG/SG', 'Chicago Bulls', 73, 75],
  ['Patrick Williams', 'PF/SF', 'Chicago Bulls', 79, 77],
  ['Torrey Craig', 'PF/SF', 'Chicago Bulls', 79, 75],
  ['Coby White', 'SG/PG', 'Chicago Bulls', 77, 76],
  ['Dalen Terry', 'SF/SG', 'Chicago Bulls', 79, 72],
  ['Carlik Jones', 'PG/SG', 'Chicago Bulls', 72, 67],
  ['Darius Garland', 'PG/SG', 'Cleveland Cavaliers', 73, 86],
  ['Donovan Mitchell', 'SG/PG', 'Cleveland Cavaliers', 73, 92],
  ['Isaac Okoro', 'SF/SG', 'Cleveland Cavaliers', 77, 76],
  ['Evan Mobley', 'PF/C', 'Cleveland Cavaliers', 83, 85],
  ['Jarrett Allen', 'C', 'Cleveland Cavaliers', 81, 83],
  ['Caris LeVert', 'SG/SF', 'Cleveland Cavaliers', 78, 78],
]

export const ATTRS = [
  'Shot Close', 'Shot Mid', 'Shot 3PT', 'Free Throw', 'Driving Layup', 'Driving Dunk',
  'Standing Dunk', 'Post Control', 'Pass Accuracy', 'Ball Handle', 'Speed', 'Acceleration',
  'Strength', 'Vertical', 'Stamina', 'Interior Defense', 'Perimeter Defense', 'Steal',
  'Block', 'Off. Rebound', 'Def. Rebound',
]

// Placeholder attribute values derived from overall + position.
// Replace with real values when you have a data source.
function seed(str) {
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return () => ((h = (h * 1103515245 + 12345) >>> 0) % 1000) / 1000
}
function attrsFor(name, pos, ovr) {
  const r = seed(name)
  const big = pos.startsWith('C') || pos.startsWith('PF')
  const bigBias = ['Standing Dunk', 'Post Control', 'Strength', 'Interior Defense', 'Block', 'Off. Rebound', 'Def. Rebound']
  const smallBias = ['Shot 3PT', 'Ball Handle', 'Speed', 'Acceleration', 'Pass Accuracy', 'Perimeter Defense', 'Steal']
  return Object.fromEntries(ATTRS.map(a => {
    let v = ovr - 12 + Math.round(r() * 20)
    if (bigBias.includes(a)) v += big ? 8 : -12
    if (smallBias.includes(a)) v += big ? -12 : 6
    return [a, Math.max(25, Math.min(99, v))]
  }))
}

export const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
export const fmtHeight = h => `${Math.floor(h / 12)}'${h % 12}"`

export const players = raw.map(([name, pos, team, height, ovr], i) => ({
  id: i, name, pos, team, height, ovr, slug: slug(name), attrs: attrsFor(name, pos, ovr),
}))
