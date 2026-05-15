// TORSION · Spirals
// Spirals are temporal accelerators — they recur with transformation, not repetition

export class Spiral {
  constructor(config) {
    this.name = config.name;
    this.icon = config.icon;
    this.period = config.period;        // Time in ms between cycles
    this.torsionClass = config.torsionClass;
    this.description = config.description;
    this.factor = config.factor || 1;
    
    this.cycle = 0;                     // Which cycle we're on
    this.elevation = 0;                 // How high the spiral has climbed
    this.active = false;
    this.interval = null;
    this.onCycle = config.onCycle || null;  // Callback each cycle
    this.particles = [];                // Particles currently in this spiral
  }

  /**
   * Start the spiral.
   * Each cycle, the spiral processes its particles and elevates.
   */
  start() {
    if (this.active) return;
    this.active = true;
    this.cycle = 0;
    this.elevation = 0;
    
    this.interval = setInterval(() => {
      this.cycle++;
      this.elevation += this.factor;
      
      // Process particles in this spiral
      for (const particle of this.particles) {
        if (particle.alive) {
          // Each cycle applies the spiral's torsion
          particle.current.score = Math.min(100, 
            (particle.current.score || 50) * (1 + this.factor * 0.01)
          );
        }
      }
      
      // Callback
      if (this.onCycle) {
        this.onCycle(this);
      }
      
      console.log(`${this.icon} ${this.name}: cycle ${this.cycle}, elevation ${this.elevation.toFixed(2)}`);
    }, this.period);
  }

  /**
   * Stop the spiral.
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.active = false;
  }

  /**
   * Introduce a particle into this spiral.
   */
  introduce(particle) {
    if (!this.particles.includes(particle)) {
      this.particles.push(particle);
    }
  }

  /**
   * Remove a particle from this spiral.
   */
  release(particle) {
    const index = this.particles.indexOf(particle);
    if (index !== -1) {
      this.particles.splice(index, 1);
    }
  }

  /**
   * Get the torsion class this spiral applies.
   */
  getTorsionClass() {
    return this.torsionClass;
  }

  /**
   * Get spiral state.
   */
  getState() {
    return {
      name: this.name,
      icon: this.icon,
      cycle: this.cycle,
      elevation: this.elevation,
      active: this.active,
      particleCount: this.particles.length,
      torsionClass: this.torsionClass,
      period: this.period,
    };
  }
}

// ── Spiral Definitions ──

export const SPIRAL_DEFINITIONS = {
  fast: {
    name: 'FAST SPIRAL',
    icon: '⚡',
    period: 16180, // 16.18 seconds
    torsionClass: 'amplify',
    factor: 1.618, // Golden ratio
    description: 'Quick cycle. Amplifies signal. Intensifies with each pass.',
  },
  slow: {
    name: 'SLOW SPIRAL',
    icon: '🐢',
    period: 3600000, // 60 minutes
    torsionClass: 'stretch',
    factor: 0.618, // Inverse golden ratio
    description: 'Deep cycle. Stretches time. Reveals hidden patterns.',
  },
  mythic: {
    name: 'MYTHIC SPIRAL',
    icon: '🏛️',
    period: 60000, // 1 minute (on demand)
    torsionClass: 'mirror',
    factor: -1,
    description: 'Archetypal cycle. Mirrors symbols. Reverses to find meaning.',
  },
  shadow: {
    name: 'SHADOW SPIRAL',
    icon: '🌑',
    period: 432000, // 7.2 minutes
    torsionClass: 'twist',
    factor: 1.5,
    description: 'Emergent cycle. Born from deck evolution. Unknown potential.',
  },
};

/**
 * Create a spiral from a definition.
 */
export function createSpiral(type, onCycle = null) {
  const def = SPIRAL_DEFINITIONS[type];
  if (!def) throw new Error(`Unknown spiral type: ${type}`);
  
  return new Spiral({
    ...def,
    onCycle,
  });
}

/**
 * Create all four spirals.
 */
export function createAllSpirals(callbacks = {}) {
  return {
    fast: createSpiral('fast', callbacks.fast),
    slow: createSpiral('slow', callbacks.slow),
    mythic: createSpiral('mythic', callbacks.mythic),
    shadow: createSpiral('shadow', callbacks.shadow),
  };
}
