/* I QUIT! — AI Bots με επώνυμες στρατηγικές (v0.5).
   🔥 Επιθετικός: μικρό μαξιλάρι, κόκκινες μετοχές, BB νωρίς και με δάνεια, wild swaps.
   🛡️ Αμυντικός: μεγάλο μαξιλάρι, πράσινα/ομόλογα, BB μόνο με άνεση, γρήγορη αποπληρωμή χρεών.
   ⚖️ Ισορροπημένος: η στρατηγική του brief §6. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./engine.js'));
  } else {
    root.IQ_BOTS = factory(root.IQ_ENGINE);
  }
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';

  const PROFILES = {
    aggressive: {
      label: 'Επιθετικός', icon: '🔥',
      cushion: 250,          // ελάχιστο μαξιλάρι μετρητών
      bbAge: 30,             // από πότε αγοράζει BB "χωρίς δεύτερη σκέψη"
      bbEarlyMult: 1.5,      // πριν από αυτό: cash ≥ mult × κόστος
      redExtra: 0,           // επιπλέον μαξιλάρι για κόκκινα project
      bondCushion: 5000,     // πόσα μετρητά θέλει για να "χαραμίσει" σε ομόλογο
      wildAge: 30, wildCash: 4000,
      repay: 'late',         // αποπληρώνει μόνο όταν το I QUIT meter γεμίσει
    },
    defensive: {
      label: 'Αμυντικός', icon: '🛡️',
      cushion: 1200,
      bbAge: 38,
      bbEarlyMult: 2.5,
      redExtra: 800,
      bondCushion: 1200,
      wildAge: 45, wildCash: 8000,
      repay: 'early',
    },
    balanced: {
      label: 'Ισορροπημένος', icon: '⚖️',
      cushion: 500,
      bbAge: 35,
      bbEarlyMult: 2,
      redExtra: 0,
      bondCushion: 2500,
      wildAge: 35, wildCash: 5000,
      repay: 'mid',
    },
    // v1.8 (αίτημα Γιώργου): θεματικά bots με δική τους «φιλοσοφία» προς τη νίκη
    tycoon: { // 🏢 αγοράζει ΜΟΝΟ Big Business & Χρηματοδοτήσεις — τα Projects τα γυρίζει με Wild σε BB
      label: 'Μεγιστάνας', icon: '🏢',
      cushion: 400, bbAge: 26, bbEarlyMult: 1.2, redExtra: 0,
      bondCushion: Infinity, wildAge: 26, wildCash: 2500,
      repay: 'mid', focus: 'bigmoney',
    },
    stockpicker: { // 📈 αγοράζει ΜΟΝΟ Πράσινα/Κίτρινα/Κόκκινα Projects — ποτέ BB/ομόλογα
      label: 'Χρηματιστής', icon: '📈',
      cushion: 400, bbAge: 99, bbEarlyMult: 99, redExtra: 0,
      bondCushion: Infinity, wildAge: 28, wildCash: 3000,
      repay: 'mid', focus: 'stocks',
    },
    scholar: { // 🎓 μεταπτυχιακά/φοροτεχνικά/καλύτερα δάνεια, γρήγορη αποπληρωμή, BB μόνο μετά τα 38 με άνεση
      label: 'Ακαδημαϊκός', icon: '🎓',
      cushion: 800, bbAge: 38, bbEarlyMult: 2, redExtra: 0,
      bondCushion: 2000, wildAge: 99, wildCash: 999999,
      repay: 'early', focus: 'education',
    },
  };
  function profileOf(p) { return PROFILES[p.strategy] || PROFILES.balanced; }

  function decide(state, playerId) {
    if (state.phase !== 'playing') return null;
    const p = state.players.find(x => x.id === playerId);
    if (!p) return null;

    if (state.pending && state.pending.playerId === playerId) {
      return decidePending(state, p, state.pending);
    }
    if (!state.pending && E.currentPlayer(state).id === playerId && E.isActive(p)) {
      // v1.13: γεμάτο meter + αποταμίευση + χρέη → ρευστοποίησε το ΤΕΑ για την τελική εξόφληση
      if (E.passive(p) >= E.totalExp(p) && (p.savings || 0) > 0 && p.loans.length > 0) return { a: 'sav-withdraw' };
      // Πριν ρίξει ζάρια: σκέψου αποπληρωμή δανείων (v0.5 — απαιτείται για I QUIT)
      const rep = considerRepay(state, p);
      if (rep) return rep;
      return { a: 'roll' };
    }
    return null;
  }

  function considerRepay(state, p) {
    if (!p.loans.length) return null;
    const prof = profileOf(p);
    const l = p.loans[0];
    const owedAll = E.loanOwedNow(p);
    const meterFull = E.passive(p) >= E.totalExp(p);
    const comfy = p.cash > owedAll + prof.cushion * (prof.repay === 'early' ? 1 : 3);
    // Πληρώνει όσες δόσεις αντέχει όταν: γέμισε το meter (πρέπει για I QUIT) ή έχει άνεση
    if (meterFull || (prof.repay !== 'late' && comfy)) {
      const affordable = Math.floor((p.cash - prof.cushion) / l.payment);
      const count = Math.min(l.remaining, Math.max(0, affordable));
      if (count > 0) return { a: 'repay', uid: l.uid, count };
    }
    return null;
  }

  function decidePending(state, p, pend) {
    switch (pend.type) {
      case 'card': return decideCard(state, p, pend);
      case 'reveal': {
        // v1.2: την κάρτα «Πληθωρισμός» ΔΕΝ την κλείνει το bot — μένει μέχρι να την
        // πατήσει κάποιος άνθρωπος (μόνο σε παρτίδες χωρίς ανθρώπους την κλείνει μόνο του)
        if (pend.special === 'inflation' && state.players.some(x => !x.isBot)) return null;
        return { a: 'resolve', choice: 'ok' };
      }
      case 'lifestyle-partner': {
        const others = state.players.filter(x => x.id !== p.id && E.isActive(x));
        const partner = others[(state.round + p.pos) % others.length];
        return { a: 'resolve', partnerId: partner.id };
      }
      case 'forced-sale': {
        const sellable = p.inv.slice().sort((a, b) => yieldOf(a) - yieldOf(b));
        return { a: 'resolve', uid: sellable[0].uid };
      }
      case 'funding-offer': {
        const prof = profileOf(p);
        const ok = pend.income / pend.price >= 0.08 && p.cash - pend.price >= prof.cushion * 2;
        return { a: 'resolve', choice: ok ? 'accept' : 'decline' };
      }
      case 'savings': {
        // v1.6: ο αμυντικός αποταμιεύει γενναία, ο ισορροπημένος λίγο, ο επιθετικός καθόλου·
        // στα 60 όλοι ρευστοποιούν (τα κλειδωμένα χρήματα δεν βοηθούν πια στην κατάταξη κίνησης)
        const prof = profileOf(p);
        if (pend.canWithdraw && (p.savings || 0) > 0) return { a: 'resolve', choice: 'withdraw' };
        const pct = { aggressive: 0, balanced: 0.06, defensive: 0.15, tycoon: 0.04, stockpicker: 0.05, scholar: 0.12 }[p.strategy] || 0.06;
        const amt = Math.floor((p.cash * pct) / 50) * 50;
        if (amt >= 50 && p.cash - amt >= prof.cushion * 2) return { a: 'resolve', choice: 'deposit', amount: amt };
        return { a: 'resolve', choice: 'skip' };
      }
      default:
        return { a: 'resolve', choice: 'decline' };
    }
  }

  function yieldOf(inv) { return inv.kind === 'bond' ? 0.04 : (inv.income / inv.cost); }

  function decideCard(state, p, pend) {
    const c = E.card(pend.cardId);
    const prof = profileOf(p);
    const price = Math.round(E.priceOf(state, c) * (1 - (pend.discount || 0)));
    const affordable = p.cash - price >= prof.cushion;
    const shortfall = Math.max(0, price - p.cash);
    const loanAmount = Math.ceil(shortfall / 100) * 100;
    const canLoanCover = E.maxLoan(p) >= loanAmount && shortfall > 0 && (p.loansTaken || 0) < E.MAX_LOANS_TOTAL;
    const isBB = pend.deck === 'bb';

    // v1.0 (#5): αν το παθητικό ήδη καλύπτει τα έξοδα, ο ΜΟΝΟΣ δρόμος για I QUIT είναι
    // η εξόφληση των δανείων — καμία νέα αγορά, κανένα νέο δάνειο!
    if (E.passive(p) >= E.totalExp(p)) return { a: 'resolve', choice: 'decline' };

    const focus = prof.focus || null; // v1.8: θεματική στρατηγική

    if (isBB) {
      // Χρηματιστής: ΔΕΝ αγοράζει ποτέ BB — αν έχει Wild, τη γυρίζει σε Project
      if (focus === 'stocks') {
        if (pend.canWild && p.wilds > 0 && p.cash >= prof.cushion + 400) return { a: 'resolve', choice: 'wild' };
        return { a: 'resolve', choice: 'decline' };
      }
      if (p.age >= prof.bbAge) {
        if (p.cash >= price) return { a: 'resolve', choice: 'buy' };
        if (canLoanCover && p.cash > 0) return { a: 'resolve', choice: 'buy-loan', loanAmount: loanAmount };
        return { a: 'resolve', choice: 'decline' };
      }
      if (p.cash >= prof.bbEarlyMult * price) return { a: 'resolve', choice: 'buy' };
      if (pend.canWild && p.wilds > 0 && p.cash >= prof.cushion + 400) return { a: 'resolve', choice: 'wild' };
      return { a: 'resolve', choice: 'decline' };
    }

    switch (c.kind) {
      case 'P': {
        // Μεγιστάνας: τα Projects δεν τον ενδιαφέρουν — Wild προς BB αν γίνεται, αλλιώς πάσο
        if (focus === 'bigmoney') {
          if (pend.canWild && p.wilds > 0 && p.cash >= prof.cushion + 400) return { a: 'resolve', choice: 'wild' };
          return { a: 'resolve', choice: 'decline' };
        }
        // Ακαδημαϊκός: αποφεύγει το υψηλό ρίσκο (κόκκινα)
        if (focus === 'education' && c.color === 'R') return { a: 'resolve', choice: 'decline' };
        if (pend.canWild && p.wilds > 0 && p.age >= prof.wildAge && p.cash >= prof.wildCash + prof.cushion) {
          return { a: 'resolve', choice: 'wild' };
        }
        const extra = c.color === 'R' ? prof.redExtra : 0;
        return { a: 'resolve', choice: (p.cash - price >= prof.cushion + extra ? 'buy' : 'decline') };
      }
      case 'funding':
        if (focus === 'stocks') return { a: 'resolve', choice: 'decline' }; // μόνο μετοχές γι' αυτόν
        return { a: 'resolve', choice: affordable ? 'buy' : 'decline' };
      case 'bond':
        return { a: 'resolve', choice: (p.cash - price >= prof.bondCushion ? 'buy' : 'decline') };
      case 'masters':
        // Ακαδημαϊκός: το μεταπτυχιακό είναι προτεραιότητα — το παίρνει σχεδόν πάντα
        if (focus === 'education') return { a: 'resolve', choice: (p.cash - price >= 200 ? 'buy' : 'decline') };
        return { a: 'resolve', choice: affordable ? 'buy' : 'decline' };
      case 'taxprepay':
        if (focus === 'education') return { a: 'resolve', choice: (p.cash - price >= prof.cushion ? 'buy' : 'decline') };
        return { a: 'resolve', choice: (p.cash - price >= prof.cushion * 2 ? 'buy' : 'decline') };
      case 'betterloan':
        if (focus === 'education') return { a: 'resolve', choice: (p.loans.length > 0 && affordable ? 'buy' : 'decline') };
        return { a: 'resolve', choice: (E.loanOwedNow(p) > 2 * price && affordable ? 'buy' : 'decline') };
      default:
        return { a: 'resolve', choice: 'decline' };
    }
  }

  return { decide, PROFILES };
});
