// TORSION · Field Engine
// The space where information twists, bends, and gains angular momentum

import { TORSION_CLASSES } from '../cards/config.js';

export class TorsionField {
  constructor() {
    this.fieldStrength = 0;
    this.activeTransforms = [];
    this.particles = [];        // Tokens currently in the field
    this.fieldHistory = [];     // Record of all field events
    this.resonanceMap = new Map(); // Symbol → resonance strength
    this.spiralAnchor = null;   // Current spiral attachment
  }

  // ── Field Operations ──

  /**
   * Introduce a particle (token) into the torsion field.
   * The particle will be twisted by all active transforms.
   */
  introduce(particle, source = 'unknown') {
    const entry = {
      id: Date.now() + Math.random(),
      original: particle,
      current: { ...particle },
      torsionLevel: 0,
      path: [source],
      enteredAt: Date.now(),
      transforms: [],
      alive: true,
    };

    this.particles.push(entry);
    this.fieldHistory.push({
      event: 'introduce',
      particle: entry.id,
      source,
      timestamp: Date.now(),
    });

    return entry;
  }

  /**
   * Apply a torsion transform to a particle.
   * Each transform twists the particle — it never comes out the same.
   */
  applyTorsion(particle, torsionClass, strength = 1) {
    const classDef = TORSION_CLASSES[torsionClass];
    if (!classDef) return particle;

    let twisted = { ...particle.current };

    switch (classDef.transform) {
      case 'scale':
        // Amplify: intensify the signal
        twisted.score = (twisted.score || 50) * classDef.factor * strength;
        twisted.body = twisted.body?.toUpperCase();
        twisted.amplified = true;
        break;

      case 'dilate':
        // Stretch: expand in time
        twisted.score = (twisted.score || 50) * classDef.factor;
        twisted.body = twisted.body?.split('').join(' ');
        twisted.stretched = true;
        break;

      case 'reflect':
        // Mirror: reverse the symbol
        twisted.body = twisted.body?.split('').reverse().join('');
        twisted.score = (twisted.score || 50) * Math.abs(classDef.factor);
        twisted.mirrored = true;
        break;

      case 'select':
        // Filter: discriminate quality
        twisted.score = twisted.score * classDef.factor;
        twisted.filtered = true;
        break;

      case 'compact':
        // Compress: reduce to essence
        twisted.body = twisted.body?.replace(/\s+/g, '');
        twisted.score = Math.min(100, (twisted.score || 50) * (1 + classDef.factor));
        twisted.compressed = true;
        break;

      case 'harmonize':
        // Resonate: find harmonic frequency
        twisted.score = twisted.score * classDef.factor;
        twisted.resonated = true;
        break;

      case 'cluster':
        // Cohere: group with similar particles
        twisted.score = twisted.score * classDef.factor;
        twisted.clustered = true;
        break;

      case 'torsion':
        // Direct torsion: apply raw twist
        twisted.score = (twisted.score || 50) * classDef.factor * strength;
        twisted.body = twisted.body?.split('').map((c, i) => 
          i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()
        ).join('');
        twisted.torsioned = true;
        break;

      case 'evolve':
        // Mutate: random variation
        twisted.score = (twisted.score || 50) * (0.8 + Math.random() * 0.4);
        twisted.mutated = true;
        break;

      default:
        break;
    }

    // Clamp score
    twisted.score = Math.min(100, Math.max(1, twisted.score || 50));

    // Update particle
    particle.current = twisted;
    particle.torsionLevel++;
    particle.transforms.push(torsionClass);
    particle.lastTwisted = Date.now();

    // Update field strength
    this.fieldStrength += 0.1 * strength;

    // Track resonance
    const symbol = twisted.body?.toLowerCase();
    if (symbol) {
      this.resonanceMap.set(symbol, (this.resonanceMap.get(symbol) || 0) + 1);
    }

    this.fieldHistory.push({
      event: 'torsion',
      particle: particle.id,
      class: torsionClass,
      strength,
      timestamp: Date.now(),
    });

    return particle;
  }

  /**
   * Apply multiple torsion transforms in sequence.
   * This is how cards create complex twists.
   */
  applySequence(particle, sequence) {
    for (const step of sequence) {
      particle = this.applyTorsion(particle, step.class, step.strength || 1);
    }
    return particle;
  }

  /**
   * Measure the torsion on a particle.
   * Higher torsion = more twisted from original.
   */
  measureTorsion(particle) {
    return {
      level: particle.torsionLevel,
      transforms: particle.transforms.length,
      timeInField: Date.now() - particle.enteredAt,
      changed: JSON.stringify(particle.original) !== JSON.stringify(particle.current),
      resonance: this.resonanceMap.get(particle.current.body?.toLowerCase()) || 0,
    };
  }

  /**
   * Get particles by torsion level.
   */
  getByTorsionLevel(minLevel = 1) {
    return this.particles.filter(p => p.torsionLevel >= minLevel);
  }

  /**
   * Get particles that resonate (appear multiple times).
   */
  getResonant(minResonance = 2) {
    return this.particles.filter(p => {
      const symbol = p.current.body?.toLowerCase();
      return symbol && (this.resonanceMap.get(symbol) || 0) >= minResonance;
    });
  }

  /**
   * Get the strongest resonance symbols.
   */
  getResonanceSpectrum(topN = 10) {
    return Array.from(this.resonanceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([symbol, strength]) => ({ symbol, strength }));
  }

  // ── Field State ──

  /**
   * Get the current state of the entire field.
   */
  getFieldState() {
    return {
      strength: this.fieldStrength,
      activeTransforms: this.activeTransforms.length,
      particleCount: this.particles.length,
      aliveCount: this.particles.filter(p => p.alive).length,
      averageTorsion: this.particles.length > 0
        ? this.particles.reduce((s, p) => s + p.torsionLevel, 0) / this.particles.length
        : 0,
      resonanceSpectrum: this.getResonanceSpectrum(5),
      spiralAnchor: this.spiralAnchor,
      recentEvents: this.fieldHistory.slice(-10),
    };
  }

  /**
   * Attach the field to a spiral.
   */
  attachSpiral(spiral) {
    this.spiralAnchor = spiral;
    this.activeTransforms.push(spiral.getTorsionClass());
  }

  /**
   * Decay: particles lose strength over time if not reinforced.
   */
  decay(decayRate = 0.99) {
    for (const particle of this.particles) {
      if (particle.alive && particle.lastTwisted) {
        const timeSinceTwist = Date.now() - particle.lastTwisted;
        if (timeSinceTwist > 60000) { // 1 minute
          particle.current.score *= decayRate;
          if (particle.current.score < 5) {
            particle.alive = false;
          }
        }
      }
    }

    // Clean dead particles
    this.particles = this.particles.filter(p => p.alive);

    this.fieldHistory.push({
      event: 'decay',
      rate: decayRate,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear the field.
   */
  clear() {
    const count = this.particles.length;
    this.particles = [];
    this.fieldStrength = 0;
    this.fieldHistory.push({
      event: 'clear',
      cleared: count,
      timestamp: Date.now(),
    });
  }

  /**
   * Get field history for analysis.
   */
  getHistory(limit = 50) {
    return this.fieldHistory.slice(-limit);
  }
}
