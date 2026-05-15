// TORSION · Resonance Tracker
// Symbols gain weight through recurrence and conjugate co-occurrence

export class Resonance {
  constructor() {
    this.frequencies = new Map();     // symbol → occurrence count
    this.coOccurrence = new Map();    // "symbolA|symbolB" → count
    this.timeline = [];              // [{ symbol, timestamp }]
    this.totalEvents = 0;
  }

  /**
   * Record a symbol occurrence.
   */
  record(symbol, source = 'unknown') {
    const key = symbol.toLowerCase().trim();
    if (!key) return;
    
    this.frequencies.set(key, (this.frequencies.get(key) || 0) + 1);
    this.timeline.push({ symbol: key, source, timestamp: Date.now() });
    this.totalEvents++;
    
    // Keep timeline bounded
    if (this.timeline.length > 500) {
      this.timeline.shift();
    }
  }

  /**
   * Record co-occurrence of two symbols.
   */
  recordPair(symbolA, symbolB) {
    const a = symbolA.toLowerCase().trim();
    const b = symbolB.toLowerCase().trim();
    if (!a || !b || a === b) return;
    
    // Order doesn't matter for resonance
    const pairKey = [a, b].sort().join('|');
    this.coOccurrence.set(pairKey, (this.coOccurrence.get(pairKey) || 0) + 1);
    
    // Also record individually
    this.record(a, 'co-occurrence');
    this.record(b, 'co-occurrence');
  }

  /**
   * Get the resonance strength of a symbol.
   * Strength = frequency * age_factor * co-occurrence_bonus
   */
  getStrength(symbol) {
    const key = symbol.toLowerCase().trim();
    const freq = this.frequencies.get(key) || 0;
    
    if (freq === 0) return 0;
    
    // Frequency component (0-70)
    const freqScore = Math.min(70, freq * 3);
    
    // Co-occurrence bonus (0-30)
    let coBonus = 0;
    for (const [pairKey, count] of this.coOccurrence) {
      if (pairKey.includes(key)) {
        coBonus += count * 2;
      }
    }
    const coScore = Math.min(30, coBonus);
    
    // Recent activity bonus (0-20)
    const recentCount = this.timeline.slice(-50).filter(e => e.symbol === key).length;
    const recentScore = Math.min(20, recentCount * 4);
    
    return Math.min(100, freqScore + coScore + recentScore);
  }

  /**
   * Get the resonance spectrum — top N symbols by strength.
   */
  getSpectrum(topN = 10) {
    const symbols = Array.from(this.frequencies.keys());
    
    return symbols
      .map(symbol => ({
        symbol,
        frequency: this.frequencies.get(symbol),
        strength: this.getStrength(symbol),
      }))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, topN);
  }

  /**
   * Find symbols that resonate with each other.
   */
  getResonantPairs(minCoOccurrence = 3) {
    const pairs = [];
    
    for (const [pairKey, count] of this.coOccurrence) {
      if (count >= minCoOccurrence) {
        const [a, b] = pairKey.split('|');
        pairs.push({
          symbols: [a, b],
          coOccurrence: count,
          strengthA: this.getStrength(a),
          strengthB: this.getStrength(b),
          combinedStrength: (this.getStrength(a) + this.getStrength(b)) / 2,
        });
      }
    }
    
    return pairs.sort((a, b) => b.combinedStrength - a.combinedStrength);
  }

  /**
   * Check if a symbol is "canon-worthy" — high resonance over time.
   */
  isCanonWorthy(symbol, threshold = 70) {
    return this.getStrength(symbol) >= threshold;
  }

  /**
   * Get recent activity.
   */
  getRecent(count = 20) {
    return this.timeline.slice(-count).reverse();
  }

  /**
   * Get full stats.
   */
  getStats() {
    const spectrum = this.getSpectrum(5);
    
    return {
      uniqueSymbols: this.frequencies.size,
      totalOccurrences: this.totalEvents,
      resonantPairs: this.getResonantPairs().length,
      topSymbol: spectrum[0] || null,
      spectrum,
      averageStrength: this.frequencies.size > 0
        ? Array.from(this.frequencies.keys())
            .reduce((s, sym) => s + this.getStrength(sym), 0) / this.frequencies.size
        : 0,
    };
  }
}
