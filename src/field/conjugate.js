// TORSION · Harmonic Conjugate Engine
// The mathematical spine: d = c / (2c - 1)
// Cross-ratio (A,B; C,D) = -1 preserved under all spiral transforms

export class HarmonicConjugate {
  constructor() {
    // Reference points for the projective line
    this.A = 0;  // The Canon — fixed origin
    this.B = 1;  // The Field Anchor — spiral attachment point
    
    // Known symbolic inversions (mythic pairs)
    this.symbolicPairs = new Map([
      ['threshold', 'passage'],
      ['passage', 'threshold'],
      ['mirror', 'witness'],
      ['witness', 'mirror'],
      ['spiral', 'axis'],
      ['axis', 'spiral'],
      ['hermes', 'boundary-breaker'],
      ['boundary-breaker', 'hermes'],
      ['ouroboros', 'linear-time'],
      ['linear-time', 'ouroboros'],
      ['phoenix', 'entropy'],
      ['entropy', 'phoenix'],
      ['chaos', 'order'],
      ['order', 'chaos'],
      ['torsion', 'equilibrium'],
      ['equilibrium', 'torsion'],
      ['light', 'shadow'],
      ['shadow', 'light'],
      ['signal', 'silence'],
      ['silence', 'signal'],
      ['form', 'void'],
      ['void', 'form'],
      ['memory', 'forgetting'],
      ['forgetting', 'memory'],
    ]);
    
    // Track all computed conjugates
    this.conjugateHistory = [];
  }

  /**
   * Compute the harmonic conjugate D of point C
   * with respect to reference points A and B.
   * 
   * Formula: D(c) = c / (2c - 1)
   * 
   * @param {number} c - The drifting symbol's numeric value (score or position)
   * @returns {number} d - The harmonic conjugate
   */
  compute(c) {
    // Handle edge cases
    if (c === 0.5) return Infinity;  // Role reversal — conjugate drifts
    if (c === Infinity) return 0.5;  // The Torsion Attractor
    if (c === -Infinity) return 0.5; // Same attractor from negative infinity
    
    // The harmonic conjugate formula
    const d = c / (2 * c - 1);
    
    return d;
  }

  /**
   * Compute conjugate with a symbolic body.
   * Returns both the numeric conjugate and the symbolic inversion.
   * 
   * @param {Object} token - { body: string, score: number }
   * @returns {Object} conjugate pair
   */
  conjugateToken(token) {
    const c = token.score || 50;
    const d = this.compute(c);
    
    // Get symbolic inversion
    const symbolicBody = this.invertSymbol(token.body || '');
    
    const conjugate = {
      body: symbolicBody,
      score: Math.max(1, Math.min(100, d * 100)),
      numericConjugate: d,
      originalScore: c,
      relationship: 'harmonic_conjugate',
      crossRatio: -1,
      invariant: true,
    };
    
    const pair = {
      original: { ...token },
      conjugate,
      crossRatio: -1,
      bond: 'harmonic',
      boundedAt: d === Infinity ? 'conjugate_drifts' : 
                  d === 0.5 ? 'torsion_attractor' : 'finite_pair',
      description: this.describe(c, d, token.body, symbolicBody),
      timestamp: Date.now(),
    };
    
    this.conjugateHistory.push(pair);
    
    // Keep history bounded
    if (this.conjugateHistory.length > 200) {
      this.conjugateHistory.shift();
    }
    
    return pair;
  }

  /**
   * Invert a symbol to its mythic counterpart.
   * Falls back to structural reversal if no known pair exists.
   */
  invertSymbol(body) {
    if (!body) return '';
    
    const key = body.toLowerCase().trim();
    
    // Check known pairs
    if (this.symbolicPairs.has(key)) {
      return this.symbolicPairs.get(key);
    }
    
    // Check if this is already a conjugate (reverse lookup)
    for (const [origin, conjugate] of this.symbolicPairs) {
      if (conjugate === key) return origin;
    }
    
    // Structural fallbacks
    if (key.length <= 3) {
      // Short symbols: reverse
      return key.split('').reverse().join('');
    }
    
    if (key.includes(' ')) {
      // Multi-word: reverse word order
      return key.split(' ').reverse().join(' ');
    }
    
    // Default: reverse the string
    return key.split('').reverse().join('');
  }

  /**
   * Describe the conjugate relationship.
   */
  describe(c, d, originalBody, conjugateBody) {
    if (d === Infinity || isNaN(d)) {
      return `${originalBody} → CONJUGATE DRIFTS (c = ${c.toFixed(2)}, role reversal)`;
    }
    if (Math.abs(d - 0.5) < 0.001) {
      return `${originalBody} → TORSION ATTRACTOR (c → ∞, d = 0.5)`;
    }
    if (d < 0) {
      return `${originalBody} ↔ ${conjugateBody} (inverted pair, d = ${d.toFixed(2)})`;
    }
    return `${originalBody} ↔ ${conjugateBody} (harmonic pair, d = ${d.toFixed(2)})`;
  }

  /**
   * Verify the cross-ratio holds.
   * (A,B; C,D) should equal -1 for any valid conjugate pair.
   * 
   * @returns {boolean} true if cross-ratio is within tolerance of -1
   */
  verifyCrossRatio(c, d, a = this.A, b = this.B) {
    // Cross-ratio = (AC/CB) / (AD/DB)
    // For numeric values: (c-a)/(b-c) / (d-a)/(b-d)
    
    const AC = c - a;
    const CB = b - c;
    const AD = d - a;
    const DB = b - d;
    
    if (CB === 0 || DB === 0) return false;
    
    const crossRatio = (AC / CB) / (AD / DB);
    
    // Should equal -1 (within floating point tolerance)
    return Math.abs(crossRatio + 1) < 0.001;
  }

  /**
   * Verify cross-ratio for symbolic tokens using semantic distance.
   */
  verifySymbolicCrossRatio(original, conjugate) {
    const AC = this.semanticDistance(this.A, original);
    const CB = this.semanticDistance(original, this.B);
    const AD = this.semanticDistance(this.A, conjugate);
    const DB = this.semanticDistance(conjugate, this.B);
    
    if (CB === 0 || DB === 0) return false;
    
    const crossRatio = (AC / CB) / (AD / DB);
    return Math.abs(crossRatio + 1) < 0.15; // Wider tolerance for symbolic
  }

  /**
   * Simple semantic distance between two values.
   * For numbers: absolute difference.
   * For strings: length difference + character differences.
   */
  semanticDistance(a, b) {
    if (typeof a === 'number' && typeof b === 'number') {
      return Math.abs(a - b) + 1; // +1 avoids zero
    }
    
    const strA = String(a).toLowerCase();
    const strB = String(b).toLowerCase();
    
    let distance = Math.abs(strA.length - strB.length);
    const minLen = Math.min(strA.length, strB.length);
    
    for (let i = 0; i < minLen; i++) {
      if (strA[i] !== strB[i]) distance++;
    }
    
    return distance + 1;
  }

  /**
   * Generate the full conjugate spectrum for a range of c values.
   * Useful for visualization and analysis.
   */
  spectrum(cValues = [0, 0.25, 0.5, 0.75, 1, 2, 10, 100]) {
    return cValues.map(c => ({
      c,
      d: this.compute(c),
      crossRatio: this.verifyCrossRatio(c, this.compute(c)) ? -1 : null,
      behavior: c === 0.5 ? 'role_reversal' :
                c > 10 ? 'approaching_infinity' :
                c < 0.1 ? 'near_canon' : 'finite_pair',
    }));
  }

  /**
   * Get the attractor value.
   * This is what D approaches as C → ∞.
   */
  getAttractor() {
    return {
      value: 0.5,
      formula: 'lim(c→∞) c/(2c-1) = 1/2',
      meaning: 'The finite echo of the infinite symbol',
    };
  }

  /**
   * Find symbols whose conjugates are near the attractor.
   * These are symbols that have drifted far from the canon.
   */
  findDriftedSymbols(threshold = 10) {
    return this.conjugateHistory
      .filter(pair => Math.abs(pair.conjugate.numericConjugate - 0.5) < 0.01)
      .filter(pair => pair.original.score > threshold)
      .slice(-20);
  }

  /**
   * Get conjugate history.
   */
  getHistory(limit = 20) {
    return this.conjugateHistory.slice(-limit);
  }

  /**
   * Clear conjugate history.
   */
  clearHistory() {
    this.conjugateHistory = [];
  }

  /**
   * Get current state.
   */
  getState() {
    const drifted = this.findDriftedSymbols();
    
    return {
      referenceA: this.A,
      referenceB: this.B,
      attractor: this.getAttractor(),
      totalConjugates: this.conjugateHistory.length,
      driftedSymbols: drifted.length,
      recentPairs: this.conjugateHistory.slice(-5).map(p => p.description),
      spectrum: this.spectrum(),
    };
  }
}
