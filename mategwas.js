// mategwas.js — Mategwas the Hare-God, Dealer & Harmonic Computer
// ================================================================
// Mategwas never plays a card. He deals, shuffles, and computes D.
// D is the emergent card generated from torsion at collision points.

class Mategwas {
  constructor(masterDeck) {
    this.id = 'mategwas';
    this.name = 'Mategwas';
    this.sigil = '🐇';
    this.masterDeck = [...masterDeck];
    this.dCards = [];
    this.computationLog = [];
    
    // Anchor word → numeric value mapping
    // Each anchor word gets a complex value: real = semantic weight, imag = polarity
    this.anchorValues = this._buildAnchorValueMap();
  }

  // ----------------------------------------------------------
  // SHUFFLE — Fisher-Yates with runic blessing
  // ----------------------------------------------------------
  shuffle(deck = null) {
    const cards = deck ? [...deck] : [...this.masterDeck];
    const n = cards.length;
    
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    
    this._log('shuffle', `Shuffled ${n} cards with the leap of the hare`);
    return cards;
  }

  // ----------------------------------------------------------
  // DEAL — Deal 5 cards to each of 6 gods
  // ----------------------------------------------------------
  deal(gods) {
    const shuffled = this.shuffle();
    const hands = {};
    
    // Separate cards by god
    const cardsByGod = {};
    gods.forEach(god => {
      cardsByGod[god.id] = shuffled.filter(c => c.god === god.id);
    });
    
    // Deal 5 to each god (or all available if less than 5)
    gods.forEach(god => {
      const godCards = cardsByGod[god.id] || [];
      const handSize = Math.min(5, godCards.length);
      
      // Draw from their own pool first
      const hand = godCards.slice(0, handSize);
      const remaining = godCards.slice(handSize);
      
      // If not enough, draw from other gods' pools
      if (hand.length < 5) {
        const others = shuffled.filter(c => c.god !== god.id && !hand.find(h => h.id === c.id));
        const needed = 5 - hand.length;
        hand.push(...others.slice(0, needed));
      }
      
      hands[god.id] = {
        god: god.id,
        loop: god.loop,
        position: god.position,
        cards: hand,
        played: [],
        held: []
      };
    });
    
    this._log('deal', `Dealt 5 cards to each of ${gods.length} gods`);
    return hands;
  }

  // ----------------------------------------------------------
  // BUILD ANCHOR VALUE MAP
  // Maps each anchor word to a complex number for cross-ratio
  // ----------------------------------------------------------
  _buildAnchorValueMap() {
    const map = {};
    const allAnchors = {};
    
    // Collect all anchors from GODS
    GODS.forEach(god => {
      god.anchors.forEach((word, i) => {
        if (!allAnchors[word]) {
          // Semantic weight based on index (earlier anchors = more core)
          const realPart = 0.5 + (1.0 - (i / god.anchors.length)) * 0.5;
          // Polarity based on god's domain
          const imagPart = this._polarityToNumber(god.polarities?.[i % god.polarities?.length] || 'neutral');
          allAnchors[word] = { real: realPart, imag: imagPart, god: god.id };
        }
      });
    });
    
    return allAnchors;
  }

  _polarityToNumber(polarity) {
    switch(polarity) {
      case 'light': return 0.5;
      case 'dark': return -0.5;
      case 'order': return 0.3;
      case 'neutral': return 0.0;
      default: return 0.0;
    }
  }

  // ----------------------------------------------------------
  // MAP CARD TO COMPLEX NUMBER
  // Each card's anchor word gives its position on the complex plane
  // ----------------------------------------------------------
  cardToComplex(card) {
    const word = card.word;
    const value = this.anchorValues[word];
    
    if (value) {
      return { real: value.real * card.power / 5, imag: value.imag * card.power / 5 };
    }
    
    // Fallback: use PIE root hash
    const hash = this._hashString(card.pie_root);
    return { 
      real: (hash % 100) / 50 - 1, 
      imag: ((hash * 7) % 100) / 50 - 1 
    };
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  // ----------------------------------------------------------
  // CROSS-RATIO — The torsion at a collision point
  // (z1, z2, z3, z4) → (z1-z3)(z2-z4) / (z1-z4)(z2-z3)
  // ----------------------------------------------------------
  computeCrossRatio(z1, z2, z3, z4) {
    // Convert to complex-like objects {real, imag}
    const subtract = (a, b) => ({ real: a.real - b.real, imag: a.imag - b.imag });
    const multiply = (a, b) => ({
      real: a.real * b.real - a.imag * b.imag,
      imag: a.real * b.imag + a.imag * b.real
    });
    const divide = (a, b) => {
      const denom = b.real * b.real + b.imag * b.imag;
      if (denom === 0) return { real: Infinity, imag: Infinity };
      return {
        real: (a.real * b.real + a.imag * b.imag) / denom,
        imag: (a.imag * b.real - a.real * b.imag) / denom
      };
    };
    
    const num1 = multiply(subtract(z1, z3), subtract(z2, z4));
    const num2 = multiply(subtract(z1, z4), subtract(z2, z3));
    
    const crossRatio = divide(num1, num2);
    return crossRatio;
  }

  // ----------------------------------------------------------
  // TORSION SCORE — Real-valued measure from cross-ratio
  // ----------------------------------------------------------
  computeTorsionScore(cardA, cardB) {
    // Get four points from the two cards
    const z1 = this.cardToComplex(cardA);
    const z2 = this.cardToComplex(cardB);
    
    // Create two additional points from the gods' domain vectors
    const vecA = DOMAIN_VECTORS[cardA.domain] || [0, 0, 0];
    const vecB = DOMAIN_VECTORS[cardB.domain] || [0, 0, 0];
    
    const z3 = { real: vecA[0], imag: vecA[2] };
    const z4 = { real: vecB[0], imag: vecB[2] };
    
    const crossRatio = this.computeCrossRatio(z1, z2, z3, z4);
    
    // Torsion score = magnitude of cross-ratio
    const magnitude = Math.sqrt(
      crossRatio.real * crossRatio.real + crossRatio.imag * crossRatio.imag
    );
    
    // Check for PIE root resonance
    const affinity = this._getPieAffinity(cardA.pie_root, cardB.pie_root);
    const resonanceBonus = affinity * 2;
    
    // Check for domain conflict
    const conflict = this._getDomainConflict(cardA.domain, cardB.domain);
    const conflictPenalty = conflict * 1.5;
    
    // Final torsion score
    let score = magnitude * 5 + resonanceBonus - conflictPenalty;
    score = Math.max(0, Math.min(10, score));
    
    return {
      crossRatio: crossRatio,
      magnitude: magnitude,
      resonance: affinity > 0.3,
      conflict: conflict > 0.5,
      resonanceBonus: resonanceBonus,
      conflictPenalty: conflictPenalty,
      score: Math.round(score * 10) / 10
    };
  }

  _getPieAffinity(rootA, rootB) {
    const key1 = `${rootA}${rootB}`;
    const key2 = `${rootB}${rootA}`;
    return PIE_AFFINITIES[key1] || PIE_AFFINITIES[key2] || 0;
  }

  _getDomainConflict(domainA, domainB) {
    // Simplified domain conflict detection
    const orderDomains = ['sovereignty_sky_law', 'order_empire_contract', 'thunder_protection_craft'];
    const chaosDomains = ['chaos_fire_trickery', 'dissolution_dance_time'];
    const mysteryDomains = ['wisdom_sacrifice_mystery'];
    
    const aOrder = orderDomains.includes(domainA);
    const bOrder = orderDomains.includes(domainB);
    const aChaos = chaosDomains.includes(domainA);
    const bChaos = chaosDomains.includes(domainB);
    
    if ((aOrder && bChaos) || (aChaos && bOrder)) return 0.8;
    if (aOrder && bOrder) return 0.0;
    if (aChaos && bChaos) return 0.3;
    return 0.2;
  }

  // ----------------------------------------------------------
  // HARMONIC CONJUGATE — Generate D from three collision scores
  // ----------------------------------------------------------
  computeHarmonicConjugate(collisions) {
    // Take three torsion scores from positions A, B, C
    const scores = collisions.map(c => c.torsion.score);
    
    // Harmonic conjugate: if a,b,c are three points, the harmonic conjugate d
    // satisfies (a,b;c,d) = -1
    // For three real numbers, d = (ac + bc - 2ab) / (2c - a - b)
    // Simplified: d = harmonic mean of the three scores, shifted
    
    if (scores.length < 3) {
      this._log('error', 'Need 3 collision scores for harmonic conjugate');
      return null;
    }
    
    const [s1, s2, s3] = scores;
    
    // Harmonic conjugate formula for three points
    const harmonicMean = 3 / ((1/s1) + (1/s2) + (1/s3));
    const geometricMean = Math.cbrt(s1 * s2 * s3);
    const arithmeticMean = (s1 + s2 + s3) / 3;
    
    // D power = combination that favors emergent properties
    const dPower = Math.round((harmonicMean * 0.4 + geometricMean * 0.35 + arithmeticMean * 0.25) * 10) / 10;
    const dPowerClamped = Math.max(1, Math.min(10, Math.round(dPower)));
    
    // Generate D card
    const dCard = this._generateDCard(collisions, dPowerClamped);
    this.dCards.push(dCard);
    
    this._log('harmonic', `Computed D card: "${dCard.word}" (power: ${dCard.power})`);
    
    return dCard;
  }

  // ----------------------------------------------------------
  // GENERATE D CARD — The emergent card from collision
  // ----------------------------------------------------------
  _generateDCard(collisions, power) {
    // Fuse words from colliding cards
    const allCards = collisions.flatMap(c => [c.loopACard, c.loopBCard]);
    const words = allCards.map(c => c.word);
    const domains = [...new Set(allCards.map(c => c.domain))];
    const pieRoots = [...new Set(allCards.map(c => c.pie_root))];
    
    // Create fused word
    const fusedWord = this._fuseWords(words);
    const fusedEnglish = this._generateEnglishName(allCards);
    const fusedDomain = this._fuseDomains(domains);
    const fusedPieRoot = pieRoots.join(' + ');
    
    // Determine polarity from torsion scores
    const avgResonance = collisions.reduce((sum, c) => sum + (c.torsion.resonance ? 1 : 0), 0) / collisions.length;
    const polarity = avgResonance > 0.5 ? 'light' : avgResonance < 0.3 ? 'dark' : 'neutral';
    
    return {
      id: `D_${String(this.dCards.length + 1).padStart(3, '0')}`,
      generated_by: 'mategwas',
      round: collisions[0].round,
      from_collision: allCards.map(c => `${c.god}_${c.word}`),
      word: fusedWord,
      english: fusedEnglish,
      power: power,
      domain: fusedDomain,
      pie_root: fusedPieRoot,
      polarity: polarity,
      effect: this._generateDEffect(allCards, power),
      cost: { type: 'emergence', amount: Math.ceil(power / 2) },
      is_d_card: true
    };
  }

  _fuseWords(words) {
    if (words.length === 0) return 'wōðeldr';
    // Take first syllable of each word
    const syllables = words.map(w => w.substring(0, Math.ceil(w.length / 2)));
    return syllables.join('').substring(0, 12);
  }

  _generateEnglishName(cards) {
    const themes = cards.map(c => c.english.split(' ').pop());
    return `The ${themes.join('-')} Emergence`;
  }

  _fuseDomains(domains) {
    const parts = domains.map(d => d.split('_').pop());
    return parts.join('_');
  }

  _generateDEffect(cards, power) {
    const effects = cards.map(c => c.effect);
    return `Emergent fusion: ${effects.join(' + ')} at power ${power}`;
  }

  // ----------------------------------------------------------
  // LOGGING
  // ----------------------------------------------------------
  _log(type, message) {
    this.computationLog.push({
      timestamp: Date.now(),
      type: type,
      message: message
    });
  }

  getLog() {
    return this.computationLog;
  }

  // Add D card to master deck
  addDToMasterDeck() {
    this.dCards.forEach(dCard => {
      this.masterDeck.push(dCard);
    });
    this._log('deck', `Added ${this.dCards.length} D cards to master deck`);
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Mategwas;
}
