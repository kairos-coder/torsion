// engine.js — The Torsion Game Engine
// ====================================
// Drives the two-loop spiral, card play, collisions, and scoring

class TorsionEngine {
  constructor(masterDeck) {
    this.mategwas = new Mategwas(masterDeck);
    this.gods = [...GODS];
    this.hands = {};
    this.round = 0;
    this.maxRounds = 10;
    this.collisions = [];
    this.gameLog = [];
    this.state = 'setup'; // setup, playing, collision, computing, ended
    this.winner = null;
    this.table = { A: null, B: null, C: null }; // Cards on the table
    this.loopAPosition = 0; // 0=A(Loki), 1=B(Zeus), 2=C(Jupiter)
    this.loopBPosition = 0; // 0=A(Odin), 1=B(Thor), 2=C(Shiva)
    this.loopAComplete = false;
    this.loopBComplete = false;
  }

  // ----------------------------------------------------------
  // SETUP — Deal cards, initialize game
  // ----------------------------------------------------------
  setup() {
    this.state = 'setup';
    this.round = 0;
    this.collisions = [];
    this.gameLog = [];
    this.winner = null;
    this.table = { A: null, B: null, C: null };
    this.loopAPosition = 0;
    this.loopBPosition = 0;
    
    this.hands = this.mategwas.deal(this.gods);
    this.state = 'playing';
    
    this._log('game', '═══════════════════════════════');
    this._log('game', '🐇 Mategwas shuffles the master deck');
    this._log('game', '📜 Deals 5 cards to each of the 6 gods');
    this._log('game', '🔄 Loop A (Left): Loki → Zeus → Jupiter');
    this._log('game', '🔄 Loop B (Right): Odin → Thor → Shiva');
    this._log('game', '═══════════════════════════════');
    
    return this.getState();
  }

  // ----------------------------------------------------------
  // PLAY TURN — Next god in the spiral plays a card
  // ----------------------------------------------------------
  playTurn() {
    if (this.state === 'ended') {
      this._log('game', 'Game has ended. Reset to play again.');
      return null;
    }
    
    if (this.state === 'computing') {
      // After computing D, start new round
      this._startNewRound();
    }
    
    // Determine which god plays next
    // Alternate between Loop A and Loop B
    let playingGod;
    let loop;
    
    if (!this.loopAComplete && this.loopAPosition <= 2) {
      playingGod = this._getGodByPosition('A', this.loopAPosition);
      loop = 'A';
    } else if (!this.loopBComplete && this.loopBPosition <= 2) {
      playingGod = this._getGodByPosition('B', this.loopBPosition);
      loop = 'B';
    } else if (this.loopAComplete && this.loopBComplete) {
      // Both loops complete — resolve collisions
      this._resolveCollisions();
      return this.getState();
    } else {
      // One loop complete, other still going
      if (!this.loopAComplete) {
        playingGod = this._getGodByPosition('A', this.loopAPosition);
        loop = 'A';
      } else {
        playingGod = this._getGodByPosition('B', this.loopBPosition);
        loop = 'B';
      }
    }
    
    if (!playingGod) {
      this._log('error', 'No god to play');
      return this.getState();
    }
    
    // Get god's hand
    const hand = this.hands[playingGod.id];
    if (!hand || hand.cards.length === 0) {
      this._log('game', `${playingGod.sigil} ${playingGod.name} has no cards left!`);
      this._checkGameEnd();
      
      // Advance position
      if (loop === 'A') this.loopAPosition++;
      else this.loopBPosition++;
      
      return this.getState();
    }
    
    // Play a card (AI selects based on strategy)
    const cardIndex = this._selectCard(playingGod, hand.cards);
    const playedCard = hand.cards.splice(cardIndex, 1)[0];
    hand.played.push(playedCard);
    
    // Place on table
    this.table[playingGod.position] = {
      god: playingGod,
      card: playedCard,
      loop: loop
    };
    
    this._log('play', `${playingGod.sigil} ${playingGod.name} plays "${playedCard.word}" (${playedCard.english}) [Power: ${playedCard.power}] → Position ${playingGod.position}`);
    
    // Advance position
    if (loop === 'A') {
      this.loopAPosition++;
      if (this.loopAPosition >= 3) this.loopAComplete = true;
    } else {
      this.loopBPosition++;
      if (this.loopBPosition >= 3) this.loopBComplete = true;
    }
    
    // Check if both loops complete
    if (this.loopAComplete && this.loopBComplete) {
      this.state = 'collision';
      this._log('game', '⚡ Both loops complete — COLLISION IMMINENT ⚡');
    }
    
    this._checkGameEnd();
    return this.getState();
  }

  // ----------------------------------------------------------
  // AUTO-PLAY FULL ROUND — Play all 6 cards
  // ----------------------------------------------------------
  autoPlayRound() {
    if (this.state === 'ended') return this.getState();
    
    this._startNewRound();
    this.round++;
    
    this._log('game', `\n━━━━━ ROUND ${this.round} ━━━━━`);
    
    // Play all 6 positions
    for (let i = 0; i < 6; i++) {
      const result = this.playTurn();
      if (result?.state === 'ended') break;
    }
    
    // If both loops complete, resolve collisions
    if (this.state === 'collision') {
      this._resolveCollisions();
    }
    
    return this.getState();
  }

  // ----------------------------------------------------------
  // RESOLVE COLLISIONS — Compute torsion at each position
  // ----------------------------------------------------------
  _resolveCollisions() {
    this.state = 'computing';
    this._log('game', '\n⚡ COLLISION PHASE ⚡');
    
    const collisionResults = [];
    
    for (const pos of ['A', 'B', 'C']) {
      const loopAEntry = this.table[pos];
      const loopBEntry = this.table[pos];
      
      // Find the matching position from other loop
      const allTableEntries = Object.values(this.table).filter(e => e !== null);
      const loopACard = allTableEntries.find(e => e.loop === 'A' && e.god.position === pos);
      const loopBCard = allTableEntries.find(e => e.loop === 'B' && e.god.position === pos);
      
      if (loopACard && loopBCard) {
        const torsion = this.mategwas.computeTorsionScore(loopACard.card, loopBCard.card);
        
        const collision = {
          round: this.round,
          position: pos,
          loopA: loopACard.god.id,
          loopB: loopBCard.god.id,
          loopACard: loopACard.card,
          loopBCard: loopBCard.card,
          torsion: torsion
        };
        
        collisionResults.push(collision);
        this.collisions.push(collision);
        
        const resonanceIcon = torsion.resonance ? '✨ RESONANCE' : '';
        const conflictIcon = torsion.conflict ? '💥 CONFLICT' : '';
        this._log('collision', 
          `Position ${pos}: ${loopACard.god.sigil}${loopACard.card.word} ↔ ${loopBCard.god.sigil}${loopBCard.card.word} | ` +
          `Torsion: ${torsion.score} ${resonanceIcon} ${conflictIcon}`
        );
      }
    }
    
    // Mategwas computes D
    if (collisionResults.length >= 3) {
      const dCard = this.mategwas.computeHarmonicConjugate(collisionResults);
      this._log('d_card', `🐇 Mategwas computes D: "${dCard.word}" — ${dCard.english} [Power: ${dCard.power}]`);
    }
    
    this._log('game', '═══════════════════════════════\n');
    this.state = 'computing';
    
    this._checkGameEnd();
  }

  // ----------------------------------------------------------
  // START NEW ROUND
  // ----------------------------------------------------------
  _startNewRound() {
    this.round++;
    this.table = { A: null, B: null, C: null };
    this.loopAPosition = 0;
    this.loopBPosition = 0;
    this.loopAComplete = false;
    this.loopBComplete = false;
    this.state = 'playing';
  }

  // ----------------------------------------------------------
  // GET GOD BY LOOP AND POSITION
  // ----------------------------------------------------------
  _getGodByPosition(loop, positionIndex) {
    const positions = loop === 'A' ? ['A', 'B', 'C'] : ['A', 'B', 'C'];
    const pos = positions[positionIndex];
    const gods = this.gods.filter(g => g.loop === loop && g.position === pos);
    return gods[0] || null;
  }

  // ----------------------------------------------------------
  // AI CARD SELECTION — Simple strategy
  // ----------------------------------------------------------
  _selectCard(god, cards) {
    // Strategy: play highest power card first, but sometimes play tricks
    if (god.id === 'loki') {
      // Loki prefers chaotic plays — sometimes low power
      return Math.random() < 0.3 ? 
        cards.findIndex(c => c.power === Math.min(...cards.map(c2 => c2.power))) :
        cards.findIndex(c => c.power === Math.max(...cards.map(c2 => c2.power)));
    }
    
    // Most gods play their strongest card
    const maxPower = Math.max(...cards.map(c => c.power));
    const bestCards = cards
      .map((c, i) => ({ card: c, index: i }))
      .filter(item => item.card.power === maxPower);
    
    return bestCards[Math.floor(Math.random() * bestCards.length)].index;
  }

  // ----------------------------------------------------------
  // CHECK GAME END CONDITIONS
  // ----------------------------------------------------------
  _checkGameEnd() {
    let ended = false;
    let reason = '';
    
    // Condition 1: A god runs out of cards
    for (const god of this.gods) {
      const hand = this.hands[god.id];
      if (hand && hand.cards.length === 0 && hand.played.length >= 5) {
        ended = true;
        reason = `${god.name} has exhausted their hand`;
        this.winner = this._determineWinner();
        break;
      }
    }
    
    // Condition 2: D card reaches power 10
    if (!ended && this.mategwas.dCards.length > 0) {
      const lastD = this.mategwas.dCards[this.mategwas.dCards.length - 1];
      if (lastD.power >= 10) {
        ended = true;
        reason = `D card "${lastD.word}" reached power 10`;
        this.winner = 'mategwas';
      }
    }
    
    // Condition 3: Max rounds reached
    if (!ended && this.round >= this.maxRounds) {
      ended = true;
      reason = `Maximum rounds (${this.maxRounds}) reached`;
      this.winner = this._determineWinner();
    }
    
    if (ended) {
      this.state = 'ended';
      this._log('game', `\n🏆 GAME OVER: ${reason}`);
      this._log('game', `👑 Winner: ${this.winner === 'mategwas' ? '🐇 Mategwas (D card)' : this.winner}`);
    }
  }

  _determineWinner() {
    // Winner = god with highest total played power
    let maxTotal = 0;
    let winner = null;
    
    for (const god of this.gods) {
      const hand = this.hands[god.id];
      if (hand) {
        const totalPower = hand.played.reduce((sum, c) => sum + c.power, 0);
        if (totalPower > maxTotal) {
          maxTotal = totalPower;
          winner = god.name;
        }
      }
    }
    
    return winner || 'Draw';
  }

  // ----------------------------------------------------------
  // GET FULL GAME STATE
  // ----------------------------------------------------------
  getState() {
    return {
      round: this.round,
      state: this.state,
      hands: this.hands,
      table: this.table,
      collisions: this.collisions,
      dCards: this.mategwas.dCards,
      gameLog: [...this.gameLog],
      mategwasLog: this.mategwas.getLog(),
      winner: this.winner,
      loopProgress: {
        loopA: this.loopAPosition,
        loopB: this.loopBPosition,
        loopAComplete: this.loopAComplete,
        loopBComplete: this.loopBComplete
      }
    };
  }

  // ----------------------------------------------------------
  // LOGGING
  // ----------------------------------------------------------
  _log(type, message) {
    this.gameLog.push({
      timestamp: Date.now(),
      type: type,
      message: message
    });
  }

  // Reset game
  reset() {
    this.mategwas = new Mategwas(this.mategwas.masterDeck);
    this.setup();
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TorsionEngine;
}
