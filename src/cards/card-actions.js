// TORSION · Card Actions
// Bridges existing Hermes modules to the card system
// Each card.action maps to a function here

import { FAST_SOURCES, SLOW_SOURCES } from '../source-registry.js';
import { getEmbedding, getSimilarity, isReady } from '../semantic-core.js';
import { passesGate } from '../hermes-gate.js';

export class CardActions {
  constructor(gate, sb, torsionField, conjugate) {
    this.gate = gate;              // HermesGate instance
    this.sb = sb;                  // Supabase client
    this.field = torsionField;     // TorsionField instance
    this.conjugate = conjugate;    // HarmonicConjugate instance
    this.results = [];             // Accumulated results from card plays
    this.tokens = [];              // All tokens found
  }

  // ═══════════════════════════════════════════
  // SOURCE CARDS — fetch from external streams
  // ═══════════════════════════════════════════

  async fetchFastSources(params) {
    const allConcepts = [];
    const errors = [];
    
    for (const source of FAST_SOURCES) {
      try {
        const concepts = await source.fetch();
        allConcepts.push(...concepts);
        
        // Introduce each concept into the torsion field
        for (const concept of concepts) {
          const particle = this.field.introduce(concept, source.name);
          // Apply the source's natural torsion
          this.field.applyTorsion(particle, 'amplify', 0.5);
        }
      } catch (err) {
        errors.push(`${source.name}: ${err.message}`);
      }
    }
    
    // Extract token bodies
    const newTokens = allConcepts.map(c => c.body).filter(Boolean);
    this.tokens.push(...newTokens.filter(t => !this.tokens.includes(t)));
    
    this.results.push({ 
      type: 'fetch_fast', 
      data: allConcepts, 
      count: allConcepts.length,
      tokens: newTokens.length,
      errors: errors.length > 0 ? errors : null
    });
    
    return { 
      success: allConcepts.length > 0, 
      data: `${allConcepts.length} concepts from ${FAST_SOURCES.length - errors.length}/${FAST_SOURCES.length} sources`,
      count: allConcepts.length,
      tokens: newTokens,
      particles: allConcepts.length
    };
  }

  async fetchSlowSources(params) {
    const allConcepts = [];
    const errors = [];
    
    for (const source of SLOW_SOURCES) {
      try {
        const concepts = await source.fetch();
        const sampled = concepts.slice(0, 12);
        allConcepts.push(...sampled);
        
        // Introduce into field with stretch torsion
        for (const concept of sampled) {
          const particle = this.field.introduce(concept, source.name);
          this.field.applyTorsion(particle, 'stretch', 0.3);
        }
      } catch (err) {
        errors.push(`${source.name}: ${err.message}`);
      }
    }
    
    const newTokens = allConcepts.map(c => c.body).filter(Boolean);
    this.tokens.push(...newTokens.filter(t => !this.tokens.includes(t)));
    
    this.results.push({ 
      type: 'fetch_slow', 
      data: allConcepts, 
      count: allConcepts.length,
      tokens: newTokens.length
    });
    
    return { 
      success: allConcepts.length > 0, 
      data: `${allConcepts.length} deep concepts`,
      count: allConcepts.length,
      tokens: newTokens
    };
  }

  async fetchMythicOnly(params) {
    const mythicSource = FAST_SOURCES.find(s => s.name === 'Mythic Archive');
    if (!mythicSource) {
      return { success: false, error: 'Mythic source not found in registry' };
    }
    
    const concepts = await mythicSource.fetch();
    
    // Mythic tokens get mirror torsion
    for (const concept of concepts) {
      const particle = this.field.introduce(concept, 'mythic_archive');
      this.field.applyTorsion(particle, 'mirror', 1.0);
    }
    
    const newTokens = concepts.map(c => c.body).filter(Boolean);
    this.tokens.push(...newTokens.filter(t => !this.tokens.includes(t)));
    
    this.results.push({ 
      type: 'fetch_mythic', 
      data: concepts, 
      count: concepts.length 
    });
    
    return { 
      success: concepts.length > 0, 
      data: `${concepts.length} mythic archetypes`,
      count: concepts.length,
      tokens: newTokens
    };
  }

  // ═══════════════════════════════════════════
  // GATE CARDS — quality filtering
  // ═══════════════════════════════════════════

  async runGateCheck(params) {
    if (!this.gate) {
      return { success: false, error: 'Gate not initialized' };
    }
    
    // Get tokens to check — from field particles or stored tokens
    const candidates = this.field.particles.length > 0 
      ? this.field.particles.filter(p => p.alive).map(p => p.current)
      : this.tokens.slice(-20).map(body => ({ body, score: 50 }));
    
    if (candidates.length === 0) {
      return { success: false, error: 'No tokens to gate check' };
    }
    
    let passed = 0;
    let rejected = 0;
    const gateResults = [];
    
    for (const item of candidates.slice(0, 15)) {
      try {
        const result = await this.gate.process({
          body: item.body || '',
          source: item.source || 'card_deck',
          source_loop: 'fast',
          score: item.score || 50,
          metadata: item.metadata || {}
        });
        
        if (result.success) {
          passed++;
          gateResults.push({ ...item, gateResult: 'passed', score: result.score });
        } else {
          rejected++;
          gateResults.push({ ...item, gateResult: 'rejected', reason: result.error });
        }
      } catch (err) {
        rejected++;
        gateResults.push({ ...item, gateResult: 'error', reason: err.message });
      }
    }
    
    this.results.push({ 
      type: 'gate_check', 
      passed, 
      rejected, 
      total: candidates.length 
    });
    
    return { 
      success: passed > 0, 
      data: `${passed} passed, ${rejected} rejected`,
      passed,
      rejected,
      passRate: candidates.length > 0 ? passed / candidates.length : 0,
      gateResults
    };
  }

  async deduplicateTokens(params) {
    const before = this.tokens.length;
    
    // Normalize and deduplicate
    const seen = new Set();
    this.tokens = this.tokens.filter(token => {
      const key = token.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    const removed = before - this.tokens.length;
    
    // Also deduplicate field particles
    const particleBefore = this.field.particles.length;
    const particleSeen = new Set();
    this.field.particles = this.field.particles.filter(p => {
      const key = p.current.body?.toLowerCase().trim();
      if (!key) return true;
      if (particleSeen.has(key)) {
        p.alive = false;
        return false;
      }
      particleSeen.add(key);
      return true;
    });
    
    this.results.push({ 
      type: 'deduplicate', 
      tokensRemoved: removed,
      particlesRemoved: particleBefore - this.field.particles.length
    });
    
    return { 
      success: removed > 0 || particleBefore > this.field.particles.length, 
      data: `Removed ${removed} duplicate tokens`,
      removed,
      remaining: this.tokens.length
    };
  }

  // ═══════════════════════════════════════════
  // SEMANTIC CARDS — meaning operations
  // ═══════════════════════════════════════════

  async semanticFilter(params) {
    if (!isReady()) {
      return { success: false, error: 'Semantic model not loaded yet' };
    }
    
    const threshold = params.threshold || 0.7;
    const candidates = this.tokens.slice(-30);
    
    if (candidates.length === 0) {
      return { success: false, error: 'No tokens to filter' };
    }
    
    // Use semantic similarity to a reference concept
    const reference = 'technology innovation future meaning';
    const scored = [];
    
    for (const token of candidates) {
      try {
        const similarity = await getSimilarity(token, reference);
        if (similarity >= threshold) {
          scored.push({ token, similarity });
        }
      } catch (err) {
        // Skip failed comparisons
      }
    }
    
    // Update tokens to only include semantically relevant ones
    const relevantTokens = scored.map(s => s.token);
    this.tokens = [...new Set([...relevantTokens, ...this.tokens])];
    
    this.results.push({ 
      type: 'semantic_filter', 
      threshold,
      candidates: candidates.length,
      passed: scored.length
    });
    
    return { 
      success: scored.length > 0, 
      data: `${scored.length}/${candidates.length} passed semantic filter`,
      count: scored.length,
      topMatch: scored[0]?.token || null
    };
  }

  async clusterTokens(params) {
    const tokens = this.tokens.slice(-30);
    
    if (tokens.length === 0) {
      return { success: false, error: 'No tokens to cluster' };
    }
    
    const clusters = {
      tech: [],
      mythos: [],
      signal: [],
      general: []
    };
    
    for (const token of tokens) {
      const lower = token.toLowerCase();
      
      if (lower.match(/ai|tech|code|data|cloud|neural|quantum|algorithm|api|digital/)) {
        clusters.tech.push(token);
      } else if (lower.match(/myth|god|titan|ancient|phoenix|ouroboros|chaos|hermes|archetype/)) {
        clusters.mythos.push(token);
      } else if (lower.match(/signal|token|torsion|field|spiral|mirror|conjugate|meaning/)) {
        clusters.signal.push(token);
      } else {
        clusters.general.push(token);
      }
    }
    
    // Apply cluster torsion to each group
    for (const [clusterName, clusterTokens] of Object.entries(clusters)) {
      for (const token of clusterTokens) {
        const particle = this.field.particles.find(p => 
          p.current.body?.toLowerCase() === token.toLowerCase()
        );
        if (particle) {
          this.field.applyTorsion(particle, 'cohere', 0.5);
        }
      }
    }
    
    const totalClustered = Object.values(clusters).reduce((s, a) => s + a.length, 0);
    
    this.results.push({ 
      type: 'cluster', 
      clusters: Object.fromEntries(
        Object.entries(clusters).map(([k, v]) => [k, v.length])
      )
    });
    
    return { 
      success: totalClustered > 0, 
      data: `T:${clusters.tech.length} M:${clusters.mythos.length} S:${clusters.signal.length} G:${clusters.general.length}`,
      clusters,
      count: totalClustered
    };
  }

  // ═══════════════════════════════════════════
  // MEMORY CARDS — persistence operations
  // ═══════════════════════════════════════════

  async storeToken(params) {
    if (!this.gate) {
      return { success: false, error: 'Gate not initialized — cannot store' };
    }
    
    const toStore = this.tokens.slice(0, 10);
    let stored = 0;
    const storedTokens = [];
    
    for (const body of toStore) {
      try {
        const result = await this.gate.process({
          body,
          source: 'torsion_card',
          source_loop: 'fast',
          score: 70,
          metadata: { 
            stored_by: 'hermes_card',
            torsion_level: this.field.particles.find(p => 
              p.current.body?.toLowerCase() === body.toLowerCase()
            )?.torsionLevel || 0
          }
        });
        
        if (result.success) {
          stored++;
          storedTokens.push(body);
        }
      } catch (err) {
        // Continue to next token
      }
    }
    
    this.results.push({ 
      type: 'store', 
      attempted: toStore.length,
      stored,
      tokens: storedTokens
    });
    
    return { 
      success: stored > 0, 
      data: `Stored ${stored}/${toStore.length} tokens`,
      stored,
      attempted: toStore.length,
      tokens: storedTokens
    };
  }

  async queryMemory(params) {
    if (!this.sb) {
      return { success: false, error: 'Supabase not connected' };
    }
    
    const limit = params.limit || 10;
    
    try {
      const { data, error } = await this.sb
        .from('concepts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      const memoryTokens = data.map(d => d.body).filter(Boolean);
      
      // Add to local tokens
      this.tokens.push(...memoryTokens.filter(t => !this.tokens.includes(t)));
      
      this.results.push({ 
        type: 'query_memory', 
        count: data.length,
        tokens: memoryTokens
      });
      
      return { 
        success: data.length > 0, 
        data: `${data.length} memories retrieved`,
        count: data.length,
        tokens: memoryTokens,
        oldestMemory: data[data.length - 1]?.created_at || null
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async recallLineage(params) {
    // Get the most recent token and trace its field history
    const lastParticle = this.field.particles
      .filter(p => p.alive)
      .sort((a, b) => b.enteredAt - a.enteredAt)[0];
    
    if (!lastParticle) {
      return { success: false, error: 'No particles in field' };
    }
    
    const torsionMeasurement = this.field.measureTorsion(lastParticle);
    
    // Get conjugate history for this token
    const conjugatePair = this.conjugate?.conjugateToken(lastParticle.current);
    
    const lineage = {
      particle: lastParticle.current.body,
      enteredAt: new Date(lastParticle.enteredAt).toISOString(),
      torsionLevel: torsionMeasurement.level,
      transforms: lastParticle.transforms,
      resonance: torsionMeasurement.resonance,
      conjugate: conjugatePair?.conjugate?.body || null,
      path: lastParticle.path,
    };
    
    this.results.push({ type: 'lineage', lineage });
    
    return { 
      success: true, 
      data: `Lineage traced: ${lineage.transforms.length} transforms, torsion level ${lineage.torsionLevel}`,
      lineage
    };
  }

  // ═══════════════════════════════════════════
  // TORSION CARDS — field operations
  // ═══════════════════════════════════════════

  async applyTorsion(params) {
    const strength = params.strength || 1;
    const particles = this.field.particles.filter(p => p.alive);
    
    if (particles.length === 0) {
      return { success: false, error: 'No particles in field to torsion' };
    }
    
    let twisted = 0;
    
    for (const particle of particles.slice(0, 10)) {
      // Apply direct torsion twist
      this.field.applyTorsion(particle, 'twist', strength);
      
      // Also compute conjugate
      if (this.conjugate) {
        this.conjugate.conjugateToken(particle.current);
      }
      
      twisted++;
    }
    
    this.results.push({ 
      type: 'apply_torsion', 
      strength,
      particlesAffected: twisted
    });
    
    const fieldState = this.field.getFieldState();
    
    return { 
      success: twisted > 0, 
      data: `Torsion applied to ${twisted} particles at strength ${strength}`,
      twisted,
      fieldStrength: fieldState.strength,
      averageTorsion: fieldState.averageTorsion
    };
  }

  async evolveDeck(params) {
    // This will be called from deck.evolve() 
    // but can also be triggered directly as a card
    
    const fieldState = this.field.getFieldState();
    const resonanceSpectrum = this.field.getResonanceSpectrum(5);
    
    this.results.push({ 
      type: 'evolve_deck',
      fieldStrength: fieldState.strength,
      resonanceSpectrum
    });
    
    return { 
      success: true, 
      data: `Deck evolution triggered. Field strength: ${fieldState.strength.toFixed(2)}`,
      fieldState,
      topResonance: resonanceSpectrum[0]?.symbol || null
    };
  }

  // ═══════════════════════════════════════════
  // SIGNAL CARDS — direct input
  // ═══════════════════════════════════════════

  async processManualSignal(params) {
    if (!this.gate) {
      return { success: false, error: 'Gate not initialized' };
    }
    
    // Get the most recent token as the signal
    const signal = this.tokens[this.tokens.length - 1];
    
    if (!signal) {
      return { success: false, error: 'No signal to process' };
    }
    
    // Introduce into field
    const particle = this.field.introduce({ body: signal, score: 75 }, 'manual_signal');
    
    // Apply direct torsion
    this.field.applyTorsion(particle, 'twist', 0.8);
    
    // Process through gate
    const result = await this.gate.process({
      body: signal,
      source: 'hermes_manual',
      source_loop: 'slow',
      score: 75,
      metadata: { 
        torsion_level: particle.torsionLevel,
        manual: true 
      }
    });
    
    this.results.push({ 
      type: 'manual_signal', 
      signal,
      gateResult: result.success ? 'passed' : 'rejected'
    });
    
    return { 
      success: result.success, 
      data: result.success ? `Signal "${signal}" accepted` : `Signal rejected: ${result.error}`,
      signal,
      gateScore: result.score || 0
    };
  }

  // ═══════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════

  /**
   * Get all accumulated results.
   */
  getResults() {
    return this.results;
  }

  /**
   * Get all found tokens.
   */
  getTokens() {
    return this.tokens;
  }

  /**
   * Get combined state from field and actions.
   */
  getState() {
    return {
      tokensFound: this.tokens.length,
      resultsCount: this.results.length,
      fieldState: this.field.getFieldState(),
      conjugateState: this.conjugate?.getState() || null,
      recentResults: this.results.slice(-5),
    };
  }

  /**
   * Clear all accumulated data.
   */
  clear() {
    this.results = [];
    this.tokens = [];
  }
}
