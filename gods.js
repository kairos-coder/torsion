// gods.js — The Six Gods + Mategwas the Dealer
// ============================================================

const GODS = [
  // LOOP A (Left Spiral): Loki → Zeus → Jupiter
  {
    id: 'loki',
    name: 'Loki',
    sigil: '🔥',
    tongue: 'Old Norse',
    loop: 'A',
    position: 'A',  // First to play in Loop A
    color: '#27ae60',
    domain: 'chaos_fire_trickery',
    anchors: ['eldr', 'ljúga', 'skapta', 'nál', 'brenna', 'ský', 'eitr', 'gjǫll', 'seiðr', 'ván'],
    pieRoots: {
      primary: '*leuk-',
      secondary: ['*bʰer-', '*wert-'],
      meaning: 'light, fire, shine'
    },
    polarities: ['light', 'dark', 'neutral'],
    cardCount: 10
  },
  {
    id: 'zeus',
    name: 'Zeus',
    sigil: '☁️',
    tongue: 'Epic Greek',
    loop: 'A',
    position: 'B',  // Second in Loop A
    color: '#f39c12',
    domain: 'sovereignty_sky_law',
    anchors: ['λόγος', 'δίκη', 'ξενία', 'αἰθήρ', 'κεραυνός', 'νόμος', 'ὅρος', 'ἀρχή', 'βία', 'μοῖρα'],
    pieRoots: {
      primary: '*dyew-',
      secondary: ['*reg-', '*dʰeh₁-'],
      meaning: 'sky, shine, god'
    },
    polarities: ['light', 'order', 'neutral'],
    cardCount: 10
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    sigil: '⚖️',
    tongue: 'Latin',
    loop: 'A',
    position: 'C',  // Third in Loop A
    color: '#d4a017',
    domain: 'order_empire_contract',
    anchors: ['ius', 'fatum', 'pax', 'limen', 'rex', 'caelum', 'foedus', 'auctoritas', 'imperium', 'porta'],
    pieRoots: {
      primary: '*dyew-pter-',
      secondary: ['*leg-', '*sta-'],
      meaning: 'sky-father, law, stand'
    },
    polarities: ['order', 'light', 'dark'],
    cardCount: 10
  },

  // LOOP B (Right Spiral): Odin → Thor → Shiva
  {
    id: 'odin',
    name: 'Odin',
    sigil: '🌑',
    tongue: 'Old Saxon',
    loop: 'B',
    position: 'A',  // First to play in Loop B (collides with Loki)
    color: '#4a6fa5',
    domain: 'wisdom_sacrifice_mystery',
    anchors: ['wōð', 'wīs', 'weg', 'wōden', 'galdar', 'rūna', 'dōð', 'wer', 'walt', 'wīht'],
    pieRoots: {
      primary: '*weh₂t-',
      secondary: ['*weyd-', '*gʰel-'],
      meaning: 'inspired, frenzied, ecstatic'
    },
    polarities: ['dark', 'neutral', 'light'],
    cardCount: 10
  },
  {
    id: 'thor',
    name: 'Thor',
    sigil: '⚡',
    tongue: 'Old High German',
    loop: 'B',
    position: 'B',  // Second in Loop B (collides with Zeus)
    color: '#c0392b',
    domain: 'thunder_protection_craft',
    anchors: ['donar', 'kraft', 'scild', 'folk', 'burg', 'eisan', 'feuer', 'stark', 'bund', 'erd'],
    pieRoots: {
      primary: '*tḱer-',
      secondary: ['*bʰerǵʰ-', '*tew-'],
      meaning: 'thunder, strike, resound'
    },
    polarities: ['light', 'order', 'neutral'],
    cardCount: 10
  },
  {
    id: 'shiva',
    name: 'Shiva',
    sigil: '🌀',
    tongue: 'Sanskrit',
    loop: 'B',
    position: 'C',  // Third in Loop B (collides with Jupiter)
    color: '#8e44ad',
    domain: 'dissolution_dance_time',
    anchors: ['ṛta', 'nāda', 'tāṇḍava', 'śūnya', 'kāla', 'agni', 'mokṣa', 'ānanda', 'liṅga', 'māyā'],
    pieRoots: {
      primary: '*h₂eg-',
      secondary: ['*kʷel-', '*mer-'],
      meaning: 'cosmic order, drive, move'
    },
    polarities: ['dark', 'light', 'neutral'],
    cardCount: 10
  }
];

// Mategwas — The Dealer, never plays
const MATEGWAS = {
  id: 'mategwas',
  name: 'Mategwas',
  sigil: '🐇',
  tongue: 'Old English',
  role: 'dealer',
  color: '#1abc9c',
  anchors: ['hlēap', 'wyrd', 'dæg', 'fruma', 'gāst', 'wundor', 'hring', 'springe', 'þerscold', 'giedda'],
  pieRoots: {
    primary: '*wert-',
    secondary: ['*bʰewg-', '*leyp-'],
    meaning: 'to turn, become, leap'
  }
};

// COLLISION PAIRS — Loop A position maps to Loop B position
const COLLISION_PAIRS = {
  'A': { loop_a: 'loki', loop_b: 'odin' },
  'B': { loop_a: 'zeus', loop_b: 'thor' },
  'C': { loop_a: 'jupiter', loop_b: 'shiva' }
};

// DOMAIN WEIGHTS for cross-ratio computation
const DOMAIN_VECTORS = {
  'chaos_fire_trickery':    [ 0.7,  0.3, -0.5],
  'sovereignty_sky_law':    [ 0.9,  0.1,  0.8],
  'order_empire_contract':  [ 0.95, 0.0,  0.9],
  'wisdom_sacrifice_mystery': [-0.3, 0.8, -0.2],
  'thunder_protection_craft': [ 0.5,  0.6,  0.7],
  'dissolution_dance_time':   [-0.8, 0.4, -0.6]
};

// PIE ROOT AFFINITY MATRIX
const PIE_AFFINITIES = {
  '*leuk-*weh₂t-':  0.2,   // fire meets ecstasy — weak affinity
  '*leuk-*dyew-':   0.5,   // fire meets sky
  '*leuk-*tḱer-':   0.4,   // fire meets thunder
  '*leuk-*dyew-pter-': 0.4,
  '*leuk-*h₂eg-':   -0.3,  // fire vs cosmic order — conflict
  
  '*dyew-*weh₂t-':  0.3,
  '*dyew-*tḱer-':   0.6,   // sky meets thunder — resonance
  '*dyew-*h₂eg-':   0.4,
  '*dyew-*dyew-pter-': 0.9, // COUSINS — high resonance!
  
  '*dyew-pter-*weh₂t-': 0.2,
  '*dyew-pter-*tḱer-':  0.5,
  '*dyew-pter-*h₂eg-':  0.3,
  
  '*tḱer-*h₂eg-':   0.4,
  '*tḱer-*weh₂t-':  0.5,
  '*tḱer-*dyew-':   0.6,
  
  '*h₂eg-*weh₂t-':  -0.2,  // cosmic order vs ecstasy — mild conflict
  '*h₂eg-*dyew-':   0.4,
  '*h₂eg-*dyew-pter-': 0.3
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GODS, MATEGWAS, COLLISION_PAIRS, DOMAIN_VECTORS, PIE_AFFINITIES };
}
