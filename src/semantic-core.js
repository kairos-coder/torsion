// semantic-core.js — Lightweight semantic engine (no external dependencies)
// Replaces Transformers.js with hardcoded embedding vectors and similarity

let cachedEmbeddings = null;
let loadPromise = null;

export const ModelState = {
    UNLOADED: 'unloaded',
    LOADING: 'loading',
    READY: 'ready',
    ERROR: 'error'
};

let currentState = ModelState.UNLOADED;
let stateListeners = [];

function setState(state, message = '') {
    currentState = state;
    stateListeners.forEach(fn => fn(state, message));
}

export function onStateChange(listener) {
    stateListeners.push(listener);
    listener(currentState, '');
    return () => { stateListeners = stateListeners.filter(l => l !== listener); };
}

// ═══════════════════════════════════════════
// WORD VECTORS — 50-dimensional hand-crafted semantic space
// Each word gets a vector based on letter patterns, length, and archetypal weight
// ═══════════════════════════════════════════

function wordToVector(word) {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!clean) return new Array(50).fill(0);
    
    const vec = new Array(50).fill(0);
    
    // Dimension 0-9: Letter frequency patterns (a-j)
    for (let i = 0; i < Math.min(10, clean.length); i++) {
        const code = clean.charCodeAt(i) - 97;
        if (code >= 0 && code < 10) vec[code] += 0.3;
    }
    
    // Dimension 10-19: Letter frequency patterns (k-t)
    for (let i = 0; i < Math.min(10, clean.length); i++) {
        const code = clean.charCodeAt(i) - 97;
        if (code >= 10 && code < 20) vec[code] += 0.3;
    }
    
    // Dimension 20-25: Last letters
    for (let i = Math.max(0, clean.length - 6); i < clean.length; i++) {
        const dim = 20 + (clean.charCodeAt(i) - 97) % 6;
        vec[dim] += 0.25;
    }
    
    // Dimension 26-29: Length-based features
    vec[26] = Math.min(1, clean.length / 15);           // normalized length
    vec[27] = clean.length <= 3 ? 1 : 0;                // short word flag
    vec[28] = clean.length >= 8 ? 1 : 0;                // long word flag
    vec[29] = (clean.match(/[aeiou]/g) || []).length / Math.max(1, clean.length); // vowel ratio
    
    // Dimension 30-39: Archetypal resonance
    const archetypes = {
        'ai': 30, 'tech': 30, 'code': 30, 'data': 30, 'cloud': 30,
        'neural': 30, 'quantum': 30, 'digital': 30, 'algorithm': 30,
        'myth': 31, 'god': 31, 'titan': 31, 'ancient': 31, 'phoenix': 31,
        'ouroboros': 31, 'chaos': 31, 'hermes': 31, 'archetype': 31,
        'torsion': 32, 'field': 32, 'spiral': 32, 'mirror': 32,
        'conjugate': 32, 'meaning': 32, 'signal': 32, 'token': 32,
        'love': 33, 'fear': 33, 'hope': 33, 'death': 33, 'life': 33,
        'war': 34, 'peace': 34, 'power': 34, 'order': 34, 'shadow': 34,
        'light': 35, 'void': 35, 'fire': 35, 'water': 35, 'earth': 35,
        'time': 36, 'space': 36, 'memory': 36, 'dream': 36, 'truth': 36,
        'new': 37, 'old': 37, 'first': 37, 'last': 37, 'eternal': 37,
        'human': 38, 'machine': 38, 'nature': 38, 'spirit': 38, 'soul': 38,
        'threshold': 39, 'passage': 39, 'boundary': 39, 'cross': 39
    };
    
    for (const [key, dim] of Object.entries(archetypes)) {
        if (clean.includes(key)) {
            vec[dim] += 0.5;
        }
    }
    
    // Dimension 40-44: Consonant/vowel structure
    const consonants = clean.replace(/[aeiou]/g, '');
    const vowels = clean.replace(/[^aeiou]/g, '');
    vec[40] = consonants.length / Math.max(1, clean.length);
    vec[41] = vowels.length / Math.max(1, clean.length);
    vec[42] = (clean.match(/(.)\1/g) || []).length / Math.max(1, clean.length); // repeated chars
    vec[43] = clean[0] === clean[clean.length - 1] ? 1 : 0; // starts and ends same
    vec[44] = clean === clean.split('').reverse().join('') ? 1 : 0; // palindrome
    
    // Dimension 45-49: Priority word bonus
    const priorityWords = new Set([
        'ai', 'ml', 'api', 'data', 'cloud', 'native', 'quantum', 'neural',
        'vector', 'semantic', 'intelligence', 'generative', 'agentic',
        'ouroboros', 'phoenix', 'prometheus', 'hermes', 'torsion'
    ]);
    
    vec[45] = priorityWords.has(clean) ? 1 : 0;
    vec[46] = clean.length >= 4 && clean.length <= 14 ? 0.5 : 0;
    vec[47] = /^[a-z]+$/.test(clean) ? 0.3 : 0;
    vec[48] = clean.includes('e') ? 0.2 : 0; // most common letter
    vec[49] = Math.random() * 0.1; // tiny noise for differentiation
    
    // Normalize
    const magnitude = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    if (magnitude > 0) {
        for (let i = 0; i < vec.length; i++) {
            vec[i] /= magnitude;
        }
    }
    
    return vec;
}

// ═══════════════════════════════════════════
// PUBLIC API — same interface as before
// ═══════════════════════════════════════════

export async function loadModel() {
    if (currentState === ModelState.READY) return true;
    if (loadPromise) return loadPromise;
    
    setState(ModelState.LOADING, 'Building semantic engine...');
    
    loadPromise = (async () => {
        // Tiny delay to show the loading state
        await new Promise(r => setTimeout(r, 100));
        
        cachedEmbeddings = new Map(); // Cache for computed embeddings
        setState(ModelState.READY, 'Semantic engine online (local)');
        console.log('✅ Lightweight semantic engine ready (no downloads)');
        return true;
    })();
    
    return loadPromise;
}

export async function getEmbedding(text) {
    await loadModel();
    
    if (!text) return new Array(50).fill(0);
    
    // Split into words, get vectors, average them
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    
    if (words.length === 0) return new Array(50).fill(0);
    
    const vectors = words.map(w => {
        // Use cache
        if (cachedEmbeddings?.has(w)) {
            return cachedEmbeddings.get(w);
        }
        const vec = wordToVector(w);
        if (cachedEmbeddings) {
            cachedEmbeddings.set(w, vec);
        }
        return vec;
    });
    
    // Average the word vectors
    const result = new Array(50).fill(0);
    for (const vec of vectors) {
        for (let i = 0; i < 50; i++) {
            result[i] += vec[i];
        }
    }
    
    // Normalize
    const magnitude = Math.sqrt(result.reduce((s, v) => s + v * v, 0));
    if (magnitude > 0) {
        for (let i = 0; i < 50; i++) {
            result[i] /= magnitude;
        }
    }
    
    return result;
}

export async function getSimilarity(textA, textB) {
    const [embA, embB] = await Promise.all([
        getEmbedding(textA), 
        getEmbedding(textB)
    ]);
    
    if (!embA || !embB) return 0;
    return cosineSimilarity(embA, embB);
}

export function cosineSimilarity(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
}

export function isReady() {
    return currentState === ModelState.READY;
}
