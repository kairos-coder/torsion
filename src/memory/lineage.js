// TORSION · Lineage Tracker
// Tracks symbolic ancestry: parent-child, conjugate pairs, generation depth

export class Lineage {
  constructor() {
    this.tree = new Map();        // id → { parent, children, generation, born }
    this.conjugatePairs = [];     // [{ original, conjugate, timestamp }]
    this.generationCount = 0;     // Highest generation seen
    this.extinctions = [];        // Symbols that died out
  }

  /**
   * Register a new symbol in the lineage tree.
   */
  register(id, parentId = null) {
    const entry = {
      id,
      parent: parentId,
      children: [],
      generation: 0,
      born: Date.now(),
      alive: true,
      conjugates: [],
    };

    // Calculate generation
    if (parentId && this.tree.has(parentId)) {
      const parent = this.tree.get(parentId);
      entry.generation = parent.generation + 1;
      parent.children.push(id);
      
      if (entry.generation > this.generationCount) {
        this.generationCount = entry.generation;
      }
    }

    this.tree.set(id, entry);
    return entry;
  }

  /**
   * Record a conjugate pair.
   */
  recordConjugate(originalId, conjugateId) {
    const pair = {
      original: originalId,
      conjugate: conjugateId,
      timestamp: Date.now(),
    };
    
    this.conjugatePairs.push(pair);
    
    // Link to tree entries
    if (this.tree.has(originalId)) {
      this.tree.get(originalId).conjugates.push(conjugateId);
    }
    if (this.tree.has(conjugateId)) {
      this.tree.get(conjugateId).conjugates.push(originalId);
    }
    
    return pair;
  }

  /**
   * Trace ancestry back to origin.
   */
  traceAncestry(id) {
    const chain = [];
    let current = id;
    const visited = new Set(); // Prevent infinite loops
    
    while (current && this.tree.has(current) && !visited.has(current)) {
      visited.add(current);
      const entry = this.tree.get(current);
      chain.unshift({
        id: current,
        generation: entry.generation,
        born: entry.born,
        alive: entry.alive,
        children: entry.children.length,
        conjugates: entry.conjugates.length,
      });
      current = entry.parent;
    }
    
    return chain;
  }

  /**
   * Get all descendants of a symbol.
   */
  getDescendants(id, depth = 0) {
    if (!this.tree.has(id)) return [];
    
    const entry = this.tree.get(id);
    const descendants = [];
    
    for (const childId of entry.children) {
      descendants.push({
        id: childId,
        depth: depth + 1,
        generation: this.tree.get(childId)?.generation || 0,
      });
      
      // Recurse
      descendants.push(...this.getDescendants(childId, depth + 1));
    }
    
    return descendants;
  }

  /**
   * Mark a symbol as extinct.
   */
  extinct(id, reason = 'unknown') {
    if (this.tree.has(id)) {
      this.tree.get(id).alive = false;
      this.extinctions.push({ id, reason, timestamp: Date.now() });
    }
  }

  /**
   * Get the full lineage stats.
   */
  getStats() {
    const allEntries = Array.from(this.tree.values());
    const alive = allEntries.filter(e => e.alive);
    
    return {
      totalSymbols: this.tree.size,
      alive: alive.length,
      extinct: this.extinctions.length,
      maxGeneration: this.generationCount,
      conjugatePairs: this.conjugatePairs.length,
      avgChildren: allEntries.length > 0 
        ? allEntries.reduce((s, e) => s + e.children.length, 0) / allEntries.length 
        : 0,
      oldestSymbol: alive.sort((a, b) => a.born - b.born)[0]?.id || null,
      newestSymbol: alive.sort((a, b) => b.born - a.born)[0]?.id || null,
      mostChildren: allEntries.sort((a, b) => b.children.length - a.children.length)[0]?.id || null,
    };
  }

  /**
   * Get lineage as a renderable tree.
   */
  getTree(rootId = null) {
    if (rootId && this.tree.has(rootId)) {
      return this.buildSubtree(rootId);
    }
    
    // Find root nodes (no parent)
    const roots = Array.from(this.tree.values()).filter(e => !e.parent);
    return roots.map(r => this.buildSubtree(r.id));
  }

  buildSubtree(id, depth = 0) {
    const entry = this.tree.get(id);
    if (!entry) return null;
    
    return {
      id,
      generation: entry.generation,
      alive: entry.alive,
      conjugates: entry.conjugates.length,
      born: entry.born,
      children: entry.children.map(cid => this.buildSubtree(cid, depth + 1)).filter(Boolean),
    };
  }
}
