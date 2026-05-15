// TORSION · Laboratory Controller
// Wires Hermes agent to the UI

import { createClient } from '@supabase/supabase-js';
import { loadModel, onStateChange, isReady } from './semantic-core.js';
import { HermesGate } from './hermes-gate.js';
import { HermesAgent } from './agents/hermes.js';
import { Lineage } from './memory/lineage.js';
import { Resonance } from './memory/resonance.js';
import { Canon } from './memory/canon.js';

// Supabase
const SUPABASE_URL = 'https://kzcucjcyxybypncbdbws.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_saeUHGocDah-T2_709M6Fg_g26JtLXw';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Core systems
const gate = new HermesGate(sb);
const lineage = new Lineage();
const resonance = new Resonance();
const canon = new Canon();
const hermes = new HermesAgent(gate, sb);

// Wire lineage + resonance + canon into Hermes' listener
hermes.addListener({
  onStateChange: (state, highlightedCard) => renderAll(state, highlightedCard),
  onSpeak: (entry) => renderLogEntry(entry),
});

// ── Rendering ──
function renderAll(state, highlightedCard) {
  updateStats(state);
  renderHand(state, highlightedCard);
  renderDeckInfo(state);
  renderMirror(state);
  renderResonance(state);
  renderTokens(state);
  updateButtons(state);
}

function updateStats(state) {
  document.getElementById('tokenCount').textContent = state.tokenCount;
  document.getElementById('deckSize').textContent = state.deck.deckSize;
  document.getElementById('torsionLevel').textContent = state.field.averageTorsion.toFixed(2);
  document.getElementById('conjugateCount').textContent = state.conjugateFlips;
  document.getElementById('canonCount').textContent = canon.getStats().canonSize;
  document.getElementById('fieldStrength').textContent = state.field.fieldStrength.toFixed(2);
  document.getElementById('agentTitle').textContent = 
    `Hermes · ${state.title}`;
}

function renderHand(state, highlightedCard) {
  const handRow = document.getElementById('handRow');
  if (!state.hand || state.hand.length === 0) {
    handRow.innerHTML = '';
    document.getElementById('handStats').textContent = '0 cards';
    return;
  }
  
  document.getElementById('handStats').textContent = `${state.hand.length} cards`;
  
  handRow.innerHTML = state.hand.map(card => `
    <div class="card-item ${highlightedCard === card.id ? 'playing' : ''}"
         style="opacity:${0.5 + card.confidence * 0.5}">
      <div class="card-icon">${card.icon}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-desc">${card.description}</div>
      <div class="card-meta">
        <span>${Math.round(card.confidence * 100)}%</span>
        <span>${card.playCount} plays</span>
      </div>
    </div>
  `).join('');
}

function renderDeckInfo(state) {
  const info = document.getElementById('deckInfo');
  info.innerHTML = `
    🃏 Deck: ${state.deck.deckSize} · 🗑️ Discard: ${state.deck.discardSize} · 
    ✧ Top: ${state.deck.topCard?.name || 'none'} · Gen ${state.deck.generationCount}
  `;
}

function renderMirror(state) {
  const reflection = document.getElementById('mirrorReflection');
  const recentToken = state.tokens[state.tokens.length - 1];
  
  if (recentToken) {
    const isConjugate = recentToken.length > 0 && state.conjugateFlips > 0;
    reflection.innerHTML = `
      <span class="reflection-text ${isConjugate ? 'conjugate' : ''}">
        "${recentToken}"
      </span>
    `;
  } else {
    reflection.innerHTML = '<span class="reflection-text">Awaiting particles...</span>';
  }
}

function renderResonance(state) {
  const bars = document.getElementById('spectrumBars');
  const spectrum = state.field.resonance || [];
  
  if (spectrum.length === 0) {
    bars.innerHTML = '<div style="color:var(--text-dim);font-family:var(--font-mono);font-size:0.45rem;text-align:center;padding:1rem;">No resonance yet</div>';
    return;
  }
  
  bars.innerHTML = spectrum.map(r => `
    <div class="spectrum-bar">
      <span class="bar-label">${r.symbol}</span>
      <div class="bar-fill">
        <div class="bar-inner" style="width:${r.strength}%"></div>
      </div>
      <span style="font-size:0.4rem;color:var(--text-dim);width:30px;">${Math.round(r.strength)}</span>
    </div>
  `).join('');
}

function renderTokens(state) {
  const scroll = document.getElementById('tokenScroll');
  document.getElementById('tokenBarCount').textContent = state.tokenCount;
  
  const recentTokens = state.tokens.slice(-30).reverse();
  
  scroll.innerHTML = recentTokens.map(t => {
    const isConjugate = state.conjugateFlips > 0 && Math.random() > 0.7; // approximate
    const isCanon = canon.isCanon(t);
    return `<span class="token-chip ${isCanon ? 'canon' : isConjugate ? 'conjugate' : ''}">${t}</span>`;
  }).join('');
}

function renderLogEntry(entry) {
  const stream = document.getElementById('logStream');
  const div = document.createElement('div');
  div.className = `log-entry log-${entry.type}`;
  div.innerHTML = `<span class="log-icon">${entry.icon}</span>${entry.message}`;
  stream.insertBefore(div, stream.firstChild);
  while (stream.children.length > 80) stream.removeChild(stream.lastChild);
}

function updateButtons(state) {
  document.getElementById('playBtn').disabled = state.isPlaying || state.handSize === 0;
  document.getElementById('drawBtn').disabled = state.isPlaying;
  document.getElementById('evolveBtn').disabled = state.isPlaying;
}

// ── Global API ──
window.TORSION = {
  drawHand: () => hermes.drawHand(),
  playSequence: () => hermes.playSequence(),
  evolve: () => hermes.evolve(),
  sendSignal: async (body) => {
    if (!body || !body.trim()) return;
    const token = body.trim();
    hermes.speak('system', `✍️ Manual signal: "${token}"`);
    
    // Process through gate
    const result = await gate.process({
      body: token, source: 'terminal', source_loop: 'slow', score: 75, metadata: {}
    });
    
    if (result.success) {
      hermes.tokens.push(token);
      hermes.field.introduce({ body: token, score: 75 }, 'manual');
      hermes.speak('success', `Accepted: "${token}"`);
      
      // Track resonance
      resonance.record(token, 'manual');
      
      // Check canon
      const strength = resonance.getStrength(token);
      if (canon.consider(token, { strength, frequency: 1 }, null)) {
        hermes.speak('system', `🏛️ "${token}" inducted into canon!`);
      }
    } else {
      hermes.speak('failure', `Rejected: ${result.error}`);
    }
    
    renderAll(hermes.getState());
  },
};

// ── Init ──
async function init() {
  // Load semantic model
  loadModel().catch(err => console.warn('Model load:', err));
  onStateChange((state, msg) => {
    if (state === 'ready') hermes.speak('system', '🧠 Semantic model cached and ready');
  });
  
  // Initial render
  renderAll(hermes.getState());
  
  // Auto-draw first hand
  setTimeout(() => hermes.drawHand(), 500);
  
  hermes.speak('system', '🌀 TORSION laboratory online');
  hermes.speak('system', `🪶 ${hermes.currentTitle} at your service`);
  
  console.log('🌀 TORSION · Symbolic Physics Engine');
  console.log('🪶 Hermes agent ready');
  console.log('📐 Torsion Attractor: d = c/(2c-1)');
  console.log('🃏 Draw · ▶ Play · 🔄 Evolve · ✧ Signal');
}

init();
