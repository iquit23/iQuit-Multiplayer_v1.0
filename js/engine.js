/* I QUIT! — Authoritative Game Engine.
   Pure JS state machine — τρέχει στον host (browser) και σε Node (tests).
   Πηγή αλήθειας μηχανικής: IQuit_App.html + IQuit_Fable_Brief.md §4. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./cards.js'));
  } else {
    root.IQ_ENGINE = factory(root.IQ_CARDS);
  }
})(typeof self !== 'undefined' ? self : this, function (CARDS) {
  'use strict';

  const START_EXPENSES = { 'Φόροι': 200, 'Ενοίκιο': 500, 'Μεταφορικά': 200, 'Διατροφή': 300, 'Ένδυση': 100, 'Ψυχαγωγία': 100, 'Ασφάλεια': 100 };
  const START_CASH = 2000, START_SALARY = 2000, START_AGE = 25, END_AGE = 65;
  const WILDS_PER_PLAYER = 5;
  const COLORNAME = { G: 'Πράσινο', Y: 'Κίτρινο', R: 'Κόκκινο' };
  const PLAYER_COLORS = ['#3b82f6', '#e25b54', '#3ec46d', '#e8c43d', '#a98cf0', '#f08c4b'];

  // ---------- Deterministic RNG (mulberry32) ----------
  function rnd(state) {
    state.rngState = (state.rngState + 0x6D2B79F5) | 0;
    let t = state.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rollDie(state) { return 1 + Math.floor(rnd(state) * 6); }
  function shuffle(state, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd(state) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---------- Card lookup ----------
  const CARD_BY_ID = {};
  [].concat(CARDS.LIFESTYLE, CARDS.MOMENTS, CARDS.PROJECTS, CARDS.BIG_BUSINESS).forEach(c => { CARD_BY_ID[c.id] = c; });
  function card(id) { return CARD_BY_ID[id]; }

  // ---------- Derived values (ίδιοι τύποι με IQuit_App.html) ----------
  function totalExp(p) { return Object.values(p.expenses).reduce((a, b) => a + b, 0); }
  function passive(p) { return p.inv.filter(i => i.kind !== 'bond').reduce((s, i) => s + i.income, 0); }
  function bbPassive(p) { return p.inv.filter(i => i.kind === 'bb').reduce((s, i) => s + i.income, 0); }
  function invTotalCost(p) { return p.inv.reduce((s, i) => s + i.cost, 0); }
  // v0.2: ο τόκος ομολόγου (4%) πληρώνεται σε μετρητά σε κάθε είσπραξη· η πώληση/λήξη επιστρέφει το κεφάλαιο
  function bondValue(i) { return i.cost; }
  function bondInterestOf(i) { return i.cost * 0.04; }
  function capital(p) { return p.cash + p.inv.reduce((s, i) => s + i.cost, 0); }
  function quitPct(p) { const e = totalExp(p); return e > 0 ? Math.round(passive(p) / e * 100) : 0; }
  // v0.2: τα ομόλογα ΔΕΝ μετράνε ως επενδύσεις για το όριο δανείου
  function loanBase(p) { return p.inv.filter(i => i.kind !== 'bond').reduce((s, i) => s + i.cost, 0); }
  // v0.5 (κανόνας Γιώργου): υπόλοιπο "κεφαλαίου" ενός δανείου = ποσό × (δόσεις που μένουν / 20)
  function loanDebt(p) { return p.loans.reduce((s, l) => s + Math.round(l.amount * l.remaining / 20), 0); }
  // Ό,τι πραγματικά θα πληρωθεί ακόμα (δόσεις × ποσό δόσης)
  function loanOwedNow(p) { return p.loans.reduce((s, l) => s + l.remaining * l.payment, 0); }
  // Μέγιστο ΝΕΟ δάνειο = αξία επενδύσεων (χωρίς ομόλογα) − υπάρχον χρέος, σε πολλαπλάσια του 100
  function maxLoan(p) { return Math.max(0, Math.floor((loanBase(p) - loanDebt(p)) / 100) * 100); }
  let _loanSeq = 0;
  function takeLoanInternalV2(state, p, amount) {
    const remaining = Math.max(1, 20 - (p.loanBonusFewer || 0));
    p.loanBonusFewer = 0; // το μπόνους «−2 δόσεις» καταναλώνεται στο επόμενο δάνειο
    state.invSeq = (state.invSeq || 0) + 1;
    p.loans.push({ uid: 'ln' + state.invSeq, amount, payment: amount * 0.1, remaining });
    p.cash += amount;
    log(state, 'lg_loanTaken', { n: pname(p), a: fmt(amount), r: remaining, pay: fmt(amount * 0.1) });
  }
  function fmt(n) { return Math.round(n).toLocaleString('el-GR') + '€'; }

  // v1.0: δομημένα log events {k, p} — μεταφράζονται στη γλώσσα ΚΑΘΕ παίκτη στο UI
  function log(state, k, p) {
    state.log.push(p ? { k: k, p: p } : { k: k });
    if (state.log.length > 120) state.log.splice(0, state.log.length - 120);
    state.logSeq++;
  }
  function pname(p) { return (p.isBot ? '🤖 ' : '') + p.name; }

  // ---------- Setup ----------
  function newGame(playersSpec, seed) {
    // playersSpec: [{id, name, isBot}]
    const state = {
      v: 1,
      phase: 'playing',
      rngState: (seed | 0) || (Date.now() | 0),
      turn: 0,
      round: 1,
      inflMult: 1,
      players: playersSpec.map((ps, i) => ({
        id: ps.id, name: ps.name, isBot: !!ps.isBot, connected: true,
        pawn: ps.isBot ? '🤖' : (ps.pawn || null),
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        pos: 0, age: START_AGE, cash: START_CASH, salary: START_SALARY,
        expenses: Object.assign({}, START_EXPENSES),
        lifestyle: [],
        inv: [],
        loans: [], // v0.5: πολλαπλά δάνεια — {uid, amount, payment, remaining}
        loanBonusFewer: 0,
        strategy: ps.strategy || 'balanced',
        wilds: WILDS_PER_PLAYER,
        retiredAge: null, finished: false,
      })),
      decks: null,
      pending: null,
      afterPendingAdvance: false,
      lastRoll: null,
      log: [], logSeq: 0,
      rankings: null,
    };
    state.decks = {
      project: shuffle(state, CARDS.PROJECTS.map(c => c.id)),
      projectDiscard: [],
      moments: shuffle(state, CARDS.MOMENTS.map(c => c.id)),
      momentsDiscard: [],
      lifestyle: shuffle(state, CARDS.LIFESTYLE.map(c => c.id)),
      lifestyleDiscard: [],
      bb: shuffle(state, CARDS.BIG_BUSINESS.map(c => c.id)), // δεν ανακυκλώνεται· αγορασμένες αφαιρούνται
    };
    // v0.7 (κανόνας Γιώργου): ο πρώτος παίκτης κληρώνεται τυχαία ανάμεσα στους ΑΝΘΡΩΠΟΥΣ
    // (αν παίζουν μόνο bots, ανάμεσα σε όλους)
    const humans = state.players.map((p, i) => (p.isBot ? -1 : i)).filter(i => i >= 0);
    const pool = humans.length ? humans : state.players.map((_, i) => i);
    state.turn = pool[Math.floor(rnd(state) * pool.length)];
    log(state, 'lg_start', { n: pname(state.players[state.turn]) });
    return state;
  }

  function draw(state, deckName) {
    const d = state.decks;
    if (deckName === 'bb') return d.bb.length ? d.bb.shift() : null;
    let deck = d[deckName], discard = d[deckName + 'Discard'];
    if (!deck.length && discard.length) { d[deckName] = shuffle(state, discard.splice(0)); deck = d[deckName]; }
    return deck.length ? deck.shift() : null;
  }
  function discard(state, deckName, cardId) {
    if (deckName === 'bb') state.decks.bb.push(cardId); // πίσω στον πάτο
    else state.decks[deckName + 'Discard'].push(cardId);
  }

  // ---------- Player status ----------
  function isActive(p) { return p.retiredAge === null && !p.finished; }
  function activePlayers(state) { return state.players.filter(isActive); }
  function currentPlayer(state) { return state.players[state.turn]; }

  function nextActiveIndex(state, from) {
    const n = state.players.length;
    for (let k = 1; k <= n; k++) {
      const i = (from + k) % n;
      if (isActive(state.players[i])) return i;
    }
    return -1;
  }

  function advanceTurn(state) {
    const ni = nextActiveIndex(state, state.turn);
    if (ni === -1) { endGame(state); return; }
    if (ni <= state.turn) state.round++;
    state.turn = ni;
  }

  function endGame(state) {
    state.phase = 'ended';
    state.rankings = computeRankings(state);
    const w = state.rankings[0];
    log(state, w.retiredAge ? 'lg_endRet' : 'lg_endNo', { n: w.name, age: w.retiredAge });
  }

  function computeRankings(state) {
    const retired = state.players.filter(p => p.retiredAge !== null)
      .sort((a, b) => a.retiredAge - b.retiredAge);
    const rest = state.players.filter(p => p.retiredAge === null)
      .map(p => {
        const gap = totalExp(p) - passive(p);
        const months = gap > 0 ? capital(p) / gap : Infinity;
        return { p, months };
      })
      .sort((a, b) => b.months - a.months);
    const out = [];
    retired.forEach(p => out.push({ id: p.id, name: pname(p), retiredAge: p.retiredAge, months: null }));
    rest.forEach(({ p, months }) => out.push({ id: p.id, name: pname(p), retiredAge: null, months: months === Infinity ? null : Math.round(months) }));
    return out;
  }

  // ---------- Collect (Salary / Starting Point) — πιστό στο IQuit_App.html collect() ----------
  function collect(state, p) {
    // Ομόλογα: +1 token και ο τόκος (4%) μπαίνει στο ταμείο σε ΚΑΘΕ είσπραξη (v0.2)
    let bondInterest = 0;
    p.inv.forEach(i => {
      if (i.kind === 'bond' && i.tokens < 10) { i.tokens++; bondInterest += bondInterestOf(i); }
    });
    p.cash += bondInterest;
    const exp = totalExp(p), pas = passive(p);
    const net = p.salary - exp + pas;
    p.cash += net;
    let loanPay = 0;
    p.loans.forEach(l => { loanPay += l.payment; l.remaining--; });
    if (loanPay > 0) p.cash -= loanPay;
    const doneLoans = p.loans.filter(l => l.remaining <= 0);
    p.loans = p.loans.filter(l => l.remaining > 0);
    doneLoans.forEach(l => log(state, 'lg_loanDone', { n: pname(p), a: fmt(l.amount) }));
    p.age++;
    // 4 παραλλαγές μηνύματος ανάλογα με τόκους ομολόγων/δόσεις (για σωστή μετάφραση)
    const ck = bondInterest > 0 ? (loanPay > 0 ? 'lg_collectBL' : 'lg_collectB') : (loanPay > 0 ? 'lg_collectL' : 'lg_collect');
    log(state, ck, { n: pname(p), net: fmt(net), age: p.age, bi: fmt(bondInterest), lp: fmt(loanPay) });
    // Career Bonus (v0.4 — επανήλθε με απόφαση Γιώργου): +500€ μισθός στα 35, 45, 55
    if (p.age === 35 || p.age === 45 || p.age === 55) {
      p.salary += 500;
      log(state, 'lg_career', { n: pname(p), age: p.age, s: fmt(p.salary) });
    }
    // Υποχρεωτική λήξη ομολόγων στα 10 tokens → επιστροφή κεφαλαίου
    for (let i = p.inv.length - 1; i >= 0; i--) {
      const b = p.inv[i];
      if (b.kind === 'bond' && b.tokens >= 10) {
        p.cash += b.cost;
        p.inv.splice(i, 1);
        discard(state, 'project', b.cardId);
        log(state, 'lg_bondMature', { n: pname(p), v: fmt(b.cost) });
      }
    }
    // Έλεγχος παραίτησης (I QUIT) στο σημείο είσπραξης.
    // v0.5: ΑΠΑΙΤΕΙΤΑΙ πλήρης εξόφληση δανείων πριν την παραίτηση!
    if (p.retiredAge === null && pas >= exp) {
      if (p.loans.length > 0) {
        log(state, 'lg_quitBlocked', { n: pname(p), pas: fmt(pas), exp: fmt(exp), owed: fmt(loanOwedNow(p)) });
      } else {
        p.retiredAge = p.age;
        log(state, 'lg_iquit', { n: pname(p), age: p.age, pas: fmt(pas), exp: fmt(exp) });
        return;
      }
    }
    // Τέλος διαδρομής στα 65
    if (p.age >= END_AGE) {
      p.finished = true;
      // Τα δάνεια πρέπει να έχουν εξοφληθεί ως τα 65 — το υπόλοιπο αφαιρείται
      const owed = loanOwedNow(p);
      if (owed > 0) {
        p.cash -= owed; p.loans = [];
        log(state, 'lg_forcedLoanSettle', { n: pname(p), v: fmt(owed) });
      }
      log(state, 'lg_reached65', { n: pname(p) });
    }
  }

  // Επιλογή "θύματος" σε Crash/Funding Fails (v0.2, κανόνας Γιώργου #3):
  // χάνεται η κάρτα με τη μεγαλύτερη ΑΠΟΔΟΣΗ (%)· σε ισοπαλία, αυτή με το μεγαλύτερο ποσό είσπραξης.
  function pickVictim(list) {
    return list.reduce((a, b) => {
      const ya = a.income / a.cost, yb = b.income / b.cost;
      if (yb > ya) return b;
      if (yb < ya) return a;
      return b.income > a.income ? b : a;
    });
  }

  // Πληθωρισμός (v0.5, κανόνας Γιώργου): οι επενδύσεις ΔΕΝ επηρεάζονται πλέον.
  // Πληθωρίζονται +5% τα ΜΗΝΙΑΙΑ ΕΞΟΔΑ όλων των παικτών, και οι κάρτες Lifestyle
  // (τα ±50/±100 τους) εφαρμόζονται πληθωρισμένα με τον τρέχοντα συντελεστή.
  function doInflation(state) {
    state.inflMult = (state.inflMult || 1) * 1.05;
    state.players.forEach(pl => {
      Object.keys(pl.expenses).forEach(k => { pl.expenses[k] = Math.round(pl.expenses[k] * 1.05); });
    });
    log(state, 'lg_inflation');
  }
  // v0.5: οι τιμές των καρτών στις στοίβες ΔΕΝ πληθωρίζονται πια
  function priceOf(state, c) { return c.cost; }
  // Πληθωρισμένη επίδραση κάρτας Lifestyle
  function lifestyleDelta(state, c) { return Math.round(c.delta * (state.inflMult || 1)); }
  // v0.6: πληθωρίζονται ΚΑΙ οι κάρτες Moments (εφάπαξ ποσά, θετικά & αρνητικά)
  function momentAmount(state, c) { return Math.round((c.amount || 0) * (state.inflMult || 1)); }

  // ---------- Forced sale ----------
  function needForcedSale(p) { return p.cash < 0 && p.inv.length > 0; }
  function queueForcedSaleIfNeeded(state, p) {
    if (needForcedSale(p)) {
      state.pending = { type: 'forced-sale', playerId: p.id, deficit: -p.cash };
      log(state, 'lg_forcedNeeded', { n: pname(p), v: fmt(p.cash) });
      return true;
    }
    if (p.cash < 0) log(state, 'lg_negNoAssets', { n: pname(p), v: fmt(p.cash) });
    return false;
  }

  // ---------- Square resolution ----------
  function resolveSquare(state, p) {
    const sq = CARDS.BOARD[p.pos];
    switch (sq.t) {
      case 'start': case 'salary':
        return finishTurn(state); // η είσπραξη έγινε ήδη στο πέρασμα
      case 'project': {
        const cid = draw(state, 'project');
        if (!cid) { log(state, 'lg_emptyProject'); return finishTurn(state); }
        state.pending = { type: 'card', playerId: p.id, deck: 'project', cardId: cid, discount: 0, canWild: p.wilds > 0 && state.decks.bb.length > 0, viaWild: false };
        return;
      }
      case 'bb': {
        const cid = draw(state, 'bb');
        if (!cid) { log(state, 'lg_emptyBB'); return finishTurn(state); }
        state.pending = { type: 'card', playerId: p.id, deck: 'bb', cardId: cid, discount: 0, canWild: p.wilds > 0, viaWild: false };
        return;
      }
      case 'lifestyle': {
        const cid = draw(state, 'lifestyle');
        if (!cid) { log(state, 'lg_emptyLifestyle'); return finishTurn(state); }
        return applyLifestyle(state, p, cid);
      }
      case 'moments': {
        const cid = draw(state, 'moments');
        if (!cid) { log(state, 'lg_emptyMoments'); return finishTurn(state); }
        return applyMoment(state, p, cid);
      }
      case 'inflation': {
        doInflation(state);
        // v0.5 (εκπαιδευτικό): κάρτα «Πληθωρισμός» εμφανίζεται σε ΟΛΟΥΣ (και όταν πατάει bot)
        state.pending = { type: 'reveal', playerId: p.id, special: 'inflation' };
        return;
      }
      case 'tax': {
        const t = 0.5 * bbPassive(p);
        if (t > 0) {
          p.cash -= t;
          log(state, 'lg_tax', { n: pname(p), v: fmt(t) });
          if (queueForcedSaleIfNeeded(state, p)) { state.pending.then = 'advance'; return; }
        } else {
          log(state, 'lg_taxNone', { n: pname(p) });
        }
        return finishTurn(state);
      }
      case 'crash': {
        const candidates = p.inv.filter(i => i.kind === 'P' && sq.colors.includes(i.color));
        if (!candidates.length) {
          log(state, 'lg_crashMiss', { n: pname(p), colors: sq.colors.join(',') });
          return finishTurn(state);
        }
        const victim = pickVictim(candidates);
        p.inv = p.inv.filter(i => i.uid !== victim.uid);
        discard(state, 'project', victim.cardId);
        log(state, 'lg_crashHit', { n: pname(p), cid: victim.cardId, v: fmt(victim.cost), inc: fmt(victim.income) });
        return finishTurn(state);
      }
      case 'fundingfails': {
        const funds = p.inv.filter(i => i.kind === 'funding');
        if (!funds.length) {
          log(state, 'lg_ffMiss', { n: pname(p) });
          return finishTurn(state);
        }
        const victim = pickVictim(funds);
        p.inv = p.inv.filter(i => i.uid !== victim.uid);
        discard(state, 'project', victim.cardId);
        log(state, 'lg_ffHit', { n: pname(p), cid: victim.cardId, v: fmt(victim.cost) });
        return finishTurn(state);
      }
    }
  }

  function applyLifestyle(state, p, cid) {
    const c = card(cid);
    if (c.shared && activePlayers(state).filter(x => x.id !== p.id).length > 0) {
      state.pending = { type: 'lifestyle-partner', playerId: p.id, cardId: cid };
      return;
    }
    const applied = applyLifestyleTo(state, p, c);
    log(state, applied !== c.delta ? 'lg_lifestyleInfl' : 'lg_lifestyle', { n: pname(p), cid: c.id, catKey: c.cat, d: (applied > 0 ? '+' : '') + applied });
    // v0.2: για ανθρώπους η κάρτα εμφανίζεται σε ΟΛΟΥΣ και κλείνει με κλικ του παίκτη
    if (!p.isBot) { state.pending = { type: 'reveal', playerId: p.id, cardId: c.id, deck: 'lifestyle' }; return; }
    return finishTurn(state);
  }
  function applyLifestyleTo(state, p, c) {
    const applied = lifestyleDelta(state, c);
    p.expenses[c.cat] = Math.max(0, (p.expenses[c.cat] || 0) + applied);
    p.lifestyle.push({ id: c.id, applied }); // κρατάμε το πληθωρισμένο ποσό για σωστή αναίρεση
    return applied;
  }

  function applyMoment(state, p, cid) {
    const c = card(cid);
    if (c.cancels) {
      let undone = [];
      c.cancels.forEach(tag => {
        const entry = p.lifestyle.find(e => card(e.id).tag === tag);
        if (entry) {
          const lc = card(entry.id);
          p.expenses[lc.cat] = Math.max(0, p.expenses[lc.cat] - entry.applied);
          p.lifestyle = p.lifestyle.filter(e => e !== entry);
          discard(state, 'lifestyle', entry.id);
          undone.push(lc.title);
        }
      });
      log(state, undone.length ? 'lg_momentCancel' : 'lg_momentCancelNone', { n: pname(p), cid: c.id, cids: undone.join(',') });
    } else {
      const amt = momentAmount(state, c);
      p.cash += amt;
      log(state, amt !== c.amount ? 'lg_momentInfl' : 'lg_moment', { e: (amt >= 0 ? '🟢' : '🔻'), n: pname(p), cid: c.id, v: (amt > 0 ? '+' : '') + fmt(amt) });
    }
    discard(state, 'moments', cid);
    // v0.2: reveal για ανθρώπους — το forced sale (αν χρειάζεται) ακολουθεί μετά το κλείσιμο της κάρτας
    if (!p.isBot) { state.pending = { type: 'reveal', playerId: p.id, cardId: cid, deck: 'moments' }; return; }
    if (queueForcedSaleIfNeeded(state, p)) { state.pending.then = 'advance'; return; }
    return finishTurn(state);
  }

  function finishTurn(state) {
    state.pending = null;
    state.afterPendingAdvance = false;
    if (state.phase === 'ended') return;
    advanceTurn(state);
  }

  // ---------- Purchase ----------
  function buyCard(state, p, pend, withLoan) {
    const c = card(pend.cardId);
    let price = Math.round(priceOf(state, c) * (1 - (pend.discount || 0)));
    if (withLoan) {
      // v1.0 (#8): ο παίκτης επιλέγει ΠΟΣΟ δάνειο θα πάρει (και μεγαλύτερο από τη διαφορά,
      // για μαξιλάρι ρευστότητας) — ακόμα κι αν του φτάνουν τα μετρητά. Πάντα εντός ορίου.
      const shortfall = Math.max(0, price - p.cash);
      let amount = Math.floor(withLoan.loanAmount || 0);
      if (!amount) amount = Math.max(100, Math.ceil(shortfall / 100) * 100);
      if (amount % 100 !== 0) return err('Το δάνειο δίνεται σε πολλαπλάσια του 100€.');
      if (maxLoan(p) < 100) return err('Δεν υπάρχει περιθώριο δανείου (αξία επενδύσεων − χρέος).');
      if (amount > maxLoan(p)) return err('Μέγιστο δάνειο: ' + fmt(maxLoan(p)) + '.');
      if (p.cash + amount < price) return err('Το δάνειο (' + fmt(amount) + ') δεν καλύπτει την αγορά.');
      takeLoanInternalV2(state, p, amount);
    }
    if (p.cash < price) return err('Δεν επαρκούν τα μετρητά (' + fmt(p.cash) + ' / ' + fmt(price) + ').');
    p.cash -= price;
    addInvestment(state, p, c, price, pend.discount);
    return null;
  }

  function addInvestment(state, p, c, pricePaid, discount) {
    const value = priceOf(state, c); // πλήρης τρέχουσα αξία (με πληθωρισμό, χωρίς έκπτωση)
    const isBB = c.id.startsWith('BB');
    if (isBB) {
      p.inv.push({ uid: uid(state), cardId: c.id, kind: 'bb', title: c.title, cost: value, income: c.income });
      log(state, discount ? 'lg_buyBBDisc' : 'lg_buyBB', { n: pname(p), cid: c.id, v: fmt(pricePaid), inc: fmt(c.income) });
      return;
    }
    switch (c.kind) {
      case 'P':
        p.inv.push({ uid: uid(state), cardId: c.id, kind: 'P', color: c.color, title: c.title, cost: value, income: c.income });
        log(state, 'lg_buyP', { n: pname(p), colors: c.color, cid: c.id, v: fmt(value), inc: fmt(c.income) });
        break;
      case 'funding':
        p.inv.push({ uid: uid(state), cardId: c.id, kind: 'funding', title: c.title, cost: value, income: c.income });
        log(state, 'lg_buyF', { n: pname(p), cid: c.id, v: fmt(value), inc: fmt(c.income) });
        break;
      case 'bond':
        p.inv.push({ uid: uid(state), cardId: c.id, kind: 'bond', title: c.title, cost: c.cost, income: 0, tokens: 0 });
        log(state, 'lg_buyBond', { n: pname(p), v: fmt(c.cost) });
        break;
      case 'masters':
        p.salary += c.salaryUp;
        log(state, 'lg_masters', { n: pname(p), v: fmt(c.cost), up: fmt(c.salaryUp), s: fmt(p.salary) });
        discard(state, 'project', c.id);
        break;
      case 'taxprepay':
        p.expenses['Φόροι'] = Math.max(0, p.expenses['Φόροι'] - c.taxDown);
        log(state, 'lg_taxprepay', { n: pname(p), v: fmt(c.cost), d: fmt(c.taxDown) });
        discard(state, 'project', c.id);
        break;
      case 'betterloan': {
        // Εφαρμόζεται στο δάνειο με τις περισσότερες δόσεις· αλλιώς πιστώνεται στο επόμενο
        const active = p.loans.slice().sort((a, b) => b.remaining - a.remaining)[0];
        if (active) {
          active.remaining = Math.max(0, active.remaining - c.fewerPayments);
          log(state, 'lg_blActive', { n: pname(p), f: c.fewerPayments, a: fmt(active.amount), r: active.remaining });
          if (active.remaining <= 0) {
            p.loans = p.loans.filter(x => x.uid !== active.uid);
            log(state, 'lg_loanDone', { n: pname(p), a: fmt(active.amount) });
          }
        } else {
          p.loanBonusFewer += c.fewerPayments;
          log(state, 'lg_blFuture', { n: pname(p), f: c.fewerPayments });
        }
        discard(state, 'project', c.id);
        break;
      }
    }
  }

  let _uidCounter = 0;
  function uid(state) { state.invSeq = (state.invSeq || 0) + 1; return 'i' + state.invSeq; }

  function err(message) { return { error: message }; }

  // v1.0 (#4β): ΑΜΕΣΟ I QUIT — τη στιγμή που το παθητικό καλύπτει τα έξοδα ΚΑΙ δεν υπάρχουν
  // χρέη, ο παίκτης παραιτείται αυτόματα, χωρίς να περιμένει το επόμενο πέρασμα από Salary.
  function sweepInstantQuit(state) {
    if (state.phase !== 'playing') return;
    state.players.forEach(p => {
      if (!isActive(p)) return;
      if (state.pending && state.pending.playerId === p.id) return; // όχι στη μέση δικής του απόφασης
      if (p.loans.length === 0 && passive(p) >= totalExp(p)) {
        p.retiredAge = p.age;
        log(state, 'lg_iquitInstant', { n: pname(p), age: p.age, pas: fmt(passive(p)), exp: fmt(totalExp(p)) });
      }
    });
    // Αν αυτός που έχει σειρά μόλις παραιτήθηκε (και δεν εκκρεμεί τίποτα), προχώρα τη σειρά
    if (state.phase === 'playing' && !state.pending && !isActive(currentPlayer(state))) advanceTurn(state);
  }

  // ---------- Actions ----------
  // applyAction(state, playerId, action) → null (ok) ή {error}
  function applyAction(state, playerId, action) {
    const r = applyActionInner(state, playerId, action);
    if (!r || !r.error) sweepInstantQuit(state);
    return r;
  }
  function applyActionInner(state, playerId, action) {
    if (state.phase !== 'playing') return err('Το παιχνίδι δεν είναι σε εξέλιξη.');
    const p = state.players.find(x => x.id === playerId);
    if (!p) return err('Άγνωστος παίκτης.');

    switch (action.a) {
      case 'roll': {
        if (state.pending) return err('Υπάρχει εκκρεμής απόφαση.');
        if (currentPlayer(state).id !== playerId) return err('Δεν είναι η σειρά σου.');
        if (!isActive(p)) return err('Έχεις ολοκληρώσει τη διαδρομή σου.');
        const d1 = rollDie(state), d2 = rollDie(state);
        const from = p.pos, steps = d1 + d2;
        state.lastRoll = { playerId, d1, d2, from, to: (from + steps) % 28, seq: state.logSeq };
        log(state, 'lg_roll', { n: pname(p), d1: d1, d2: d2, s: steps });
        for (let s = 1; s <= steps; s++) {
          const pos = (from + s) % 28;
          if (pos === 0 || pos === 14) {
            collect(state, p);
            if (!isActive(p)) break; // παραιτήθηκε ή έφτασε 65 κατά την κίνηση
          }
        }
        p.pos = (from + steps) % 28;
        if (!isActive(p)) return finishTurn(state), null;
        if (queueForcedSaleIfNeeded(state, p)) { state.pending.then = 'square'; return null; }
        resolveSquare(state, p);
        return null;
      }

      case 'resolve': {
        const pend = state.pending;
        if (!pend) return err('Δεν υπάρχει εκκρεμής απόφαση.');
        if (pend.playerId !== playerId) return err('Η απόφαση δεν είναι δική σου.');
        return resolvePendingAction(state, p, pend, action);
      }

      case 'loan': {
        if (currentPlayer(state).id !== playerId || state.pending) return err('Δάνειο μόνο στη σειρά σου, χωρίς εκκρεμότητες.');
        const amount = Math.floor(action.amount);
        if (!amount || amount < 100) return err('Ελάχιστο δάνειο 100€.');
        if (amount % 100 !== 0) return err('Το δάνειο δίνεται σε πολλαπλάσια του 100€ (π.χ. ' + fmt(Math.ceil(amount / 100) * 100) + ').');
        if (loanBase(p) <= 0) return err('Χωρίς επενδύσεις δεν δίνεται δάνειο (τα ομόλογα δεν μετράνε).');
        if (amount > maxLoan(p)) return err('Μέγιστο νέο δάνειο: ' + fmt(maxLoan(p)) + ' (αξία επενδύσεων ' + fmt(loanBase(p)) + ' − υπάρχον χρέος ' + fmt(loanDebt(p)) + ').');
        takeLoanInternalV2(state, p, amount);
        return null;
      }

      case 'repay': {
        // v0.5: πρόωρη αποπληρωμή σε πολλαπλάσια της δόσης, ανά δάνειο
        if (currentPlayer(state).id !== playerId || state.pending) return err('Αποπληρωμή μόνο στη σειρά σου.');
        const l = p.loans.find(x => x.uid === action.uid);
        if (!l) return err('Δεν βρέθηκε το δάνειο.');
        const count = Math.min(Math.max(1, Math.floor(action.count || 1)), l.remaining);
        const pay = count * l.payment;
        if (p.cash < pay) return err('Χρειάζεσαι ' + fmt(pay) + ' για ' + count + ' δόσεις.');
        p.cash -= pay;
        l.remaining -= count;
        if (l.remaining <= 0) {
          p.loans = p.loans.filter(x => x.uid !== l.uid);
          log(state, 'lg_repayFull', { n: pname(p), a: fmt(l.amount), v: fmt(pay) });
        } else {
          log(state, 'lg_repayPart', { n: pname(p), c: count, v: fmt(pay), r: l.remaining });
        }
        return null;
      }

      case 'redeem-bond': {
        // v0.2 (#1): επιτρέπεται και ΚΑΤΑ ΤΗ ΔΙΑΡΚΕΙΑ δικής σου απόφασης αγοράς,
        // ώστε να πουλήσεις ομόλογο και να προχωρήσεις στην αγορά της επένδυσης.
        const duringOwnDecision = state.pending && state.pending.playerId === playerId &&
          (state.pending.type === 'card' || state.pending.type === 'funding-offer');
        const freeTurn = currentPlayer(state).id === playerId && !state.pending;
        if (!freeTurn && !duringOwnDecision) return err('Πώληση ομολόγου μόνο στη σειρά σου ή κατά τη διάρκεια δικής σου απόφασης.');
        const b = p.inv.find(i => i.uid === action.uid && i.kind === 'bond');
        if (!b) return err('Δεν βρέθηκε το ομόλογο.');
        p.cash += b.cost;
        p.inv = p.inv.filter(i => i.uid !== b.uid);
        discard(state, 'project', b.cardId);
        log(state, 'lg_bondSold', { n: pname(p), t: b.tokens, v: fmt(b.cost) });
        return null;
      }

      case 'offer-funding': {
        if (currentPlayer(state).id !== playerId || state.pending) return err('Προσφορά μόνο στη σειρά σου.');
        const inv = p.inv.find(i => i.uid === action.uid && i.kind === 'funding');
        if (!inv) return err('Δεν βρέθηκε η Χρηματοδότηση.');
        const target = state.players.find(x => x.id === action.toId);
        if (!target || target.id === p.id || !isActive(target)) return err('Μη έγκυρος παίκτης.');
        const price = Math.floor(action.price);
        if (!price || price < inv.cost) return err('Η τιμή πρέπει να είναι ≥ ' + fmt(inv.cost) + '.');
        state.pending = { type: 'funding-offer', playerId: target.id, fromId: p.id, uid: inv.uid, price, title: inv.title, income: inv.income, cost: inv.cost };
        log(state, 'lg_offer', { n: pname(p), cid: inv.cardId, n2: pname(target), v: fmt(price) });
        return null;
      }

      default:
        return err('Άγνωστη ενέργεια.');
    }
  }

  function resolvePendingAction(state, p, pend, action) {
    switch (pend.type) {
      case 'card': {
        const c = card(pend.cardId);
        const ch = action.choice;
        if (ch === 'wild') {
          if (!pend.canWild || p.wilds <= 0) return err('Δεν μπορείς να χρησιμοποιήσεις Wild Card εδώ.');
          const otherDeck = pend.deck === 'project' ? 'bb' : 'project';
          const ncid = draw(state, otherDeck);
          if (!ncid) return err('Η άλλη στοίβα είναι άδεια.');
          p.wilds--;
          discard(state, pend.deck, pend.cardId); // η αρχική στον πάτο/discard
          log(state, pend.deck === 'project' ? 'lg_wildToBB' : 'lg_wildToP', { n: pname(p), w: p.wilds });
          state.pending = { type: 'card', playerId: p.id, deck: otherDeck, cardId: ncid, discount: 0, canWild: false, viaWild: true };
          return null;
        }
        if (ch === 'buy' || ch === 'buy-loan') {
          const e = buyCard(state, p, pend, ch === 'buy-loan' ? { loanAmount: action.loanAmount } : null);
          if (e) return e;
          return finishTurn(state), null;
        }
        if (ch === 'decline') {
          if (pend.deck === 'bb' && !pend.isDiscountOffer) {
            // Ο επόμενος ενεργός παίκτης μπορεί να αγοράσει με -10%
            const ni = nextActiveIndex(state, state.players.findIndex(x => x.id === p.id));
            const np = ni >= 0 ? state.players[ni] : null;
            if (np && np.id !== p.id) {
              state.pending = { type: 'card', playerId: np.id, deck: 'bb', cardId: pend.cardId, discount: 0.10, canWild: false, viaWild: false, isDiscountOffer: true, declinedBy: p.id };
              log(state, 'lg_passDisc', { n: pname(p), cid: c.id, n2: pname(np), v: fmt(c.cost * 0.9) });
              return null;
            }
            discard(state, 'bb', pend.cardId);
          } else {
            discard(state, pend.deck === 'bb' ? 'bb' : 'project', pend.cardId);
          }
          log(state, 'lg_declined', { n: pname(p), cid: c.id });
          return finishTurn(state), null;
        }
        return err('Μη έγκυρη επιλογή.');
      }

      case 'lifestyle-partner': {
        const c = card(pend.cardId);
        const partner = state.players.find(x => x.id === action.partnerId);
        if (!partner || partner.id === p.id || !isActive(partner)) return err('Διάλεξε έναν άλλον ενεργό παίκτη.');
        const applied = applyLifestyleTo(state, p, c);
        partner.expenses[c.cat] = Math.max(0, (partner.expenses[c.cat] || 0) + applied);
        log(state, 'lg_lifestyleEach', { cid: c.id, n: pname(p), n2: pname(partner), catKey: c.cat, d: applied });
        return finishTurn(state), null;
      }

      case 'forced-sale': {
        const inv = p.inv.find(i => i.uid === action.uid);
        if (!inv) return err('Δεν βρέθηκε η επένδυση.');
        const val = inv.kind === 'bond' ? bondValue(inv) : 0.8 * inv.cost;
        p.cash += val;
        p.inv = p.inv.filter(i => i.uid !== inv.uid);
        if (inv.kind === 'bb') { /* BB αφαιρούνται οριστικά */ }
        else discard(state, 'project', inv.cardId);
        log(state, 'lg_forcedSold', { n: pname(p), cid: inv.cardId, v: fmt(val) });
        if (needForcedSale(p)) {
          state.pending = { type: 'forced-sale', playerId: p.id, deficit: -p.cash, then: pend.then };
          return null;
        }
        state.pending = null;
        if (pend.then === 'square') { resolveSquare(state, p); return null; }
        return finishTurn(state), null;
      }

      case 'reveal': {
        state.pending = null;
        if (queueForcedSaleIfNeeded(state, p)) { state.pending.then = 'advance'; return null; }
        return finishTurn(state), null;
      }

      case 'funding-offer': {
        const from = state.players.find(x => x.id === pend.fromId);
        if (action.choice === 'accept') {
          if (p.cash < pend.price) return err('Δεν επαρκούν τα μετρητά.');
          const inv = from && from.inv.find(i => i.uid === pend.uid);
          if (!inv) { state.pending = null; return err('Η Χρηματοδότηση δεν υπάρχει πια.'); }
          p.cash -= pend.price;
          from.cash += pend.price;
          from.inv = from.inv.filter(i => i.uid !== inv.uid);
          p.inv.push(Object.assign({}, inv, { uid: uid(state) }));
          log(state, 'lg_offerAccepted', { n: pname(p), cid: inv.cardId, n2: pname(from), v: fmt(pend.price) });
        } else {
          log(state, 'lg_offerDeclined', { n: pname(p) });
        }
        state.pending = null;
        return null;
      }

      default:
        return err('Άγνωστη εκκρεμότητα.');
    }
  }

  return {
    newGame, applyAction, computeRankings,
    totalExp, passive, bbPassive, invTotalCost, bondValue, bondInterestOf, capital, quitPct,
    maxLoan, loanBase, loanDebt, loanOwedNow, priceOf, lifestyleDelta, momentAmount,
    isActive, currentPlayer, card, fmt,
    BOARD: CARDS.BOARD, COLORNAME, END_AGE,
    _internals: { pickVictim, doInflation, collect, sweepInstantQuit },
  };
});
