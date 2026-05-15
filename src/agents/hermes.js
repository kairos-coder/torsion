// TORSION · Hermes Agent
// First particle-operator: draws cards, navigates the field, flips conjugates

import { Deck } from '../cards/deck.js';
import { CardActions } from '../cards/card-actions.js';
import { BASE_DECK, CONFIG, VOICE_LINES } from '../cards/config.js';
import { HarmonicConjugate } from '../field/conjugate.js';
import { TorsionField } from '../field/torsion-field.js';

export class HermesAgent {
  constructor(gate, sb) {
    // Name and identity
    this.name = 'Hermes';
    this.icon = '🪶';
    this.titles = [
      'Messenger of the Gods',
      'Boundary-Crosser',
      'Interpreter of Symbols',
      'Thief of Meaning',
      'Guide of Souls',
      'First Particle-Operator',
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
    
    // Voice
    this.log = [];        // Hermes' spoken log
    this.listeners = [];  // UI update callbacks
  }

  // ═══════════════════════════════════════════
  // CORE OPERATIONS
  // ═══════════════════════════════════════════

  /**
   * Draw a new hand from the deck.
   */
  drawHand() {
    const hand = this.deck.drawHand();
    this.speak('draw', this.pickLine(VOICE_LINES.draw));
    this.speak('system', `Hand: ${hand.map(c => c.icon + ' ' + c.name).join(' · ')}`);
    this.notifyListeners();
    return hand;
  }

  /**
   * Play the current hand as a sequence.
   * Each card executes in order, feeding results forward.
   */
  async playSequence() {
    if (this.isPlaying || this.deck.hand.length === 0) {
      this.speak('system', 'No cards in hand. Draw first.');
      return;
    }
    
    this.isPlaying = true;
    this.cycleCount++;
    const cards = [...this.deck.hand];
    
    this.speak('play', this.pickLine(VOICE_LINES.play));
    this.speak('system', `Sequence: ${cards.map(c => c.name).join(' → ')}`);
    
    const sequenceResults = [];
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const playedCard = this.deck.playCard(card.id);
      
      if (!playedCard) {
        this.speak('system', `${card.name} not in hand — skipping`);
        continue;
      }
      
      this.totalPlays++;
      this.speak('play', `${card.icon} Playing: ${card.name}`);
      this.notifyListeners(card.id); // Highlight current card
      
      try {
        // Execute the card action
        const actionFn = this.actions[card.action];
        if (!actionFn) {
          this.speak('failure', `Unknown action: ${card.action}`);
          this.deck.recordResult(card, false);
          sequenceResults.push({ card: card.name, success: false, error: 'Unknown action' });
          continue;
        }
        
        const result = await actionFn.call(this.actions, card.params);
        
        if (result.success) {
          this.speak('success', this.pickLine(VOICE_LINES.success));
          this.speak('success', `${card.name}: ${result.data}`);
          
          // Collect tokens
          if (result.tokens && result.tokens.length > 0) {
            this.tokens.push(...result.tokens.filter(t => !this.tokens.includes(t)));
            this.speak('success', `🎯 +${result.tokens.length} tokens (${this.tokens.length} total)`);
          }
          
          this.deck.recordResult(card, true);
          sequenceResults.push({ card: card.name, ...result });
          
          // Successful cards may trigger conjugate flip
          if (card.torsionClass === 'mirror' || card.torsionClass === 'twist') {
            this.maybeFlipConjugate(result);
          }
          
        } else {
          this.speak('failure', this.pickLine(VOICE_LINES.failure));
          this.speak('failure', `${card.name}: ${result.error || 'no result'}`);
          this.deck.recordResult(card, false);
          sequenceResults.push({ card: card.name, ...result });
        }
        
      } catch (err) {
        this.speak('failure', `${card.name} errored: ${err.message}`);
        this.deck.recordResult(card, false);
        sequenceResults.push({ card: card.name, success: false, error: err.message });
      }
      
      // Brief pause between cards for dramatic effect
      await this.sleep(300);
      this.notifyListeners();
    }
    
    // Discard any remaining hand
    this.deck.discardHand();
    
    // Decay the field slightly
    this.field.decay();
    
    this.isPlaying = false;
    
    // Check for evolution
    if (this.deck.history.length % CONFIG.EVOLUTION_THRESHOLD === 0) {
      this.evolve();
    }
    
    this.notifyListeners();
    return sequenceResults;
  }

  /**
   * Play a single card by ID from the hand.
   */
  async playCard(cardId) {
    const card = this.deck.hand.find(c => c.id === cardId);
    if (!card) {
      this.speak('system', 'Card not in hand');
      return;
    }
    
    const playedCard = this.deck.playCard(cardId);
    if (!playedCard) return;
    
    this.totalPlays++;
    this.speak('play', `${card.icon} Playing: ${card.name}`);
    
    try {
      const actionFn = this.actions[card.action];
      const result = await actionFn.call(this.actions, card.params);
      
      if (result.success) {
        this.speak('success', `${card.name}: ${result.data}`);
        if (result.tokens) {
          this.tokens.push(...result.tokens.filter(t => !this.tokens.includes(t)));
        }
        this.deck.recordResult(card, true);
      } else {
        this.speak('failure', `${card.name}: ${result.error || 'failed'}`);
        this.deck.recordResult(card, false);
      }
      
      this.deck.discardHand();
    } catch (err) {
      this.speak('failure', `${card.name} errored: ${err.message}`);
      this.deck.recordResult(card, false);
    }
    
    this.notifyListeners();
  }

  // ═══════════════════════════════════════════
  // CONJUGATE OPERATIONS
  // ═══════════════════════════════════════════

  /**
   * Maybe flip a token into its harmonic conjugate.
   * Mirror and twist cards have a chance to trigger this.
   */
  maybeFlipConjugate(result) {
    // 30% chance to flip when conditions are right
    if (Math.random() > 0.3) return;
    
    // Get a token to flip
    const token = this.tokens[this.tokens.length - 1];
    if (!token) return;
    
    const pair = this.conjugate.conjugateToken({ 
      body: token, 
      score: Math.min(100, (this.tokens.length * 5) + 50) 
    });
    
    this.conjugateFlips++;
    
    this.speak('system', `🌀 Conjugate flip: "${token}" ↔ "${pair.conjugate.body}"`);
    this.speak('system', `   ${pair.description}`);
    
    // Add the conjugate as a new token
    if (!this.tokens.includes(pair.conjugate.body)) {
      this.tokens.push(pair.conjugate.body);
    }
    
    // Introduce the conjugate into the field
    this.field.introduce(
      { body: pair.conjugate.body, score: pair.conjugate.score },
      'conjugate_flip'
    );
    
    this.notifyListeners();
  }

  /**
   * Manually flip a specific token.
   */
  flipToken(tokenBody) {
    const pair = this.conjugate.conjugateToken({ 
      body: tokenBody, 
      score: 50 
    });
    
    this.conjugateFlips++;
    this.speak('system', `🌀 Manual flip: "${tokenBody}" → "${pair.conjugate.body}"`);
    
    return pair;
  }

  // ═══════════════════════════════════════════
  // EVOLUTION
  // ═══════════════════════════════════════════

  /**
   * Evolve the deck.
   */
  evolve() {
    const mutations = this.deck.evolve();
    
    if (mutations > 0) {
      this.speak('evolve', this.pickLine(VOICE_LINES.evolve));
      this.speak('system', `${mutations} cards mutated or spawned`);
      
      // Random chance to change title
      if (Math.random() > 0.7) {
        this.currentTitle = this.titles[Math.floor(Math.random() * this.titles.length)];
        this.speak('system', `I am now: ${this.currentTitle}`);
      }
    }
    
    this.notifyListeners();
  }

  // ═══════════════════════════════════════════
  // FIELD OPERATIONS
  // ═══════════════════════════════════════════

  /**
   * Get the current field state.
   */
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

  // ═══════════════════════════════════════════
  // MISSION SYSTEM
  // ═══════════════════════════════════════════

  /**
   * Set a mission objective.
   */
  setMission(mission) {
    this.mission = mission;
    this.speak('system', `📋 Mission: ${mission.name} — ${mission.description}`);
    this.notifyListeners();
  }

  /**
   * Check if current mission is complete.
   */
  checkMission() {
    if (!this.mission) return false;
    
    switch (this.mission.objective) {
      case 'find_tokens':
        return this.tokens.length >= (this.mission.target || 5);
      case 'achieve_torsion':
        return this.field.getFieldState().averageTorsion >= (this.mission.target || 3);
      case 'flip_conjugates':
        return this.conjugateFlips >= (this.mission.target || 3);
      default:
        return false;
    }
  }

  // ═══════════════════════════════════════════
  // VOICE & LOGGING
  // ═══════════════════════════════════════════

  /**
   * Hermes speaks.
   */
  speak(type, message) {
    const entry = {
      type,
      message,
      timestamp: Date.now(),
      icon: this.getIcon(type),
    };
    
    this.log.push(entry);
    
    // Keep log bounded
    if (this.log.length > 200) {
      this.log.shift();
    }
    
    // Notify UI
    for (const listener of this.listeners) {
      listener.onSpeak(entry);
    }
    
    console.log(`[${this.icon} ${type}] ${message}`);
  }

  getIcon(type) {
    const icons = {
      draw: '🃏',
      play: '▶️',
      success: '✅',
      failure: '❌',
      evolve: '🔄',
      system: '⚙️',
      field: '🌀',
      conjugate: '🔮',
    };
    return icons[type] || '•';
  }

  pickLine(lines) {
    return lines[Math.floor(Math.random() * lines.length)];
  }

  // ═══════════════════════════════════════════
  // LISTENERS (UI binding)
  // ═══════════════════════════════════════════

  /**
   * Register a UI listener.
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * Notify all listeners of state change.
   */
  notifyListeners(highlightedCard = null) {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener.onStateChange(state, highlightedCard);
    }
  }

  // ═══════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════

  /**
   * Get the full agent state for rendering.
   */
  getState() {
    const deckStats = this.deck.getStats();
    const torsionProfile = this.deck.getTorsionProfile();
    const fieldReport = this.getFieldReport();
    
    return {
      // Hermes identity
      name: this.name,
      icon: this.icon,
      title: this.currentTitle,
      
      // Deck
      deck: deckStats,
      hand: this.deck.hand,
      handSize: this.deck.hand.length,
      torsionProfile,
      
      // Field
      field: fieldReport,
      
      // Tokens
      tokens: this.tokens,
      tokenCount: this.tokens.length,
      
      // Conjugates
      conjugateFlips: this.conjugateFlips,
      
      // Mission
      mission: this.mission,
      missionComplete: this.checkMission(),
      
      // Activity
      isPlaying: this.isPlaying,
      cycleCount: this.cycleCount,
      totalPlays: this.totalPlays,
      
      // Recent log
      recentLog: this.log.slice(-20),
    };
  }

  // ═══════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /**
   * Reset the agent.
   */
  reset() {
    this.field.clear();
    this.conjugate.clearHistory();
    this.deck = new Deck(BASE_DECK);
    this.actions.clear();
    this.tokens = [];
    this.cycleCount = 0;
    this.conjugateFlips = 0;
    this.totalPlays = 0;
    this.log = [];
    this.isPlaying = false;
    this.speak('system', 'Reset complete. A fresh deck, a clear field.');
    this.notifyListeners();
  }
}
// ═══════════════════════════════════════════
// CARD GENERATION — Hermes creates new tools
// ═══════════════════════════════════════════

/**
 * Generate a new card based on what the field has learned.
 * Uses resonance spectrum to determine what kind of card would be useful.
 */
generateCard() {
  const fieldState = this.field.getFieldState();
  const resonance = this.field.getResonanceSpectrum(3);
  const deckStats = this.deck.getStats();
  
  // Determine what's missing from the deck
  const torsionProfile = this.deck.getTorsionProfile();
  const missingTypes = [];
  
  if (!torsionProfile['amplify'] || torsionProfile['amplify'].count < 2) missingTypes.push('source');
  if (!torsionProfile['filter'] || torsionProfile['filter'].count < 2) missingTypes.push('gate');
  if (!torsionProfile['resonate'] || torsionProfile['resonate'].count < 2) missingTypes.push('semantic');
  if (!torsionProfile['persist'] || torsionProfile['persist'].count < 2) missingTypes.push('memory');
  if (!torsionProfile['twist'] || torsionProfile['twist'].count < 2) missingTypes.push('torsion');
  
  // Pick a missing type, or a random one if the deck is balanced
  const type = missingTypes.length > 0 
    ? missingTypes[Math.floor(Math.random() * missingTypes.length)]
    : ['source', 'gate', 'semantic', 'memory', 'torsion'][Math.floor(Math.random() * 5)];
  
  // Generate based on type
  const newCard = this.createCard(type, resonance, fieldState);
  
  // Add to deck
  this.deck.cards.push(newCard);
  
  this.speak('evolve', `✨ Generated new card: ${newCard.icon} ${newCard.name}`);
  this.speak('system', `   Type: ${type} | Confidence: ${Math.round(newCard.confidence * 100)}%`);
  this.speak('system', `   "${newCard.description}"`);
  
  return newCard;
}

/**
 * Create a card of a specific type, tuned to the current field state.
 */
createCard(type, resonance, fieldState) {
  const topSymbols = resonance.map(r => r.symbol).join(', ');
  const id = `generated_${type}_${Date.now()}`;
  
  const templates = {
    source: {
      name: `HUNT: ${resonance[0]?.symbol || 'signal'}`.toUpperCase(),
      icon: '🎯',
      torsionClass: 'amplify',
      description: `Seek tokens related to "${resonance[0]?.symbol || 'meaning'}"`,
      action: 'fetchFastSources',
      params: { query: resonance[0]?.symbol }
    },
    gate: {
      name: `FILTER: ${resonance[0]?.symbol || 'noise'}`.toUpperCase(),
      icon: '🪮',
      torsionClass: 'filter',
      description: `Quality filter tuned to ${topSymbols}`,
      action: 'runGateCheck',
      params: { threshold: 0.6 + fieldState.averageTorsion * 0.1 }
    },
    semantic: {
      name: `UNDERSTAND: ${resonance[0]?.symbol || 'meaning'}`.toUpperCase(),
      icon: '🔮',
      torsionClass: 'resonate',
      description: `Find semantic resonance with "${resonance[0]?.symbol || 'truth'}"`,
      action: 'semanticFilter',
      params: { threshold: 0.5 }
    },
    memory: {
      name: `REMEMBER: ${resonance[0]?.symbol || 'past'}`.toUpperCase(),
      icon: '💾',
      torsionClass: 'persist',
      description: `Store tokens related to ${topSymbols}`,
      action: 'storeToken',
      params: {}
    },
    torsion: {
      name: `TWIST: ${resonance[0]?.symbol || 'reality'}`.toUpperCase(),
      icon: '🌀',
      torsionClass: 'twist',
      description: `Apply torsion strength ${Math.round(fieldState.averageTorsion)} to the field`,
      action: 'applyTorsion',
      params: { strength: Math.min(3, fieldState.averageTorsion) }
    }
  };
  
  const template = templates[type] || templates.torsion;
  
  return {
    id,
    name: template.name,
    icon: template.icon,
    type: type,
    torsionClass: template.torsionClass,
    description: template.description,
    confidence: 0.5 + fieldState.averageTorsion * 0.1,
    playCount: 0,
    successCount: 0,
    generation: this.deck.getStats().generationCount + 1,
    parent: 'hermes_generated',
    action: template.action,
    params: template.params
  };
}

// ═══════════════════════════════════════════
// STRATEGIC SEQUENCING — Play cards in optimal order
// ═══════════════════════════════════════════

/**
 * Analyze the hand and determine the optimal play sequence.
 * Source cards first (gather), then gate/semantic (filter), 
 * then torsion/memory (process), then evolve (mutate).
 */
optimizeSequence() {
  if (this.deck.hand.length === 0) return [];
  
  const hand = [...this.deck.hand];
  
  // Score each card for its position in the sequence
  const scored = hand.map((card, index) => {
    let positionScore = 0;
    
    // Source cards should go first (gather tokens)
    if (card.type === 'source') positionScore = 100;
    // Gate cards next (filter quality)
    else if (card.type === 'gate') positionScore = 80;
    // Semantic cards after gate (understand)
    else if (card.type === 'semantic') positionScore = 60;
    // Memory/storage cards next (persist)
    else if (card.type === 'memory') positionScore = 40;
    // Torsion cards next (transform)
    else if (card.type === 'torsion') positionScore = 20;
    // Signal cards last (manual input)
    else if (card.type === 'signal') positionScore = 10;
    
    // Boost for high-confidence cards
    positionScore += card.confidence * 10;
    
    // Boost for cards that need play (low play count)
    if (card.playCount < 3) positionScore += 5;
    
    return { card, index, score: positionScore };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  const sequence = scored.map(s => s.card);
  
  this.speak('system', `🧠 Optimal sequence: ${sequence.map(c => c.name).join(' → ')}`);
  
  return sequence;
}

/**
 * Play the hand in the optimal sequence.
 */
async playOptimizedSequence() {
  if (this.isPlaying || this.deck.hand.length === 0) {
    this.speak('system', 'No cards to play');
    return;
  }
  
  const sequence = this.optimizeSequence();
  
  // Reorder the hand to match the optimized sequence
  this.deck.hand = sequence;
  
  // Play normally (now in optimized order)
  return await this.playSequence();
}

// ═══════════════════════════════════════════
// STRATEGIC EVOLUTION — Prune and generate
// ═══════════════════════════════════════════

/**
 * Strategic evolution: analyze the deck, prune weak cards, 
 * generate new ones to fill gaps.
 */
strategicEvolve() {
  const stats = this.deck.getStats();
  const torsionProfile = this.deck.getTorsionProfile();
  
  this.speak('evolve', '🧬 Strategic evolution initiated...');
  
  // Find cards that are dead weight
  const weakCards = [...this.deck.cards, ...this.deck.discard]
    .filter(c => c.confidence < 0.25 && c.playCount > 5 && c.generation > 0);
  
  if (weakCards.length > 0) {
    // Remove the weakest
    const toRemove = weakCards[0];
    this.deck.cards = this.deck.cards.filter(c => c.id !== toRemove.id);
    this.deck.discard = this.deck.discard.filter(c => c.id !== toRemove.id);
    this.speak('system', `🗑️ Pruned: ${toRemove.name} (confidence: ${Math.round(toRemove.confidence * 100)}%)`);
  }
  
  // Generate cards to fill gaps
  const missingTypes = [];
  if (!torsionProfile['amplify'] || torsionProfile['amplify'].count < 3) missingTypes.push('source');
  if (!torsionProfile['filter'] || torsionProfile['filter'].count < 2) missingTypes.push('gate');
  if (!torsionProfile['resonate'] || torsionProfile['resonate'].count < 2) missingTypes.push('semantic');
  if (!torsionProfile['twist'] || torsionProfile['twist'].count < 2) missingTypes.push('torsion');
  
  // Generate up to 2 cards to fill gaps
  const toGenerate = missingTypes.slice(0, 2);
  for (const type of toGenerate) {
    this.generateCard();
  }
  
  // If no gaps, maybe generate a torsion card for variety
  if (toGenerate.length === 0 && Math.random() > 0.5) {
    this.generateCard();
  }
  
  this.speak('system', `📊 Deck: ${this.deck.cards.length} cards | Avg confidence: ${Math.round(stats.averageConfidence * 100)}%`);
}

/**
 * Decide whether to evolve based on deck health.
 */
shouldEvolve() {
  const stats = this.deck.getStats();
  
  // Evolve if confidence is dropping
  if (stats.averageConfidence < 0.45) return true;
  
  // Evolve if deck is small
  if (stats.deckSize < 8) return true;
  
  // Evolve if there are weak cards
  const weakCount = [...this.deck.cards, ...this.deck.discard]
    .filter(c => c.confidence < 0.3 && c.playCount > 3).length;
  if (weakCount > 3) return true;
  
  // Evolve periodically
  if (this.cycleCount % 3 === 0) return true;
  
  return false;
}
