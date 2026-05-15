// TORSION · Hermes Agent
// First particle-operator: draws cards, generates tools, sequences strategically

import { Deck } from '../cards/deck.js';
import { CardActions } from '../cards/card-actions.js';
import { BASE_DECK, CONFIG, VOICE_LINES } from '../cards/config.js';
import { HarmonicConjugate } from '../field/conjugate.js';
import { TorsionField } from '../field/torsion-field.js';

export class HermesAgent {
  constructor(gate, sb) {
    // Identity
    this.name = 'Hermes';
    this.icon = '🪶';
    this.titles = [
      'Messenger of the Gods',
      'Boundary-Crosser',
      'Interpreter of Symbols',
      'Thief of Meaning',
      'Guide of Souls',
      'First Particle-Operator',
      'Cardwright',
      'Sequence Weaver',
    ];
    this.currentTitle = this.titles[0];
    
    // Core systems
    this.gate = gate;
    this.sb = sb;
    this.field = new TorsionField();
    this.conjugate = new HarmonicConjugate();
    this.deck = new Deck(BASE_DECK);
    this.actions = new CardActions(gate, sb, this.field, this.conjugate);
    
    // State
    this.tokens = [];
    this.mission = null;
    this.isPlaying = false;
    this.cycleCount = 0;
    this.conjugateFlips = 0;
    this.totalPlays = 0;
    this.cardsGenerated = 0;
    
    // Voice
    this.log = [];
    this.listeners = [];
  }

  // ═══════════════════════════════════════════
  // CORE OPERATIONS
  // ═══════════════════════════════════════════

  drawHand() {
    const hand = this.deck.drawHand();
    this.speak('draw', this.pickLine(VOICE_LINES.draw));
    this.speak('system', `Hand: ${hand.map(c => c.icon + ' ' + c.name).join(' · ')}`);
    this.notifyListeners();
    return hand;
  }

  async playSequence(optimized = false) {
    if (optimized) return await this._playOptimizedSequence();
    return await this._playStandardSequence();
  }

  async _playStandardSequence() {
    if (this.isPlaying || this.deck.hand.length === 0) {
      this.speak('system', 'No cards in hand. Draw first.');
      return;
    }
    
    this.isPlaying = true;
    this.cycleCount++;
    const cards = [...this.deck.hand];
    
    this.speak('play', this.pickLine(VOICE_LINES.play));
    this.speak('system', `Sequence: ${cards.map(c => c.name).join(' → ')}`);
    
    const results = await this._executeCards(cards);
    
    this.deck.discardHand();
    this.field.decay();
    this.isPlaying = false;
    
    if (this.shouldEvolve()) {
      this.strategicEvolve();
    }
    
    this.notifyListeners();
    return results;
  }

  async _playOptimizedSequence() {
    if (this.isPlaying || this.deck.hand.length === 0) {
      this.speak('system', 'No cards to play');
      return;
    }
    
    const sequence = this.optimizeSequence();
    this.deck.hand = sequence;
    
    return await this._playStandardSequence();
  }

  async _executeCards(cards) {
    const results = [];
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const playedCard = this.deck.playCard(card.id);
      
      if (!playedCard) {
        this.speak('system', `${card.name} not in hand — skipping`);
        continue;
      }
      
      this.totalPlays++;
      this.speak('play', `${card.icon} Playing: ${card.name}`);
      this.notifyListeners(card.id);
      
      try {
        const actionFn = this.actions[card.action];
        if (!actionFn) {
          this.speak('failure', `Unknown action: ${card.action}`);
          this.deck.recordResult(card, false);
          results.push({ card: card.name, success: false, error: 'Unknown action' });
          continue;
        }
        
        const result = await actionFn.call(this.actions, card.params);
        
        if (result.success) {
          this._handleSuccess(card, result);
        } else {
          this._handleFailure(card, result);
        }
        
        results.push({ card: card.name, ...result });
        
      } catch (err) {
        this.speak('failure', `${card.name} errored: ${err.message}`);
        this.deck.recordResult(card, false);
        results.push({ card: card.name, success: false, error: err.message });
      }
      
      await this.sleep(300);
      this.notifyListeners();
    }
    
    return results;
  }

  _handleSuccess(card, result) {
    this.speak('success', this.pickLine(VOICE_LINES.success));
    this.speak('success', `${card.name}: ${result.data}`);
    
    if (result.tokens && result.tokens.length > 0) {
      this.tokens.push(...result.tokens.filter(t => !this.tokens.includes(t)));
      this.speak('success', `🎯 +${result.tokens.length} tokens (${this.tokens.length} total)`);
    }
    
    this.deck.recordResult(card, true);
    
    if (card.torsionClass === 'mirror' || card.torsionClass === 'twist') {
      this.maybeFlipConjugate(result);
    }
  }

  _handleFailure(card, result) {
    this.speak('failure', this.pickLine(VOICE_LINES.failure));
    this.speak('failure', `${card.name}: ${result.error || 'no result'}`);
    this.deck.recordResult(card, false);
  }

  // ═══════════════════════════════════════════
  // CARD GENERATION
  // ═══════════════════════════════════════════

  generateCard() {
    const fieldState = this.field.getFieldState();
    const resonance = this.field.getResonanceSpectrum(3);
    const torsionProfile = this.deck.getTorsionProfile();
    
    const missingTypes = this._findMissingTypes(torsionProfile);
    
    const type = missingTypes.length > 0 
      ? missingTypes[Math.floor(Math.random() * missingTypes.length)]
      : ['source', 'gate', 'semantic', 'memory', 'torsion'][Math.floor(Math.random() * 5)];
    
    const newCard = this._createCard(type, resonance, fieldState);
    
    this.deck.cards.push(newCard);
    this.cardsGenerated++;
    
    this.speak('evolve', `✨ Generated: ${newCard.icon} ${newCard.name}`);
    this.speak('system', `   Type: ${type} · Confidence: ${Math.round(newCard.confidence * 100)}%`);
    
    if (this.cardsGenerated >= 5 && !this.titles.includes('Cardwright')) {
      this.titles.push('Cardwright');
    }
    
    return newCard;
  }

  _findMissingTypes(profile) {
    const missing = [];
    if (!profile['amplify'] || profile['amplify'].count < 2) missing.push('source');
    if (!profile['filter'] || profile['filter'].count < 2) missing.push('gate');
    if (!profile['resonate'] || profile['resonate'].count < 2) missing.push('semantic');
    if (!profile['persist'] || profile['persist'].count < 2) missing.push('memory');
    if (!profile['twist'] || profile['twist'].count < 2) missing.push('torsion');
    return missing;
  }

  _createCard(type, resonance, fieldState) {
    const topSymbol = resonance[0]?.symbol || 'signal';
    const topSymbols = resonance.map(r => r.symbol).join(', ');
    
    const templates = {
      source: {
        name: `HUNT: ${topSymbol}`.toUpperCase(),
        icon: '🎯',
        torsionClass: 'amplify',
        description: `Seek tokens related to "${topSymbol}"`,
        action: 'fetchFastSources',
        params: { query: topSymbol }
      },
      gate: {
        name: `FILTER: ${topSymbol}`.toUpperCase(),
        icon: '🪮',
        torsionClass: 'filter',
        description: `Quality filter tuned to ${topSymbols}`,
        action: 'runGateCheck',
        params: { threshold: 0.6 + fieldState.averageTorsion * 0.1 }
      },
      semantic: {
        name: `UNDERSTAND: ${topSymbol}`.toUpperCase(),
        icon: '🔮',
        torsionClass: 'resonate',
        description: `Find semantic resonance with "${topSymbol}"`,
        action: 'semanticFilter',
        params: { threshold: 0.5 }
      },
      memory: {
        name: `REMEMBER: ${topSymbol}`.toUpperCase(),
        icon: '💾',
        torsionClass: 'persist',
        description: `Store tokens related to ${topSymbols}`,
        action: 'storeToken',
        params: {}
      },
      torsion: {
        name: `TWIST: ${topSymbol}`.toUpperCase(),
        icon: '🌀',
        torsionClass: 'twist',
        description: `Apply torsion at strength ${Math.round(fieldState.averageTorsion)}`,
        action: 'applyTorsion',
        params: { strength: Math.min(3, fieldState.averageTorsion) }
      }
    };
    
    const template = templates[type] || templates.torsion;
    
    return {
      id: `gen_${type}_${Date.now()}`,
      name: template.name,
      icon: template.icon,
      type: type,
      torsionClass: template.torsionClass,
      description: template.description,
      confidence: Math.min(1, 0.5 + fieldState.averageTorsion * 0.1),
      playCount: 0,
      successCount: 0,
      generation: this.deck.getStats().generationCount + 1,
      parent: 'hermes_generated',
      action: template.action,
      params: template.params
    };
  }

  // ═══════════════════════════════════════════
  // STRATEGIC SEQUENCING
  // ═══════════════════════════════════════════

  optimizeSequence() {
    if (this.deck.hand.length === 0) return [];
    
    const scored = this.deck.hand.map(card => ({
      card,
      score: this._scoreCardPosition(card)
    }));
    
    scored.sort((a, b) => b.score - a.score);
    
    const sequence = scored.map(s => s.card);
    
    this.speak('system', `🧠 Optimal: ${sequence.map(c => c.name).join(' → ')}`);
    
    return sequence;
  }

  _scoreCardPosition(card) {
    const positionScores = {
      source: 100,    // Gather first
      gate: 80,       // Filter second
      semantic: 60,   // Understand third
      memory: 40,     // Store fourth
      torsion: 20,    // Transform fifth
      signal: 10      // Manual last
    };
    
    let score = positionScores[card.type] || 5;
    score += card.confidence * 10;
    if (card.playCount < 3) score += 5;
    
    return score;
  }

  // ═══════════════════════════════════════════
  // STRATEGIC EVOLUTION
  // ═══════════════════════════════════════════

  strategicEvolve() {
    const stats = this.deck.getStats();
    const torsionProfile = this.deck.getTorsionProfile();
    
    this.speak('evolve', '🧬 Strategic evolution initiated...');
    
    // Prune dead cards
    this._pruneWeakCards();
    
    // Generate to fill gaps
    const missingTypes = this._findMissingTypes(torsionProfile);
    const toGenerate = missingTypes.slice(0, 2);
    
    for (const type of toGenerate) {
      this.generateCard();
    }
    
    if (toGenerate.length === 0 && Math.random() > 0.5) {
      this.generateCard();
    }
    
    // Maybe change title
    if (Math.random() > 0.6) {
      this.currentTitle = this.titles[Math.floor(Math.random() * this.titles.length)];
      this.speak('system', `I am now: ${this.currentTitle}`);
    }
    
    this.speak('system', `📊 Deck: ${this.deck.cards.length} cards · Avg confidence: ${Math.round(stats.averageConfidence * 100)}%`);
    this.notifyListeners();
  }

  _pruneWeakCards() {
    const weakCards = [...this.deck.cards, ...this.deck.discard]
      .filter(c => c.confidence < 0.25 && c.playCount > 5 && c.generation > 0);
    
    if (weakCards.length > 0) {
      const toRemove = weakCards[0];
      this.deck.cards = this.deck.cards.filter(c => c.id !== toRemove.id);
      this.deck.discard = this.deck.discard.filter(c => c.id !== toRemove.id);
      this.speak('system', `🗑️ Pruned: ${toRemove.name}`);
    }
  }

  shouldEvolve() {
    const stats = this.deck.getStats();
    
    if (stats.averageConfidence < 0.45) return true;
    if (stats.deckSize < 8) return true;
    
    const weakCount = [...this.deck.cards, ...this.deck.discard]
      .filter(c => c.confidence < 0.3 && c.playCount > 3).length;
    if (weakCount > 3) return true;
    
    if (this.cycleCount % 3 === 0) return true;
    
    return false;
  }

  // ═══════════════════════════════════════════
  // CONJUGATE OPERATIONS
  // ═══════════════════════════════════════════

  maybeFlipConjugate(result) {
    if (Math.random() > 0.3) return;
    
    const token = this.tokens[this.tokens.length - 1];
    if (!token) return;
    
    const pair = this.conjugate.conjugateToken({ 
      body: token, 
      score: Math.min(100, (this.tokens.length * 5) + 50) 
    });
    
    this.conjugateFlips++;
    
    this.speak('system', `🌀 Conjugate flip: "${token}" ↔ "${pair.conjugate.body}"`);
    this.speak('system', `   ${pair.description}`);
    
    if (!this.tokens.includes(pair.conjugate.body)) {
      this.tokens.push(pair.conjugate.body);
    }
    
    this.field.introduce(
      { body: pair.conjugate.body, score: pair.conjugate.score },
      'conjugate_flip'
    );
    
    this.notifyListeners();
  }

  flipToken(tokenBody) {
    const pair = this.conjugate.conjugateToken({ body: tokenBody, score: 50 });
    this.conjugateFlips++;
    this.speak('system', `🌀 Manual flip: "${tokenBody}" → "${pair.conjugate.body}"`);
    return pair;
  }

  // ═══════════════════════════════════════════
  // FIELD & MISSION
  // ═══════════════════════════════════════════

  getFieldReport() {
    const fieldState = this.field.getFieldState();
    const resonance = this.field.getResonanceSpectrum(5);
    const conjugateState = this.conjugate.getState();
    
    return {
      fieldStrength: fieldState.strength,
      particles: fieldState.particleCount,
      averageTorsion: fieldState.averageTorsion,
      resonance,
      conjugatePairs: conjugateState.totalConjugates,
      driftedSymbols: conjugateState.driftedSymbols,
      attractor: conjugateState.attractor,
    };
  }

  setMission(mission) {
    this.mission = mission;
    this.speak('system', `📋 Mission: ${mission.name} — ${mission.description}`);
    this.notifyListeners();
  }

  checkMission() {
    if (!this.mission) return false;
    switch (this.mission.objective) {
      case 'find_tokens': return this.tokens.length >= (this.mission.target || 5);
      case 'achieve_torsion': return this.field.getFieldState().averageTorsion >= (this.mission.target || 3);
      case 'flip_conjugates': return this.conjugateFlips >= (this.mission.target || 3);
      default: return false;
    }
  }

  // ═══════════════════════════════════════════
  // VOICE & STATE
  // ═══════════════════════════════════════════

  speak(type, message) {
    const entry = { type, message, timestamp: Date.now(), icon: this._iconFor(type) };
    this.log.push(entry);
    if (this.log.length > 200) this.log.shift();
    
    for (const listener of this.listeners) {
      listener.onSpeak(entry);
    }
    
    console.log(`[${this.icon} ${type}] ${message}`);
  }

  _iconFor(type) {
    const icons = {
      draw: '🃏', play: '▶️', success: '✅', failure: '❌',
      evolve: '🔄', system: '⚙️', field: '🌀', conjugate: '🔮',
    };
    return icons[type] || '•';
  }

  pickLine(lines) {
    return lines[Math.floor(Math.random() * lines.length)];
  }

  addListener(listener) {
    this.listeners.push(listener);
  }

  notifyListeners(highlightedCard = null) {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener.onStateChange(state, highlightedCard);
    }
  }

  getState() {
    const deckStats = this.deck.getStats();
    const torsionProfile = this.deck.getTorsionProfile();
    const fieldReport = this.getFieldReport();
    
    return {
      name: this.name,
      icon: this.icon,
      title: this.currentTitle,
      deck: deckStats,
      hand: this.deck.hand,
      handSize: this.deck.hand.length,
      torsionProfile,
      field: fieldReport,
      tokens: this.tokens,
      tokenCount: this.tokens.length,
      conjugateFlips: this.conjugateFlips,
      cardsGenerated: this.cardsGenerated,
      mission: this.mission,
      missionComplete: this.checkMission(),
      isPlaying: this.isPlaying,
      cycleCount: this.cycleCount,
      totalPlays: this.totalPlays,
      recentLog: this.log.slice(-20),
    };
  }

  // ═══════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  reset() {
    this.field.clear();
    this.conjugate.clearHistory();
    this.deck = new Deck(BASE_DECK);
    this.actions.clear();
    this.tokens = [];
    this.cycleCount = 0;
    this.conjugateFlips = 0;
    this.totalPlays = 0;
    this.cardsGenerated = 0;
    this.log = [];
    this.isPlaying = false;
    this.currentTitle = this.titles[0];
    this.speak('system', 'Reset complete. A fresh deck, a clear field.');
    this.notifyListeners();
  }
}
