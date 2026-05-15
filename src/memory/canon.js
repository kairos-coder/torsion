// TORSION · Canon Manager
// Symbols that survive long enough become permanent

export class Canon {
  constructor(storageKey = 'torsion_canon') {
    this.storageKey = storageKey;
    this.entries = this.load();       // [{ symbol, inducted, strength, lineage }]
    this.threshold = 70;             // Resonance threshold for induction
    this.minAge = 3;                 // Minimum cycles before eligible
  }

  /**
   * Load canon from persistent storage.
   */
  load() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Save canon to persistent storage.
   */
  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.entries));
    } catch (e) {
      console.warn('Failed to save canon:', e);
    }
  }

  /**
   * Consider a symbol for canon induction.
   * Returns true if inducted.
   */
  consider(symbol, resonance, lineage) {
    // Already canon?
    if (this.entries.find(e => e.symbol === symbol)) return false;
    
    // Check eligibility
    if (resonance.strength < this.threshold) return false;
    if ((resonance.frequency || 0) < this.minAge) return false;
    
    // Induct
    const entry = {
      symbol,
      inducted: Date.now(),
      strength: resonance.strength,
      frequency: resonance.frequency,
      lineage: lineage ? {
        generation: lineage.generation,
        ancestors: lineage.ancestors?.length || 0,
        children: lineage.children?.length || 0,
      } : null,
    };
    
    this.entries.push(entry);
    this.save();
    
    return true;
  }

  /**
   * Check if a symbol is canon.
   */
  isCanon(symbol) {
    return this.entries.some(e => e.symbol === symbol);
  }

  /**
   * Get canon symbols that match a pattern.
   */
  search(pattern) {
    const lower = pattern.toLowerCase();
    return this.entries.filter(e => e.symbol.toLowerCase().includes(lower));
  }

  /**
   * Get canon as influence for new card generation.
   * Canon symbols can seed new cards.
   */
  getInfluence(count = 5) {
    return this.entries
      .sort((a, b) => b.strength - a.strength)
      .slice(0, count)
      .map(e => ({
        symbol: e.symbol,
        strength: e.strength,
        age: Date.now() - e.inducted,
      }));
  }

  /**
   * Get canon stats.
   */
  getStats() {
    return {
      canonSize: this.entries.length,
      averageStrength: this.entries.length > 0
        ? this.entries.reduce((s, e) => s + e.strength, 0) / this.entries.length
        : 0,
      oldest: this.entries.sort((a, b) => a.inducted - b.inducted)[0] || null,
      newest: this.entries.sort((a, b) => b.inducted - a.inducted)[0] || null,
      strongest: this.entries.sort((a, b) => b.strength - a.strength)[0] || null,
      recentInductions: this.entries
        .filter(e => Date.now() - e.inducted < 3600000) // Last hour
        .map(e => e.symbol),
    };
  }

  /**
   * Remove a symbol from canon (rare — for corruption mechanics).
   */
  excommunicate(symbol) {
    const before = this.entries.length;
    this.entries = this.entries.filter(e => e.symbol !== symbol);
    if (this.entries.length < before) {
      this.save();
      return true;
    }
    return false;
  }

  /**
   * Clear canon (for reset).
   */
  clear() {
    this.entries = [];
    this.save();
  }
}
