// TORSION · Deck Management
// The deck is a living memory of information particles

import { CONFIG, TORSION_CLASSES } from './config.js';

export class Deck {
  constructor(cards = []) {
    this.cards = JSON.parse(JSON.stringify(cards));
    this.hand = [];
    this.discard = [];
    this.history = [];
    this.lineage = new Map(); // Track card ancestry
  }

  // ── Core Operations ──

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  drawHand(size = CONFIG.HAND_SIZE) {
    // Reshuffle discard into deck if needed
    if (this.cards.length < size) {
      this.cards.push(...this.discard);
      this.discard = [];
      this.shuffle();
    }

    // Return any remaining hand to discard
    if (this.hand.length > 0) {
      this.discard.push(...this.hand);
    }

    this.hand = this.cards.splice(0, Math.min(size, this.cards.length));
    return this.hand;
  }

  playCard(cardId) {
    const index = this.hand.findIndex(c => c.id === cardId);
    if (index === -1) return null;
    const card = this.hand.splice(index, 1)[0];
    card.playCount++;
    return card;
  }

  discardCard(card) {
    this.discard.push(card);
  }

  discardHand() {
    if (this.hand.length > 0) {
      this.discard.push(...this.hand);
      this.hand = [];
    }
  }

  // ── Memory Operations ──

  recordResult(card, success) {
    if (success) {
      card.successCount++;
      card.confidence = Math.min(1, card.confidence * CONFIG.TORSION_GROWTH);
    } else {
      card.confidence = Math.max(0.1, card.confidence * CONFIG.TORSION_DECAY);
    }
    
    this.discardCard(card);
    this.history.push({
      cardId: card.id,
      cardName: card.name,
      success,
      confidence: card.confidence,
      timestamp: Date.now(),
      generation: card.generation,
    });

    // Track lineage
    if (!this.lineage.has(card.id)) {
      this.lineage.set(card.id, []);
    }
    this.lineage.get(card.id).push({
      success,
      timestamp: Date.now(),
      confidence: card.confidence,
    });
  }

  // ── Evolution ──

  evolve() {
    let mutations = 0;

    // Mutate low-confidence cards that have been played enough
    this.cards = this.cards.map(card => {
      if (card.confidence < 0.3 && card.playCount > 5) {
        mutations++;
        return this.mutateCard(card);
      }
      return card;
    });

    // Also check discard for mutation candidates
    this.discard = this.discard.map(card => {
      if (card.confidence < 0.3 && card.playCount > 5) {
        mutations++;
        return this.mutateCard(card);
      }
      return card;
    });

    // Remove truly dead cards
    this.discard = this.discard.filter(card => {
      return !(card.confidence < 0.15 && card.playCount > 10);
    });

    // Spawn new cards from highly successful ones
    if (this.cards.length < 8) {
      const successful = [...this.cards, ...this.discard]
        .filter(c => c.confidence > 0.7)
        .sort((a, b) => b.confidence - a.confidence);

      if (successful.length > 0) {
        const child = this.spawnCard(successful[0]);
        this.cards.push(child);
        mutations++;
      }
    }

    return mutations;
  }

  mutateCard(card) {
    const mutations = [
      { suffix: ' ✧', confidence: 0.5, bonus: 'Refined through torsion' },
      { suffix: ' ∿', confidence: 0.4, bonus: 'Spiral-accelerated' },
      { suffix: ' ⚡', confidence: 0.6, bonus: 'Field-charged variant' },
    ];

    const mutation = mutations[Math.floor(Math.random() * mutations.length)];

    return {
      ...card,
      id: card.id + '_' + Date.now(),
      name: card.name + mutation.suffix,
      confidence: mutation.confidence,
      playCount: 0,
      successCount: 0,
      description: card.description + '. ' + mutation.bonus + '.',
      parent: card.id,
      generation: (card.generation || 0) + 1,
    };
  }

  spawnCard(parent) {
    return {
      ...parent,
      id: parent.id + '_child_' + Date.now(),
      name: parent.name + ' II',
      confidence: parent.confidence * 0.8,
      playCount: 0,
      successCount: 0,
      description: parent.description + ' Spawned from successful lineage.',
      parent: parent.id,
      generation: (parent.generation || 0) + 1,
    };
  }

  // ── Lineage ──

  getLineage(cardId) {
    return this.lineage.get(cardId) || [];
  }

  getAncestors(cardId) {
    const ancestors = [];
    let current = [...this.cards, ...this.discard, ...this.hand].find(c => c.id === cardId);
    
    while (current && current.parent) {
      ancestors.push(current.parent);
      current = [...this.cards, ...this.discard, ...this.hand].find(c => c.id === current.parent);
    }
    
    return ancestors;
  }

  // ── Stats ──

  getStats() {
    const allCards = [...this.cards, ...this.hand, ...this.discard];
    const totalPlays = allCards.reduce((s, c) => s + c.playCount, 0);
    const totalSuccesses = allCards.reduce((s, c) => s + c.successCount, 0);
    
    return {
      deckSize: this.cards.length,
      handSize: this.hand.length,
      discardSize: this.discard.length,
      totalPlays,
      totalSuccesses,
      successRate: totalPlays > 0 ? totalSuccesses / totalPlays : 0,
      averageConfidence: allCards.length > 0 
        ? allCards.reduce((s, c) => s + c.confidence, 0) / allCards.length 
        : 0,
      topCard: allCards.sort((a, b) => b.confidence - a.confidence)[0],
      weakestCard: allCards.sort((a, b) => a.confidence - b.confidence)[0],
      generationCount: Math.max(...allCards.map(c => c.generation || 0)),
      mutations: allCards.filter(c => c.generation > 0).length,
    };
  }

  // ── Torsion ──

  getTorsionProfile() {
    const allCards = [...this.cards, ...this.hand, ...this.discard];
    const profile = {};
    
    for (const card of allCards) {
      const tClass = card.torsionClass || 'unknown';
      if (!profile[tClass]) {
        profile[tClass] = { count: 0, totalConfidence: 0, cards: [] };
      }
      profile[tClass].count++;
      profile[tClass].totalConfidence += card.confidence;
      profile[tClass].cards.push(card.name);
    }
    
    // Calculate averages
    for (const key of Object.keys(profile)) {
      profile[key].averageConfidence = profile[key].totalConfidence / profile[key].count;
    }
    
    return profile;
  }
}
