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
