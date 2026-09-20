/**
 * The example notebook Horizon ships with.
 *
 * Everything here is fabricated. The companies and form types are real, but
 * the passages attributed to them are illustrative prose written for this
 * prototype — they are not quotations from any actual filing. Source links
 * point at EDGAR's public search so a reader can go and find the real
 * document for themselves. Nothing in this file touches a network.
 */

import type {
  DiscoverySeed,
  Evidence,
  Goal,
  GraphEdge,
  GraphNode,
  Habit,
  JournalEntry,
  ReviewItem,
  Sleeve,
  ValueDef,
  ValueStance,
  ValueWeight,
} from '../lib/types'

const edgar = (ticker: string, form: string) =>
  `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&ticker=${ticker}&type=${form}&dateb=&owner=include&count=40`

/* ------------------------------------------------------------------ */
/* Pillars — the broadest beliefs. Everything else hangs off these.     */
/* ------------------------------------------------------------------ */

const pillars: GraphNode[] = [
  {
    id: 'p-outsourced',
    kind: 'pillar',
    label: 'Outsourced Living',
    claim:
      'Households keep converting their own unpaid labour into paid services. Cooking, cleaning, repairs, pet care and errands move, one category at a time, from something you do to something you buy — and the share of household spending going to services keeps climbing through the next cycle.',
    horizonYears: 10,
    falsifiers: [
      'Services share of household consumption stalls or reverses for eight consecutive quarters outside a recession.',
      'Take rates at the large service marketplaces compress below 12% as households go back to doing the work themselves.',
      'Real median wages fall far enough that paid help becomes unaffordable for the middle three income quintiles.',
    ],
    prior: 72,
    createdAt: '2025-11-04T09:12:00Z',
  },
  {
    id: 'p-grid',
    kind: 'pillar',
    label: 'The Grid Deficit',
    claim:
      'The electrical system is being asked to carry loads it was never built for, and the equipment, transmission and generation needed to close the gap take longer to build than the demand takes to arrive. The shortfall gets paid for — in capital spending, in equipment pricing power, and in the price of firm power.',
    horizonYears: 12,
    falsifiers: [
      'Utility-scale load growth forecasts are revised down two years running and capex plans follow.',
      'Transformer and switchgear lead times fall back under 40 weeks with pricing normalising.',
      'Efficiency gains in computing cut data-centre power draw faster than new sites are added.',
    ],
    prior: 78,
    createdAt: '2025-11-04T09:41:00Z',
  },
  {
    id: 'p-trust',
    kind: 'pillar',
    label: 'Trust Moves Online',
    claim:
      'The last thing to move online is the part that needed a person to vouch for it. Local, trust-dependent commerce — the plumber, the groomer, the contractor — finishes its migration to digital intermediaries, and whoever holds the payment, the schedule and the verification holds the relationship.',
    horizonYears: 8,
    falsifiers: [
      'Service professionals durably route repeat business off-platform and marketplace take rates fall.',
      'No marketplace reaches enough density in a major metro to make search reliable, and word of mouth stays dominant.',
      'Regulation forces platforms to classify professionals as employees in a way that breaks marketplace economics.',
    ],
    prior: 64,
    createdAt: '2025-11-19T14:05:00Z',
  },
]

/* ------------------------------------------------------------------ */
/* Theses — narrower claims hanging off the pillars.                   */
/* ------------------------------------------------------------------ */

const theses: GraphNode[] = [
  {
    id: 't-food',
    kind: 'thesis',
    label: 'Food preparation outsourced',
    claim:
      'The share of meals a household cooks from raw ingredients keeps falling, and it does not come back after a downturn. Delivery, prepared food and fast casual take the volume, and the habit sticks because the time saved is worth more than the premium paid.',
    horizonYears: 7,
    falsifiers: [
      'Food-away-from-home share of food spending falls for six straight quarters.',
      'Delivery order frequency among existing cohorts declines rather than flattening.',
      'Grocery basket size grows while restaurant traffic falls for a full year outside a recession.',
    ],
    prior: 70,
    createdAt: '2025-11-05T10:20:00Z',
  },
  {
    id: 't-home-repair',
    kind: 'thesis',
    label: 'Home maintenance intermediated',
    claim:
      'Finding and paying someone to fix your house stops being a phone-a-friend problem. Marketplaces, franchised service brands and manufacturer-owned service networks capture the job, and the homeowner stops holding the relationship with the individual tradesperson.',
    horizonYears: 8,
    falsifiers: [
      'Marketplace lead-conversion rates keep falling and pros abandon paid lead generation.',
      'Franchise service brands see unit economics deteriorate as labour costs outpace ticket prices.',
      'Homeowners defer maintenance durably enough to shrink the addressable spend.',
    ],
    prior: 62,
    createdAt: '2025-11-05T10:44:00Z',
  },
  {
    id: 't-pet',
    kind: 'thesis',
    label: 'Pet care professionalises',
    claim:
      'Pets move from animals kept at home to dependants with a care budget. Veterinary spend per animal, insurance attachment and prepared-diet penetration all rise, and the spend proves less cyclical than discretionary retail.',
    horizonYears: 8,
    falsifiers: [
      'Veterinary visit volumes decline for more than a year while pricing carries the category.',
      'Pet insurance attachment stalls below 5% of US households.',
      'Household pet formation reverses after the post-2020 cohort ages out.',
    ],
    prior: 66,
    createdAt: '2025-11-06T08:30:00Z',
  },
  {
    id: 't-care',
    kind: 'thesis',
    label: 'Childcare & eldercare formalise',
    claim:
      'Care work currently done unpaid inside families moves into paid, credentialed, platform-mediated arrangements — pushed by demographics on one side and by two-earner households on the other.',
    horizonYears: 12,
    falsifiers: [
      'Public subsidy structures collapse the private market rather than expanding it.',
      'Informal family care share holds flat through the next decade of ageing.',
      'Platform models fail repeatedly on liability and background-check risk.',
    ],
    prior: 55,
    createdAt: '2026-01-14T16:20:00Z',
  },
  {
    id: 't-dc-load',
    kind: 'thesis',
    label: 'Data-centre load outruns plans',
    claim:
      'Interconnection queues and announced campus builds imply load growth well above what utility integrated resource plans assume. The gap is closed late and expensively, which is good for whoever sells the capacity and the equipment.',
    horizonYears: 8,
    falsifiers: [
      'Announced campuses are cancelled or deferred at a rate above 30% of nameplate.',
      'Compute efficiency improvements cut power per unit of work faster than workloads grow.',
      'Utilities successfully revise plans upward early and procurement normalises.',
    ],
    prior: 76,
    createdAt: '2025-11-07T11:05:00Z',
  },
  {
    id: 't-equipment',
    kind: 'thesis',
    label: 'Grid equipment constrained',
    claim:
      'Transformers, switchgear and breakers stay on long lead times because the bottleneck is skilled labour and specialised steel, not order books. Constrained supply plus non-deferrable demand means pricing holds far longer than a normal cycle.',
    horizonYears: 6,
    falsifiers: [
      'Lead times normalise below 40 weeks across the major suppliers.',
      'New capacity comes online fast enough that backlog coverage falls below a year.',
      'Order cancellations rise while backlog is still being reported as firm.',
    ],
    prior: 74,
    createdAt: '2025-11-07T11:31:00Z',
  },
  {
    id: 't-transmission',
    kind: 'thesis',
    label: 'Transmission unblocked',
    claim:
      'Permitting and siting reform, plus visible reliability scares, loosen the constraint on long-haul transmission. The build runs for a decade and the engineering and construction capacity to do it is scarce.',
    horizonYears: 12,
    falsifiers: [
      'Major interregional projects keep failing at state siting after federal reform.',
      'Cost allocation disputes stall approved projects past their in-service dates.',
      'Load growth is met locally by behind-the-meter generation instead.',
    ],
    prior: 58,
    createdAt: '2025-11-08T09:15:00Z',
  },
  {
    id: 't-behind-meter',
    kind: 'thesis',
    label: 'Large loads go behind the meter',
    claim:
      'Rather than wait years for interconnection, large consumers contract directly for firm generation — existing nuclear, gas, on-site turbines. The value of existing dispatchable capacity gets repriced upward.',
    horizonYears: 7,
    falsifiers: [
      'Regulators block or heavily tax co-location arrangements.',
      'Interconnection queues clear fast enough that waiting becomes cheaper than contracting.',
      'Power purchase pricing for existing capacity fails to rise with demand.',
    ],
    prior: 68,
    createdAt: '2025-11-08T09:52:00Z',
  },
  {
    id: 't-discovery-consolidation',
    kind: 'thesis',
    label: 'Local discovery consolidates',
    claim:
      'Finding a local professional collapses into two or three destinations per category. Density is the whole game: the marketplace with the most pros in a metro gives the most reliable search, which attracts more demand, which attracts more pros.',
    horizonYears: 7,
    falsifiers: [
      'Search or an AI assistant disintermediates marketplaces and sends demand straight to pros.',
      'Marketplace share in the largest metros stays fragmented across five or more players.',
      'Customer acquisition cost keeps rising faster than lifetime value at the leaders.',
    ],
    prior: 60,
    createdAt: '2025-11-20T10:10:00Z',
  },
  {
    id: 't-payments-moat',
    kind: 'thesis',
    label: 'Payments beat listings',
    claim:
      'The durable position is not the directory. It is holding the scheduling, the invoice and the money. Once payment runs through the platform, the relationship does too, and the take rate stops being a lead-generation fee and starts being a payments fee.',
    horizonYears: 6,
    falsifiers: [
      'Payment volume through vertical platforms grows but attach rates on software stall.',
      'Pros keep routing payment off-platform at scale.',
      'Interchange or regulatory changes compress payment economics below software economics.',
    ],
    prior: 69,
    createdAt: '2025-11-21T15:42:00Z',
  },
  {
    id: 't-verification',
    kind: 'thesis',
    label: 'Verification as a platform',
    claim:
      'Licensing, insurance and background checking stop being the customer’s problem and become a service the platform performs and monetises. Whoever owns the risk data owns a piece of every transaction.',
    horizonYears: 9,
    falsifiers: [
      'Verification stays a commodity bundled free and never earns a fee.',
      'Liability rulings make platforms unwilling to vouch for professionals at all.',
      'State licensing regimes fragment badly enough to block national products.',
    ],
    prior: 56,
    createdAt: '2025-12-02T11:25:00Z',
  },
  {
    id: 't-labor-supply',
    kind: 'thesis',
    label: 'Trade labour keeps shrinking',
    claim:
      'The supply of licensed electricians, plumbers and HVAC technicians shrinks as the existing cohort retires faster than apprenticeships replace it. Scarce labour raises ticket prices, and raises the value of anything that routes that labour efficiently.',
    horizonYears: 10,
    falsifiers: [
      'Apprenticeship completions rise fast enough to hold the licensed headcount flat.',
      'Service ticket prices stop outpacing general inflation for two years.',
      'Tooling or prefabrication cuts labour hours per job enough to offset the shortfall.',
    ],
    prior: 71,
    createdAt: '2025-12-03T09:05:00Z',
  },
]

/* ------------------------------------------------------------------ */
/* Categories — how the map groups companies.                          */
/* ------------------------------------------------------------------ */

const categories: GraphNode[] = [
  { id: 'c-delivery', kind: 'category', label: 'Delivery & prepared food', prior: 62, createdAt: '2025-11-05T12:00:00Z', businessDescription: 'Platforms and operators that put a finished meal in front of someone who would otherwise have cooked it.' },
  { id: 'c-home-services', kind: 'category', label: 'Home services & repair', prior: 60, createdAt: '2025-11-05T12:04:00Z', businessDescription: 'Marketplaces, franchised service brands and retailers that capture the maintenance of a house.' },
  { id: 'c-petcare', kind: 'category', label: 'Pet care & veterinary', prior: 64, createdAt: '2025-11-06T09:10:00Z', businessDescription: 'Diagnostics, retail, insurance and clinical care for animals kept as dependants.' },
  { id: 'c-grid-hardware', kind: 'category', label: 'Grid hardware', prior: 72, createdAt: '2025-11-07T12:15:00Z', businessDescription: 'Transformers, switchgear, breakers and the contractors who install them.' },
  { id: 'c-power-gen', kind: 'category', label: 'Independent power', prior: 70, createdAt: '2025-11-08T10:20:00Z', businessDescription: 'Owners of dispatchable generation selling firm power into a tightening market.' },
  { id: 'c-datacenter', kind: 'category', label: 'Data centres', prior: 68, createdAt: '2025-11-07T12:40:00Z', businessDescription: 'The landlords and interconnection points of the compute build-out.' },
  { id: 'c-vertical-payments', kind: 'category', label: 'Software & payments', prior: 63, createdAt: '2025-11-21T16:10:00Z', businessDescription: 'Software that runs a small business and takes a cut of the money moving through it.' },
  { id: 'c-risk-data', kind: 'category', label: 'Risk data & verification', prior: 58, createdAt: '2025-12-02T12:00:00Z', businessDescription: 'Analytics, licensing and staffing infrastructure that decides who is allowed to do the work.' },
]

/* ------------------------------------------------------------------ */
/* Companies.                                                          */
/* ------------------------------------------------------------------ */

interface CompanySeed {
  id: string
  label: string
  ticker: string
  exchange: string
  marketCapB: number
  prior: number
  sicCode: string
  sicLabel: string
  businessDescription: string
  createdAt: string
}

const companySeeds: CompanySeed[] = [
  // Delivery & prepared food
  { id: 'co-dash', label: 'DoorDash', ticker: 'DASH', exchange: 'NASDAQ', marketCapB: 92, prior: 64, sicCode: '7389', sicLabel: 'Services — computer programmed, data processing', businessDescription: 'Local commerce platform connecting consumers with restaurants, grocers and retailers, plus a white-label fulfilment arm.', createdAt: '2025-11-05T12:20:00Z' },
  { id: 'co-uber', label: 'Uber Technologies', ticker: 'UBER', exchange: 'NYSE', marketCapB: 158, prior: 62, sicCode: '7389', sicLabel: 'Services — computer programmed, data processing', businessDescription: 'Mobility and delivery marketplace operating in mobility, delivery and freight segments.', createdAt: '2025-11-05T12:22:00Z' },
  { id: 'co-cmg', label: 'Chipotle Mexican Grill', ticker: 'CMG', exchange: 'NYSE', marketCapB: 71, prior: 58, sicCode: '5812', sicLabel: 'Retail — eating places', businessDescription: 'Owner-operated fast casual restaurants with a large digital order-ahead channel.', createdAt: '2025-11-05T12:25:00Z' },
  { id: 'co-wing', label: 'Wingstop', ticker: 'WING', exchange: 'NASDAQ', marketCapB: 9, prior: 55, sicCode: '5812', sicLabel: 'Retail — eating places', businessDescription: 'Franchised chicken wing restaurant brand built around delivery and carry-out rather than dine-in.', createdAt: '2025-11-05T12:27:00Z' },

  // Home services & repair
  { id: 'co-angi', label: 'Angi', ticker: 'ANGI', exchange: 'NASDAQ', marketCapB: 0.9, prior: 46, sicCode: '7389', sicLabel: 'Services — computer programmed, data processing', businessDescription: 'Home services marketplace matching homeowners with local service professionals.', createdAt: '2025-11-05T12:31:00Z' },
  { id: 'co-hd', label: 'Home Depot', ticker: 'HD', exchange: 'NYSE', marketCapB: 352, prior: 61, sicCode: '5211', sicLabel: 'Retail — lumber & other building materials', businessDescription: 'Home improvement retailer with a growing professional-contractor and installation-services business.', createdAt: '2025-11-05T12:33:00Z' },
  { id: 'co-rol', label: 'Rollins', ticker: 'ROL', exchange: 'NYSE', marketCapB: 26, prior: 67, sicCode: '7342', sicLabel: 'Services — disinfecting & pest control', businessDescription: 'Route-based pest control services to residential and commercial customers on recurring contracts.', createdAt: '2025-11-05T12:36:00Z' },
  { id: 'co-tt', label: 'Trane Technologies', ticker: 'TT', exchange: 'NYSE', marketCapB: 88, prior: 69, sicCode: '3585', sicLabel: 'Air conditioning & warm air heating equipment', businessDescription: 'HVAC equipment manufacturer with a large installed-base service and aftermarket business.', createdAt: '2025-11-05T12:38:00Z' },

  // Pet care & veterinary
  { id: 'co-chwy', label: 'Chewy', ticker: 'CHWY', exchange: 'NYSE', marketCapB: 16, prior: 59, sicCode: '5961', sicLabel: 'Retail — catalog & mail-order houses', businessDescription: 'Online pet retailer expanding into pharmacy, insurance and owned veterinary clinics.', createdAt: '2025-11-06T09:20:00Z' },
  { id: 'co-idxx', label: 'IDEXX Laboratories', ticker: 'IDXX', exchange: 'NASDAQ', marketCapB: 44, prior: 71, sicCode: '2835', sicLabel: 'In vitro & in vivo diagnostic substances', businessDescription: 'Veterinary diagnostics — analysers, consumables and reference laboratory services sold to clinics.', createdAt: '2025-11-06T09:23:00Z' },
  { id: 'co-trup', label: 'Trupanion', ticker: 'TRUP', exchange: 'NASDAQ', marketCapB: 2.2, prior: 52, sicCode: '6411', sicLabel: 'Insurance agents, brokers & service', businessDescription: 'Medical insurance for cats and dogs, sold largely through veterinary referral.', createdAt: '2025-11-06T09:26:00Z' },

  // Grid hardware & construction
  { id: 'co-etn', label: 'Eaton', ticker: 'ETN', exchange: 'NYSE', marketCapB: 141, prior: 74, sicCode: '3613', sicLabel: 'Switchgear & switchboard apparatus', businessDescription: 'Electrical components and systems for utility, data-centre and industrial power distribution.', createdAt: '2025-11-07T12:50:00Z' },
  { id: 'co-hubb', label: 'Hubbell', ticker: 'HUBB', exchange: 'NYSE', marketCapB: 22, prior: 70, sicCode: '3613', sicLabel: 'Switchgear & switchboard apparatus', businessDescription: 'Utility and electrical solutions — transformers, meters, connectors and grid protection equipment.', createdAt: '2025-11-07T12:52:00Z' },
  { id: 'co-pwr', label: 'Quanta Services', ticker: 'PWR', exchange: 'NYSE', marketCapB: 48, prior: 72, sicCode: '1731', sicLabel: 'Electrical work', businessDescription: 'Specialty contractor building and maintaining electric power transmission and distribution infrastructure.', createdAt: '2025-11-07T12:55:00Z' },
  { id: 'co-nvt', label: 'nVent Electric', ticker: 'NVT', exchange: 'NYSE', marketCapB: 12, prior: 66, sicCode: '3613', sicLabel: 'Switchgear & switchboard apparatus', businessDescription: 'Electrical connection and protection products, including liquid cooling and enclosures for data centres.', createdAt: '2025-11-07T12:58:00Z' },
  { id: 'co-gev', label: 'GE Vernova', ticker: 'GEV', exchange: 'NYSE', marketCapB: 119, prior: 73, sicCode: '3511', sicLabel: 'Turbines & turbine generator sets', businessDescription: 'Power generation equipment and grid solutions — gas turbines, grid software and high-voltage equipment.', createdAt: '2025-11-07T13:01:00Z' },

  // Independent power
  { id: 'co-vst', label: 'Vistra', ticker: 'VST', exchange: 'NYSE', marketCapB: 47, prior: 71, sicCode: '4911', sicLabel: 'Electric services', businessDescription: 'Integrated retail electricity and power generation, including a nuclear fleet sold as firm capacity.', createdAt: '2025-11-08T10:30:00Z' },
  { id: 'co-ceg', label: 'Constellation Energy', ticker: 'CEG', exchange: 'NASDAQ', marketCapB: 86, prior: 73, sicCode: '4911', sicLabel: 'Electric services', businessDescription: 'Largest US carbon-free generator, contracting nuclear output directly to large commercial customers.', createdAt: '2025-11-08T10:33:00Z' },
  { id: 'co-nrg', label: 'NRG Energy', ticker: 'NRG', exchange: 'NYSE', marketCapB: 19, prior: 62, sicCode: '4911', sicLabel: 'Electric services', businessDescription: 'Retail energy provider and dispatchable generator with a large Texas position.', createdAt: '2025-11-08T10:36:00Z' },

  // Data-centre infrastructure
  { id: 'co-eqix', label: 'Equinix', ticker: 'EQIX', exchange: 'NASDAQ', marketCapB: 78, prior: 68, sicCode: '6798', sicLabel: 'Real estate investment trusts', businessDescription: 'Interconnection-dense colocation data centres operated as a REIT.', createdAt: '2025-11-07T13:10:00Z' },
  { id: 'co-dlr', label: 'Digital Realty', ticker: 'DLR', exchange: 'NYSE', marketCapB: 52, prior: 65, sicCode: '6798', sicLabel: 'Real estate investment trusts', businessDescription: 'Wholesale and hyperscale data-centre landlord with a global development pipeline.', createdAt: '2025-11-07T13:12:00Z' },

  // Vertical software & payments
  { id: 'co-tost', label: 'Toast', ticker: 'TOST', exchange: 'NYSE', marketCapB: 21, prior: 64, sicCode: '7372', sicLabel: 'Services — prepackaged software', businessDescription: 'Restaurant operating platform combining point of sale, payroll and payment processing.', createdAt: '2025-11-21T16:20:00Z' },
  { id: 'co-shop', label: 'Shopify', ticker: 'SHOP', exchange: 'NASDAQ', marketCapB: 148, prior: 63, sicCode: '7372', sicLabel: 'Services — prepackaged software', businessDescription: 'Commerce platform for merchants, monetised increasingly through payments and merchant solutions.', createdAt: '2025-11-21T16:23:00Z' },
  { id: 'co-xyz', label: 'Block', ticker: 'XYZ', exchange: 'NYSE', marketCapB: 38, prior: 57, sicCode: '7372', sicLabel: 'Services — prepackaged software', businessDescription: 'Seller ecosystem and consumer financial services, with vertical point-of-sale software for local businesses.', createdAt: '2025-11-21T16:26:00Z' },

  // Risk data & verification
  { id: 'co-vrsk', label: 'Verisk Analytics', ticker: 'VRSK', exchange: 'NASDAQ', marketCapB: 36, prior: 66, sicCode: '7320', sicLabel: 'Services — consumer credit reporting & collection', businessDescription: 'Risk analytics and underwriting data sold to property and casualty insurers.', createdAt: '2025-12-02T12:20:00Z' },
  { id: 'co-asgn', label: 'ASGN Incorporated', ticker: 'ASGN', exchange: 'NYSE', marketCapB: 2.4, prior: 49, sicCode: '7363', sicLabel: 'Services — help supply services', businessDescription: 'Staffing and consulting provider placing skilled technical and engineering labour.', createdAt: '2025-12-02T12:23:00Z' },
]

const companies: GraphNode[] = companySeeds.map((c) => ({
  id: c.id,
  kind: 'company' as const,
  label: c.label,
  ticker: c.ticker,
  exchange: c.exchange,
  marketCapB: c.marketCapB,
  prior: c.prior,
  sicCode: c.sicCode,
  sicLabel: c.sicLabel,
  businessDescription: c.businessDescription,
  createdAt: c.createdAt,
}))

const altSports: GraphNode[] = [
  {
    id: 'p-altsports',
    kind: 'pillar',
    label: 'Participation beats spectating',
    claim:
      'Adults under forty are spending their time and money playing — pickleball, padel, fitness racing, rec leagues — rather than watching. The spend follows the participation: courts, equipment, apparel, events, and the software that runs them.',
    horizonYears: 7,
    falsifiers: [
      'Participation growth in the new formats stalls for two consecutive years.',
      'The spend stays private and local; no listed business captures it.',
      'Broadcast sport recovers its under-forty audience.',
    ],
    prior: 58,
    createdAt: '2026-09-17T14:00:00Z',
  },
  {
    id: 't-altsports-participation',
    kind: 'thesis',
    label: 'Court and facility operators are capacity-constrained',
    claim:
      'Indoor racquet facilities in large metros run above eighty percent utilisation on weekday evenings and cannot be built fast enough. Whoever owns or equips the courts has pricing power for the next five years.',
    horizonYears: 5,
    falsifiers: ['Utilisation falls below sixty percent as supply catches up.', 'Municipal courts absorb the demand at no charge.'],
    prior: 55,
    createdAt: '2026-09-17T14:10:00Z',
  },
]

export const seedNodes: GraphNode[] = [...pillars, ...theses, ...categories, ...companies, ...altSports]

/* ------------------------------------------------------------------ */
/* Edges. Every link carries the reason it exists.                     */
/* ------------------------------------------------------------------ */

const edge = (from: string, to: string, weight: number, rationale: string, createdAt: string): GraphEdge => ({
  id: `e-${from}-${to}`,
  from,
  to,
  weight,
  rationale,
  createdAt,
})

export const seedEdges: GraphEdge[] = [
  edge('t-altsports-participation', 'p-altsports', 0.8, 'Capacity is the cleanest measurable version of the participation claim.', '2026-09-17T14:12:00Z'),
  // Theses under pillars
  edge('t-food', 'p-outsourced', 0.9, 'Cooking is the largest single block of unpaid household labour. If any category proves the pillar, it is this one.', '2025-11-05T10:22:00Z'),
  edge('t-home-repair', 'p-outsourced', 0.85, 'Repair work is the second-largest block of household labour and the one with the steepest skill barrier.', '2025-11-05T10:46:00Z'),
  edge('t-pet', 'p-outsourced', 0.7, 'Pet care is a smaller category but an unusually clean read on willingness to pay for something you used to do yourself.', '2025-11-06T08:33:00Z'),
  edge('t-care', 'p-outsourced', 0.6, 'The largest category by dollars eventually, but the slowest to formalise and the most exposed to policy.', '2026-01-14T16:23:00Z'),
  edge('t-labor-supply', 'p-outsourced', 0.5, 'Scarce trade labour raises the price of the outsourced service, which shows up as category revenue even without volume growth.', '2025-12-03T09:10:00Z'),
  edge('t-home-repair', 'p-trust', 0.5, 'Repair is the canonical trust-dependent local transaction: you are letting a stranger into your house.', '2025-11-20T10:14:00Z'),

  edge('t-dc-load', 'p-grid', 0.9, 'Compute demand is the specific load the existing system was not planned around.', '2025-11-07T11:08:00Z'),
  edge('t-equipment', 'p-grid', 0.85, 'Equipment lead times are the most directly observable evidence that the deficit is real.', '2025-11-07T11:34:00Z'),
  edge('t-transmission', 'p-grid', 0.7, 'Transmission is how the deficit gets closed structurally rather than locally — slower, but larger.', '2025-11-08T09:18:00Z'),
  edge('t-behind-meter', 'p-grid', 0.6, 'Behind-the-meter contracting is what happens while the structural fix is still being permitted.', '2025-11-08T09:55:00Z'),

  edge('t-discovery-consolidation', 'p-trust', 0.85, 'If discovery does not consolidate, no intermediary ever holds the relationship, and the pillar fails.', '2025-11-20T10:12:00Z'),
  edge('t-payments-moat', 'p-trust', 0.8, 'Payments are the mechanism by which the intermediary keeps the relationship it won.', '2025-11-21T15:46:00Z'),
  edge('t-verification', 'p-trust', 0.65, 'Verification is the specific form the trust transfer takes — from a neighbour vouching to a platform vouching.', '2025-12-02T11:28:00Z'),
  edge('t-labor-supply', 'p-trust', 0.5, 'When pros are scarce they gain the power to leave the platform, which is the main threat to the pillar.', '2025-12-03T09:12:00Z'),

  // Categories under theses
  edge('c-delivery', 't-food', 0.9, 'Direct read on whether prepared food volume keeps taking share from home cooking.', '2025-11-05T12:05:00Z'),
  edge('c-delivery', 't-discovery-consolidation', 0.45, 'Food delivery is the furthest-along example of local discovery collapsing into two apps.', '2025-11-20T10:20:00Z'),
  edge('c-home-services', 't-home-repair', 0.85, 'These are the companies that capture the repair job once the homeowner stops doing it.', '2025-11-05T12:08:00Z'),
  edge('c-home-services', 't-discovery-consolidation', 0.65, 'Home services is the category where discovery is least consolidated, so it is the live test.', '2025-11-20T10:22:00Z'),
  edge('c-home-services', 't-labor-supply', 0.6, 'These businesses employ or route exactly the licensed trades the thesis says are getting scarce.', '2025-12-03T09:20:00Z'),
  edge('c-petcare', 't-pet', 0.9, 'Diagnostics, retail and insurance together cover the whole professionalisation of pet spend.', '2025-11-06T09:14:00Z'),
  edge('c-grid-hardware', 't-equipment', 0.9, 'These are the suppliers whose lead times and backlogs the thesis is a claim about.', '2025-11-07T12:20:00Z'),
  edge('c-grid-hardware', 't-transmission', 0.6, 'The same firms build and equip long-haul lines, so transmission spend lands here first.', '2025-11-08T09:22:00Z'),
  edge('c-power-gen', 't-behind-meter', 0.75, 'Owners of dispatchable capacity are the direct counterparty to a behind-the-meter contract.', '2025-11-08T10:24:00Z'),
  edge('c-power-gen', 't-dc-load', 0.55, 'Their disclosed contracting activity is a read on how much new load is actually showing up.', '2025-11-08T10:26:00Z'),
  edge('c-datacenter', 't-dc-load', 0.85, 'Leasing and development pipelines are the cleanest available proxy for future load.', '2025-11-07T12:44:00Z'),
  edge('c-vertical-payments', 't-payments-moat', 0.85, 'These are the platforms testing whether payment attach beats subscription attach.', '2025-11-21T16:14:00Z'),
  edge('c-risk-data', 't-verification', 0.8, 'Underwriting and screening data is what a verification product is actually built on.', '2025-12-02T12:05:00Z'),
  edge('c-risk-data', 't-labor-supply', 0.45, 'Staffing volumes in skilled trades are a direct measurement of the shortage.', '2025-12-03T09:24:00Z'),

  // Companies under categories
  edge('co-dash', 'c-delivery', 0.9, 'Largest US share of restaurant delivery and the broadest push into non-restaurant local commerce.', '2025-11-05T12:40:00Z'),
  edge('co-uber', 'c-delivery', 0.8, 'Second delivery platform, with mobility cross-subsidising the density advantage.', '2025-11-05T12:41:00Z'),
  edge('co-cmg', 'c-delivery', 0.6, 'Operator-side read: digital order-ahead volume without a marketplace intermediary.', '2025-11-05T12:42:00Z'),
  edge('co-wing', 'c-delivery', 0.5, 'Purest listed example of a restaurant format designed for off-premise only.', '2025-11-05T12:43:00Z'),

  edge('co-angi', 'c-home-services', 0.7, 'The listed pure-play on home services marketplace economics, for better or worse.', '2025-11-05T12:44:00Z'),
  edge('co-hd', 'c-home-services', 0.6, 'Professional and installation-services revenue is a read on outsourced repair spend.', '2025-11-05T12:45:00Z'),
  edge('co-rol', 'c-home-services', 0.75, 'Recurring route-based contracts are what fully outsourced home maintenance looks like at scale.', '2025-11-05T12:46:00Z'),
  edge('co-tt', 'c-home-services', 0.65, 'Aftermarket service on an installed base is the annuity version of the thesis.', '2025-11-05T12:47:00Z'),

  edge('co-chwy', 'c-petcare', 0.7, 'Consumer wallet share, and now a direct test of clinic and insurance attach.', '2025-11-06T09:30:00Z'),
  edge('co-idxx', 'c-petcare', 0.85, 'Diagnostics volume is the least promotional measure of how much care animals actually receive.', '2025-11-06T09:31:00Z'),
  edge('co-trup', 'c-petcare', 0.55, 'Insurance attachment is the sharpest single indicator of professionalisation.', '2025-11-06T09:32:00Z'),

  edge('co-etn', 'c-grid-hardware', 0.85, 'Electrical segment backlog is the most-watched read on grid and data-centre equipment demand.', '2025-11-07T13:20:00Z'),
  edge('co-hubb', 'c-grid-hardware', 0.8, 'Utility solutions sells the specific equipment — transformers, protection — the thesis is about.', '2025-11-07T13:21:00Z'),
  edge('co-pwr', 'c-grid-hardware', 0.8, 'Installation labour is the real constraint, and this is the listed way to own it.', '2025-11-07T13:22:00Z'),
  edge('co-nvt', 'c-grid-hardware', 0.6, 'Smaller, more data-centre levered, including liquid cooling attach.', '2025-11-07T13:23:00Z'),
  edge('co-gev', 'c-grid-hardware', 0.75, 'Turbines plus high-voltage equipment covers both halves of the deficit.', '2025-11-07T13:24:00Z'),

  edge('co-vst', 'c-power-gen', 0.85, 'Nuclear fleet plus retail book is the cleanest listed expression of firm-power repricing.', '2025-11-08T10:40:00Z'),
  edge('co-ceg', 'c-power-gen', 0.85, 'Largest carbon-free fleet and the most direct commercial contracting with large loads.', '2025-11-08T10:41:00Z'),
  edge('co-nrg', 'c-power-gen', 0.6, 'Texas dispatchable position, more merchant-exposed and more volatile.', '2025-11-08T10:42:00Z'),

  edge('co-eqix', 'c-datacenter', 0.8, 'Interconnection density gives visibility into where load is being added first.', '2025-11-07T13:30:00Z'),
  edge('co-dlr', 'c-datacenter', 0.75, 'Hyperscale development pipeline is the forward-looking half of the same picture.', '2025-11-07T13:31:00Z'),

  edge('co-tost', 'c-vertical-payments', 0.85, 'The clearest example of payment attach on top of vertical software in a local category.', '2025-11-21T16:30:00Z'),
  edge('co-shop', 'c-vertical-payments', 0.7, 'Largest demonstration that payments monetisation outgrows subscription monetisation.', '2025-11-21T16:31:00Z'),
  edge('co-xyz', 'c-vertical-payments', 0.6, 'Seller ecosystem reaches the smallest local businesses, which is where the thesis is hardest.', '2025-11-21T16:32:00Z'),

  edge('co-vrsk', 'c-risk-data', 0.8, 'Owns the underwriting data any verification product would have to license.', '2025-12-02T12:30:00Z'),
  edge('co-asgn', 'c-risk-data', 0.5, 'Placement volumes are a direct measurement of skilled labour scarcity.', '2025-12-02T12:31:00Z'),
]

/* ------------------------------------------------------------------ */
/* Evidence.                                                           */
/*                                                                     */
/* Passages are illustrative prose written for this prototype in the   */
/* register of the filings they are attributed to. They are not        */
/* quotations. Links go to EDGAR's public search for the real filer.   */
/* ------------------------------------------------------------------ */

interface Src {
  company: string
  ticker: string
  form: string
  section: string
  filedAt: string
}

const ev = (
  id: string,
  targetId: string,
  stance: Evidence['stance'],
  strength: number,
  title: string,
  src: Src,
  excerpt: string,
  highlight: string,
  addedAt: string,
  note?: string,
): Evidence => ({
  id,
  targetId,
  stance,
  strength,
  title,
  excerpt,
  highlight,
  note,
  addedAt,
  source: {
    company: src.company,
    form: src.form,
    section: src.section,
    filedAt: src.filedAt,
    url: edgar(src.ticker, src.form),
  },
})

const evidenceOutsourced: Evidence[] = [
  /* --- Outsourced Living ----------------------------------------- */
  ev('ev-dash-1', 'co-dash', 'supports', 4, 'Order frequency rises with cohort age',
    { company: 'DoorDash, Inc.', ticker: 'DASH', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-18' },
    'Consumer cohorts have historically increased their order frequency in each year following acquisition, and we have not observed a cohort whose annual order frequency declined after its second year on the platform. We attribute this to broadening use cases beyond restaurant meals, including grocery, convenience and retail.',
    'we have not observed a cohort whose annual order frequency declined after its second year on the platform',
    '2026-02-20T09:14:00Z',
    'This is the single most important number for the food thesis. Habit formation, not promotion.'),
  ev('ev-dash-2', 'co-dash', 'supports', 3, 'Non-restaurant categories growing faster than core',
    { company: 'DoorDash, Inc.', ticker: 'DASH', form: '10-K', section: 'Item 1 — Business', filedAt: '2026-02-18' },
    'Orders in grocery, convenience and retail categories grew at a materially faster rate than restaurant orders during the period, and now represent a growing share of total marketplace volume in our more mature markets.',
    'grew at a materially faster rate than restaurant orders',
    '2026-02-20T09:31:00Z'),
  ev('ev-dash-3', 'co-dash', 'contradicts', 3, 'Regulatory fee caps cited as a margin risk',
    { company: 'DoorDash, Inc.', ticker: 'DASH', form: '10-K', section: 'Item 1A — Risk Factors', filedAt: '2026-02-18' },
    'A number of jurisdictions have adopted or proposed ordinances that cap the fees we may charge merchants. Where such caps have been enacted, we have offset a portion of the impact through consumer-facing fees, which has in certain markets reduced order volumes relative to comparable markets without caps.',
    'has in certain markets reduced order volumes relative to comparable markets without caps',
    '2026-02-21T10:02:00Z',
    'Price elasticity is real at the margin. Does not kill the thesis but caps the take rate.'),
  ev('ev-uber-1', 'co-uber', 'supports', 3, 'Delivery segment profitable at scale',
    { company: 'Uber Technologies, Inc.', ticker: 'UBER', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-10' },
    'Our Delivery segment generated positive adjusted EBITDA in each quarter of the period, driven by improved courier utilisation and higher advertising revenue attach on merchant listings.',
    'generated positive adjusted EBITDA in each quarter of the period',
    '2026-02-12T11:20:00Z'),
  ev('ev-uber-2', 'co-uber', 'contradicts', 2, 'Courier classification risk',
    { company: 'Uber Technologies, Inc.', ticker: 'UBER', form: '10-K', section: 'Item 1A — Risk Factors', filedAt: '2026-02-10' },
    'If couriers are reclassified as employees in additional jurisdictions, we would incur significantly greater costs and may be required to restructure the Delivery business in those markets, including by reducing service areas.',
    'may be required to restructure the Delivery business in those markets, including by reducing service areas',
    '2026-02-12T11:44:00Z'),
  ev('ev-cmg-1', 'co-cmg', 'supports', 3, 'Digital order-ahead share holds after promotion ends',
    { company: 'Chipotle Mexican Grill, Inc.', ticker: 'CMG', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-05' },
    'Digital sales represented approximately a third of total food and beverage revenue for the year. The digital mix has remained broadly stable since we reduced promotional activity, which we believe indicates a durable change in ordering behaviour rather than a promotional effect.',
    'has remained broadly stable since we reduced promotional activity',
    '2026-02-07T08:50:00Z'),
  ev('ev-cmg-2', 'co-cmg', 'contradicts', 2, 'Traffic softening in lower-income cohorts',
    { company: 'Chipotle Mexican Grill, Inc.', ticker: 'CMG', form: '10-Q', section: "Item 2 — Management's Discussion and Analysis", filedAt: '2026-04-22' },
    'Transaction growth moderated during the quarter, with softer traffic among lower-income consumers partially offset by continued growth in higher-income cohorts.',
    'softer traffic among lower-income consumers',
    '2026-04-24T14:10:00Z',
    'Worth watching. If outsourcing only works for the top two quintiles the pillar is narrower than I wrote it.'),
  ev('ev-wing-1', 'co-wing', 'supports', 3, 'Format built for off-premise only',
    { company: 'Wingstop Inc.', ticker: 'WING', form: '10-K', section: 'Item 1 — Business', filedAt: '2026-02-25' },
    'Substantially all of our transactions are carry-out or delivery. Our restaurant model is designed without a dining room, which lowers build cost per unit and allows franchisees to reach cash-on-cash returns on a smaller footprint.',
    'Substantially all of our transactions are carry-out or delivery',
    '2026-02-26T09:30:00Z'),

  ev('ev-angi-1', 'co-angi', 'contradicts', 5, 'Service requests decline as lead model is rebuilt',
    { company: 'Angi Inc.', ticker: 'ANGI', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-03-02' },
    'Service requests declined year over year as we deliberately reduced low-intent demand and moved away from paid lead generation toward a homeowner-choice experience. Revenue declined correspondingly, and we expect further declines before the transition is complete.',
    'Service requests declined year over year',
    '2026-03-04T10:15:00Z',
    'This is the strongest thing arguing against me. The pure-play marketplace is shrinking, not compounding.'),
  ev('ev-angi-2', 'co-angi', 'contradicts', 3, 'Professionals churn off the platform',
    { company: 'Angi Inc.', ticker: 'ANGI', form: '10-K', section: 'Item 1A — Risk Factors', filedAt: '2026-03-02' },
    'Service professionals may cease using our platform if they are able to obtain sufficient business through referrals or repeat customers, and historically a significant portion of professionals have transacted with us for less than one year.',
    'a significant portion of professionals have transacted with us for less than one year',
    '2026-03-04T10:41:00Z'),
  ev('ev-hd-1', 'co-hd', 'supports', 3, 'Professional customer revenue outgrows DIY',
    { company: 'The Home Depot, Inc.', ticker: 'HD', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-03-11' },
    'Sales to professional customers grew faster than sales to do-it-yourself customers for the period, continuing a multi-year trend, and our installation services business grew ahead of the company average.',
    'Sales to professional customers grew faster than sales to do-it-yourself customers',
    '2026-03-12T13:05:00Z'),
  ev('ev-hd-2', 'co-hd', 'contradicts', 2, 'Large-ticket discretionary projects deferred',
    { company: 'The Home Depot, Inc.', ticker: 'HD', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-03-11' },
    'Customers continued to defer larger discretionary remodelling projects, and comparable sales in big-ticket categories declined for the year.',
    'comparable sales in big-ticket categories declined for the year',
    '2026-03-12T13:22:00Z'),
  ev('ev-rol-1', 'co-rol', 'supports', 4, 'Recurring contract base retains above 80%',
    { company: 'Rollins, Inc.', ticker: 'ROL', form: '10-K', section: 'Item 1 — Business', filedAt: '2026-02-27' },
    'Approximately eighty percent of our revenue is recurring in nature, derived from contracts that renew automatically. Customer retention in our residential recurring base has remained stable across economic cycles, including periods of consumer weakness.',
    'Customer retention in our residential recurring base has remained stable across economic cycles',
    '2026-02-28T08:20:00Z',
    'Once a chore becomes a subscription it stops being discretionary. That is the whole pillar in one sentence.'),
  ev('ev-tt-1', 'co-tt', 'supports', 4, 'Aftermarket service outgrows equipment',
    { company: 'Trane Technologies plc', ticker: 'TT', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-13' },
    'Services revenue grew at a faster rate than equipment revenue for the period and now represents approximately a third of total revenue. Services carries higher margins and is substantially less cyclical than equipment.',
    'Services revenue grew at a faster rate than equipment revenue',
    '2026-02-14T10:40:00Z'),
  ev('ev-tt-2', 'co-tt', 'supports', 3, 'Technician headcount named as the binding constraint',
    { company: 'Trane Technologies plc', ticker: 'TT', form: '10-K', section: 'Item 1A — Risk Factors', filedAt: '2026-02-13' },
    'Our ability to grow the services business depends on recruiting and retaining qualified technicians. Competition for skilled trades labour has intensified, and in certain regions technician availability has limited our ability to accept additional service contracts.',
    'technician availability has limited our ability to accept additional service contracts',
    '2026-02-14T11:02:00Z',
    'Demand is not the constraint. Labour is. Files under the labour thesis too.'),

  ev('ev-chwy-1', 'co-chwy', 'supports', 3, 'Autoship share of sales keeps climbing',
    { company: 'Chewy, Inc.', ticker: 'CHWY', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-03-25' },
    'Autoship customer sales represented a record share of net sales for the year. Autoship customers spend more per year than non-Autoship customers and exhibit materially lower churn.',
    'Autoship customer sales represented a record share of net sales',
    '2026-03-26T09:10:00Z'),
  ev('ev-chwy-2', 'co-chwy', 'contradicts', 3, 'Active customer count declines',
    { company: 'Chewy, Inc.', ticker: 'CHWY', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-03-25' },
    'Active customers declined modestly year over year. We believe this reflects normalisation in household pet formation following the elevated adoption levels of prior years, partially offset by higher spend per active customer.',
    'Active customers declined modestly year over year',
    '2026-03-26T09:34:00Z',
    'Spend per pet is up but the number of pets is down. The thesis needs both eventually.'),
  ev('ev-idxx-1', 'co-idxx', 'supports', 4, 'Diagnostic utilisation rises while visits fall',
    { company: 'IDEXX Laboratories, Inc.', ticker: 'IDXX', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-09' },
    'Clinical visit volumes in the United States declined modestly for the period, while diagnostic revenue per visit increased, reflecting continued expansion in the use of diagnostics per patient encounter.',
    'diagnostic revenue per visit increased',
    '2026-02-11T08:55:00Z',
    'Exactly the professionalisation signal: fewer visits, more medicine per visit.'),
  ev('ev-idxx-2', 'co-idxx', 'contradicts', 2, 'Clinic staffing shortages cap visit capacity',
    { company: 'IDEXX Laboratories, Inc.', ticker: 'IDXX', form: '10-K', section: 'Item 1A — Risk Factors', filedAt: '2026-02-09' },
    'Veterinary practices continue to report shortages of veterinarians and support staff, which may limit the number of patient visits practices are able to accommodate and therefore the growth of diagnostic testing volumes.',
    'may limit the number of patient visits practices are able to accommodate',
    '2026-02-11T09:18:00Z'),
  ev('ev-trup-1', 'co-trup', 'supports', 3, 'Insurance attachment still under five percent',
    { company: 'Trupanion, Inc.', ticker: 'TRUP', form: '10-K', section: 'Item 1 — Business', filedAt: '2026-02-19' },
    'We estimate that fewer than five percent of North American cats and dogs are covered by medical insurance, compared with substantially higher penetration in several European markets, which we view as indicative of the long-term opportunity.',
    'fewer than five percent of North American cats and dogs are covered by medical insurance',
    '2026-02-20T15:30:00Z'),
  ev('ev-trup-2', 'co-trup', 'contradicts', 3, 'Veterinary cost inflation outruns pricing',
    { company: 'Trupanion, Inc.', ticker: 'TRUP', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-19' },
    'Veterinary invoice inflation exceeded our expectations during the period, and our ability to file and implement rate increases lagged the increase in claims costs, compressing our subscription margin.',
    'our ability to file and implement rate increases lagged the increase in claims costs',
    '2026-02-20T15:52:00Z'),
]

const evidenceGrid: Evidence[] = [
  ev('ev-etn-1', 'co-etn', 'supports', 4, 'Backlog coverage extends past two years',
    { company: 'Eaton Corporation plc', ticker: 'ETN', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-24' },
    'Electrical Americas backlog increased year over year and now represents more than two years of segment revenue at current shipment rates. Negotiated project pricing has held firm, and we have not experienced material order cancellations.',
    'now represents more than two years of segment revenue at current shipment rates',
    '2026-02-25T08:40:00Z',
    'Backlog with no cancellations is the tell. Orders you can cancel are not orders.'),
  ev('ev-etn-2', 'co-etn', 'supports', 3, 'Capacity expansion aimed at data centres',
    { company: 'Eaton Corporation plc', ticker: 'ETN', form: '10-K', section: 'Item 1 — Business', filedAt: '2026-02-24' },
    'We are investing in additional manufacturing capacity for electrical distribution equipment, with several announced facilities dedicated to serving data-centre and utility customers, which we expect to come online over the next two to three years.',
    'several announced facilities dedicated to serving data-centre and utility customers',
    '2026-02-25T09:05:00Z'),
  ev('ev-hubb-1', 'co-hubb', 'supports', 4, 'Transformer lead times remain extended',
    { company: 'Hubbell Incorporated', ticker: 'HUBB', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-06' },
    'Lead times for distribution transformers and certain protection products remain significantly extended relative to historical norms. We do not expect industry lead times to normalise within the next twelve months given constraints in specialised steel and skilled manufacturing labour.',
    'We do not expect industry lead times to normalise within the next twelve months',
    '2026-02-07T10:15:00Z'),
  ev('ev-hubb-2', 'co-hubb', 'contradicts', 3, 'Utility customers work down their own stock',
    { company: 'Hubbell Incorporated', ticker: 'HUBB', form: '10-Q', section: "Item 2 — Management's Discussion and Analysis", filedAt: '2026-04-28' },
    'Order rates in certain utility distribution product lines moderated during the quarter as customers reduced inventory positions built during the prior period of extended lead times.',
    'customers reduced inventory positions built during the prior period of extended lead times',
    '2026-04-29T09:44:00Z',
    'Classic double-ordering unwind. The question is whether it is a quarter or a cycle.'),
  ev('ev-pwr-1', 'co-pwr', 'supports', 4, 'Multi-year utility programmes, not one-off projects',
    { company: 'Quanta Services, Inc.', ticker: 'PWR', form: '10-K', section: 'Item 1 — Business', filedAt: '2026-02-26' },
    'An increasing portion of our revenue is derived from multi-year master service agreements and programme work rather than discrete projects. Total backlog and twelve-month backlog both reached records at period end.',
    'multi-year master service agreements and programme work rather than discrete projects',
    '2026-02-27T11:30:00Z'),
  ev('ev-pwr-2', 'co-pwr', 'supports', 3, 'Craft labour named as the growth constraint',
    { company: 'Quanta Services, Inc.', ticker: 'PWR', form: '10-K', section: 'Item 1A — Risk Factors', filedAt: '2026-02-26' },
    'Our ability to execute on awarded work depends on our ability to attract and retain skilled craft labour. The industry-wide shortage of qualified linemen and electricians could limit the amount of work we are able to undertake.',
    'The industry-wide shortage of qualified linemen and electricians could limit the amount of work we are able to undertake',
    '2026-02-27T11:52:00Z'),
  ev('ev-nvt-1', 'co-nvt', 'supports', 3, 'Liquid cooling attach rising per megawatt',
    { company: 'nVent Electric plc', ticker: 'NVT', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-17' },
    'Sales into data-centre applications grew substantially, led by liquid cooling solutions. Content per megawatt of deployed capacity has increased as rack densities rise and air cooling becomes insufficient.',
    'Content per megawatt of deployed capacity has increased',
    '2026-02-18T08:30:00Z'),
  ev('ev-gev-1', 'co-gev', 'supports', 4, 'Turbine slot reservations sold out for years',
    { company: 'GE Vernova Inc.', ticker: 'GEV', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-04' },
    'Demand for heavy-duty gas turbines has exceeded available manufacturing slots. Substantially all of our near-term production capacity is reserved, and we are taking deposits against slots several years forward.',
    'we are taking deposits against slots several years forward',
    '2026-02-05T09:20:00Z',
    'Customers paying to reserve a factory slot years out. That is what a real shortage looks like.'),
  ev('ev-gev-2', 'co-gev', 'contradicts', 2, 'Grid segment margins pressured by legacy contracts',
    { company: 'GE Vernova Inc.', ticker: 'GEV', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-04' },
    'Electrification segment profitability continued to be affected by legacy contracts entered into at prices that do not reflect current input costs, and we expect this drag to persist until those contracts run off.',
    'legacy contracts entered into at prices that do not reflect current input costs',
    '2026-02-05T09:48:00Z'),

  ev('ev-vst-1', 'co-vst', 'supports', 4, 'Long-dated firm power agreement with a large load',
    { company: 'Vistra Corp.', ticker: 'VST', form: '10-K', section: 'Item 1 — Business', filedAt: '2026-02-27' },
    'We entered into a long-term power purchase agreement providing firm, around-the-clock supply to a single large commercial customer from our existing nuclear generation fleet, at pricing above our recent realised merchant prices.',
    'at pricing above our recent realised merchant prices',
    '2026-02-28T10:05:00Z'),
  ev('ev-ceg-1', 'co-ceg', 'supports', 5, 'Commercial contracting with data-centre customers expands',
    { company: 'Constellation Energy Corporation', ticker: 'CEG', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-25' },
    'We executed additional long-term agreements to supply carbon-free energy to data-centre customers during the period. These agreements are multi-decade in duration and are priced to reflect the scarcity value of firm, carbon-free capacity.',
    'priced to reflect the scarcity value of firm, carbon-free capacity',
    '2026-02-26T08:15:00Z',
    'The repricing of existing capacity is happening in contracts, in public, right now.'),
  ev('ev-ceg-2', 'co-ceg', 'contradicts', 3, 'Regulatory challenge to co-location structures',
    { company: 'Constellation Energy Corporation', ticker: 'CEG', form: '10-K', section: 'Item 1A — Risk Factors', filedAt: '2026-02-25' },
    'Regulatory proceedings concerning the treatment of large loads co-located at generating facilities remain unresolved. An adverse outcome could require such loads to be served through the transmission system and to bear associated network charges, which would reduce the economic advantage of co-location.',
    'could require such loads to be served through the transmission system and to bear associated network charges',
    '2026-02-26T08:44:00Z',
    'This is the live risk to the behind-the-meter thesis. Watch the docket.'),
  ev('ev-nrg-1', 'co-nrg', 'supports', 3, 'Reserve margins tighten in core market',
    { company: 'NRG Energy, Inc.', ticker: 'NRG', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-26' },
    'Forecast reserve margins in our largest market have tightened relative to prior-year projections, driven by load growth from large commercial customers outpacing the addition of new dispatchable capacity.',
    'load growth from large commercial customers outpacing the addition of new dispatchable capacity',
    '2026-02-27T09:12:00Z'),

  ev('ev-eqix-1', 'co-eqix', 'supports', 3, 'Power, not space, is the gating factor',
    { company: 'Equinix, Inc.', ticker: 'EQIX', form: '10-K', section: 'Item 1A — Risk Factors', filedAt: '2026-02-12' },
    'In several of our key metros, the availability of utility power has become the primary constraint on our ability to expand capacity, and in certain markets utilities have indicated multi-year timelines for new large-load service.',
    'the availability of utility power has become the primary constraint on our ability to expand capacity',
    '2026-02-13T10:50:00Z',
    'The landlord saying the grid is the bottleneck is better evidence than any utility forecast.'),
  ev('ev-dlr-1', 'co-dlr', 'supports', 4, 'Development pipeline pre-leased years ahead',
    { company: 'Digital Realty Trust, Inc.', ticker: 'DLR', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-20' },
    'A substantial majority of capacity under active development was pre-leased at period end, with several deliveries scheduled beyond the next twenty-four months already committed. Renewal spreads on expiring leases were positive across all regions.',
    'several deliveries scheduled beyond the next twenty-four months already committed',
    '2026-02-21T09:35:00Z'),
  ev('ev-dlr-2', 'co-dlr', 'contradicts', 2, 'Delivery slippage on power and equipment',
    { company: 'Digital Realty Trust, Inc.', ticker: 'DLR', form: '10-K', section: 'Item 1A — Risk Factors', filedAt: '2026-02-20' },
    'Certain projects have experienced delays relating to utility interconnection timing and the availability of long lead-time electrical equipment, and further delays could push revenue commencement dates beyond currently scheduled periods.',
    'delays relating to utility interconnection timing and the availability of long lead-time electrical equipment',
    '2026-02-21T09:58:00Z',
    'Cuts both ways: bad for the landlord, confirms the equipment thesis.'),

  ev('ev-t-dc-1', 't-dc-load', 'supports', 3, 'Utility plans revised upward mid-cycle',
    { company: 'Vistra Corp.', ticker: 'VST', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-27' },
    'Independent system operator load forecasts in our principal markets have been revised upward materially over the past two planning cycles, with the largest revisions attributable to announced large commercial and industrial interconnection requests.',
    'load forecasts in our principal markets have been revised upward materially over the past two planning cycles',
    '2026-03-01T11:10:00Z'),
  ev('ev-t-trans-1', 't-transmission', 'contradicts', 4, 'Interregional project stalls at state siting',
    { company: 'Quanta Services, Inc.', ticker: 'PWR', form: '10-K', section: 'Item 1A — Risk Factors', filedAt: '2026-02-26' },
    'Large transmission projects remain subject to state and local siting approvals that can extend timelines by years. Certain projects included in our reported backlog have experienced permitting delays and may be cancelled or substantially restructured.',
    'Certain projects included in our reported backlog have experienced permitting delays and may be cancelled',
    '2026-03-01T12:20:00Z',
    'Federal reform did not solve siting. This thesis is slower than I wrote it.'),
  ev('ev-t-equip-1', 't-equipment', 'contradicts', 3, 'New capacity coming online industry-wide',
    { company: 'Eaton Corporation plc', ticker: 'ETN', form: '10-K', section: 'Item 1A — Risk Factors', filedAt: '2026-02-24' },
    'Competitors have announced significant capacity additions in electrical distribution equipment. If industry capacity expands faster than demand, pricing and backlog conversion could come under pressure.',
    'If industry capacity expands faster than demand, pricing and backlog conversion could come under pressure',
    '2026-03-02T09:05:00Z',
    'The obvious way this thesis ends. Everyone builds, the shortage clears, pricing goes.'),
]

const evidenceTrust: Evidence[] = [
  ev('ev-tost-1', 'co-tost', 'supports', 4, 'Payments revenue outgrows subscription revenue',
    { company: 'Toast, Inc.', ticker: 'TOST', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-18' },
    'Financial technology solutions revenue, which is primarily payment processing, grew faster than subscription services revenue and represents the substantial majority of total revenue. Gross payment volume per location increased year over year.',
    'grew faster than subscription services revenue and represents the substantial majority of total revenue',
    '2026-02-19T09:40:00Z',
    'The listings-versus-payments question, answered in the revenue mix.'),
  ev('ev-tost-2', 'co-tost', 'supports', 3, 'Multi-product locations churn less',
    { company: 'Toast, Inc.', ticker: 'TOST', form: '10-K', section: 'Item 1 — Business', filedAt: '2026-02-18' },
    'Locations using three or more of our products exhibit materially lower churn than locations using point of sale alone, and we continue to see attach rates increase within our existing customer base.',
    'Locations using three or more of our products exhibit materially lower churn',
    '2026-02-19T10:02:00Z'),
  ev('ev-tost-3', 'co-tost', 'contradicts', 3, 'Competitive discounting on hardware and rates',
    { company: 'Toast, Inc.', ticker: 'TOST', form: '10-K', section: 'Item 1A — Risk Factors', filedAt: '2026-02-18' },
    'We face intense competition from both legacy point-of-sale providers and newer entrants, several of which have offered hardware at or below cost and discounted processing rates in order to win locations.',
    'several of which have offered hardware at or below cost and discounted processing rates',
    '2026-02-19T10:30:00Z'),
  ev('ev-shop-1', 'co-shop', 'supports', 4, 'Merchant solutions dominates take rate',
    { company: 'Shopify Inc.', ticker: 'SHOP', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-11' },
    'Merchant solutions revenue, driven principally by payments penetration, grew faster than subscription solutions revenue and represents the substantial majority of total revenue. Payments penetration of gross merchandise volume increased again during the period.',
    'Payments penetration of gross merchandise volume increased again during the period',
    '2026-02-12T08:45:00Z'),
  ev('ev-xyz-1', 'co-xyz', 'contradicts', 3, 'Smallest sellers churn and gross profit retention slips',
    { company: 'Block, Inc.', ticker: 'XYZ', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-23' },
    'Gross profit retention among our smallest sellers declined relative to the prior year. Sellers below our smallest revenue band continue to exhibit higher rates of business closure and product abandonment.',
    'Gross profit retention among our smallest sellers declined relative to the prior year',
    '2026-02-24T14:20:00Z',
    'The long tail of local businesses may simply be too small to hold. Hurts the payments-moat thesis at the bottom end.'),
  ev('ev-xyz-2', 'co-xyz', 'supports', 2, 'Software attach lifts per-seller gross profit',
    { company: 'Block, Inc.', ticker: 'XYZ', form: '10-K', section: 'Item 1 — Business', filedAt: '2026-02-23' },
    'Sellers adopting two or more software products generate higher gross profit per seller and retain at higher rates than payments-only sellers, and the share of our seller base using multiple products continued to increase.',
    'Sellers adopting two or more software products generate higher gross profit per seller',
    '2026-02-24T14:41:00Z'),

  ev('ev-vrsk-1', 'co-vrsk', 'supports', 3, 'Underwriting data renews at very high rates',
    { company: 'Verisk Analytics, Inc.', ticker: 'VRSK', form: '10-K', section: 'Item 1 — Business', filedAt: '2026-02-26' },
    'The substantial majority of our revenue is subscription or long-term agreement based, and our annual customer retention rate has remained in the high nineties for each of the last several years.',
    'our annual customer retention rate has remained in the high nineties',
    '2026-02-27T10:20:00Z'),
  ev('ev-vrsk-2', 'co-vrsk', 'contradicts', 2, 'Data licensing terms tighten',
    { company: 'Verisk Analytics, Inc.', ticker: 'VRSK', form: '10-K', section: 'Item 1A — Risk Factors', filedAt: '2026-02-26' },
    'Certain of our data sets are licensed from third parties under agreements that may be renegotiated or terminated. Increasing restrictions on the use of consumer and property data could limit the products we are able to offer.',
    'Increasing restrictions on the use of consumer and property data could limit the products we are able to offer',
    '2026-02-27T10:44:00Z'),
  ev('ev-asgn-1', 'co-asgn', 'contradicts', 3, 'Placement volumes fall despite the shortage story',
    { company: 'ASGN Incorporated', ticker: 'ASGN', form: '10-K', section: "Item 7 — Management's Discussion and Analysis", filedAt: '2026-02-25' },
    'Assignment revenues declined year over year as clients reduced discretionary spending and extended hiring timelines. Bill rates were broadly stable, but volumes did not recover during the period.',
    'Assignment revenues declined year over year',
    '2026-02-26T11:15:00Z',
    'If skilled labour were truly scarce, placements should be rising. This argues the shortage is narrower than I think.'),

  ev('ev-t-disc-1', 't-discovery-consolidation', 'contradicts', 4, 'Assistants may route demand past the marketplace',
    { company: 'Angi Inc.', ticker: 'ANGI', form: '10-K', section: 'Item 1A — Risk Factors', filedAt: '2026-03-02' },
    'Changes in how consumers discover services, including the use of general-purpose assistants and changes to search engine result presentation, have reduced traffic to our properties and could further reduce our ability to acquire homeowners economically.',
    'have reduced traffic to our properties and could further reduce our ability to acquire homeowners economically',
    '2026-03-05T09:25:00Z',
    'The disintermediation risk is no longer hypothetical — it is in the traffic numbers.'),
  ev('ev-t-pay-1', 't-payments-moat', 'supports', 3, 'Off-platform payment leakage falls as tools improve',
    { company: 'Toast, Inc.', ticker: 'TOST', form: '10-K', section: 'Item 1 — Business', filedAt: '2026-02-18' },
    'Substantially all locations on our platform process payments through us. We attribute this to the integration of payments with scheduling, payroll and reporting, which makes processing elsewhere operationally impractical.',
    'makes processing elsewhere operationally impractical',
    '2026-03-06T10:40:00Z'),
  ev('ev-t-ver-1', 't-verification', 'contradicts', 3, 'Platforms resist vouching for professionals',
    { company: 'Angi Inc.', ticker: 'ANGI', form: '10-K', section: 'Item 1A — Risk Factors', filedAt: '2026-03-02' },
    'We do not guarantee the work of service professionals. Claims arising from work performed by professionals found through our platform have resulted in litigation, and expanding the assurances we provide would increase our exposure.',
    'expanding the assurances we provide would increase our exposure',
    '2026-03-06T11:05:00Z',
    'Liability is the reason verification stays free and thin. Real obstacle to that thesis.'),
  ev('ev-t-labor-1', 't-labor-supply', 'supports', 4, 'Retirements outpace apprenticeship completions',
    { company: 'Quanta Services, Inc.', ticker: 'PWR', form: '10-K', section: 'Item 1 — Business', filedAt: '2026-02-26' },
    'We operate our own training programmes because the pipeline of qualified craft labour entering the industry has not kept pace with retirements. We expect competition for experienced craft labour to remain intense for the foreseeable future.',
    'the pipeline of qualified craft labour entering the industry has not kept pace with retirements',
    '2026-03-07T08:30:00Z'),
  ev('ev-t-food-1', 't-food', 'supports', 3, 'Food-away-from-home share keeps rising',
    { company: 'DoorDash, Inc.', ticker: 'DASH', form: '10-K', section: 'Item 1 — Business', filedAt: '2026-02-18' },
    'We believe the long-term shift of food spending toward prepared and away-from-home consumption continues, and that digital ordering is capturing an increasing share of that spend across every market in which we operate.',
    'digital ordering is capturing an increasing share of that spend across every market in which we operate',
    '2026-03-08T09:50:00Z'),
  ev('ev-t-home-1', 't-home-repair', 'supports', 3, 'Ageing housing stock forces non-discretionary work',
    { company: 'The Home Depot, Inc.', ticker: 'HD', form: '10-K', section: 'Item 1 — Business', filedAt: '2026-03-11' },
    'The median age of the United States housing stock continues to rise. Older homes require more maintenance and repair, a category of demand that is substantially less discretionary than remodelling.',
    'a category of demand that is substantially less discretionary than remodelling',
    '2026-03-12T14:00:00Z'),
]

export const seedEvidence: Evidence[] = [...evidenceOutsourced, ...evidenceGrid, ...evidenceTrust]

/* ------------------------------------------------------------------ */
/* Sleeves — where money is pointed at the map.                        */
/* ------------------------------------------------------------------ */

export const SEED_CASH_USD = 263_100

export const seedSleeves: Sleeve[] = [
  {
    id: 'sl-outsourced',
    name: 'Outsourced Living',
    rootId: 'p-outsourced',
    targetPct: 11.5,
    rules: { maxSinglePositionPct: 4, minMarketCapM: 500 },
    cadence: 'quarterly',
    exitBelow: 56,
    createdAt: '2025-12-08T10:00:00Z',
    note: 'Broad, slow, meant to be held through a cycle. No single name above four percent of the book.',
    positions: [
      { companyId: 'co-dash', valueUsd: 12_400 },
      { companyId: 'co-rol', valueUsd: 9_800 },
      { companyId: 'co-idxx', valueUsd: 8_600 },
      { companyId: 'co-tt', valueUsd: 7_900 },
      { companyId: 'co-hd', valueUsd: 6_500 },
      { companyId: 'co-chwy', valueUsd: 4_200 },
    ],
  },
  {
    id: 'sl-grid',
    name: 'Grid Deficit',
    rootId: 'p-grid',
    targetPct: 16.5,
    rules: { maxSinglePositionPct: 5, minMarketCapM: 1_000 },
    cadence: 'on-confidence-change',
    exitBelow: 58,
    createdAt: '2025-12-08T10:22:00Z',
    note: 'Highest conviction branch and the largest sleeve. Revisit whenever branch confidence moves more than a few points rather than on the calendar.',
    positions: [
      { companyId: 'co-etn', valueUsd: 18_200 },
      { companyId: 'co-gev', valueUsd: 14_900 },
      { companyId: 'co-ceg', valueUsd: 13_400 },
      { companyId: 'co-pwr', valueUsd: 11_600 },
      { companyId: 'co-vst', valueUsd: 9_700 },
      { companyId: 'co-hubb', valueUsd: 6_800 },
      { companyId: 'co-dlr', valueUsd: 5_100 },
    ],
  },
  {
    id: 'sl-rails',
    name: 'Local Commerce Rails',
    rootId: 't-payments-moat',
    targetPct: 7.5,
    rules: { maxSinglePositionPct: 3, minMarketCapM: 2_000 },
    cadence: 'monthly',
    exitBelow: 58,
    createdAt: '2026-01-22T09:30:00Z',
    note: 'Deliberately small. The thesis is good but the evidence underneath it is thinner than I would like.',
    positions: [
      { companyId: 'co-tost', valueUsd: 9_300 },
      { companyId: 'co-shop', valueUsd: 7_400 },
      { companyId: 'co-xyz', valueUsd: 3_100 },
    ],
  },
]

/* ------------------------------------------------------------------ */
/* Discovery — pre-built results for three seed companies.             */
/* ------------------------------------------------------------------ */

export const seedDiscovery: DiscoverySeed[] = [
  {
    id: 'ds-thumbtack',
    name: 'Thumbtack',
    isPrivate: true,
    blurb:
      'Private home services marketplace. Homeowners describe a job, local professionals respond with quotes. You said you liked the model but could not own it directly.',
    sicCode: '7389',
    sicLabel: 'Services — computer programmed, data processing',
    candidates: [
      {
        id: 'cand-tt-angi', name: 'Angi', ticker: 'ANGI', exchange: 'NASDAQ', marketCapB: 0.9,
        description: 'Home services marketplace matching homeowners with local service professionals.',
        score: 94, suggestedParentId: 'c-home-services', existingNodeId: 'co-angi',
        sicCode: '7389', sicLabel: 'Services — computer programmed, data processing',
        reasons: [
          { type: 'sic', label: 'Same industry classification', detail: 'Both file under SIC 7389, the classification used by local services marketplaces.' },
          { type: 'competitor-mention', label: 'Names the seed as a competitor', detail: 'Lists Thumbtack by name among competing home services platforms in its competition discussion.', source: 'ANGI 10-K, Item 1 — Business' },
          { type: 'description', label: 'Nearly identical business description', detail: 'Both describe matching homeowners with pre-screened local professionals and monetising through leads and platform fees.' },
        ],
      },
      {
        id: 'cand-tt-hd', name: 'Home Depot', ticker: 'HD', exchange: 'NYSE', marketCapB: 352,
        description: 'Home improvement retailer with a growing professional and installation-services business.',
        score: 71, suggestedParentId: 'c-home-services', existingNodeId: 'co-hd',
        sicCode: '5211', sicLabel: 'Retail — lumber & other building materials',
        reasons: [
          { type: 'competitor-mention', label: 'Overlapping competitive set', detail: 'Describes competition from online home services platforms for installation and repair work.', source: 'HD 10-K, Item 1 — Business' },
          { type: 'customer-overlap', label: 'Same customer on the same job', detail: 'Both monetise the moment a homeowner decides to have someone else do the work.' },
        ],
      },
      {
        id: 'cand-tt-frpt', name: 'FirstService Corporation', ticker: 'FSV', exchange: 'NASDAQ', marketCapB: 8.1,
        description: 'Property management and branded residential service franchises including restoration, painting and home inspection.',
        score: 68, suggestedParentId: 'c-home-services',
        sicCode: '6531', sicLabel: 'Real estate agents & managers',
        reasons: [
          { type: 'description', label: 'Same job, different structure', detail: 'Delivers the same residential service categories through franchised brands rather than a marketplace.' },
          { type: 'supply-chain', label: 'Competes for the same labour', detail: 'Recruits from the same pool of licensed residential trades the seed depends on.' },
        ],
      },
      {
        id: 'cand-tt-rol', name: 'Rollins', ticker: 'ROL', exchange: 'NYSE', marketCapB: 26,
        description: 'Route-based residential and commercial pest control on recurring contracts.',
        score: 61, suggestedParentId: 'c-home-services', existingNodeId: 'co-rol',
        sicCode: '7342', sicLabel: 'Services — disinfecting & pest control',
        reasons: [
          { type: 'description', label: 'Recurring version of the same spend', detail: 'Converts an episodic household chore into a subscription, which is the end state the seed is working toward.' },
        ],
      },
      {
        id: 'cand-tt-yelp', name: 'Yelp', ticker: 'YELP', exchange: 'NYSE', marketCapB: 2.1,
        description: 'Local business discovery and advertising platform with a growing services request product.',
        score: 78, suggestedParentId: 'c-home-services',
        sicCode: '7389', sicLabel: 'Services — computer programmed, data processing',
        reasons: [
          { type: 'sic', label: 'Same industry classification', detail: 'Files under SIC 7389 alongside the seed and the other local marketplaces.' },
          { type: 'competitor-mention', label: 'Names the seed as a competitor', detail: 'Cites Thumbtack among competitors for home and local services request volume.', source: 'YELP 10-K, Item 1 — Business' },
          { type: 'description', label: 'Request-for-quote product', detail: 'Operates a request-a-quote flow structurally identical to the seed, attached to a directory rather than standing alone.' },
        ],
      },
      {
        id: 'cand-tt-asgn', name: 'ASGN Incorporated', ticker: 'ASGN', exchange: 'NYSE', marketCapB: 2.4,
        description: 'Staffing and consulting provider placing skilled technical and engineering labour.',
        score: 44, suggestedParentId: 'c-risk-data', existingNodeId: 'co-asgn',
        sicCode: '7363', sicLabel: 'Services — help supply services',
        reasons: [
          { type: 'description', label: 'Labour marketplace, different collar', detail: 'Matches scarce skilled labour to demand, but for enterprise technical roles rather than household jobs.' },
        ],
      },
    ],
  },
  {
    id: 'ds-rover',
    name: 'Rover',
    isPrivate: true,
    blurb:
      'Private marketplace for dog walking, boarding and pet sitting. The clearest example you could find of unpaid household work becoming a paid service.',
    sicCode: '7389',
    sicLabel: 'Services — computer programmed, data processing',
    candidates: [
      {
        id: 'cand-rv-chwy', name: 'Chewy', ticker: 'CHWY', exchange: 'NYSE', marketCapB: 16,
        description: 'Online pet retailer expanding into pharmacy, insurance and owned veterinary clinics.',
        score: 82, suggestedParentId: 'c-petcare', existingNodeId: 'co-chwy',
        sicCode: '5961', sicLabel: 'Retail — catalog & mail-order houses',
        reasons: [
          { type: 'customer-overlap', label: 'Same wallet', detail: 'Both are funded out of the same discretionary pet-care budget and expand by adding services to it.' },
          { type: 'description', label: 'Moving from goods into services', detail: 'Describes an expansion from product retail into clinical services, mirroring the seed from the other direction.' },
        ],
      },
      {
        id: 'cand-rv-idxx', name: 'IDEXX Laboratories', ticker: 'IDXX', exchange: 'NASDAQ', marketCapB: 44,
        description: 'Veterinary diagnostics sold to clinics — analysers, consumables and reference laboratories.',
        score: 74, suggestedParentId: 'c-petcare', existingNodeId: 'co-idxx',
        sicCode: '2835', sicLabel: 'In vitro & in vivo diagnostic substances',
        reasons: [
          { type: 'supply-chain', label: 'Sells into the same professionalisation', detail: 'Revenue rises with the amount of professional care an animal receives, which is what the seed is creating demand for.' },
        ],
      },
      {
        id: 'cand-rv-trup', name: 'Trupanion', ticker: 'TRUP', exchange: 'NASDAQ', marketCapB: 2.2,
        description: 'Medical insurance for cats and dogs, distributed largely through veterinary referral.',
        score: 70, suggestedParentId: 'c-petcare', existingNodeId: 'co-trup',
        sicCode: '6411', sicLabel: 'Insurance agents, brokers & service',
        reasons: [
          { type: 'customer-overlap', label: 'Same owner, later in the journey', detail: 'Attaches to the owner who already treats the animal as a dependant with a budget.' },
          { type: 'description', label: 'Explicit professionalisation thesis', detail: 'Its own filings argue the humanisation of pets as the driver of insurance attachment.' },
        ],
      },
      {
        id: 'cand-rv-woof', name: 'Petco Health and Wellness', ticker: 'WOOF', exchange: 'NASDAQ', marketCapB: 1.3,
        description: 'Pet specialty retailer with in-store veterinary hospitals, grooming and training services.',
        score: 77, suggestedParentId: 'c-petcare',
        sicCode: '5990', sicLabel: 'Retail — retail stores',
        reasons: [
          { type: 'description', label: 'Services attached to retail', detail: 'Operates grooming, training and boarding — the same services the seed intermediates — out of owned locations.' },
          { type: 'competitor-mention', label: 'Names marketplace competition', detail: 'Cites online marketplaces for pet services among competitive pressures on its services business.', source: 'WOOF 10-K, Item 1 — Business' },
        ],
      },
      {
        id: 'cand-rv-frpt', name: 'Freshpet', ticker: 'FRPT', exchange: 'NASDAQ', marketCapB: 3.4,
        description: 'Refrigerated fresh pet food manufactured and distributed through branded store chillers.',
        score: 58, suggestedParentId: 'c-petcare',
        sicCode: '2047', sicLabel: 'Dog & cat food',
        reasons: [
          { type: 'customer-overlap', label: 'Premiumisation of the same budget', detail: 'Depends on owners willing to pay a large premium for their animal, which is the behaviour the seed monetises.' },
        ],
      },
    ],
  },
  {
    id: 'ds-basepower',
    name: 'Base Power',
    isPrivate: true,
    blurb:
      'Private residential battery and distributed capacity company in Texas. You flagged it as the household-scale version of the grid deficit.',
    sicCode: '4911',
    sicLabel: 'Electric services',
    candidates: [
      {
        id: 'cand-bp-nrg', name: 'NRG Energy', ticker: 'NRG', exchange: 'NYSE', marketCapB: 19,
        description: 'Retail energy provider and dispatchable generator with a large Texas position.',
        score: 86, suggestedParentId: 'c-power-gen', existingNodeId: 'co-nrg',
        sicCode: '4911', sicLabel: 'Electric services',
        reasons: [
          { type: 'sic', label: 'Same industry classification', detail: 'Both operate as electric service providers under SIC 4911.' },
          { type: 'description', label: 'Same market, same product', detail: 'Sells retail electricity in Texas and is building distributed residential capacity as a demand-response asset.' },
          { type: 'competitor-mention', label: 'Names distributed capacity competition', detail: 'Discusses competition from distributed energy resources aggregated into virtual power plants.', source: 'NRG 10-K, Item 1 — Business' },
        ],
      },
      {
        id: 'cand-bp-vst', name: 'Vistra', ticker: 'VST', exchange: 'NYSE', marketCapB: 47,
        description: 'Integrated retail electricity and power generation including a nuclear fleet.',
        score: 79, suggestedParentId: 'c-power-gen', existingNodeId: 'co-vst',
        sicCode: '4911', sicLabel: 'Electric services',
        reasons: [
          { type: 'sic', label: 'Same industry classification', detail: 'Both classified under SIC 4911 electric services.' },
          { type: 'description', label: 'Same scarcity, larger scale', detail: 'Monetises the same shortage of firm capacity, through central generation rather than distributed batteries.' },
        ],
      },
      {
        id: 'cand-bp-enph', name: 'Enphase Energy', ticker: 'ENPH', exchange: 'NASDAQ', marketCapB: 4.6,
        description: 'Microinverters, residential battery storage and home energy management systems.',
        score: 81, suggestedParentId: 'c-grid-hardware',
        sicCode: '3674', sicLabel: 'Semiconductors & related devices',
        reasons: [
          { type: 'supply-chain', label: 'Supplies the seed’s hardware layer', detail: 'Makes the power electronics a residential battery deployment depends on.' },
          { type: 'description', label: 'Same household energy asset', detail: 'Describes residential storage and virtual power plant participation as its growth vector.' },
        ],
      },
      {
        id: 'cand-bp-nvt', name: 'nVent Electric', ticker: 'NVT', exchange: 'NYSE', marketCapB: 12,
        description: 'Electrical connection and protection products including enclosures and liquid cooling.',
        score: 63, suggestedParentId: 'c-grid-hardware', existingNodeId: 'co-nvt',
        sicCode: '3613', sicLabel: 'Switchgear & switchboard apparatus',
        reasons: [
          { type: 'supply-chain', label: 'Sells into the same build', detail: 'Supplies the protection and enclosure content required by distributed generation and storage installations.' },
        ],
      },
      {
        id: 'cand-bp-pwr', name: 'Quanta Services', ticker: 'PWR', exchange: 'NYSE', marketCapB: 48,
        description: 'Specialty contractor building and maintaining electric power infrastructure.',
        score: 66, suggestedParentId: 'c-grid-hardware', existingNodeId: 'co-pwr',
        sicCode: '1731', sicLabel: 'Electrical work',
        reasons: [
          { type: 'supply-chain', label: 'Same labour constraint', detail: 'Competes for the licensed electricians a large residential deployment programme would need.' },
          { type: 'description', label: 'Infrastructure side of the same deficit', detail: 'Builds the distribution network that distributed capacity is meant to relieve.' },
        ],
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/* Journal — how the thinking actually moved.                          */
/* ------------------------------------------------------------------ */

const j = (
  id: string,
  at: string,
  type: JournalEntry['type'],
  title: string,
  detail: string,
  nodeId?: string,
  delta?: number,
): JournalEntry => ({ id, at, type, title, detail, nodeId, delta })

export const seedJournal: JournalEntry[] = [
  j('jr-01', '2025-11-04T09:12:00Z', 'belief', 'Wrote the first pillar',
    'Started from "people pay other people to do their chores now". Took four passes to get it to something falsifiable. The horizon of ten years is the part I am least sure about.', 'p-outsourced'),
  j('jr-02', '2025-11-04T09:41:00Z', 'belief', 'Added a second pillar',
    'The grid one. Wrote it after reading two utility resource plans back to back and noticing they disagreed with the interconnection queues in their own service territory.', 'p-grid'),
  j('jr-03', '2025-11-05T10:44:00Z', 'belief', 'Split the first pillar into four theses',
    'Food, home repair, pets, care. Care is the biggest by dollars and the one I understand least, so it goes in with a low prior and nothing under it.', 'p-outsourced'),
  j('jr-04', '2025-11-07T13:24:00Z', 'note', 'Filed the first companies under grid hardware',
    'Five names. The criterion was simple: if the deficit is real, these are the businesses that take the order.', 'c-grid-hardware'),
  j('jr-05', '2025-11-19T14:05:00Z', 'belief', 'Third pillar: trust moves online',
    'This started as a sub-thesis of outsourced living and kept growing until it clearly was not one. Promoted it.', 'p-trust'),
  j('jr-06', '2025-12-03T09:05:00Z', 'belief', 'Labour supply thesis hangs off two pillars',
    'Scarce trade labour raises the price of outsourced services and gives professionals the power to leave platforms. It argues for one pillar and against another, which felt worth modelling honestly rather than filing it under whichever I preferred.', 't-labor-supply'),
  j('jr-07', '2025-12-08T10:22:00Z', 'sleeve', 'Opened the first two sleeves',
    'Grid gets the larger allocation because the evidence underneath it is better, not because I like it more. Set it to revisit on confidence change rather than on the calendar.', undefined),
  j('jr-08', '2026-01-14T16:20:00Z', 'belief', 'Wrote the care thesis properly',
    'Still no evidence underneath it. Leaving it visible and ungrounded rather than quietly deleting it — a belief I cannot support is worth looking at every time I open the map.', 't-care'),
  j('jr-09', '2026-01-22T09:30:00Z', 'sleeve', 'Opened the rails sleeve, deliberately small',
    'Seven and a half percent target. The payments thesis reads well but three companies is a thin branch to put money behind.', undefined),
  j('jr-10', '2026-02-05T09:20:00Z', 'evidence', 'Turbine slots are being reserved years forward',
    'Attached to GE Vernova. Customers paying deposits to hold factory slots is the least ambiguous shortage signal in the whole map.', 'co-gev', 24),
  j('jr-11', '2026-02-11T08:55:00Z', 'evidence', 'Fewer vet visits, more diagnostics per visit',
    'This is the professionalisation thesis in one line. Raised confidence in IDEXX and the pet branch above it.', 'co-idxx', 18),
  j('jr-12', '2026-02-20T09:14:00Z', 'evidence', 'Delivery cohorts do not decay',
    'No cohort has shown falling frequency after year two. If that holds it is the strongest single fact supporting the food thesis.', 'co-dash', 22),
  j('jr-13', '2026-02-21T10:02:00Z', 'evidence', 'Fee caps reduce order volume where enacted',
    'Marked contradicting. It does not break the thesis but it caps how much of the value the platform keeps.', 'co-dash', -14),
  j('jr-14', '2026-02-26T08:15:00Z', 'evidence', 'Firm carbon-free capacity is being repriced in public',
    'Multi-decade contracts priced on scarcity. Pushed the power generation branch up several points.', 'co-ceg', 27),
  j('jr-15', '2026-02-26T08:44:00Z', 'evidence', 'Co-location regulation is unresolved',
    'Marked contradicting on the same company. Both things are true at once and the map should show that.', 'co-ceg', -16),
  j('jr-16', '2026-03-01T12:20:00Z', 'confidence', 'Transmission thesis marked down',
    'Permitting reform did not solve state siting. Cut the weight on transmission and let the contradicting filing do the rest.', 't-transmission', -21),
  j('jr-17', '2026-03-04T10:15:00Z', 'evidence', 'The home services marketplace is shrinking',
    'Angi service requests down year over year, by design, and revenue with it. This is the strongest evidence against the intermediation thesis and I have weighted it at five.', 'co-angi', -29),
  j('jr-18', '2026-03-05T09:25:00Z', 'evidence', 'Assistants are already taking discovery traffic',
    'Filed against the consolidation thesis directly. The disintermediation risk stopped being hypothetical and showed up in someone’s traffic numbers.', 't-discovery-consolidation', -23),
  j('jr-19', '2026-03-12T14:00:00Z', 'evidence', 'Ageing housing stock is the floor under repair demand',
    'Maintenance on old houses is not discretionary. This is what keeps the home repair thesis alive while the marketplace evidence goes the other way.', 't-home-repair', 17),
  j('jr-20', '2026-04-24T14:10:00Z', 'evidence', 'Outsourcing softens at the bottom of the income distribution',
    'Chipotle traffic weak in lower-income cohorts. Filed as contradicting. If this persists I need to narrow the pillar to the top two quintiles rather than "households".', 'co-cmg', -11),
  j('jr-21', '2026-04-29T09:44:00Z', 'evidence', 'Utility customers are destocking',
    'Hubbell order rates moderating as customers run down inventory built during the shortage. Either a quarter of noise or the start of the end of the equipment thesis.', 'co-hubb', -17),
  j('jr-22', '2026-06-11T10:30:00Z', 'note', 'Half-year read of the map',
    'Two pillars are better supported than when I wrote them, one is worse. The trust pillar has the most contradicting evidence and the smallest sleeve, which is at least consistent.', undefined),
  j('jr-23', '2026-08-27T08:40:00Z', 'discovery', 'Ran discovery on three private companies',
    'Thumbtack, Rover and Base Power. The useful part was not the matches, it was seeing which of them matched on a competitor mention rather than on a classification code.', undefined),
]

/* ------------------------------------------------------------------ */
/* Review queue — what is already waiting, and what has been decided.  */
/* ------------------------------------------------------------------ */

export const seedReviewItems: ReviewItem[] = [
  {
    id: 'rv-angi',
    createdAt: '2026-03-04T10:20:00Z',
    status: 'pending',
    kind: 'trim',
    title: 'Reduce the home services position',
    summary:
      'Angi confidence fell to 20 after a strength-five contradicting filing. The home services category, and the home repair thesis above it, both fell with it. The Outsourced Living branch is now 1.8 points above its exit threshold.',
    proposal:
      'Trim Home Depot and Trane by a combined $2,400 inside the Outsourced Living sleeve, leaving the target percentage unchanged. Do not add to Angi.',
    sleeveId: 'sl-outsourced',
    nodeId: 'c-home-services',
    chain: [
      { kind: 'evidence', label: 'Service requests declined year over year', detail: 'Angi 10-K, Item 7. Marked contradicting at strength five.', evidenceId: 'ev-angi-1', delta: -29 },
      { kind: 'company', label: 'Angi', detail: 'Confidence fell to 20, the lowest node on the map.', nodeId: 'co-angi', delta: -29 },
      { kind: 'category', label: 'Home services & repair', detail: 'Weighted average of its companies fell.', nodeId: 'c-home-services', delta: -7 },
      { kind: 'thesis', label: 'Home maintenance intermediated', detail: 'Partly offset by the ageing housing stock passage filed the same week.', nodeId: 't-home-repair', delta: -4 },
      { kind: 'pillar', label: 'Outsourced Living', detail: 'Now 57.8, against a sleeve exit threshold of 56.', nodeId: 'p-outsourced', delta: -2 },
      { kind: 'rule', label: 'Quarterly revisit', detail: 'Sleeve cadence is quarterly; this is the scheduled look.', sleeveId: 'sl-outsourced' },
    ],
  },
  {
    id: 'rv-hubb',
    createdAt: '2026-04-29T09:50:00Z',
    status: 'pending',
    kind: 'review-thesis',
    title: 'Re-read the equipment thesis',
    summary:
      'Two separate contradicting passages now sit under the equipment thesis: competitors adding capacity, and utility customers running down the inventory they built during the shortage. The thesis is at 56, down from 77 when it was written.',
    proposal:
      'No trade. Re-read the thesis and decide whether the falsifier about lead times normalising has been met. If it has, archive the thesis and re-point the grid sleeve at the load and behind-the-meter branches instead.',
    nodeId: 't-equipment',
    sleeveId: 'sl-grid',
    chain: [
      { kind: 'evidence', label: 'Customers reduced inventory positions', detail: 'Hubbell 10-Q, Item 2. Marked contradicting at strength three.', evidenceId: 'ev-hubb-2', delta: -17 },
      { kind: 'evidence', label: 'Competitors announced capacity additions', detail: 'Eaton 10-K, Item 1A, filed against the thesis directly.', evidenceId: 'ev-t-equip-1', delta: -14 },
      { kind: 'thesis', label: 'Grid equipment constrained', detail: 'Blends a weak direct read with a stronger inherited one.', nodeId: 't-equipment', delta: -21 },
      { kind: 'rule', label: 'Falsifier check', detail: 'Falsifier on file: lead times normalise below 40 weeks across major suppliers.', nodeId: 't-equipment' },
    ],
  },
  {
    id: 'rv-rails-drift',
    createdAt: '2026-09-01T08:05:00Z',
    status: 'pending',
    kind: 'rebalance',
    title: 'Local Commerce Rails is 2.7 points under target',
    summary:
      'The rails sleeve is at 4.8% against a 7.5% target. The drift is from the target being raised in January rather than from anything moving, and it has not been closed since.',
    proposal:
      'Add $11,100 across Toast and Shopify to reach target, respecting the three percent single-position cap. Block allocates nothing further — its confidence is the lowest in the sleeve.',
    sleeveId: 'sl-rails',
    chain: [
      { kind: 'sleeve', label: 'Local Commerce Rails', detail: 'Current 4.8%, target 7.5%, drift −2.7 points.', sleeveId: 'sl-rails' },
      { kind: 'rule', label: 'Monthly revisit', detail: 'Sleeve cadence is monthly; drift has persisted for seven of them.', sleeveId: 'sl-rails' },
      { kind: 'thesis', label: 'Payments beat listings', detail: 'Branch confidence 62.8, comfortably above the 58 exit threshold.', nodeId: 't-payments-moat' },
    ],
  },
  {
    id: 'rv-transmission',
    createdAt: '2026-03-01T12:30:00Z',
    status: 'approved',
    decidedAt: '2026-03-02T09:15:00Z',
    kind: 'flag',
    title: 'Flag the transmission thesis as slower than written',
    summary:
      'A contradicting passage on state siting delays cut the transmission thesis to 55. The horizon on the written claim is twelve years, so the thesis survives — the pacing assumption does not.',
    proposal: 'Keep the thesis. Cut the edge weight into the grid pillar from 0.85 to 0.70 and note the revision in the journal.',
    nodeId: 't-transmission',
    chain: [
      { kind: 'evidence', label: 'Projects in backlog face permitting delays', detail: 'Quanta 10-K, Item 1A. Marked contradicting at strength four.', evidenceId: 'ev-t-trans-1', delta: -21 },
      { kind: 'thesis', label: 'Transmission unblocked', detail: 'Fell to 54.9 from a written prior of 58.', nodeId: 't-transmission', delta: -21 },
      { kind: 'pillar', label: 'The Grid Deficit', detail: 'Absorbed a smaller move because the edge weight was already below one.', nodeId: 'p-grid', delta: -3 },
    ],
  },
  {
    id: 'rv-asgn',
    createdAt: '2026-02-26T11:20:00Z',
    status: 'rejected',
    decidedAt: '2026-02-27T07:40:00Z',
    kind: 'trim',
    title: 'Open a position in ASGN',
    summary:
      'Proposed on the strength of the labour supply thesis. The filing attached at the time showed assignment revenues falling, which argues against the thesis rather than for the position.',
    proposal: 'Rejected. Leave ASGN on the map as a measurement device, not a holding.',
    nodeId: 'co-asgn',
    chain: [
      { kind: 'evidence', label: 'Assignment revenues declined year over year', detail: 'ASGN 10-K, Item 7. Marked contradicting at strength three.', evidenceId: 'ev-asgn-1', delta: -14 },
      { kind: 'company', label: 'ASGN Incorporated', detail: 'Confidence 36. Below anything else considered for a sleeve.', nodeId: 'co-asgn' },
      { kind: 'rule', label: 'Minimum market cap $2.0bn', detail: 'Passes the rule, but fails on confidence.', sleeveId: 'sl-rails' },
    ],
  },
]

/* ------------------------------------------------------------------ */
/* Values — what a reader can decide to care about.                    */
/* ------------------------------------------------------------------ */

export const seedValues: ValueDef[] = [
  { id: 'v-climate', label: 'Climate & clean energy', blurb: 'Speeds the move off fossil fuels, or at least does not slow it.' },
  { id: 'v-workers', label: 'Fair work', blurb: 'How the people doing the work are paid, classified and treated.' },
  { id: 'v-privacy', label: 'Privacy', blurb: 'Does not depend on knowing more about people than it needs to.' },
  { id: 'v-local', label: 'Local & independent business', blurb: 'Leaves small operators stronger rather than squeezed.' },
  { id: 'v-animals', label: 'Animal welfare', blurb: 'Treats animals as more than inventory.' },
  { id: 'v-health', label: 'Health & wellbeing', blurb: 'Makes people healthier, or at least does not profit from making them less so.' },
  { id: 'v-openness', label: 'Open knowledge & repair', blurb: 'Lets people understand, fix and keep what they own.' },
  { id: 'v-fairness', label: 'Financial fairness', blurb: 'Does not make its money from people at their worst moments.' },
]

/**
 * Where each company stands. These are one reader's judgements written for the
 * prototype — illustrative, not research. −2 works against, +2 clearly advances.
 */
const companyValues: Record<string, ValueStance[]> = {
  'co-dash': [
    { valueId: 'v-workers', score: -2, reason: 'Couriers are independent contractors without the protections employees get.' },
    { valueId: 'v-local', score: -1, reason: 'Restaurants pay large commissions for demand they used to own.' },
    { valueId: 'v-health', score: -1, reason: 'Makes it easier to eat badly and harder to cook.' },
  ],
  'co-uber': [
    { valueId: 'v-workers', score: -2, reason: 'The contractor model is the business model.' },
    { valueId: 'v-privacy', score: -1, reason: 'Holds detailed location history on riders and drivers.' },
    { valueId: 'v-climate', score: 1, reason: 'Fewer privately owned cars in dense cities, on balance.' },
  ],
  'co-cmg': [
    { valueId: 'v-health', score: 1, reason: 'Whole ingredients, cooked in the restaurant.' },
    { valueId: 'v-workers', score: 1, reason: 'Hourly staff, internal promotion, above-minimum pay.' },
    { valueId: 'v-animals', score: 0, reason: 'Publishes sourcing standards, but they are voluntary.' },
  ],
  'co-wing': [
    { valueId: 'v-health', score: -1, reason: 'Fried chicken, delivered.' },
    { valueId: 'v-local', score: 1, reason: 'Franchised — most units are owned by small operators.' },
  ],
  'co-angi': [
    { valueId: 'v-local', score: 1, reason: 'Sends work to independent tradespeople, though at a price.' },
    { valueId: 'v-workers', score: -1, reason: 'Pros pay for leads whether or not they convert.' },
  ],
  'co-hd': [
    { valueId: 'v-openness', score: 2, reason: 'Sells the parts and tools that let people fix their own homes.' },
    { valueId: 'v-workers', score: 0, reason: 'Ordinary retail employer; nothing notable either way.' },
    { valueId: 'v-local', score: -1, reason: 'Has replaced most independent hardware stores.' },
  ],
  'co-rol': [
    { valueId: 'v-health', score: 1, reason: 'Pest control is public health work.' },
    { valueId: 'v-animals', score: -1, reason: 'The service is killing animals.' },
    { valueId: 'v-workers', score: 1, reason: 'Route technicians are employees with benefits.' },
  ],
  'co-tt': [
    { valueId: 'v-climate', score: 2, reason: 'Heat pumps and efficient HVAC are a large share of the decarbonisation job.' },
    { valueId: 'v-openness', score: 1, reason: 'Publishes service manuals; installers can repair.' },
  ],
  'co-chwy': [
    { valueId: 'v-animals', score: 1, reason: 'Cheaper pharmacy and care for animals people already own.' },
    { valueId: 'v-local', score: -1, reason: 'Competes directly with independent pet shops.' },
  ],
  'co-idxx': [
    { valueId: 'v-animals', score: 2, reason: 'Earlier diagnosis means less suffering.' },
    { valueId: 'v-openness', score: -1, reason: 'Closed consumable ecosystem; clinics are locked in.' },
  ],
  'co-trup': [
    { valueId: 'v-animals', score: 2, reason: 'Insurance is what lets people say yes to treatment.' },
    { valueId: 'v-fairness', score: 1, reason: 'Pays vets directly; no claim-chasing for the owner.' },
  ],
  'co-etn': [
    { valueId: 'v-climate', score: 1, reason: 'Grid equipment is needed whatever the generation is, and increasingly for renewables.' },
    { valueId: 'v-workers', score: 1, reason: 'Unionised manufacturing footprint.' },
  ],
  'co-hubb': [
    { valueId: 'v-climate', score: 1, reason: 'Transformers and protection equipment for a grid that has to electrify.' },
  ],
  'co-pwr': [
    { valueId: 'v-climate', score: 2, reason: 'Builds the transmission that renewables cannot reach the grid without.' },
    { valueId: 'v-workers', score: 2, reason: 'Runs its own apprenticeship programmes for skilled trades.' },
  ],
  'co-nvt': [
    { valueId: 'v-climate', score: 1, reason: 'Liquid cooling cuts data-centre energy use.' },
  ],
  'co-gev': [
    { valueId: 'v-climate', score: 0, reason: 'Wind turbines and grid on one side, gas turbines on the other.' },
    { valueId: 'v-workers', score: 1, reason: 'Large unionised industrial workforce.' },
  ],
  'co-vst': [
    { valueId: 'v-climate', score: 0, reason: 'Nuclear fleet is carbon-free; the gas and coal fleet is not.' },
    { valueId: 'v-fairness', score: -1, reason: 'Retail electricity pricing has drawn regulatory complaints.' },
  ],
  'co-ceg': [
    { valueId: 'v-climate', score: 2, reason: 'Largest carbon-free generator in the country.' },
  ],
  'co-nrg': [
    { valueId: 'v-climate', score: -1, reason: 'Gas and coal are most of the fleet.' },
    { valueId: 'v-fairness', score: -1, reason: 'Variable-rate retail plans have hurt customers in price spikes.' },
  ],
  'co-eqix': [
    { valueId: 'v-climate', score: 1, reason: 'Contracts for renewable power at most sites.' },
    { valueId: 'v-privacy', score: 0, reason: 'Landlord to everyone; neutral on what tenants do.' },
  ],
  'co-dlr': [
    { valueId: 'v-climate', score: 0, reason: 'Enormous power draw, partly offset by renewable contracts.' },
  ],
  'co-tost': [
    { valueId: 'v-local', score: 2, reason: 'Software that helps independent restaurants run like chains.' },
    { valueId: 'v-workers', score: 1, reason: 'Tip pooling and payroll tools that get staff paid correctly.' },
    { valueId: 'v-privacy', score: -1, reason: 'Collects diner data across every restaurant on the platform.' },
  ],
  'co-shop': [
    { valueId: 'v-local', score: 2, reason: 'Built for independent merchants competing with marketplaces.' },
    { valueId: 'v-privacy', score: -1, reason: 'Cross-merchant shopper profiles power its ads and checkout.' },
  ],
  'co-xyz': [
    { valueId: 'v-local', score: 2, reason: 'Payments and lending for the smallest sellers.' },
    { valueId: 'v-fairness', score: -1, reason: 'Consumer lending arm profits from short-term credit.' },
    { valueId: 'v-privacy', score: -1, reason: 'A consumer wallet with a full picture of spending.' },
  ],
  'co-vrsk': [
    { valueId: 'v-privacy', score: -2, reason: 'The product is a detailed profile of people and property, sold to insurers.' },
    { valueId: 'v-fairness', score: -1, reason: 'Underwriting data decides who pays more.' },
  ],
  'co-asgn': [
    { valueId: 'v-workers', score: 0, reason: 'Contract staffing: flexible for clients, precarious for contractors.' },
  ],
}

for (const node of seedNodes) {
  if (node.kind === 'company') node.values = companyValues[node.id] ?? []
}

/** What the example reader has said they care about. */
export const seedValueWeights: Record<string, ValueWeight> = {
  'v-climate': 2,
  'v-workers': 1,
  'v-privacy': 2,
  'v-local': 1,
  'v-animals': 0,
  'v-health': 1,
  'v-openness': 0,
  'v-fairness': 1,
}

/* ------------------------------------------------------------------ */
/* Goals — what the money is for.                                      */
/* ------------------------------------------------------------------ */

export const seedGoals: Goal[] = [
  {
    id: 'g-cushion',
    title: 'Three months of breathing room',
    why: 'So that a bad quarter is an inconvenience and not a crisis.',
    horizon: 'now',
    kind: 'save',
    targetUsd: 18_000,
    earmarkedUsd: 18_000,
    monthlyUsd: 0,
    linkedSleeveIds: [],
    status: 'reached',
    createdAt: '2025-10-12T09:00:00Z',
    reachedAt: '2026-03-02T09:00:00Z',
  },
  {
    id: 'g-card',
    title: 'Clear the card',
    why: 'Paying interest on last year is the most expensive thing in the budget.',
    horizon: 'now',
    kind: 'save',
    targetUsd: 2_400,
    earmarkedUsd: 1_900,
    monthlyUsd: 500,
    targetDate: '2026-10-31',
    linkedSleeveIds: [],
    status: 'active',
    createdAt: '2026-07-01T09:00:00Z',
  },
  {
    id: 'g-house',
    title: 'House deposit',
    why: 'Rent ends in April. Owning makes the next decade of housing a decision rather than a surprise.',
    horizon: 'soon',
    kind: 'save',
    targetUsd: 120_000,
    earmarkedUsd: 64_200,
    monthlyUsd: 3_500,
    targetDate: '2027-04-30',
    linkedSleeveIds: [],
    status: 'active',
    createdAt: '2025-11-02T09:00:00Z',
  },
  {
    id: 'g-toollib',
    title: 'Ship the tool library',
    why: 'A lending library for tools in the neighbourhood. Needs a year of runway to reach its first two hundred members.',
    horizon: 'later',
    kind: 'build',
    targetUsd: 24_000,
    earmarkedUsd: 6_500,
    monthlyUsd: 600,
    targetDate: '2028-03-31',
    linkedSleeveIds: [],
    status: 'active',
    createdAt: '2026-01-18T09:00:00Z',
  },
  {
    id: 'g-sabbatical',
    title: 'Six weeks off',
    why: 'Long enough to forget the shape of the week.',
    horizon: 'later',
    kind: 'save',
    targetUsd: 15_000,
    earmarkedUsd: 4_100,
    monthlyUsd: 350,
    targetDate: '2028-06-30',
    linkedSleeveIds: [],
    status: 'active',
    createdAt: '2026-02-09T09:00:00Z',
  },
  {
    id: 'g-scholarship',
    title: 'A scholarship every year',
    why: 'An endowment that pays one student’s way through a trade apprenticeship, every year, without me.',
    horizon: 'someday',
    kind: 'give',
    targetUsd: 150_000,
    earmarkedUsd: 12_000,
    monthlyUsd: 400,
    linkedSleeveIds: ['sl-rails'],
    status: 'active',
    createdAt: '2026-04-20T09:00:00Z',
  },
  {
    id: 'g-independence',
    title: 'Work because I want to',
    why: 'The belief-driven sleeves are for this. When they cover the essentials, every job after that is a choice.',
    horizon: 'someday',
    kind: 'save',
    targetUsd: 900_000,
    earmarkedUsd: 0,
    monthlyUsd: 1_800,
    linkedSleeveIds: ['sl-outsourced', 'sl-grid'],
    status: 'active',
    createdAt: '2025-11-04T09:00:00Z',
  },
]

/* ------------------------------------------------------------------ */
/* Habits — spend less on this, and the difference goes there.         */
/* ------------------------------------------------------------------ */

export const seedHabits: Habit[] = [
  {
    id: 'h-weed',
    title: 'Smoke less',
    category: 'Cannabis',
    baselineMonthlyUsd: 340,
    targetMonthlyUsd: 150,
    redirectToGoalId: 'g-house',
    createdAt: '2026-03-01T09:00:00Z',
    note: 'Not quitting. Just not every night.',
    months: [
      { month: '2026-03', spentUsd: 335 },
      { month: '2026-04', spentUsd: 300 },
      { month: '2026-05', spentUsd: 255 },
      { month: '2026-06', spentUsd: 210 },
      { month: '2026-07', spentUsd: 180 },
      { month: '2026-08', spentUsd: 145 },
      { month: '2026-09', spentUsd: 70 },
    ],
  },
  {
    id: 'h-delivery',
    title: 'Fewer delivery dinners',
    category: 'Food delivery',
    baselineMonthlyUsd: 420,
    targetMonthlyUsd: 250,
    redirectToGoalId: 'g-sabbatical',
    createdAt: '2026-04-01T09:00:00Z',
    note: 'Ironic, given the food thesis. The thesis is about other people.',
    months: [
      { month: '2026-04', spentUsd: 390 },
      { month: '2026-05', spentUsd: 310 },
      { month: '2026-06', spentUsd: 330 },
      { month: '2026-07', spentUsd: 240 },
      { month: '2026-08', spentUsd: 265 },
      { month: '2026-09', spentUsd: 110 },
    ],
  },
  {
    id: 'h-subs',
    title: 'Cancel what I do not use',
    category: 'Subscriptions',
    baselineMonthlyUsd: 210,
    targetMonthlyUsd: 120,
    redirectToGoalId: 'g-toollib',
    createdAt: '2026-06-01T09:00:00Z',
    months: [
      { month: '2026-06', spentUsd: 195 },
      { month: '2026-07', spentUsd: 160 },
      { month: '2026-08', spentUsd: 125 },
      { month: '2026-09', spentUsd: 118 },
    ],
  },
]

/* Journal entries for the goals side of the notebook. */
export const seedJournalGoals: JournalEntry[] = [
  j('jg-01', '2025-10-12T09:00:00Z', 'goal', 'Wrote the first goal: three months of breathing room',
    'Everything else waits until this exists. Eighteen thousand, in cash, not touched.', undefined),
  j('jg-02', '2025-11-02T09:05:00Z', 'goal', 'House deposit, for April 2027',
    'The lease ends then. A hundred and twenty thousand is a real number for a real place, not a wish. Three and a half thousand a month from now.', undefined),
  j('jg-03', '2026-01-18T09:10:00Z', 'goal', 'Decided to build the tool library',
    'A goal that is a thing to make rather than a thing to buy. Twenty-four thousand is a year of runway for one person and a van.', undefined),
  j('jg-04', '2026-03-01T09:15:00Z', 'habit', 'Started tracking cannabis spend',
    'Baseline three hundred and forty a month. Target one-fifty. Whatever I do not spend goes to the house, which is the only thing that has ever made this feel like a trade rather than a deprivation.', undefined),
  j('jg-05', '2026-03-02T09:00:00Z', 'goal', 'Breathing room reached',
    'Eighteen thousand set aside. Took five months. It changes how the rest of the notebook feels.', undefined),
  j('jg-06', '2026-06-01T10:00:00Z', 'habit', 'Second and third habits',
    'Delivery dinners fund the six weeks off. Dead subscriptions fund the tool library. The rule for all three: the reward is the goal moving, nothing else.', undefined),
  j('jg-07', '2026-07-05T08:30:00Z', 'values', 'Marked privacy and climate as core',
    'Went through the map with the values on. Verisk is a problem: it is the right company for the verification thesis and the wrong company for me.', undefined),
  j('jg-08', '2026-08-31T20:00:00Z', 'habit', 'August: first month under target',
    'One hundred and forty-five on cannabis. One hundred and ninety-five released to the house. That is the whole system working once.', undefined),
  j('jg-09', '2026-09-01T08:10:00Z', 'goal', 'The house is behind',
    'At the current rate the deposit lands just under ninety thousand in April, not a hundred and twenty. Either the date moves, the rate moves, or the over-allocated grid sleeve pays for it.', undefined),
]

/* Review items for the goals and values side. */
export const seedReviewGoals: ReviewItem[] = [
  {
    id: 'rv-house',
    createdAt: '2026-09-01T08:15:00Z',
    status: 'pending',
    kind: 'goal',
    title: 'The house deposit is about $30,700 short for April',
    summary:
      'At $3,500 a month the deposit reaches roughly $89,300 by the end of April 2027 against a $120,000 target. The Grid Deficit sleeve is 2.8 points over its target, which is $11,700 of drift nobody has decided to keep.',
    proposal:
      'Trim the Grid Deficit sleeve back to target and earmark the $11,700 for the house, and raise the monthly contribution to $6,200 for the remaining months. Or move the date to August, which the current rate reaches on its own.',
    goalId: 'g-house',
    sleeveId: 'sl-grid',
    chain: [
      { kind: 'goal', label: 'House deposit', detail: 'Target $120,000 by 30 April 2027. Funded a little over $64,000 including habit releases, plus $3,500 a month.', goalId: 'g-house' },
      { kind: 'rule', label: 'Projection', detail: 'Seven monthly contributions from now: $24,500. Lands at roughly $89,300 — about $30,700 short.', goalId: 'g-house' },
      { kind: 'sleeve', label: 'Grid Deficit', detail: 'Current 19.3%, target 16.5%. Drift +2.8 points, about $11,700 over.', sleeveId: 'sl-grid' },
      { kind: 'habit', label: 'Smoke less', detail: 'Releasing roughly $190 a month at the current run rate.', habitId: 'h-weed' },
    ],
  },
  {
    id: 'rv-verisk',
    createdAt: '2026-07-05T08:40:00Z',
    status: 'pending',
    kind: 'values',
    title: 'Verisk works against a core value',
    summary:
      'Privacy is marked core. Verisk scores −2 on it: its product is a detailed profile of people and property sold to insurers. It is not held in any sleeve, but it sits on the map under the verification thesis and would be the obvious addition.',
    proposal:
      'Keep it on the map as a measurement device and mark it "will not hold". If the verification thesis ever needs a position, look for a company that verifies without profiling.',
    nodeId: 'co-vrsk',
    chain: [
      { kind: 'value', label: 'Privacy — core', detail: 'You weighted this at 2 of 2 on 5 July.' },
      { kind: 'company', label: 'Verisk Analytics', detail: 'Scores −2 on privacy and −1 on financial fairness.', nodeId: 'co-vrsk' },
      { kind: 'thesis', label: 'Verification as a platform', detail: 'The thesis it measures. Confidence 43 — the weakest on the map anyway.', nodeId: 't-verification' },
    ],
  },
]
