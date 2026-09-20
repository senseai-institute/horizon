import type { FeedItem } from './types'

/**
 * A feed widget's sample content. The runtime exposes GET /feed?url=… which
 * fetches and parses RSS; in the browser alone we show these.
 */
const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

export const sampleFeed: FeedItem[] = [
  { id: 'f1', title: 'Pickleball court operators report waitlists in 14 of 20 largest metros', source: 'Sports Business Weekly', at: ago(3), url: '#', summary: 'Indoor facility utilisation above 80% on weekday evenings; two operators raising growth capital.' },
  { id: 'f2', title: 'Padel federation counts 30,000 courts worldwide, up from 12,000 in 2020', source: 'Racquet Trade', at: ago(9), url: '#', summary: 'Growth concentrated in Spain, Italy, Sweden and the Gulf; US installations still under 500.' },
  { id: 'f3', title: 'Hyrox sells out three US events in under an hour', source: 'Endurance Insider', at: ago(21), url: '#', summary: 'Fitness racing formats with a fixed course are drawing gym-goers who never ran a marathon.' },
  { id: 'f4', title: 'Transformer lead times ease slightly for distribution class', source: 'Grid Brief', at: ago(30), url: '#', summary: 'Two suppliers cite new capacity; power-class units still 90+ weeks.' },
  { id: 'f5', title: 'Slow-pitch softball registrations rise for a third straight year', source: 'Rec League Report', at: ago(50), url: '#', summary: 'Adult recreational leagues report the strongest post-2020 recovery among team sports.' },
]
