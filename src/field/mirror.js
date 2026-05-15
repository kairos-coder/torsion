// TORSION · Convex Mirror
// The mirror is an interpretive surface — it doesn't just reflect, it reinterprets

export class ConvexMirror {
  constructor() {
    this.curvature = 0.5;        // How convex (0 = flat, 1 = maximum curve)
    this.distortion = 1.0;       // Distortion factor
    this.reflections = [];       // History of reflections
    this.activeInterpreters = [];// Active interpretation modes
  }

  /**
   * Reflect a particle through the convex mirror.
   * What comes back is not what went in — it's been distorted, reinterpreted.
   */
  reflect(particle) {
    const reflection = {
      original: particle.current,
      reflected: this.applyDistortion(particle.current),
      curvature: this.curvature,
      distortion: this.distortion,
      timestamp: Date.now(),
      interpretation: this.interpret(particle.current),
    };

    this.reflections.push(reflection);

    // Keep only last 100 reflections
    if (this.reflections.length > 100) {
      this.reflections.shift();
    }

    return reflection;
  }

  /**
   * Apply convex distortion to a token.
   * Convex mirrors compress the center, expand the edges.
   */
  applyDistortion(token) {
    const distorted = { ...token };
    const body = token.body || '';

    // Compress center, expand edges
    const mid = Math.floor(body.length / 2);
    const compressed = body.substring(0, mid).replace(/\s+/g, '');
    const expanded = body.substring(mid).split('').join(' ');

    distorted.body = compressed + expanded;
    distorted.score = Math.min(100, Math.max(1, 
      (token.score || 50) * (1 + this.curvature * this.distortion - 0.5)
    ));
    distorted.mirrored = true;
    distorted.curvatureApplied = this.curvature;

    return distorted;
  }

  /**
   * Interpret a particle — what does the mirror see?
   */
  interpret(token) {
    const body = (token.body || '').toLowerCase();
    const interpretations = [];

    // Archetypal detection
    const archetypes = {
      'hermes': 'messenger, boundary-crosser, thief of meaning',
      'phoenix': 'cyclic renewal, death-birth, eternal return',
      'ouroboros': 'self-consumption, recursion, the loop that eats itself',
      'chaos': 'primordial potential, unformed creation, the void before form',
      'ai': 'synthetic mind, emergent intelligence, the other thinker',
      'quantum': 'superposition, uncertainty, the unresolved state',
      'neural': 'network, connection, distributed knowing',
      'torsion': 'the twist itself, self-reference, the field recognizing itself',
    };

    for (const [key, meaning] of Object.entries(archetypes)) {
      if (body.includes(key)) {
        interpretations.push({ archetype: key, meaning });
      }
    }

    // Symbolic operations
    if (body === body.split('').reverse().join('')) {
      interpretations.push({ pattern: 'palindrome', meaning: 'self-identical under reversal' });
    }

    if (body.length <= 3) {
      interpretations.push({ pattern: 'compact', meaning: 'compressed to essence, minimal signal' });
    }

    if (body.length >= 10) {
      interpretations.push({ pattern: 'expanded', meaning: 'stretched across meaning-space' });
    }

    return interpretations;
  }

  /**
   * Adjust the mirror's curvature.
   * More curve = more distortion, less curve = clearer reflection.
   */
  setCurvature(value) {
    this.curvature = Math.max(0, Math.min(1, value));
  }

  /**
   * Adjust distortion factor.
   */
  setDistortion(value) {
    this.distortion = Math.max(0.1, Math.min(3, value));
  }

  /**
   * Get recent reflections.
   */
  getReflections(count = 10) {
    return this.reflections.slice(-count);
  }

  /**
   * Get mirror state.
   */
  getState() {
    return {
      curvature: this.curvature,
      distortion: this.distortion,
      reflectionCount: this.reflections.length,
      recentReflections: this.getReflections(3),
    };
  }

  /**
   * Clear reflections.
   */
  clear() {
    this.reflections = [];
  }
}
