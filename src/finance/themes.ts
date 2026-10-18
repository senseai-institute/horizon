import type { CoreTarget, Theme } from './types'

/**
 * What you can bet on, and the fund that stands for it. Real tickers, so the
 * table carries over when a real broker is wired in — check each one is
 * tradable there first (some commodity notes are thinly traded or delisted).
 * Drift, volatility and base price only drive the mock price engine.
 */
const t = (key: string, label: string, symbol: string, aliases: string[], drift: number, vol: number, base: number): Theme => ({ key, label, symbol, aliases, drift, vol, base })

export const seedThemes: Theme[] = [
  t('coffee', 'Coffee', 'JO', ['coffee beans', 'arabica'], -0.18, 0.32, 62),
  t('nuclear', 'Nuclear', 'URA', ['uranium', 'nuclear power', 'nuclear energy'], 0.24, 0.3, 26),
  t('copper', 'Copper', 'CPER', ['copper prices'], 0.12, 0.22, 24),
  t('office real estate', 'Office real estate', 'BXP', ['office reits', 'office reit', 'offices', 'office space', 'commercial real estate'], -0.06, 0.3, 68),
  t('ai chips', 'AI chips', 'SMH', ['semiconductors', 'chips', 'semis', 'gpus', 'ai'], 0.22, 0.32, 210),
  t('japan', 'Japan', 'EWJ', ['japanese stocks', 'nikkei'], 0.07, 0.16, 68),
  t('gold', 'Gold', 'GLD', ['bullion'], 0.28, 0.14, 185),
  t('silver', 'Silver', 'SLV', [], 0.1, 0.26, 22),
  t('oil', 'Oil', 'USO', ['crude', 'crude oil'], -0.04, 0.3, 72),
  t('natural gas', 'Natural gas', 'UNG', ['nat gas', 'gas prices'], -0.15, 0.45, 15),
  t('bitcoin', 'Bitcoin', 'IBIT', ['btc', 'crypto'], 0.25, 0.5, 38),
  t('ethereum', 'Ethereum', 'ETHA', ['eth', 'ether'], 0.15, 0.6, 22),
  t('china', 'China', 'MCHI', ['chinese stocks'], 0.04, 0.28, 46),
  t('india', 'India', 'INDA', ['indian stocks'], 0.11, 0.17, 50),
  t('emerging markets', 'Emerging markets', 'EEM', ['em'], 0.06, 0.18, 42),
  t('europe', 'Europe', 'VGK', ['european stocks'], 0.06, 0.16, 64),
  t('uk', 'UK', 'EWU', ['britain', 'british stocks', 'ftse'], 0.05, 0.15, 34),
  t('germany', 'Germany', 'EWG', ['german stocks', 'dax'], 0.06, 0.18, 30),
  t('brazil', 'Brazil', 'EWZ', ['brazilian stocks'], 0.03, 0.3, 29),
  t('mexico', 'Mexico', 'EWW', ['mexican stocks', 'nearshoring'], 0.05, 0.24, 58),
  t('solar', 'Solar', 'TAN', ['solar power', 'solar panels'], -0.05, 0.38, 40),
  t('clean energy', 'Clean energy', 'ICLN', ['renewables', 'green energy', 'wind'], 0.0, 0.28, 13),
  t('lithium', 'Lithium and batteries', 'LIT', ['batteries', 'battery'], -0.02, 0.34, 44),
  t('electric vehicles', 'Electric vehicles', 'DRIV', ['evs', 'ev', 'electric cars'], 0.02, 0.3, 24),
  t('cybersecurity', 'Cybersecurity', 'CIBR', ['cyber', 'security software'], 0.14, 0.24, 58),
  t('cloud', 'Cloud computing', 'SKYY', ['cloud software', 'saas'], 0.1, 0.28, 95),
  t('robotics', 'Robotics', 'BOTZ', ['robots', 'automation'], 0.12, 0.28, 30),
  t('biotech', 'Biotech', 'XBI', ['biotechnology'], 0.05, 0.34, 88),
  t('cannabis', 'Cannabis', 'MSOS', ['weed', 'marijuana'], -0.35, 0.55, 8),
  t('homebuilders', 'Homebuilders', 'ITB', ['housing', 'home building', 'new homes'], 0.07, 0.3, 105),
  t('regional banks', 'Regional banks', 'KRE', ['small banks'], 0.04, 0.3, 58),
  t('banks', 'Big banks', 'XLF', ['financials', 'big banks'], 0.1, 0.18, 48),
  t('long bonds', 'Long treasuries', 'TLT', ['treasuries', 'long treasuries', 'bonds', 'interest rates falling'], 0.0, 0.16, 90),
  t('junk bonds', 'High-yield bonds', 'HYG', ['high yield', 'high-yield bonds'], 0.04, 0.08, 78),
  t('utilities', 'Utilities', 'XLU', ['power utilities', 'electricity demand'], 0.08, 0.16, 78),
  t('defense', 'Defense', 'ITA', ['defence', 'aerospace', 'weapons'], 0.13, 0.2, 150),
  t('airlines', 'Airlines', 'JETS', ['air travel', 'travel'], 0.03, 0.32, 22),
  t('video games', 'Video games', 'ESPO', ['gaming', 'esports'], 0.12, 0.26, 80),
  t('wheat', 'Wheat', 'WEAT', ['grain'], -0.06, 0.28, 5),
  t('small caps', 'US small caps', 'IWM', ['small companies', 'russell'], 0.06, 0.22, 220),
  t('nasdaq', 'Nasdaq 100', 'QQQ', ['tech', 'big tech'], 0.14, 0.2, 480),
  t('water', 'Water', 'PHO', ['water utilities', 'water scarcity'], 0.08, 0.17, 68),
  t('space', 'Space', 'UFO', ['satellites', 'space economy'], 0.06, 0.3, 26),
  t('rare earths', 'Rare earths', 'REMX', ['rare earth metals', 'critical minerals'], 0.02, 0.36, 48),
  t('shipping', 'Dry-bulk shipping', 'BDRY', ['freight', 'shipping rates'], -0.05, 0.6, 9),
  t('retail', 'Retail', 'XRT', ['shops', 'malls', 'consumer spending'], 0.02, 0.25, 76),
]

/** The boring 80%. Drift and volatility for the mock engine live here too. */
export const seedCoreTargets: CoreTarget[] = [
  { symbol: 'VTI', label: 'US total market', weight: 50 },
  { symbol: 'VXUS', label: 'World ex-US', weight: 20 },
  { symbol: 'BND', label: 'US bonds', weight: 30 },
]

export const CORE_ENGINE: Record<string, { drift: number; vol: number; base: number }> = {
  VTI: { drift: 0.09, vol: 0.16, base: 255 },
  VXUS: { drift: 0.06, vol: 0.15, base: 60 },
  BND: { drift: 0.03, vol: 0.05, base: 72 },
  VT: { drift: 0.08, vol: 0.15, base: 110 },
  VOO: { drift: 0.09, vol: 0.16, base: 480 },
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

/** Exact match on a key or an alias, ignoring case, punctuation and a trailing "s". */
export function findTheme(themes: Theme[], thing: string): Theme | undefined {
  const q = norm(thing)
  const forms = [q, q.replace(/s$/, ''), `${q}s`, q.replace(/^the /, ''), q.replace(/ prices?$/, '')]
  for (const th of themes) {
    const names = [th.key, th.label, th.symbol, ...th.aliases].map(norm)
    if (forms.some((f) => names.includes(f))) return th
  }
  return undefined
}

function bigrams(s: string): Set<string> {
  const out = new Set<string>()
  const p = ` ${s} `
  for (let i = 0; i < p.length - 1; i++) out.add(p.slice(i, i + 2))
  return out
}

function similarity(a: string, b: string): number {
  const A = bigrams(a)
  const B = bigrams(b)
  let both = 0
  for (const x of A) if (B.has(x)) both++
  const dice = (2 * both) / (A.size + B.size)
  const words = a.split(' ')
  const wordHit = words.some((w) => w.length > 2 && b.split(' ').some((v) => v.startsWith(w) || w.startsWith(v))) ? 0.25 : 0
  return dice + wordHit
}

/** The three closest themes to something the table does not know. */
export function closestThemes(themes: Theme[], thing: string, n = 3): Theme[] {
  const q = norm(thing)
  return themes
    .map((th) => ({ th, score: Math.max(...[th.key, th.label, ...th.aliases].map((name) => similarity(q, norm(name)))) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.th)
}
