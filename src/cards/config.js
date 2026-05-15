// TORSION · Card Library Configuration
// Cards are information particles with behavioral properties

export const CONFIG = {
  HAND_SIZE: 4,
  MAX_DECK_SIZE: 24,
  EVOLUTION_THRESHOLD: 3,
  TORSION_DECAY: 0.95,
  TORSION_GROWTH: 1.1,
};

// ── CARD TYPES ──
// Each card is a symbolic unit that carries:
// - identity (name, icon)
// - behavior (action, params)
// - memory (confidence, playCount, successCount)
// - lineage (parent, generation)

export const BASE_DECK = [
  // ⚡ SOURCE CARDS — fetch from external streams
  {
    id: 'fetch_fast',
    name: 'FETCH FAST',
    icon: '⚡',
    type: 'source',
    torsionClass: 'amplify',
    description: 'Draw tokens from high-frequency sources',
    confidence: 0.7,
    playCount: 0,
    successCount: 0,
    generation: 0,
    parent: null,
    action: 'fetchFastSources',
    params: {}
  },
  {
    id: 'fetch_slow',
    name: 'FETCH DEEP',
    icon: '🕸️',
    type: 'source',
    torsionClass: 'stretch',
    description: 'Deep extraction from slow sources',
    confidence: 0.5,
    playCount: 0,
    successCount: 0,
    generation: 0,
    parent: null,
    action: 'fetchSlowSources',
    params: {}
  },
  {
    id: 'fetch_mythic',
    name: 'MYTHIC HARVEST',
    icon: '🏛️',
    type: 'source',
    torsionClass: 'mirror',
    description: 'Draw from the archetypal archive',
    confidence: 0.8,
    playCount: 0,
    successCount: 0,
    generation: 0,
    parent: null,
    action: 'fetchMythicOnly',
    params: {}
  },

  // 🚪 GATE CARDS — quality filtering
  {
    id: 'gate_check',
    name: 'GATE CHECK',
    icon: '🚪',
    type: 'gate',
    torsionClass: 'filter',
    description: 'Filter tokens through the quality gate',
    confidence: 0.9,
    playCount: 0,
    successCount: 0,
    generation: 0,
    parent: null,
    action: 'runGateCheck',
    params: {}
  },
  {
    id: 'deduplicate',
    name: 'DEDUPLICATE',
    icon: '🔍',
    type: 'gate',
    torsionClass: 'compress',
    description: 'Remove duplicate tokens — compress signal',
    confidence: 0.8,
    playCount: 0,
    successCount: 0,
    generation: 0,
    parent: null,
    action: 'deduplicateTokens',
    params: {}
  },

  // 🔮 SEMANTIC CARDS — meaning operations
  {
    id: 'semantic_filter',
    name: 'SEMANTIC FILTER',
    icon: '🔮',
    type: 'semantic',
    torsionClass: 'resonate',
    description: 'Filter tokens by semantic similarity',
    confidence: 0.6,
    playCount: 0,
    successCount: 0,
    generation: 0,
    parent: null,
    action: 'semanticFilter',
    params: { threshold: 0.7 }
  },
  {
    id: 'cluster_meaning',
    name: 'CLUSTER MEANING',
    icon: '🗂️',
    type: 'semantic',
    torsionClass: 'cohere',
    description: 'Group tokens by meaning proximity',
    confidence: 0.5,
    playCount: 0,
    successCount: 0,
    generation: 0,
    parent: null,
    action: 'clusterTokens',
    params: {}
  },

  // 💾 MEMORY CARDS — persistence operations
  {
    id: 'store_token',
    name: 'STORE TOKEN',
    icon: '💾',
    type: 'memory',
    torsionClass: 'persist',
    description: 'Write worthy tokens to memory',
    confidence: 0.9,
    playCount: 0,
    successCount: 0,
    generation: 0,
    parent: null,
    action: 'storeToken',
    params: {}
  },
  {
    id: 'query_memory',
    name: 'QUERY MEMORY',
    icon: '🔎',
    type: 'memory',
    torsionClass: 'recall',
    description: 'Search memory for related tokens',
    confidence: 0.6,
    playCount: 0,
    successCount: 0,
    generation: 0,
    parent: null,
    action: 'queryMemory',
    params: { limit: 10 }
  },
  {
    id: 'recall_lineage',
    name: 'RECALL LINEAGE',
    icon: '🧬',
    type: 'memory',
    torsionClass: 'trace',
    description: 'Trace a token back through its ancestors',
    confidence: 0.4,
    playCount: 0,
    successCount: 0,
    generation: 0,
    parent: null,
    action: 'recallLineage',
    params: {}
  },

  // 🌀 TORSION CARDS — field operations
  {
    id: 'apply_torsion',
    name: 'APPLY TORSION',
    icon: '🌀',
    type: 'torsion',
    torsionClass: 'twist',
    description: 'Apply torsion transform to tokens in hand',
    confidence: 0.5,
    playCount: 0,
    successCount: 0,
    generation: 0,
    parent: null,
    action: 'applyTorsion',
    params: { strength: 1 }
  },
  {
    id: 'evolve_deck',
    name: 'EVOLVE DECK',
    icon: '🔄',
    type: 'torsion',
    torsionClass: 'mutate',
    description: 'Force deck evolution — weak cards mutate',
    confidence: 0.6,
    playCount: 0,
    successCount: 0,
    generation: 0,
    parent: null,
    action: 'evolveDeck',
    params: {}
  },

  // ✍️ SIGNAL CARDS — direct input
  {
    id: 'manual_signal',
    name: 'MANUAL SIGNAL',
    icon: '✍️',
    type: 'signal',
    torsionClass: 'direct',
    description: 'Process a manual token through the field',
    confidence: 0.7,
    playCount: 0,
    successCount: 0,
    generation: 0,
    parent: null,
    action: 'processManualSignal',
    params: {}
  },
];

// ── TORSION CLASSES ──
// Each class defines how a card twists information
export const TORSION_CLASSES = {
  amplify:  { transform: 'scale',    factor: 1.618, description: 'Signal intensification' },
  stretch:  { transform: 'dilate',   factor: 0.618, description: 'Temporal expansion' },
  mirror:   { transform: 'reflect',  factor: -1,    description: 'Symbolic inversion' },
  filter:   { transform: 'select',   factor: 0.5,   description: 'Quality discrimination' },
  compress: { transform: 'compact',  factor: 0.3,   description: 'Signal compression' },
  resonate: { transform: 'harmonize',factor: 1.0,   description: 'Meaning resonance' },
  cohere:   { transform: 'cluster',  factor: 1.0,   description: 'Meaning clustering' },
  persist:  { transform: 'store',    factor: 1.0,   description: 'Memory persistence' },
  recall:   { transform: 'retrieve', factor: 1.0,   description: 'Memory retrieval' },
  trace:    { transform: 'lineage',  factor: 1.0,   description: 'Ancestral tracing' },
  twist:    { transform: 'torsion',  factor: 1.5,   description: 'Direct torsion application' },
  mutate:   { transform: 'evolve',   factor: 1.0,   description: 'Deck evolution' },
  direct:   { transform: 'signal',   factor: 1.0,   description: 'Direct signal input' },
};

// ── AGENT VOICE LINES ──
export const VOICE_LINES = {
  draw: [
    "The cards whisper from the aether...",
    "Drawing from the torsion field...",
    "Fate deals me these particles.",
    "New hand. New possibilities.",
  ],
  play: [
    "Executing with precision.",
    "The card activates — feel the torsion.",
    "Through the field it goes.",
    "Particle in motion.",
  ],
  success: [
    "Tokens found. The trail warms.",
    "The field responds favorably.",
    "Worthy particles added to memory.",
    "The spiral tightens.",
  ],
  failure: [
    "This card yields nothing. The field notes this.",
    "Empty harvest. The particle decays.",
    "The gate rejected all. Learning...",
    "Not all torsion produces signal.",
  ],
  evolve: [
    "Mutation! The deck reshapes itself.",
    "Evolution in progress. New particles emerge.",
    "The deck remembers. It adapts.",
    "Weak cards fall. Strong cards spawn.",
  ],
};
