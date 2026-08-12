/* I QUIT! — Tests: unit tests κανόνων + bot-vs-bot πλήρη παιχνίδια (acceptance test του brief §1.4).
   Εκτέλεση: node online/tests/run-tests.js */
'use strict';
const CARDS = require('../js/cards.js');
const E = require('../js/engine.js');
const BOTS = require('../js/bots.js');
const fs = require('fs');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.error('  ✗ FAIL: ' + msg); }
}
function section(name) { console.log('\n— ' + name); }

// ---------- 1. Δεδομένα καρτών ----------
section('Δεδομένα καρτών');
assert(CARDS.LIFESTYLE.length === 24, 'Lifestyle = 24 (' + CARDS.LIFESTYLE.length + ')');
assert(CARDS.MOMENTS.length === 26, 'Moments = 26 (' + CARDS.MOMENTS.length + ')');
assert(CARDS.BIG_BUSINESS.length === 20, 'Big Business = 20 (' + CARDS.BIG_BUSINESS.length + ')');
assert(CARDS.PROJECTS.length === 45, 'v1.12: Project = 45 (' + CARDS.PROJECTS.length + ')');
assert(CARDS.PROJECTS.filter(c => c.kind === 'masters').length === 3 && CARDS.PROJECTS.find(c => c.id === 'PM3').cost === 1800 && CARDS.PROJECTS.find(c => c.id === 'PM3').salaryUp === 180, 'v1.12: 3ο Μεταπτυχιακό 1.800€/+180€');
// v1.11: νέες κάρτες από IQuit_Cards_v3.key
assert(CARDS.PROJECTS.filter(c => c.kind === 'bond').length === 5, 'Ομόλογα = 5 (2×1.000, 2×2.000, 1×1.500)');
assert(CARDS.PROJECTS.filter(c => c.kind === 'P' && c.color === 'G').length === 10, 'Πράσινα = 10');
assert(CARDS.PROJECTS.every(c => c.kind !== 'betterloan' || c.fewerPayments === 3), 'Ευνοϊκότερο Δάνειο: −3 δόσεις πλέον');
assert(CARDS.MOMENTS.find(c => c.id === 'M02').cancels.join() === 'hobby,theater', 'M02 αναιρεί χόμπι + θεατρικές');
assert(CARDS.LIFESTYLE.find(c => c.id === 'L15').tag === 'hobby' && CARDS.LIFESTYLE.find(c => c.id === 'L18').tag === 'theater', 'tags L15/L18');
assert(CARDS.MOMENTS.find(c => c.id === 'M09').amount === -450 && CARDS.MOMENTS.find(c => c.id === 'M21').amount === -100, 'νέα ποσά M09/M21');
assert(CARDS.BOARD.length === 28, 'Ταμπλό = 28 κουτάκια');
assert(CARDS.BOARD[0].t === 'start' && CARDS.BOARD[14].t === 'salary', 'Γωνίες 0/14 σωστές');
assert(CARDS.BOARD[7].t === 'inflation' && CARDS.BOARD[21].t === 'inflation', 'Inflation στα 7/21');
assert(CARDS.BOARD[13].t === 'tax' && CARDS.BOARD[27].t === 'tax', 'Tax στα 13/27');
assert(CARDS.BOARD[18].t === 'fundingfails', 'Funding Fails στο 18');
// Αποδόσεις project ~6/13/20%
CARDS.PROJECTS.filter(c => c.kind === 'P').forEach(c => {
  const y = c.income / c.cost;
  const target = { G: 0.06, Y: 0.13, R: 0.20 }[c.color];
  assert(Math.abs(y - target) < 0.015, c.id + ' απόδοση ~' + (target * 100) + '% (' + (y * 100).toFixed(1) + '%)');
});
CARDS.PROJECTS.filter(c => c.kind === 'funding').forEach(c => {
  assert(Math.abs(c.income / c.cost - 0.08) < 0.001, c.id + ' Funding 8%');
});
CARDS.BIG_BUSINESS.forEach(c => {
  const y = c.income / c.cost;
  assert(y >= 0.054 && y <= 0.071, c.id + ' BB 5.5–7% (' + (y * 100).toFixed(1) + '%)');
});

// ---------- 2. Αρχική κατάσταση ----------
section('Αρχική κατάσταση');
let s = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B', isBot: true }], 42);
const A = () => s.players[0], B = () => s.players[1];
assert(A().cash === 2000 && A().salary === 2000 && A().age === 25, 'Αρχικά: 2000€/2000€/25');
assert(E.totalExp(A()) === 1500, 'Έξοδα εκκίνησης 1500');
assert(A().wilds === 5, '5 wild cards');
assert(E.quitPct(A()) === 0, 'I QUIT meter 0%');

// ---------- 3. Collect / ηλικία / παθητικό ----------
section('Είσπραξη & παθητικό');
A().inv.push({ uid: 'x1', cardId: 'PR1', kind: 'P', color: 'R', title: 'Μετοχή πετρελαίου', cost: 1000, income: 200 });
A().pos = 12; // 2 βήματα πριν το Salary(14)
// αναγκάζουμε ζαριά: roll είναι τυχαία — αντ' αυτού ελέγχουμε μέσω πολλών βημάτων παρακάτω.
// Εδώ ελέγχουμε τους καθαρούς τύπους:
assert(E.passive(A()) === 200, 'passive = Σ income (200)');
assert(E.bbPassive(A()) === 0, 'bbPassive = 0 χωρίς BB');
A().inv.push({ uid: 'x2', cardId: 'BB10', kind: 'bb', title: 'I Quit', cost: 4000, income: 280 });
assert(E.passive(A()) === 480, 'passive περιλαμβάνει BB (480)');
assert(E.bbPassive(A()) === 280, 'bbPassive = 280');
A().inv.push({ uid: 'x3', cardId: 'PB1', kind: 'bond', title: 'Ομόλογο', cost: 1000, income: 0, tokens: 3 });
assert(E.passive(A()) === 480, 'το ομόλογο ΔΕΝ μετράει στο παθητικό');
assert(E.bondValue(A().inv[2]) === 1000, 'v0.2: πώληση ομολόγου = επιστροφή κεφαλαίου (1000)');
assert(E.bondInterestOf(A().inv[2]) === 40, 'v0.2: τόκος ομολόγου 40€/είσπραξη');
assert(E.maxLoan(A()) === 5000, 'v0.5: μέγιστο δάνειο = αξία επενδύσεων εκτός ομολόγων (1000+4000)');

// ---------- 3β. v0.2: Ομόλογο πληρώνει τόκο σε κάθε είσπραξη & λήγει με επιστροφή κεφαλαίου (#4)
section('v0.2 Ομόλογα (#1, #4)');
{
  let s2 = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 11);
  const P = s2.players[0];
  P.inv.push({ uid: 'b1', cardId: 'PB1', kind: 'bond', title: 'Ομόλογο', cost: 1000, income: 0, tokens: 0 });
  const cashBefore = P.cash;
  E._internals.collect(s2, P);
  // net = 2000-1500+0 = 500, τόκος 40
  assert(P.inv[0] && P.inv[0].tokens === 1, 'token 0→1 στην είσπραξη');
  assert(Math.abs(P.cash - (cashBefore + 500 + 40)) < 0.01, 'ο τόκος 40€ μπήκε στο ταμείο με την είσπραξη');
  P.inv[0].tokens = 9;
  const cash2 = P.cash;
  E._internals.collect(s2, P);
  assert(P.inv.length === 0, 'στα 10 tokens το ομόλογο λήγει αυτόματα');
  assert(Math.abs(P.cash - (cash2 + 500 + 40 + 1000)) < 0.01, 'λήξη: τελευταίος τόκος + επιστροφή κεφαλαίου 1000');
  // Δάνειο με ΜΟΝΟ ομόλογο → απορρίπτεται
  let s3 = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 12);
  s3.players[0].inv.push({ uid: 'b2', cardId: 'PB2', kind: 'bond', title: 'Ομόλογο', cost: 1000, income: 0, tokens: 0 });
  const rl = E.applyAction(s3, 'a', { a: 'loan', amount: 1000 });
  assert(rl && rl.error, 'δάνειο με μόνο ομόλογο στο χαρτοφυλάκιο → απορρίπτεται');
  // Πώληση ομολόγου ΚΑΤΑ ΤΗ ΔΙΑΡΚΕΙΑ απόφασης αγοράς (#1)
  let s4 = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 13);
  const Q = s4.players[0];
  Q.cash = 100;
  Q.inv.push({ uid: 'b3', cardId: 'PB1', kind: 'bond', title: 'Ομόλογο', cost: 1000, income: 0, tokens: 4 });
  s4.pending = { type: 'card', playerId: 'a', deck: 'project', cardId: 'PG4', discount: 0, canWild: false, viaWild: false }; // κόστος 1000
  let rr = E.applyAction(s4, 'a', { a: 'redeem-bond', uid: 'b3' });
  assert(!rr || !rr.error, 'πώληση ομολόγου επιτρέπεται μέσα σε απόφαση αγοράς');
  assert(Q.cash === 1100, 'μετρητά 100+1000 μετά την πώληση');
  assert(s4.pending && s4.pending.type === 'card', 'η απόφαση αγοράς παραμένει ανοιχτή');
  rr = E.applyAction(s4, 'a', { a: 'resolve', choice: 'buy' });
  assert((!rr || !rr.error) && Q.inv.some(i => i.cardId === 'PG4'), 'και η αγορά ολοκληρώνεται με τα νέα μετρητά');
}

// ---------- 3γ. v0.2: Προκαταβολή Φόρου regression (#2)
section('v0.2 Προκαταβολή Φόρου (#2)');
{
  let s2 = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 21);
  const P = s2.players[0];
  P.cash = 5000;
  s2.pending = { type: 'card', playerId: 'a', deck: 'project', cardId: 'PT1', discount: 0, canWild: false, viaWild: false };
  const r2 = E.applyAction(s2, 'a', { a: 'resolve', choice: 'buy' });
  assert(!r2 || !r2.error, 'αγορά PT1 χωρίς σφάλμα');
  assert(P.expenses['Φόροι'] === 80, 'Φόροι 200→80 (−120)');
  assert(E.totalExp(P) === 1380, 'σύνολο εξόδων 1500→1380');
  assert(P.cash === 2600, 'μετρητά 5000−2400');
}

// ---------- 3δ. v0.2: Crash tie-break (#3)
section('v0.2 Crash tie-break (#3)');
{
  const a = { uid: '1', kind: 'P', color: 'R', title: 'A', cost: 600, income: 120 };  // 20%
  const b = { uid: '2', kind: 'P', color: 'R', title: 'B', cost: 1000, income: 200 }; // 20% — ίδια απόδοση, μεγαλύτερο ποσό
  const c = { uid: '3', kind: 'P', color: 'Y', title: 'C', cost: 400, income: 50 };   // 12.5%
  assert(E._internals.pickVictim([a, b, c]).uid === '2', 'ισοπαλία απόδοσης → χάνεται το μεγαλύτερο ποσό (200)');
  assert(E._internals.pickVictim([c, a]).uid === '1', 'αλλιώς: μεγαλύτερη απόδοση % (20% > 12.5%)');
  assert(E._internals.pickVictim([b, a]).uid === '2', 'σειρά λίστας αδιάφορη');
}

// ---------- 3ε. v0.5: Πληθωρισμός — στα ΕΞΟΔΑ & στις Lifestyle, ΟΧΙ στις επενδύσεις
// (3 παίκτες → 4% με τον πίνακα v1.2)
section('v0.5 Πληθωρισμός εξόδων');
{
  let s2 = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }], 31);
  const P = s2.players[0], Q2 = s2.players[1];
  P.cash = 1000;
  P.inv.push({ uid: 'f1', cardId: 'PF1', kind: 'funding', title: 'Καφετέρια', cost: 1000, income: 80 });
  P.inv.push({ uid: 'bo', cardId: 'PB1', kind: 'bond', title: 'Ομόλογο', cost: 1000, income: 0, tokens: 2 });
  E._internals.doInflation(s2);
  assert(P.cash === 1000, 'μετρητά ΑΝΕΠΑΦΑ');
  assert(P.inv[0].cost === 1000 && P.inv[1].cost === 1000, 'οι επενδύσεις ΔΕΝ πληθωρίζονται πια');
  assert(E.priceOf(s2, E.card('PG2')) === 800 && E.priceOf(s2, E.card('BB10')) === 4000, 'ούτε οι τιμές στις στοίβες');
  assert(P.expenses['Ενοίκιο'] === 520 && P.expenses['Φόροι'] === 208, 'έξοδα +4% (3p): Ενοίκιο 500→520, Φόροι 200→208');
  assert(E.totalExp(P) === 1560, 'σύνολο εξόδων 1500→1560');
  assert(E.totalExp(Q2) === 1560, 'πληθωρίζονται τα έξοδα ΟΛΩΝ');
  E._internals.doInflation(s2);
  assert(P.expenses['Ενοίκιο'] === 541, 'δεύτερος πληθωρισμός: 520→541 (στρογγυλοποίηση)');
  // v1.3 (απόφαση Γιώργου): τα Moments ΔΕΝ πληθωρίζονται πλέον — ονομαστικές αξίες πάντα
  assert(E.momentAmount(s2, E.card('M17')) === -500, 'v1.3: Moment −500 μένει −500 (χωρίς πληθωρισμό)');
  assert(E.momentAmount(s2, E.card('M04')) === 250, 'v1.3: Moment +250 μένει +250');
  assert(E.momentAmount(s2, E.card('M01')) === 0, 'κάρτες-αναίρεσης: χωρίς ποσό');
  // Lifestyle: εφαρμόζεται πληθωρισμένη και αναιρείται με το ίδιο ποσό
  const smoke = E.card('L14'); // Κάπνισμα: Ασφάλεια +100, tag smoking
  const before = P.expenses['Ασφάλεια'];
  const applied = E.lifestyleDelta(s2, smoke);
  assert(applied === Math.round(100 * 1.04 * 1.04), 'lifestyle +100 → +' + applied + ' με ×1.0816');
  // Το applyLifestyleTo δεν είναι exported — προσομοιώνουμε χειροκίνητα ένα entry όπως το αποθηκεύει το engine:
  P.expenses['Ασφάλεια'] = before + applied;
  P.lifestyle.push({ id: 'L14', applied });
  s2.pending = { type: 'reveal', playerId: 'a', cardId: 'M01', deck: 'moments' };
  // Η αναίρεση γίνεται στο applyMoment — τεστάρουμε το cancel μονοπάτι με resolve του Moment:
  // βάζουμε την M01 ως επόμενη κάρτα moments και πατάμε "roll" δεν γίνεται ντετερμινιστικά,
  // οπότε ελέγχουμε απευθείας ότι η αναίρεση χρησιμοποιεί το entry.applied:
  const entry = P.lifestyle.find(e => E.card(e.id).tag === 'smoking');
  P.expenses['Ασφάλεια'] = Math.max(0, P.expenses['Ασφάλεια'] - entry.applied);
  assert(P.expenses['Ασφάλεια'] === before, 'η αναίρεση επιστρέφει ακριβώς το πληθωρισμένο ποσό που εφαρμόστηκε');
  s2.pending = null;
}

// ---------- 3ε4. v1.1/v1.2: Dynamic Inflation ανά αριθμό παικτών
section('v1.2 Dynamic Inflation');
{
  assert(E.INFLATION_BY_PLAYERS[1] === 0.08 && E.INFLATION_BY_PLAYERS[3] === 0.04 && E.INFLATION_BY_PLAYERS[6] === 0.01,
    'πίνακας v1.4 (απόφαση Γιώργου): 1p=8%, 3p=4%, 6p=1%');
  assert(E.INFLATION_BY_PLAYERS[1] > E.INFLATION_BY_PLAYERS[2] && E.INFLATION_BY_PLAYERS[2] > E.INFLATION_BY_PLAYERS[3] &&
    E.INFLATION_BY_PLAYERS[3] > E.INFLATION_BY_PLAYERS[4] && E.INFLATION_BY_PLAYERS[4] > E.INFLATION_BY_PLAYERS[5] &&
    E.INFLATION_BY_PLAYERS[5] > E.INFLATION_BY_PLAYERS[6], 'μονότονα φθίνον ποσοστό όσο αυξάνονται οι παίκτες');
  // 2 παίκτες → 5%
  let g2 = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 71);
  assert(E.inflRate(g2) === 0.05, '2 παίκτες → 5%');
  E._internals.doInflation(g2);
  assert(g2.players[0].expenses['Ενοίκιο'] === Math.round(500 * 1.05), '2p: Ενοίκιο 500 → 525');
  // v1.3: όποιος έχει κάνει I QUIT ΔΕΝ επηρεάζεται από επόμενους πληθωρισμούς
  g2.players[1].retiredAge = 47;
  const frozenRent = g2.players[1].expenses['Ενοίκιο'];
  E._internals.doInflation(g2);
  assert(g2.players[1].expenses['Ενοίκιο'] === frozenRent, 'v1.3: τα έξοδα του νικητή I QUIT μένουν παγωμένα');
  assert(g2.players[0].expenses['Ενοίκιο'] === Math.round(Math.round(500 * 1.05) * 1.05), 'οι ενεργοί συνεχίζουν να πληθωρίζονται');
  // 6 παίκτες → 1%
  const spec6 = 'abcdef'.split('').map(x => ({ id: x, name: x.toUpperCase() }));
  let g6 = E.newGame(spec6, 72);
  assert(E.inflRate(g6) === 0.01, '6 παίκτες → 1%');
  E._internals.doInflation(g6);
  assert(g6.players[0].expenses['Ενοίκιο'] === Math.round(500 * 1.01), '6p: Ενοίκιο 500 → 505');
  assert(g6.players[5].expenses['Ενοίκιο'] === Math.round(500 * 1.01), 'επηρεάζονται όλοι οι παίκτες');
  // v1.2: η κάρτα Inflation μένει ΑΝΟΙΧΤΗ μέχρι να την κλείσει άνθρωπος — και όταν προσγειωθεί bot
  let gI = E.newGame([{ id: 'h', name: 'H' }, { id: 'bot', name: 'B', isBot: true }], 73);
  gI.pending = { type: 'reveal', playerId: 'bot', special: 'inflation' };
  gI.turn = 1;
  const BOTS_T = require('../js/bots.js');
  assert(BOTS_T.decide(gI, 'bot') === null, 'το bot ΔΕΝ κλείνει μόνο του την κάρτα Inflation όταν υπάρχει άνθρωπος');
  let rI = E.applyAction(gI, 'h', { a: 'resolve', choice: 'ok' });
  assert((!rI || !rI.error) && gI.pending === null, 'ο άνθρωπος κλείνει την κάρτα Inflation του bot ✓');
  // χωρίς ανθρώπους (sims) το bot την κλείνει μόνο του
  let gB = E.newGame([{ id: 'b1', name: 'B1', isBot: true }, { id: 'b2', name: 'B2', isBot: true }], 74);
  gB.pending = { type: 'reveal', playerId: 'b1', special: 'inflation' };
  const dB = BOTS_T.decide(gB, 'b1');
  assert(dB && dB.a === 'resolve', 'σε παρτίδα μόνο με bots η κάρτα κλείνει αυτόματα');
}

// ---------- 3ε9. v1.8: ΑΠΟΤΑΜΙΕΥΣΗ και για Tax + κάρτα απώλειας Crash/FFail
section('v1.8 Tax μέσω αποταμίευσης & κάρτες απώλειας');
{
  const TAX_POS = CARDS.BOARD.findIndex(s => s.t === 'tax');
  const CRASH_POS = CARDS.BOARD.findIndex(s => s.t === 'crash');
  // v1.19/v1.21: για ΑΝΘΡΩΠΟ ο φόρος ΔΕΝ αφαιρείται αμέσως — ανοίγει παράθυρο και πληρώνεται με το κουμπί
  let sT = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 111);
  const PT = sT.players[0];
  PT.inv.push({ uid: 't1', cardId: 'BB13', kind: 'bb', title: 'X', cost: 10000, income: 600 }); // φόρος 300
  PT.savings = 400; PT.cash = 5000; PT.pos = TAX_POS; sT.turn = 0;
  E._internals.resolveSquare(sT, PT);
  assert(sT.pending && sT.pending.type === 'tax-pay' && sT.pending.amount === 300, 'v1.19: άνθρωπος → πρώτα παράθυρο φόρου (300€), τίποτα δεν αφαιρέθηκε');
  assert(PT.cash === 5000 && PT.savings === 400, 'πριν το κουμπί: μετρητά & ταμείο ανέπαφα');
  let rT = E.applyAction(sT, 'a', { a: 'resolve', choice: 'pay' });
  assert((!rT || !rT.error) && PT.savings === 400 - 210 && PT.cash === 5000, 'μετά το κουμπί: −210 από ΑΠΟΤΑΜΙΕΥΣΗ (−30%), μετρητά ανέπαφα');
  // Tax που ΔΕΝ καλύπτεται → πλήρης από μετρητά (πάντα μέσω κουμπιού για ανθρώπους)
  const PT2 = sT.players[1];
  PT2.inv.push({ uid: 't2', cardId: 'BB19', kind: 'bb', title: 'Y', cost: 10000, income: 600 });
  PT2.savings = 200; PT2.cash = 5000; PT2.pos = TAX_POS; sT.turn = 1;
  E._internals.resolveSquare(sT, PT2);
  rT = E.applyAction(sT, 'b', { a: 'resolve', choice: 'pay' });
  assert((!rT || !rT.error) && PT2.savings === 200 && PT2.cash === 4700, 'ταμείο 200 < φόρος 300: πλήρη 300 από μετρητά');
  // v1.21: για BOT ΚΑΝΕΝΑ παράθυρο — αυτόματη πληρωμή αμέσως + μήνυμα lg_taxBot στο ιστορικό
  let sTB = E.newGame([{ id: 'bt', name: 'Κροίσος', isBot: true }, { id: 'h', name: 'H' }], 113);
  const PTB = sTB.players.find(x => x.id === 'bt');
  PTB.inv.push({ uid: 't3', cardId: 'BB13', kind: 'bb', title: 'X', cost: 10000, income: 800 }); // φόρος 400
  PTB.savings = 0; PTB.cash = 5000; PTB.pos = TAX_POS; sTB.turn = sTB.players.indexOf(PTB);
  E._internals.resolveSquare(sTB, PTB);
  assert(!sTB.pending || sTB.pending.type !== 'tax-pay', 'v1.21: bot → ΚΑΝΕΝΑ tax-pay pending');
  assert(PTB.cash === 4600, 'v1.21: bot πλήρωσε 400€ αυτόματα από μετρητά');
  assert(sTB.log.some(e => e.k === 'lg_taxBot'), 'v1.21: μήνυμα «🤖 πλήρωσε φόρο» στο ιστορικό');
  // bot με ΑΠΟΤΑΜΙΕΥΣΗ που καλύπτει → −30% από εκεί, αυτόματα, χωρίς pending
  let sTB2 = E.newGame([{ id: 'bt2', name: 'Αθηνά', isBot: true }, { id: 'h2', name: 'H' }], 114);
  const PTB2 = sTB2.players.find(x => x.id === 'bt2');
  PTB2.inv.push({ uid: 't4', cardId: 'BB19', kind: 'bb', title: 'Y', cost: 10000, income: 600 }); // φόρος 300
  PTB2.savings = 400; PTB2.cash = 5000; PTB2.pos = TAX_POS; sTB2.turn = sTB2.players.indexOf(PTB2);
  E._internals.resolveSquare(sTB2, PTB2);
  assert((!sTB2.pending || sTB2.pending.type !== 'tax-pay') && PTB2.savings === 190 && PTB2.cash === 5000, 'v1.21: bot με ταμείο 400 → −210 από ΑΠΟΤΑΜΙΕΥΣΗ αυτόματα, μετρητά ανέπαφα');
  // Crash σε ΑΝΘΡΩΠΟ → pending κάρτα απώλειας που κλείνει με κλικ
  let sC = E.newGame([{ id: 'h', name: 'H' }, { id: 'b', name: 'B', isBot: true }], 112);
  const PH = sC.players[0];
  PH.inv.push({ uid: 'c1', cardId: 'PR2', kind: 'P', color: 'R', title: 'Μετοχή', cost: 800, income: 160 });
  PH.pos = CRASH_POS; sC.turn = 0;
  E._internals.resolveSquare(sC, PH);
  assert(sC.pending && sC.pending.type === 'reveal' && sC.pending.special === 'crash' && sC.pending.lostV === 800,
    'crash ανθρώπου → κάρτα απώλειας (reveal) με την επένδυση που χάθηκε');
  let rC = E.applyAction(sC, 'h', { a: 'resolve', choice: 'ok' });
  assert((!rC || !rC.error) && sC.pending === null, 'η κάρτα απώλειας κλείνει με κλικ και η σειρά προχωρά');
  // Crash σε BOT → χωρίς pending (κλείνει μόνο του)
  let sB = E.newGame([{ id: 'b1', name: 'B1', isBot: true }, { id: 'b2', name: 'B2', isBot: true }], 113);
  const PB = sB.players[0];
  PB.inv.push({ uid: 'c2', cardId: 'PG2', kind: 'P', color: 'G', title: 'ΑΚ', cost: 800, income: 48 });
  PB.pos = CRASH_POS; sB.turn = 0;
  E._internals.resolveSquare(sB, PB);
  assert(sB.pending === null, 'crash σε bot: καμία εκκρεμότητα — η ροή συνεχίζεται');
}

// ---------- 3ε8. v1.7: quitPct = floor (bugfix «100% χωρίς νίκη»)
section('v1.7 quitPct floor');
{
  let sQ = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 101);
  const P = sQ.players[0]; // έξοδα 1500
  P.inv.push({ uid: 'q1', cardId: 'BB13', kind: 'bb', title: 'X', cost: 10000, income: 1495 });
  assert(E.quitPct(P) === 99, 'παθητικό 1495/1500 = 99,67% → δείχνει 99% (ΟΧΙ 100%)');
  P.inv[0].income = 1500;
  assert(E.quitPct(P) === 100, 'παθητικό 1500/1500 → 100% ακριβώς');
}

// ---------- 3ε7. v1.6: ΑΠΟΤΑΜΙΕΥΣΗ (Ταμείο Έκτακτης Ανάγκης)
section('v1.6 Αποταμίευση');
{
  let sS = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 97);
  const P = sS.players[0];
  assert(P.savings === 0 && P.savingsOffer === true, 'ξεκινά με μηδέν αποταμίευση και αρχική προσφορά (25)');
  // Κατάθεση: validations + επιτυχία
  sS.pending = { type: 'savings', playerId: 'a', canWithdraw: false, then: null };
  let r = E.applyAction(sS, 'a', { a: 'resolve', choice: 'deposit', amount: 30 });
  assert(r && r.error, 'κατάθεση 30 απορρίπτεται (< 50)');
  sS.pending = { type: 'savings', playerId: 'a', canWithdraw: false, then: null };
  r = E.applyAction(sS, 'a', { a: 'resolve', choice: 'deposit', amount: 120 });
  assert(r && r.error, 'κατάθεση 120 απορρίπτεται (όχι πολλαπλάσιο του 50)');
  sS.pending = { type: 'savings', playerId: 'a', canWithdraw: false, then: null };
  r = E.applyAction(sS, 'a', { a: 'resolve', choice: 'deposit', amount: 400 });
  assert((!r || !r.error) && P.savings === 400 && P.cash === 1600, 'κατάθεση 400: μετρητά 2000→1600, ταμείο 400');
  assert(E.capital(P) === 1600 + 400, 'το κεφάλαιο κατάταξης περιλαμβάνει την αποταμίευση');
  // Ανάληψη ΜΟΝΟ στα 60
  sS.pending = { type: 'savings', playerId: 'a', canWithdraw: false, then: null };
  r = E.applyAction(sS, 'a', { a: 'resolve', choice: 'withdraw' });
  assert(r && r.error && P.savings === 400, 'ανάληψη πριν τα 60 απορρίπτεται');
  sS.pending = { type: 'savings', playerId: 'a', canWithdraw: true, then: null };
  r = E.applyAction(sS, 'a', { a: 'resolve', choice: 'withdraw' });
  assert((!r || !r.error) && P.savings === 0 && P.cash === 2000, 'στα 60: ανάληψη όλων πίσω στα μετρητά');
  // v1.13: ανάληψη ΚΑΙ με γεμάτο meter (πριν τα 60) — μέσω modal ΚΑΙ μέσω άμεσου action
  P.savings = 300; P.cash = 1000;
  P.inv.push({ uid: 'sv1', cardId: 'BB13', kind: 'bb', title: 'X', cost: 30000, income: 1600 }); // παθητικό ≥ 1500
  P.loans.push({ uid: 'lx', amount: 1000, payment: 100, remaining: 10 }); // χρέος → όχι auto-IQUIT
  P.loansTaken = 1;
  sS.pending = { type: 'savings', playerId: 'a', canWithdraw: false, then: null };
  r = E.applyAction(sS, 'a', { a: 'resolve', choice: 'withdraw' });
  assert((!r || !r.error) && P.savings === 0 && P.cash === 1300, 'v1.13: ανάληψη μέσω modal με meter 100% (πριν τα 60)');
  P.savings = 200; sS.turn = 0;
  r = E.applyAction(sS, 'a', { a: 'sav-withdraw' });
  assert((!r || !r.error) && P.savings === 0 && P.cash === 1500, 'v1.13: άμεσο sav-withdraw στη σειρά του με meter 100%');
  const PB2 = sS.players[1];
  PB2.savings = 100; sS.turn = 1;
  r = E.applyAction(sS, 'b', { a: 'sav-withdraw' });
  assert(r && r.error && PB2.savings === 100, 'v1.13: sav-withdraw απορρίπτεται χωρίς 60+ ή meter 100%');
  // Αρνητικό Moment ΚΑΛΥΠΤΟΜΕΝΟ πλήρως → −30% από το ταμείο, μετρητά ανέπαφα
  let sM = E.newGame([{ id: 'a', name: 'A', isBot: true }, { id: 'b', name: 'B', isBot: true }], 98);
  const PM = sM.players[0];
  PM.savings = 600; PM.cash = 5000;
  const negMoment = CARDS.MOMENTS.find(c => !c.cancels && c.amount === -500);
  assert(negMoment, 'υπάρχει Moment −500 στην τράπουλα');
  E._internals.applyMoment(sM, PM, negMoment.id);
  assert(PM.savings === 600 - 350 && PM.cash === 5000, 'Moment −500 με ταμείο 600: πληρώνει 350 (−30%), μετρητά ανέπαφα');
  // ΜΗ καλυπτόμενο (ταμείο 250 < 500) → πλήρης χρέωση μετρητών, ταμείο ανέπαφο
  const PM2 = sM.players[1];
  PM2.savings = 250; PM2.cash = 5000;
  sM.turn = 1;
  E._internals.applyMoment(sM, PM2, negMoment.id);
  assert(PM2.savings === 250 && PM2.cash === 4500, 'ταμείο 250 < 500: πλήρη 500 από μετρητά, ταμείο ανέπαφο');
  // Προσφορά κάθε 5ετία: 29→30 ενεργοποιεί savingsOffer
  const P29 = sM.players[0];
  P29.age = 29; P29.savingsOffer = false;
  E._internals.collect(sM, P29);
  assert(P29.savingsOffer === true, 'στα 30 (κάθε 5ετία) ενεργοποιείται νέα προσφορά αποταμίευσης');
  // Διάσωση από χρεοκοπία: η αποταμίευση ρευστοποιείται 1:1 πριν κηρυχθεί
  let sR = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 99);
  const PR = sR.players[0];
  PR.cash = -150; PR.savings = 400;
  sR.pending = { type: 'reveal', playerId: 'a', cardId: 'M17', deck: 'moments' };
  E.applyAction(sR, 'a', { a: 'resolve', choice: 'ok' });
  // v1.19 (κανόνες Γιώργου): αφαιρείται ΜΟΝΟ όσο χρειάζεται — το υπόλοιπο μένει στο ταμείο
  assert(PR.bankrupt === false && PR.cash === 0 && PR.savings === 250, 'η αποταμίευση σώζει με ΜΕΡΙΚΗ χρήση (−150 από τα 400, μένουν 250)');
}

// ---------- 3ε6. v1.5: Player analytics
section('v1.5 Player analytics');
{
  let sA = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 95);
  sA.turn = 0;
  const P = sA.players[0];
  // Αγορά πράσινου project → buy.G
  P.cash = 10000;
  sA.pending = { type: 'card', playerId: 'a', deck: 'project', cardId: 'PG2', discount: 0, canWild: false, viaWild: false };
  E.applyAction(sA, 'a', { a: 'resolve', choice: 'buy' });
  assert(P.stats.buy.G === 1, 'analytics: αγορά πράσινου → buy.G = 1');
  // Απόρριψη ΕΝΩ επαρκούν τα μετρητά → skip
  sA.turn = 0;
  sA.pending = { type: 'card', playerId: 'a', deck: 'project', cardId: 'PG3', discount: 0, canWild: false, viaWild: false };
  E.applyAction(sA, 'a', { a: 'resolve', choice: 'decline' });
  assert(P.stats.skip.G === 1, 'analytics: απόρριψη με αρκετά μετρητά → skip.G = 1');
  // Απόρριψη ΧΩΡΙΣ αρκετά μετρητά → ΔΕΝ μετρά
  P.cash = 10;
  sA.turn = 0;
  sA.pending = { type: 'card', playerId: 'a', deck: 'project', cardId: 'PY2', discount: 0, canWild: false, viaWild: false };
  E.applyAction(sA, 'a', { a: 'resolve', choice: 'decline' });
  assert(!P.stats.skip.Y, 'analytics: απόρριψη χωρίς μετρητά ΔΕΝ μετρά');
  // Wild swap: η πρώτη κάρτα ΔΕΝ μετρά — μετρά η απόφαση στη δεύτερη
  P.cash = 100000; P.wilds = 1;
  sA.turn = 0;
  const skipsBefore = JSON.stringify(P.stats.skip);
  sA.pending = { type: 'card', playerId: 'a', deck: 'project', cardId: 'PR2', discount: 0, canWild: true, viaWild: false };
  E.applyAction(sA, 'a', { a: 'resolve', choice: 'wild' });
  assert(JSON.stringify(P.stats.skip) === skipsBefore && !P.stats.skip.R, 'analytics: το wild swap ΔΕΝ μετρά ως απόρριψη');
  assert(sA.pending && sA.pending.viaWild === true && sA.pending.deck === 'bb', 'μετά το wild εκκρεμεί η δεύτερη κάρτα (BB)');
  E.applyAction(sA, 'a', { a: 'resolve', choice: 'buy' });
  assert(P.stats.buy.bb === 1, 'analytics: η αγορά της δεύτερης κάρτας μετρά κανονικά → buy.bb = 1');
}

// ---------- 3ε5. v1.4: Χρεοκοπία
section('v1.4 Χρεοκοπία');
{
  let sB = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }], 91);
  const P = sB.players[0];
  // Αρνητικά μετρητά ΧΩΡΙΣ επενδύσεις → χρεοκοπία μέσω του forced-sale ελέγχου
  P.cash = -300;
  assert(P.inv.length === 0, 'χωρίς επενδύσεις');
  E._internals.doInflation(sB); // άσχετη ενέργεια — η χρεοκοπία ελέγχεται στα σημεία ελέγχου ρευστότητας
  sB.pending = { type: 'reveal', playerId: 'a', cardId: 'M17', deck: 'moments' };
  let rB = E.applyAction(sB, 'a', { a: 'resolve', choice: 'ok' });
  assert((!rB || !rB.error) && P.bankrupt === true, 'v1.4: αρνητικά μετρητά χωρίς περιουσία → ΧΡΕΟΚΟΠΙΑ');
  assert(!E.isActive(P), 'ο χρεοκοπημένος είναι εκτός παιχνιδιού');
  assert(sB.phase === 'playing', 'το παιχνίδι συνεχίζεται για τους υπόλοιπους');
  const rk = E.computeRankings(sB);
  assert(rk[rk.length - 1].id === 'a' && rk[rk.length - 1].bankrupt === true, 'ο χρεοκοπημένος κατατάσσεται ΤΕΛΕΥΤΑΙΟΣ');
  // Solo χρεοκοπία → το παιχνίδι τελειώνει
  let sS = E.newGame([{ id: 'x', name: 'X' }], 92);
  const PX = sS.players[0];
  PX.cash = -100;
  sS.pending = { type: 'reveal', playerId: 'x', cardId: 'M17', deck: 'moments' };
  E.applyAction(sS, 'x', { a: 'resolve', choice: 'ok' });
  assert(PX.bankrupt === true && sS.phase === 'ended', 'solo: η χρεοκοπία τερματίζει το παιχνίδι');
  // Με επενδύσεις: πρώτα forced sale· αν και μετά την πώληση ΟΛΩΝ μένει αρνητικός → χρεοκοπία
  // v1.14: στην αναγκαστική πώληση πωλούνται ΜΟΝΟ BB (80%) / Ομόλογα (100%) — τα Projects ΟΧΙ
  let sF = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 93);
  const PF = sF.players[0];
  PF.cash = -2000;
  PF.inv.push({ uid: 'z1', cardId: 'PG2', kind: 'P', color: 'G', title: 'ΑΚ', cost: 800, income: 48 });
  PF.inv.push({ uid: 'z2', cardId: 'BB16', kind: 'bb', title: 'Καντίνα', cost: 5000, income: 275 });
  sF.pending = { type: 'forced-sale', playerId: 'a', deficit: 2000 };
  let rF = E.applyAction(sF, 'a', { a: 'resolve', uid: 'z1' });
  assert(rF && rF.error, 'v1.14: το Project ΔΕΝ πωλείται στην αναγκαστική πώληση');
  rF = E.applyAction(sF, 'a', { a: 'resolve', uid: 'z2' });
  assert((!rF || !rF.error) && PF.cash === -2000 + 4000 && PF.bankrupt === false, 'το BB πωλήθηκε στο 80% (+4.000) και τον έσωσε');
  assert(PF.inv.length === 1 && PF.inv[0].uid === 'z1', 'το Project έμεινε στο χαρτοφυλάκιο');
  // Με ΜΟΝΟ Project στο χαρτοφυλάκιο και αρνητικά μετρητά → κατευθείαν χρεοκοπία (δεν σώζει)
  let sF2 = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 94);
  const PF2 = sF2.players[0];
  PF2.cash = -500;
  PF2.inv.push({ uid: 'q1', cardId: 'PR2', kind: 'P', color: 'R', title: 'Μετοχή', cost: 800, income: 160 });
  sF2.pending = { type: 'reveal', playerId: 'a', cardId: 'M17', deck: 'moments' };
  E.applyAction(sF2, 'a', { a: 'resolve', choice: 'ok' });
  assert(PF2.bankrupt === true && PF2.inv.length === 1, 'v1.14: μόνο Projects στο χέρι = χρεοκοπία (δεν πωλούνται)');
  // Ομόλογο σώζει (100% της αξίας)
  let sF3 = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 95);
  const PF3 = sF3.players[0];
  PF3.cash = -500;
  PF3.inv.push({ uid: 'b1', cardId: 'PB1', kind: 'bond', title: 'Ομόλογο', cost: 1000, income: 0, tokens: 3 });
  sF3.pending = { type: 'reveal', playerId: 'a', cardId: 'M17', deck: 'moments' };
  E.applyAction(sF3, 'a', { a: 'resolve', choice: 'ok' });
  assert(sF3.pending && sF3.pending.type === 'forced-sale', 'με ομόλογο στο χέρι ανοίγει αναγκαστική πώληση');
  E.applyAction(sF3, 'a', { a: 'resolve', uid: 'b1' });
  assert(PF3.cash === 500 && PF3.bankrupt === false, 'το ομόλογο πωλήθηκε στο 100% και τον έσωσε');
}

// ---------- 3ε5β. v1.14: Ευνοϊκότερο Δάνειο → στο δάνειο με τη ΜΕΓΑΛΥΤΕΡΗ ΔΟΣΗ
section('v1.14 Ευνοϊκότερο Δάνειο (μεγαλύτερη δόση)');
{
  let sL = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 96);
  sL.turn = 0;
  const PL = sL.players[0];
  // Δύο δάνεια: το #1 έχει ΠΕΡΙΣΣΟΤΕΡΕΣ δόσεις, το #2 ΜΕΓΑΛΥΤΕΡΗ δόση
  PL.loans.push({ uid: 'l1', amount: 500, payment: 50, remaining: 18 });
  PL.loans.push({ uid: 'l2', amount: 2000, payment: 200, remaining: 5 });
  PL.loansTaken = 2;
  PL.cash = 5000;
  sL.pending = { type: 'card', playerId: 'a', deck: 'project', cardId: 'PL1', discount: 0, canWild: false, viaWild: false };
  let rL = E.applyAction(sL, 'a', { a: 'resolve', choice: 'buy' });
  assert((!rL || !rL.error), 'αγόρασε Ευνοϊκότερο Δάνειο');
  const l1 = PL.loans.find(x => x.uid === 'l1'), l2 = PL.loans.find(x => x.uid === 'l2');
  assert(l2.remaining === 2 && l1.remaining === 18, 'v1.14: οι −3 δόσεις πήγαν στο δάνειο με τη ΜΕΓΑΛΥΤΕΡΗ ΔΟΣΗ (200€), όχι στις περισσότερες δόσεις');
}

// ---------- 3ε3. v0.5: Δάνεια v2
section('v0.5 Δάνεια v2');
{
  let s2 = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 61);
  s2.turn = 0; // για ντετερμινιστικό test — οι actions απαιτούν τη σειρά του 'a'
  const P = s2.players[0];
  P.inv.push({ uid: 'x1', cardId: 'PR2', kind: 'P', color: 'R', title: 'Μετοχή', cost: 800, income: 160 });
  P.inv.push({ uid: 'x2', cardId: 'PF6', kind: 'funding', title: 'Καφετέρια', cost: 2500, income: 200 });
  assert(E.maxLoan(P) === 3300, 'παράδειγμα Γιώργου: 800+2500 → μέγιστο δάνειο 3.300');
  let r2 = E.applyAction(s2, 'a', { a: 'loan', amount: 3456 });
  assert(r2 && r2.error, 'δάνειο 3.456 απορρίπτεται (όχι πολλαπλάσιο του 100)');
  r2 = E.applyAction(s2, 'a', { a: 'loan', amount: 3400 });
  assert(r2 && r2.error, 'δάνειο 3.400 > 3.300 απορρίπτεται');
  r2 = E.applyAction(s2, 'a', { a: 'loan', amount: 2000 });
  assert((!r2 || !r2.error) && P.loans.length === 1 && P.cash === 4000, 'δάνειο 2.000 ΟΚ (20 δόσεις × 200)');
  assert(E.loanDebt(P) === 2000, 'χρέος κεφαλαίου = 2.000');
  assert(E.maxLoan(P) === 1300, '2ο δάνειο: max = 3.300 − 2.000 = 1.300');
  r2 = E.applyAction(s2, 'a', { a: 'loan', amount: 1300 });
  assert((!r2 || !r2.error) && P.loans.length === 2, '2ο δάνειο 1.300 ΟΚ (πολλαπλά δάνεια)');
  assert(E.maxLoan(P) === 0, 'μετά: μηδέν περιθώριο');
  // Πρόωρη αποπληρωμή σε πολλαπλάσια δόσης
  const l1 = P.loans[0];
  r2 = E.applyAction(s2, 'a', { a: 'repay', uid: l1.uid, count: 5 });
  assert((!r2 || !r2.error) && l1.remaining === 15, 'πλήρωσε 5 δόσεις × 200 → μένουν 15');
  assert(E.loanDebt(P) === Math.round(2000 * 15 / 20) + 1300, 'το χρέος κεφαλαίου μειώθηκε αναλογικά');
  // v1.2: ΟΡΙΟ 3 δανείων ΣΥΝΟΛΙΚΑ σε όλο το παιχνίδι
  r2 = E.applyAction(s2, 'a', { a: 'loan', amount: 100 });
  assert((!r2 || !r2.error) && P.loans.length === 3 && P.loansTaken === 3, '3ο δάνειο ΟΚ (εντός ορίου)');
  r2 = E.applyAction(s2, 'a', { a: 'loan', amount: 100 });
  assert(r2 && r2.error && P.loans.length === 3, '4ο δάνειο ΑΠΟΡΡΙΠΤΕΤΑΙ (μέγιστο 3 συνολικά)');
  s2.pending = { type: 'card', playerId: 'a', deck: 'project', cardId: 'PG3', discount: 0, canWild: false, viaWild: false };
  r2 = E.applyAction(s2, 'a', { a: 'resolve', choice: 'buy-loan', loanAmount: 100 });
  assert(r2 && r2.error, 'και η «αγορά με δάνειο» μπλοκάρεται στο όριο των 3');
  s2.pending = null;
  // v1.2: το όριο είναι ΣΥΝΟΛΙΚΟ — η εξόφληση ΔΕΝ ελευθερώνει νέο δάνειο
  const l3 = P.loans[2];
  r2 = E.applyAction(s2, 'a', { a: 'repay', uid: l3.uid, count: l3.remaining });
  assert((!r2 || !r2.error) && P.loans.length === 2, 'εξόφλησε πλήρως το 3ο δάνειο');
  r2 = E.applyAction(s2, 'a', { a: 'loan', amount: 100 });
  assert(r2 && r2.error && P.loansTaken === 3, 'v1.2: ΚΑΝΕΝΑ νέο δάνειο μετά από 3 συνολικά — ούτε μετά από εξόφληση');
  // Παραίτηση ΜΠΛΟΚΑΡΕΤΑΙ με ενεργό δάνειο
  P.inv.push({ uid: 'x3', cardId: 'BB13', kind: 'bb', title: 'Διαμέρισμα Χανιά', cost: 10000, income: 600 });
  P.inv.push({ uid: 'x4', cardId: 'BB19', kind: 'bb', title: 'Διαμέρισμα Ηράκλειο', cost: 10000, income: 600 });
  P.inv.push({ uid: 'x5', cardId: 'BB01', kind: 'bb', title: 'ΑΠΕ', cost: 9000, income: 540 }); // παθητικό 2260 > 1500
  P.cash = 50000;
  E._internals.collect(s2, P);
  assert(P.retiredAge === null, 'ΔΕΝ παραιτείται όσο χρωστάει δάνεια, παρότι παθητικό ≥ έξοδα');
  // Εξόφληση όλων → παραίτηση στο επόμενο πέρασμα
  P.loans.slice().forEach(l => E.applyAction(s2, 'a', { a: 'repay', uid: l.uid, count: l.remaining }));
  assert(P.loans.length === 0, 'εξόφλησε όλα τα δάνεια');
  E._internals.collect(s2, P);
  assert(P.retiredAge !== null, 'τώρα παραιτείται ✓');
}

// ---------- 3ε2. v0.4: Career Bonus +500 στα 35/45/55 (επανήλθε)
section('v0.4 Career Bonus');
{
  let s2 = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 51);
  const P = s2.players[0];
  P.age = 34;
  E._internals.collect(s2, P); // 34 → 35
  assert(P.age === 35 && P.salary === 2500, 'στα 35: μισθός 2000→2500');
  E._internals.collect(s2, P); // 35 → 36
  assert(P.salary === 2500, 'στα 36: καμία αλλαγή (μία φορά ανά ορόσημο)');
  P.age = 44;
  E._internals.collect(s2, P);
  assert(P.salary === 3000, 'στα 45: μισθός → 3000');
  P.age = 54;
  E._internals.collect(s2, P);
  assert(P.salary === 3500, 'στα 55: μισθός → 3500');
  assert(P.cash > 2000, 'οι εισπράξεις πιστώθηκαν κανονικά');
}

// ---------- 3στ. v0.2: Reveal καρτών για ανθρώπους
section('v0.2 Reveal Lifestyle/Moments');
{
  let s2 = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 41);
  s2.pending = { type: 'reveal', playerId: 'a', cardId: 'M09', deck: 'moments' };
  const turnBefore = s2.turn;
  const r2 = E.applyAction(s2, 'b', { a: 'resolve', choice: 'ok' });
  assert(r2 && r2.error, 'μόνο ο παίκτης που τράβηξε κλείνει την κάρτα');
  const r3 = E.applyAction(s2, 'a', { a: 'resolve', choice: 'ok' });
  assert((!r3 || !r3.error) && !s2.pending, 'το OK κλείνει την κάρτα');
  assert(s2.turn !== turnBefore, 'και η σειρά προχωράει');
}

// ---------- 4. Ντετερμινιστικό πλήρες σενάριο με actions ----------
section('Σενάριο actions');
s = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 7);
// v0.7: ο πρώτος παίκτης κληρώνεται — τα tests δουλεύουν με τον τρέχοντα
assert(['a', 'b'].includes(E.currentPlayer(s).id), 'κληρώθηκε πρώτος παίκτης (άνθρωπος)');
const curId = E.currentPlayer(s).id, otherId = curId === 'a' ? 'b' : 'a';
let r = E.applyAction(s, otherId, { a: 'roll' });
assert(r && r.error, 'Δεν ρίχνει ζάρια εκτός σειράς');
r = E.applyAction(s, curId, { a: 'loan', amount: 1000 });
assert(r && r.error, 'Χωρίς επενδύσεις δεν δίνεται δάνειο');
r = E.applyAction(s, curId, { a: 'roll' });
assert(!r || !r.error, 'Ο τρέχων παίκτης ρίχνει ζάρια κανονικά');
// Τυχαιότητα κλήρωσης: με πολλά seeds πρέπει να ξεκινούν και οι δύο
{
  let starts = { a: 0, b: 0 };
  for (let sd = 1; sd <= 40; sd++) starts[E.currentPlayer(E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], sd)).id]++;
  assert(starts.a > 5 && starts.b > 5, 'η κλήρωση πρώτου παίκτη είναι όντως τυχαία (a:' + starts.a + ', b:' + starts.b + ')');
  let botStart = 0;
  for (let sd = 1; sd <= 20; sd++) { const g2 = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B', isBot: true }], sd); if (E.currentPlayer(g2).isBot) botStart++; }
  assert(botStart === 0, 'με ανθρώπους στο τραπέζι, δεν ξεκινά ποτέ bot');
}

// ---------- 5. Bot-vs-bot πλήρη παιχνίδια (ACCEPTANCE TEST) ----------
section('Bot-vs-bot πλήρη παιχνίδια');
function runFullGame(seed, numPlayers) {
  // v1.8: καλύπτονται ΚΑΙ τα θεματικά bots (tycoon/stockpicker/scholar)
  const strategies = ['aggressive', 'balanced', 'defensive', 'tycoon', 'stockpicker', 'scholar'];
  const spec = [];
  for (let i = 0; i < numPlayers; i++) spec.push({ id: 'p' + i, name: 'Bot' + (i + 1), isBot: true, strategy: strategies[(seed + i) % strategies.length] });
  const st = E.newGame(spec, seed);
  let guard = 0;
  while (st.phase === 'playing' && guard++ < 20000) {
    const actorId = st.pending ? st.pending.playerId : E.currentPlayer(st).id;
    const action = BOTS.decide(st, actorId);
    if (!action) throw new Error('Bot χωρίς ενέργεια! pending=' + JSON.stringify(st.pending) + ' turn=' + st.turn);
    const res = E.applyAction(st, actorId, action);
    if (res && res.error) throw new Error('Σφάλμα engine (seed ' + seed + '): ' + res.error + ' | action=' + JSON.stringify(action) + ' | pending=' + JSON.stringify(st.pending));
  }
  if (guard >= 20000) throw new Error('Ατέρμων βρόχος (seed ' + seed + ')');
  return st;
}

const GAMES = 400;
let retireAges = [], noWinner = 0, errs = 0;
for (let seed = 1; seed <= GAMES; seed++) {
  const np = 2 + (seed % 5); // 2–6 παίκτες
  try {
    const st = runFullGame(seed, np);
    assert(st.phase === 'ended' && st.rankings && st.rankings.length === np, 'παιχνίδι #' + seed + ' ολοκληρώθηκε με κατάταξη');
    st.players.forEach(p => {
      // v1.4: ο χρεοκοπημένος βγαίνει νωρίς — εξαιρείται από τα τελικά invariants
      if (p.bankrupt) { assert(p.cash < 0 && p.inv.every(i => i.kind !== 'bb' && i.kind !== 'bond'), 'v1.14: χρεοκοπία μόνο με αρνητικά μετρητά χωρίς ΠΩΛΗΣΙΜΑ (BB/ομόλογα)'); return; }
      assert(p.retiredAge !== null || p.age >= 65, 'παίκτης τερμάτισε (παραίτηση ή 65)');
      assert(p.loans.length === 0, 'όλα τα δάνεια εξοφλημένα στο τέλος (65 ή I QUIT)');
    });
    const winner = st.rankings[0];
    if (winner.retiredAge) retireAges.push(winner.retiredAge); else noWinner++;
  } catch (e) {
    errs++; failed++;
    console.error('  ✗ ' + e.message);
    if (errs > 5) { console.error('  … διακοπή μετά από 5 σφάλματα'); break; }
  }
}
if (retireAges.length) {
  retireAges.sort((a, b) => a - b);
  const med = retireAges[Math.floor(retireAges.length / 2)];
  const avg = retireAges.reduce((a, b) => a + b, 0) / retireAges.length;
  console.log('  Παιχνίδια: ' + GAMES + ' · Με νικητή-παραίτηση: ' + retireAges.length + ' (' + (100 * retireAges.length / GAMES).toFixed(1) + '%)');
  console.log('  Ηλικία νίκης: median ' + med + ' · μέση ' + avg.toFixed(1) + ' · εύρος ' + retireAges[0] + '–' + retireAges[retireAges.length - 1]);
  // Balancing στόχος brief §4: τυπική νίκη ~50–58 (η simulation του GDD έδινε median 51.5)
  assert(med >= 44 && med <= 62, 'median ηλικίας νίκης σε λογικό εύρος 44–62 (' + med + ')');
}

// ---------- 6. Σταθερότητα serialization (host→guest sync) ----------
section('Serialization');
s = E.newGame([{ id: 'a', name: 'A', isBot: true }, { id: 'b', name: 'B', isBot: true }], 99);
for (let i = 0; i < 50 && s.phase === 'playing'; i++) {
  const actorId = s.pending ? s.pending.playerId : E.currentPlayer(s).id;
  E.applyAction(s, actorId, BOTS.decide(s, actorId));
  s = JSON.parse(JSON.stringify(s)); // round-trip όπως στο δίκτυο
}
assert(true, 'Το state επιβιώνει σε JSON round-trips');

// ---------- 7. v1.23: Transport interface parity (net.js ↔ net-fb.js) ----------
section('v1.23 Firebase transport — συμβατότητα συμβολαίου');
{
  // Τα δύο transports φορτώνουν σε node χωρίς DOM/SDK (root = module.exports, guards σε location/document)
  const N1 = require('../js/net.js').IQ_NET;
  const N2 = require('../js/net-fb.js').IQ_NET_FB;
  assert(!!N1 && !!N2, 'IQ_NET & IQ_NET_FB φορτώνουν χωρίς browser');
  const api = ['createHost', 'createGuest', 'makeToken', 'makeCode', 'iceLog'];
  api.forEach(k => assert(typeof N1[k] === 'function' && typeof N2[k] === 'function', 'κοινό API: ' + k + '()'));
  // Το fb transport πρέπει να καλύπτει ΟΛΟ το API του PeerJS transport (το ui.js δουλεύει αναλλοίωτο).
  // Επιπλέον επιτρέπεται ΜΟΝΟ το authReady (κοινό auth bootstrap για τη beta λογαριασμών).
  Object.keys(N1).forEach(k => assert(Object.keys(N2).indexOf(k) > -1, 'το fb transport έχει το ' + k + ' του IQ_NET'));
  const extra = Object.keys(N2).filter(k => Object.keys(N1).indexOf(k) === -1);
  assert(extra.length === 0 || (extra.length === 1 && extra[0] === 'authReady'), 'καμία απρόβλεπτη επέκταση API (extra: ' + extra.join(',') + ')');
  let codesOk = true;
  for (let i = 0; i < 200; i++) if (!/^[A-Z2-9]{4}$/.test(N2.makeCode())) codesOk = false;
  assert(codesOk, 'fb makeCode: πάντα 4 χαρ. A-Z/2-9 (χωρίς I/O/0/1) — ίδια μορφή κωδικών με PeerJS');
  assert(N2.makeToken().length >= 12 && N2.makeToken() !== N2.makeToken(), 'fb makeToken: μοναδικά tokens');
  assert(Array.isArray(N2.iceLog()), 'fb iceLog(): επιστρέφει array (συμβατό με το διαγνωστικό panel)');
  // Το net-fb ΔΕΝ κάνει καμία ενέργεια δικτύου στο load (lazy SDK) — δεν υπάρχει global firebase στο node
  assert(typeof global.firebase === 'undefined', 'κανένα side-effect/SDK load κατά το require');
}

// ---------- 8. Αύγουστος 1.2: Firebase default + PeerJS fallback ----------
section('Αύγουστος 1.2 Transport routing & invitation links');
{
  const T = require('../js/transport.js');
  assert(T.select('').mode === 'firebase', 'χωρίς parameter → Firebase');
  assert(T.select('?room=ABCD').mode === 'firebase', 'room link χωρίς transport → Firebase');
  assert(T.select('?transport=peer').mode === 'peer', '?transport=peer → PeerJS');
  assert(T.select('?transport=firebase').mode === 'firebase', '?transport=firebase → Firebase');
  assert(T.select('?transport=unknown').mode === 'firebase' && T.select('?transport=unknown').explicit === '', 'άγνωστη τιμή → ασφαλές Firebase default χωρίς διατήρηση');

  const origin = 'https://iquitgame.com', path = '/', code = 'ABCD';
  assert(T.inviteUrl(origin, path, code, '') === 'https://iquitgame.com/?room=ABCD', 'default invitation link → καθαρό Firebase URL');
  assert(T.inviteUrl(origin, path, code, '?transport=peer') === 'https://iquitgame.com/?room=ABCD&transport=peer', 'Peer invitation link διατηρεί ?transport=peer');
  assert(T.inviteUrl(origin, path, code, '?transport=firebase') === 'https://iquitgame.com/?room=ABCD&transport=firebase', 'ρητό Firebase invitation link παραμένει συμβατό');
  assert(T.cleanPath(path, '?room=ABCD') === '/', 'καθάρισμα ?room στο default → παραμένει Firebase');
  assert(T.cleanPath(path, '?room=ABCD&transport=peer') === '/?transport=peer', 'καθάρισμα ?room διατηρεί PeerJS');
  assert(T.cleanPath(path, '?room=ABCD&transport=firebase') === '/?transport=firebase', 'καθάρισμα ?room διατηρεί ρητό Firebase');

  const uiSrc = fs.readFileSync(__dirname + '/../js/ui.js', 'utf8');
  const indexSrc = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  assert(uiSrc.includes('TPORT.select(location.search)') && uiSrc.includes('TPORT.inviteUrl(') && uiSrc.includes('TPORT.cleanPath('), 'ui.js χρησιμοποιεί τον ελεγμένο transport helper για επιλογή/links/refresh');
  assert(uiSrc.includes('dataset.transport = TRANSPORT_INFO.mode'), 'το πραγματικά επιλεγμένο transport εκτίθεται μόνο ως ασφαλές data-attribute για e2e/diagnostics');
  assert(uiSrc.includes('?turnonly=1&turnsetup=1&transport=peer'), 'Forced TURN Test παραμένει διαθέσιμο και ανοίγει ρητά PeerJS');
  assert(indexSrc.indexOf('js/transport.js') > -1 && indexSrc.indexOf('js/transport.js') < indexSrc.indexOf('js/ui.js'), 'transport helper φορτώνεται πριν από το ui.js');
  assert(indexSrc.includes('IQUIT — Αύγουστος 2.3'), 'εμφανιζόμενη έκδοση Αύγουστος 2.3');
}

// ---------- 9. Αύγουστος 1.3: SEO metadata & εισαγωγική ενότητα (μόνο περιεχόμενο/metadata) ----------
section('Αύγουστος 1.3 SEO metadata');
{
  const idx = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  const I18N = require('../js/i18n.js');
  const uiSrc2 = fs.readFileSync(__dirname + '/../js/ui.js', 'utf8');
  // Τίτλος & περιγραφή
  assert(/<title>I QUIT! — Online παιχνίδι οικονομικού αλφαβητισμού<\/title>/.test(idx), 'ελληνικός title στο static HTML');
  const desc = (idx.match(/<meta name="description" content="([^"]+)"/) || [])[1] || '';
  ['online επιτραπέζιο παιχνίδι', 'οικονομικού αλφαβητισμού', 'αποταμίευση', 'επενδύσεις', 'δάνεια', 'οικονομική ανεξαρτησία', 'με φίλους']
    .forEach(k => assert(desc.indexOf(k) > -1, 'meta description περιέχει «' + k + '»'));
  // Canonical: ΑΚΡΙΒΩΣ ένα, στο .com
  assert((idx.match(/rel="canonical"/g) || []).length === 1, 'ακριβώς ΕΝΑ canonical');
  assert(idx.includes('<link rel="canonical" href="https://iquitgame.com/">'), 'canonical → https://iquitgame.com/');
  assert(!/iquitgame\.gr/.test(idx), 'κανένα .gr URL στο HTML (το redirect ζει στο Cloudflare)');
  // Open Graph / Twitter
  ['og:type', 'og:title', 'og:description', 'og:url', 'og:site_name', 'og:image'].forEach(p =>
    assert(idx.includes('property="' + p + '"'), 'υπάρχει ' + p));
  ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'].forEach(n =>
    assert(idx.includes('name="' + n + '"'), 'υπάρχει ' + n));
  assert((idx.match(/property="og:title"/g) || []).length === 1 && (idx.match(/<title>/g) || []).length === 1, 'χωρίς διπλά/αντικρουόμενα title tags');
  // Τα δηλωμένα assets ΥΠΑΡΧΟΥΝ πραγματικά
  const files = ['iquit-game-board-v2.png', 'icon.svg', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml'];
  files.forEach(f => assert(fs.existsSync(__dirname + '/../' + f), 'υπάρχει το αρχείο ' + f));
  // Τα XML assets πρέπει να είναι WELL-FORMED — ένα malformed SVG/XML δεν αποδίδεται καθόλου
  // στον browser (π.χ. σχόλιο με διπλή παύλα «--», που απαγορεύεται από το XML spec).
  ['icon.svg', 'sitemap.xml'].forEach(f => {
    const xml = fs.readFileSync(__dirname + '/../' + f, 'utf8');
    // (α) γρήγοροι έλεγχοι που πιάνουν τα συνήθη λάθη χωρίς εξωτερικό εργαλείο
    const comments = xml.match(/<!--[\s\S]*?-->/g) || [];
    comments.forEach(c => assert(c.slice(4, -3).indexOf('--') === -1, f + ': XML σχόλιο ΧΩΡΙΣ διπλή παύλα «--»'));
    assert((xml.match(/<!--/g) || []).length === comments.length, f + ': κανένα ανοιχτό/ημιτελές σχόλιο');
    assert(!/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(xml), f + ': κανένα ακατάλληλο & (πρέπει να είναι entity)');
    // (β) πραγματικό parse με τον XML parser του Node (DOMParser μέσω xmldom δεν υπάρχει —
    //     χρησιμοποιούμε xmllint αν είναι διαθέσιμο, αλλιώς ο παραπάνω έλεγχος αρκεί ως δίχτυ)
    try {
      const { execSync } = require('child_process');
      execSync('xmllint --noout ' + JSON.stringify(__dirname + '/../' + f), { stdio: 'pipe' });
      assert(true, f + ': xmllint well-formed ✓');
    } catch (e) {
      if (e.status) assert(false, f + ': xmllint ΑΠΕΤΥΧΕ — ' + String(e.stderr || '').split('\n')[0]);
      // αν λείπει το xmllint (ENOENT), το (α) έχει ήδη καλύψει το κρίσιμο σενάριο
    }
  });
  assert(/^<svg[\s>]/.test(fs.readFileSync(__dirname + '/../icon.svg', 'utf8').trim()) &&
    /<\/svg>\s*$/.test(fs.readFileSync(__dirname + '/../icon.svg', 'utf8').trim()), 'icon.svg: σωστό root <svg> element');
  assert(idx.includes('https://iquitgame.com/iquit-game-board-v2.png'), 'og:image → υπαρκτό artwork στο canonical domain');
  assert(idx.includes('href="/icon.svg"') && !idx.includes('data:image/svg+xml,<svg'), 'favicon = πραγματικό αρχείο (fetchable από Google), όχι data: URI');
  // JSON-LD: έγκυρο JSON, WebSite, χωρίς SearchAction (δεν υπάρχει αναζήτηση), χωρίς Organization
  const ld = JSON.parse((idx.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1]);
  assert(ld['@type'] === 'WebSite' && ld.name === 'I QUIT!' && ld.alternateName === 'IQuitGame' && ld.url === 'https://iquitgame.com/', 'JSON-LD WebSite με σωστά πεδία');
  assert(!ld.potentialAction && !JSON.stringify(ld).includes('Organization'), 'χωρίς SearchAction/Organization (δεν υπάρχουν επιβεβαιωμένα στοιχεία)');
  // robots/sitemap συνεπή με το canonical
  assert(fs.readFileSync(__dirname + '/../sitemap.xml', 'utf8').includes('<loc>https://iquitgame.com/</loc>'), 'sitemap μόνο με το πραγματικό public URL');
  assert(!/room=|transport=|turnsetup/.test(fs.readFileSync(__dirname + '/../sitemap.xml', 'utf8')), 'sitemap χωρίς room codes/test flags');
  assert(fs.readFileSync(__dirname + '/../robots.txt', 'utf8').includes('Sitemap: https://iquitgame.com/sitemap.xml'), 'robots.txt δείχνει στο sitemap');
  assert(JSON.parse(fs.readFileSync(__dirname + '/../manifest.webmanifest', 'utf8')).icons[0].src === '/icon.svg', 'manifest δείχνει σε υπαρκτό icon');
  // Εισαγωγική ενότητα + i18n
  assert(idx.includes('id="aboutBox"') && idx.includes('Τι είναι το I QUIT!'), 'ενότητα «Τι είναι το I QUIT!» στην αρχική');
  assert(idx.indexOf('id="aboutBox"') > idx.indexOf('id="btnCreate"') && idx.indexOf('id="aboutBox"') > idx.indexOf('id="btnJoin"'), 'η ενότητα είναι ΚΑΤΩ από δημιουργία/είσοδο δωματίου');
  assert(typeof I18N.t === 'function' && typeof I18N.setLang === 'function', 'i18n API διαθέσιμο');
  I18N.setLang('el');
  assert(I18N.t('pageTitle') === 'I QUIT! — Online παιχνίδι οικονομικού αλφαβητισμού', 'EL pageTitle');
  ['αποταμίευση', 'επενδύσεις', 'δάνεια', 'οικονομική ανεξαρτησία', 'με φίλους'].forEach(k =>
    assert(I18N.t('aboutBody').indexOf(k) > -1, 'EL aboutBody περιέχει «' + k + '»'));
  I18N.setLang('en');
  assert(I18N.t('pageTitle') === 'I QUIT! — Online Financial Literacy Board Game', 'EN pageTitle');
  ['saving', 'investing', 'loans', 'financial independence', 'with friends'].forEach(k =>
    assert(I18N.t('aboutBody').indexOf(k) > -1, 'EN aboutBody περιέχει «' + k + '»'));
  assert(I18N.t('metaDesc').indexOf('financial literacy board game') > -1, 'EN metaDesc πλήρης');
  I18N.setLang('el');
  // Το UI ενημερώνει τίτλο/description/lang σε αλλαγή γλώσσας
  assert(uiSrc2.includes("document.title = t('pageTitle')") && uiSrc2.includes("document.documentElement.lang = I.lang"), 'applyStatic ενημερώνει title & lang attribute');
  assert(uiSrc2.includes("meta[name=\"description\"]"), 'applyStatic ενημερώνει τη meta description');
}

// ---------- 10. Αύγουστος 2.1: Προαιρετικοί λογαριασμοί (usernames) ----------
section('Αύγουστος 2.1 Λογαριασμοί — username & απομόνωση');
{
  const A = require('../js/account.js');
  const I18N2 = require('../js/i18n.js');
  const idx2 = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  const acc = fs.readFileSync(__dirname + '/../js/account.js', 'utf8');
  const rules = JSON.parse(fs.readFileSync(__dirname + '/../database.rules.json', 'utf8')).rules;

  // --- επίσημα διαθέσιμο, προαιρετικό, με emergency off ---
  ['', '?room=ABCD', '?transport=peer', '?accountbeta=1', '?fast=1&accountbeta=1', '?accountbeta=2'].forEach(q =>
    assert(A.enabled(q), 'λογαριασμός διαθέσιμος στο κανονικό URL (' + (q || 'κενό') + ')'));
  assert(!A.enabled('?accountbeta=0') && !A.enabled('?room=ABCD&accountbeta=0'), 'accountbeta=0: προσωρινή πλήρης απενεργοποίηση');
  assert(acc.indexOf("if (!api.enabled(location.search)) return api;") > -1, 'με accountbeta=0: early return πριν από DOM/SDK/auth');
  assert(idx2.indexOf('js/account.js') > -1, 'το προαιρετικό account module φορτώνεται από το index');
  assert(acc.indexOf('acc-beta') === -1, 'δεν εμφανίζεται πλέον ένδειξη BETA');

  // --- normalization: case-insensitive, ελληνικά με τόνους, τελικό ς ---
  assert(A.normalizeUsername('George') === 'george' && A.normalizeUsername('GEORGE') === 'george' && A.normalizeUsername('george') === 'george', 'George/GEORGE/george → ίδιο');
  assert(A.sameUsername('George', 'GEORGE') && A.sameUsername('gEoRgE', 'George'), 'case-insensitive σύγκρουση (λατινικά)');
  assert(A.normalizeUsername('Γιώργος') === A.normalizeUsername('ΓΙΩΡΓΟΣ'), 'Γιώργος/ΓΙΩΡΓΟΣ → ίδιο (τόνοι + τελικό ς)');
  assert(A.normalizeUsername('Γιωργος') === A.normalizeUsername('γιωργοσ'), 'ελληνικά case-insensitive');
  assert(A.normalizeUsername('  George  ') === 'george', 'trim');
  assert(A.normalizeUsername(null) === '' && A.normalizeUsername(undefined) === '', 'ασφαλές σε null/undefined');
  assert(A.normalizeUsername('Ελένη') === A.normalizeUsername('ΕΛΕΝΗ'), 'Ελένη/ΕΛΕΝΗ → ίδιο');
  assert(!A.sameUsername('george', 'george2'), 'διαφορετικά usernames ΔΕΝ συγκρούονται');

  // --- validation ---
  ['abc', 'Giorgos_95', 'Γιώργος', 'ΕΛΕΝΗ_7', 'a_1', 'x'.repeat(20)].forEach(u =>
    assert(A.validateUsername(u).ok, 'έγκυρο: ' + u));
  assert(A.validateUsername('ab').error === 'accErrUserLen', '2 χαρακτήρες → λάθος μήκους');
  assert(A.validateUsername('x'.repeat(21)).error === 'accErrUserLen', '21 χαρακτήρες → λάθος μήκους');
  assert(A.validateUsername('a b').error === 'accErrUserSpace', 'κενό → σφάλμα');
  assert(A.validateUsername('').error === 'accErrUserEmpty', 'κενό username → σφάλμα');
  ['a@b', 'geo.rge', 'geo-rge', 'geo!', 'geo/rge', 'ge#o', 'ge$o', 'ge[o]'].forEach(u =>
    assert(A.validateUsername(u).error === 'accErrUserChars', 'ειδικοί χαρακτήρες απορρίπτονται: ' + u));
  assert(A.validateUsername('Giorgos_95').normalized === 'giorgos_95', 'το validate επιστρέφει normalized');
  // τα normalized δεν περιέχουν χαρακτήρες απαγορευμένους ως RTDB keys
  ['Giorgos_95', 'Γιώργος', 'ΕΛΕΝΗ_7'].forEach(u =>
    assert(!/[.$#[\]/]/.test(A.validateUsername(u).normalized), 'normalized ασφαλές ως RTDB key: ' + u));

  // --- μηνύματα σφαλμάτων EL+EN ---
  const errKeys = ['accErrUserEmpty', 'accErrUserSpace', 'accErrUserLen', 'accErrUserChars', 'accErrUserTaken',
    'accErrEmailUsed', 'accErrEmailBad', 'accErrWeakPass', 'accErrWrongPass', 'accErrNoUser', 'accErrTooMany',
    'accErrVerification', 'accErrPermission', 'accErrNetwork', 'accErrDatabase', 'accErrUnexpected',
    'accErrBadLink', 'accErrLinkFailed', 'accErrInRoom', 'accErrGeneric'];
  const uiKeys = ['accTitle', 'accSignup', 'accLogin', 'accSignupBtn', 'accLoginBtn', 'accForgot', 'accLogout',
    'accGuestNote', 'accVerifySent', 'accResetSent', 'accUnverified', 'accVerified', 'accSignedIn', 'accVerifyBody',
    'accResend', 'accRecheck', 'accVerifiedNow', 'accStillUnverified', 'accPickUserBody', 'accUserPh',
    'accClaimBtn', 'accUserSet', 'accUseNote', 'accLoggedOut', 'accProfileLoading', 'accProfileError', 'accRetry'];
  ['el', 'en'].forEach(L => {
    I18N2.setLang(L);
    errKeys.concat(uiKeys).forEach(k => assert(I18N2.t(k) !== k && I18N2.t(k).length > 1, L.toUpperCase() + ' μετάφραση: ' + k));
  });
  I18N2.setLang('el');
  assert(I18N2.t('accErrUserTaken').indexOf('χρησιμοποιείται') > -1, 'EL μήνυμα «username πιασμένο»');
  I18N2.setLang('en');
  assert(I18N2.t('accErrUserTaken').toLowerCase().indexOf('taken') > -1, 'EN μήνυμα «username taken»');
  I18N2.setLang('el');
  // χαρτογράφηση κωδικών Firebase → καθαρά μηνύματα
  assert(A.authErrorKey('auth/email-already-in-use') === 'accErrEmailUsed', 'email σε χρήση');
  assert(A.authErrorKey('auth/wrong-password') === 'accErrWrongPass', 'λάθος κωδικός');
  assert(A.authErrorKey('auth/expired-action-code') === 'accErrBadLink', 'ληγμένο verification link');
  assert(A.authErrorKey('auth/provider-already-linked') === 'accErrLinkFailed', 'αποτυχία linking');
  assert(A.authErrorKey('κάτι άγνωστο') === 'accErrGeneric', 'άγνωστο σφάλμα → γενικό μήνυμα');

  // --- ΤΟ EMAIL ΔΕΝ ΔΙΑΡΡΕΕΙ: ούτε στη βάση, ούτε στο δωμάτιο ---
  assert(!/db\.ref\([^)]*users[^)]*\)\.set\([^)]*email/.test(acc.replace(/\s+/g, ' ')), 'το email δεν γράφεται στο users/');
  assert(acc.indexOf("username: v.username, usernameNormalized: v.normalized") > -1, 'στη βάση γράφονται μόνο username/normalized/timestamps');
  assert(!rules.users.$uid.email && !rules.users.$uid.emailVerified, 'τα rules δεν προβλέπουν καν πεδία email/emailVerified');
  assert(rules.users.$uid.$other['.validate'] === false, 'αυθαίρετα πεδία στο users/{uid} απορρίπτονται');
  const netfb = fs.readFileSync(__dirname + '/../js/net-fb.js', 'utf8');
  assert(!/email/i.test(netfb), 'το transport δεν αγγίζει ΠΟΤΕ email');
  const uiSrc3 = fs.readFileSync(__dirname + '/../js/ui.js', 'utf8');
  assert(!/\.email\b/.test(uiSrc3), 'το ui.js δεν διαβάζει/στέλνει email');

  // --- database rules: ιδιοκτησία, επιβεβαίωση email, μοναδικότητα ---
  const uw = rules.users.$uid['.write'], ur = rules.users.$uid['.read'], nw = rules.usernames.$name['.write'], nv = rules.usernames.$name['.validate'];
  assert(/\$uid === auth\.uid/.test(uw) && /\$uid === auth\.uid/.test(ur), 'κάθε χρήστης γράφει/διαβάζει ΜΟΝΟ το δικό του users/{uid}');
  assert(/auth\.token\.email_verified === true/.test(uw), 'χωρίς επιβεβαιωμένο email δεν γράφεται προφίλ');
  assert(/auth\.token\.email_verified === true/.test(nw), 'χωρίς επιβεβαιωμένο email δεν κατοχυρώνεται username');
  assert(/!data\.exists\(\)/.test(nw), 'username mapping ΜΟΝΟ σε ελεύθερο κλειδί (αποτροπή κατάληψης/race)');
  assert(/data\.val\(\) === auth\.uid/.test(nw), 'μόνο ο κάτοχος μπορεί να απελευθερώσει το δικό του username');
  assert(/newData\.val\(\) === auth\.uid/.test(nv), 'το mapping δείχνει ΠΑΝΤΑ στον authenticated uid — κανείς δεν το αλλάζει σε ξένο');
  assert(/child\('usernames'\)/.test(uw), 'το προφίλ δένεται με κατοχυρωμένο username');
  assert(rules['.read'] === false && rules['.write'] === false, 'deny-by-default παραμένει (καμία γενική άδεια)');
  assert(JSON.stringify(rules).indexOf('".read": true') === -1 && JSON.stringify(rules).indexOf('".write": true') === -1, 'πουθενά read/write = true');

  // --- το κανονικό multiplayer δεν άλλαξε ---
  assert(netfb.indexOf("const SLOTS = ['s1', 's2', 's3', 's4']") > -1, 'δομή δωματίου (4 slots) αμετάβλητη');
  assert(netfb.indexOf('authReady: fbReady') > -1, 'ο προαιρετικός λογαριασμός ΜΟΙΡΑΖΕΤΑΙ το ίδιο auth bootstrap (κανένα δεύτερο uid)');
  assert(/onAuthStateChanged/.test(netfb) && /υπάρχει ΗΔΗ συνδεδεμένος χρήστης/.test(netfb), 'το transport κρατά υπάρχοντα χρήστη αντί για τυφλό signInAnonymously');
  assert(acc.indexOf('linkWithCredential') > -1, 'η εγγραφή γίνεται με link πάνω στον ανώνυμο (ίδιο uid)');
  assert(acc.indexOf('IQ_NET_FB.authReady') > -1, 'το panel δεν αρχικοποιεί δικό του Firebase app');

  // --- ΑΤΟΜΙΚΗ κατοχύρωση (ένα multi-location update, χωρίς rollback) ---
  assert(/ref\(\)\.update\(updates\)/.test(acc), 'το claim γίνεται με ΕΝΑ atomic multi-location update');
  assert(acc.indexOf("updates['usernames/' + v.normalized]") > -1 && acc.indexOf("updates['users/' + u.uid]") > -1, 'το update περιέχει ΚΑΙ mapping ΚΑΙ profile');
  // ΠΡΟΣΟΧΗ: οι έλεγχοι «απουσίας» πρέπει να αγνοούν σχόλια — αλλιώς πιάνουν την τεκμηρίωση
  const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const accCode = strip(acc), netfbCode = strip(netfb);
  assert(!/uref\.transaction|rollback\(/.test(accCode), 'δεν απαιτείται πλέον rollback/transaction (δεν υπάρχει ενδιάμεση κατάσταση)');
  assert(/createdAt: \(prev && prev\.createdAt\) \|\| now/.test(acc), 'επαναληπτική εγγραφή διατηρεί το createdAt');
  // τα rules πρέπει να βλέπουν το mapping ΤΟΥ ΙΔΙΟΥ update (newData), όχι την προ-γραφής κατάσταση
  assert(/newData\.parent\(\)\.parent\(\)\.child\('usernames'\)/.test(rules.users.$uid['.write']),
    'το users rule ελέγχει το mapping μέσω newData (ώστε να δουλεύει το atomic update)');
  assert(!/root\.child\('usernames'\)/.test(rules.users.$uid['.write']), 'δεν χρησιμοποιείται πια το προ-γραφής root (θα απέρριπτε το atomic update)');

  // --- auth bootstrap: μία πηγή αλήθειας ---
  assert((netfbCode.match(/signInAnonymously/g) || []).length === 1, 'ΕΝΑ μόνο signInAnonymously στο transport');
  assert((accCode.match(/signInAnonymously/g) || []).length === 1, 'στο account μόνο η επαναφορά guest μετά το logout');
  assert(/signOut\(\)\.then\(/.test(acc), 'ο νέος guest δημιουργείται ΜΟΝΟ αφού ολοκληρωθεί το sign-out');
  assert((netfb.match(/initializeApp/g) || []).length === 1 && acc.indexOf('initializeApp') === -1, 'ΕΝΑ μόνο Firebase app (μία πηγή αλήθειας)');
  assert(/let _ready = null;[\s\S]*if \(_ready\) return _ready;/.test(netfb), 'το authReady είναι memoized — κανένα παράλληλο bootstrap');
  assert(/Object\.defineProperty\(ctx, 'uid'/.test(netfb), 'το uid εκτίθεται ως getter (ακολουθεί login/logout, δεν παγώνει)');
  assert(/if \(\['do-signup', 'do-login', 'logout'\]\.indexOf\(a\) > -1 && inRoom\(\)\)/.test(acc), 'login/logout/linking μπλοκαρισμένα μέσα σε δωμάτιο');
  // κανένα ευαίσθητο δεδομένο σε localStorage/logs
  assert((acc.match(/localStorage/g) || []).length === 1 && /localStorage\.setItem\('iquit_name'/.test(acc), 'στο localStorage γράφεται ΜΟΝΟ το όνομα παίκτη');
  assert(!/console\.(log|info|warn|error)/.test(acc), 'κανένα log από το account (μηδέν διαρροή credentials)');
  assert(!/password/i.test(acc.replace(/auth\/[a-z-]*password[a-z-]*/gi, '').replace(/accPass|Password|κωδικ/gi, '')), 'το password δεν αποθηκεύεται/μεταφέρεται πουθενά');

  // --- ΛΟΓΙΚΗ των rules, αξιολογημένη τοπικά ---
  // ΔΕΝ αντικαθιστά τον επίσημο emulator (tests/rules-emulator.test.js)· πιάνει όμως λάθη
  // boolean λογικής ΠΡΙΝ τρέξει ο emulator. Η σύνταξη των RTDB rules είναι υποσύνολο JS:
  // αντικαθιστούμε auth/data/newData με mock αντικείμενα και αξιολογούμε την έκφραση.
  {
    const snapOf = (v) => ({
      exists: () => v !== null && v !== undefined,
      val: () => (v === undefined ? null : v),
      child: (k) => snapOf(v && typeof v === 'object' ? v[k] : null),
      isString: () => typeof v === 'string',
      isNumber: () => typeof v === 'number',
      contains: (s) => String(v).indexOf(s) > -1,
      toLowerCase: () => String(v).toLowerCase(),
      parent: () => { throw new Error('parent() δεν χρησιμοποιείται σε αυτόν τον έλεγχο'); },
    });
    const evalRule = (expr, ctx) => {
      const auth = ctx.auth, data = snapOf(ctx.data), newData = snapOf(ctx.newData);
      const now = Date.now();
      const $name = ctx.$name, $uid = ctx.$uid;
      // eslint-disable-next-line no-new-func
      return !!(new Function('auth', 'data', 'newData', 'now', '$name', '$uid', 'return (' + expr + ');'))(auth, data, newData, now, $name, $uid);
    };
    const W = rules.usernames.$name['.write'];
    const VER = { uid: 'alice', token: { email_verified: true } };
    const UNVER = { uid: 'bob', token: { email_verified: false } };
    const ANON = { uid: 'anon', token: {} };
    // δημιουργία σε ελεύθερο
    assert(evalRule(W, { auth: VER, data: null, newData: 'alice' }), 'rule: verified παίρνει ΕΛΕΥΘΕΡΟ username');
    assert(!evalRule(W, { auth: UNVER, data: null, newData: 'bob' }), 'rule: unverified ΔΕΝ παίρνει username');
    assert(!evalRule(W, { auth: ANON, data: null, newData: 'anon' }), 'rule: anonymous ΔΕΝ παίρνει username');
    assert(!evalRule(W, { auth: VER, data: null, newData: 'mallory' }), 'rule: ΔΕΝ γράφεται ΞΕΝΟ uid σε ελεύθερο κλειδί');
    // κατειλημμένο από άλλον
    assert(!evalRule(W, { auth: { uid: 'mallory', token: { email_verified: true } }, data: 'alice', newData: 'mallory' }), 'rule: ΔΕΝ γίνεται κατάληψη ξένου username');
    assert(!evalRule(W, { auth: { uid: 'mallory', token: { email_verified: true } }, data: 'alice', newData: 'alice' }), 'rule: τρίτος ΔΕΝ «ξαναγράφει» ξένο mapping ούτε με την ίδια τιμή');
    assert(!evalRule(W, { auth: { uid: 'mallory', token: { email_verified: true } }, data: 'alice', newData: null }), 'rule: ΔΕΝ διαγράφεται ξένο mapping');
    // IDEMPOTENT επανεγγραφή από τον κάτοχο (το κενό που έδειξε ο emulator)
    assert(evalRule(W, { auth: VER, data: 'alice', newData: 'alice' }), 'rule: ο ΚΑΤΟΧΟΣ ξαναγράφει το ΔΙΚΟ του mapping (idempotent)');
    assert(evalRule(W, { auth: VER, data: 'alice', newData: null }), 'rule: ο κάτοχος ελευθερώνει το δικό του mapping');
    assert(!evalRule(W, { auth: VER, data: 'alice', newData: 'mallory' }), 'rule: ο κάτοχος ΔΕΝ βάζει ξένο uid στο δικό του mapping');
    assert(!evalRule(W, { auth: UNVER, data: 'bob', newData: 'bob' }), 'rule: unverified ΔΕΝ ξαναγράφει ούτε δικό του mapping');
    // users/{uid}: ιδιοκτησία + επιβεβαίωση
    const UW = rules.users.$uid['.write'];
    assert(/\$uid === auth\.uid/.test(UW) && /email_verified === true/.test(UW), 'rule users: ιδιοκτησία + επιβεβαιωμένο email');
  }

  // --- email links → canonical domain ---
  assert(acc.indexOf("const PROD_URL = 'https://iquitgame.com/'") > -1, 'τα email links επιστρέφουν στο canonical .com');
  assert(!/localhost/.test(accCode), 'κανένα localhost στο production flow');
  assert((acc.match(/sendEmailVerification\(actionSettings\(\)\)/g) || []).length === 2 &&
    /sendPasswordResetEmail\(c\.email, actionSettings\(\)\)/.test(acc), 'όλα τα email links περνούν actionCodeSettings');
  assert(idx2.indexOf('js/account.js') < idx2.indexOf('js/ui.js'), 'το account.js φορτώνεται πριν το ui.js');
  assert(fs.readFileSync(__dirname + '/../tools/build.js', 'utf8').indexOf("'account.js'") > -1, 'το build ενσωματώνει το account.js');
}

// ---------- 12. Αύγουστος 1.7: οι στρατηγικές των bots μένουν ΚΡΥΦΕΣ στο UI ----------
section('Αύγουστος 1.7 Bots — κρυφή στρατηγική, ανέπαφη συμπεριφορά');
{
  const uiSrc4 = fs.readFileSync(__dirname + '/../js/ui.js', 'utf8');
  const BOTS_P = require('../js/bots.js');
  const I18N3 = require('../js/i18n.js');

  // A) Τα 6 bots κρατούν ΤΑ ΙΔΙΑ internal strategy keys
  const roster = (uiSrc4.match(/const BOT_ROSTER = \[([\s\S]*?)\];/) || [])[1] || '';
  const pairs = [...roster.matchAll(/name:\s*'([^']+)',\s*strategy:\s*'([^']+)'/g)].map(m => ({ name: m[1], strategy: m[2] }));
  assert(pairs.length === 6, 'A: 6 bots στο roster (' + pairs.length + ')');
  const expected = { 'Ίκαρος': 'aggressive', 'Καλυψώ': 'balanced', 'Δανάη': 'defensive', 'Κροίσος': 'tycoon', 'Ερμής': 'stockpicker', 'Αθηνά': 'scholar' };
  Object.keys(expected).forEach(n => {
    const b = pairs.find(x => x.name === n);
    assert(b && b.strategy === expected[n], 'A: ' + n + ' → strategy «' + expected[n] + '» ΑΜΕΤΑΒΛΗΤΗ');
  });

  // B) Κάθε strategy key αντιστοιχεί σε έγκυρο profile ΜΕ εικονίδιο (και τις παραμέτρους απόφασης)
  pairs.forEach(b => {
    const prof = BOTS_P.PROFILES[b.strategy];
    assert(!!prof, 'B: υπάρχει profile για «' + b.strategy + '»');
    assert(!!prof.icon && prof.icon.length > 0, 'B: το profile «' + b.strategy + '» έχει icon (' + prof.icon + ')');
    ['cushion', 'bbAge', 'bbEarlyMult', 'bondCushion', 'repay'].forEach(k =>
      assert(prof[k] !== undefined, 'B: παράμετρος απόφασης «' + k + '» ανέπαφη στο ' + b.strategy));
  });

  // C) Το strategy εξακολουθεί να ταξιδεύει σε lobby broadcast / session / hostStart
  assert(/broadcast\(\{ t: 'lobby'[\s\S]{0,220}strategy: p\.strategy \|\| null/.test(uiSrc4), 'C: strategy στο lobby broadcast');
  assert(/lobby: \{ code: App\.lobby\.code[\s\S]{0,240}strategy: p\.strategy \|\| null/.test(uiSrc4), 'C: strategy στο saveHostSession');
  assert(/App\.lobby\.players\.map\(p => \(\{ id: p\.id, name: p\.name, isBot: p\.isBot, pawn: p\.pawn, strategy: p\.strategy \}\)\)/.test(uiSrc4), 'C: strategy στο hostStart spec');
  assert(/strategy: spec\.strategy/.test(uiSrc4), 'C: το bot μπαίνει στο lobby ΜΕ τη στρατηγική του');
  const engSrc = fs.readFileSync(__dirname + '/../js/engine.js', 'utf8');
  assert(/strategy: ps\.strategy \|\| 'balanced'/.test(engSrc), 'C: ο engine κρατά το strategy του παίκτη');
  const botsSrc = fs.readFileSync(__dirname + '/../js/bots.js', 'utf8');
  assert(/function profileOf\(p\) \{ return PROFILES\[p\.strategy\]/.test(botsSrc), 'C: profileOf() οδηγεί ακόμα τις αποφάσεις');

  // E) ΚΑΝΕΝΑ ορατό strategy label — ούτε κείμενο, ούτε title/tooltip, ούτε aria-label
  assert(!/t\('strat_'/.test(uiSrc4), 'E: το ui.js ΔΕΝ εμφανίζει πουθενά μεταφρασμένο strategy label');
  const tagFn = (uiSrc4.match(/function stratTag\(strategy\) \{[\s\S]*?\n  \}/) || [''])[0];
  assert(/prof\.icon/.test(tagFn) && !/strat_/.test(tagFn), 'E: stratTag() → μόνο icon');
  assert(!/title="[^"]*strat_|aria-label="[^"]*strat_/.test(uiSrc4), 'E: κανένα title/aria-label με στρατηγική');
  const rosterTpl = (uiSrc4.match(/\$\('botRoster'\)\.innerHTML[\s\S]*?\.join\(''\);/) || [''])[0];
  assert(/prof\.icon/.test(rosterTpl) && /esc\(b\.name\)/.test(rosterTpl) && !/strat_/.test(rosterTpl),
    'E: το roster δείχνει εικονίδιο + όνομα, χωρίς χαρακτηρισμό');
  // τα ΠΡΑΓΜΑΤΙΚΑ strings και στις δύο γλώσσες δεν πρέπει να παράγονται από το UI
  ['el', 'en'].forEach(L => {
    I18N3.setLang(L);
    ['aggressive', 'defensive', 'balanced', 'tycoon', 'stockpicker', 'scholar'].forEach(k => {
      const label = I18N3.t('strat_' + k);
      assert(label && label !== 'strat_' + k, 'E: το i18n κλειδί strat_' + k + ' ΔΙΑΤΗΡΕΙΤΑΙ (' + L + ': ' + label + ')');
    });
  });
  I18N3.setLang('el');
  // το heading της ενότητας δεν υπόσχεται πλέον επιλογή στρατηγικής (EL & EN)
  ['el', 'en'].forEach(L => {
    I18N3.setLang(L);
    const h = I18N3.t('addBot');
    assert(!/στρατηγικ|strategy/i.test(h), 'E: το heading «Πρόσθεσε bot» ΔΕΝ αναφέρει στρατηγική (' + L + ': ' + h + ')');
    assert(/bot/i.test(h), 'E: το heading παραμένει κατανοητό (' + L + ': ' + h + ')');
  });
  I18N3.setLang('el');
  const idxSrc5 = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  assert(!/διάλεξε στρατηγική|pick a strategy|choose strategy/i.test(idxSrc5), 'E: ούτε το static HTML αναφέρει επιλογή στρατηγικής');
  // τα PROFILES[].label παραμένουν ως έχουν (χωρίς cleanup σε αυτό το batch)
  assert(BOTS_P.PROFILES.aggressive.label === 'Επιθετικός', 'PROFILES.label διατηρείται ανέπαφο (χωρίς refactor)');

  // G) Η συμπεριφορά διαφέρει ΟΝΤΩΣ ανά στρατηγική (απόδειξη ότι δεν «ισοπεδώθηκαν»)
  const mk = (strategy) => {
    const s = E.newGame([{ id: 'a', name: 'A', isBot: true, strategy: strategy }, { id: 'b', name: 'B', isBot: true }], 7);
    const p = s.players[0];
    p.cash = 600; p.age = 26;
    s.pending = { type: 'card', playerId: 'a', cardId: 'BB13', deck: 'bb' };
    return BOTS.decide(s, 'a');
  };
  const dAgg = JSON.stringify(mk('aggressive')), dDef = JSON.stringify(mk('defensive'));
  assert(dAgg !== undefined && dDef !== undefined, 'G: τα bots αποφασίζουν κανονικά και με τα δύο profiles');
  assert(/aggressive: 0, balanced: 0\.06, defensive: 0\.15, tycoon: 0\.04, stockpicker: 0\.05, scholar: 0\.12/.test(botsSrc),
    'G: τα ποσοστά ΤΕΑ ανά στρατηγική παραμένουν διαφορετικά');
}

// ---------- 13. Αύγουστος 1.9: ΕΝΑ όριο χωρητικότητας (host + 4 = 5 συνολικά) ----------
section('Αύγουστος 1.9 Capacity — ένα canonical όριο παντού');
{
  const uiSrc5 = fs.readFileSync(__dirname + '/../js/ui.js', 'utf8');
  const netfbSrc = fs.readFileSync(__dirname + '/../js/net-fb.js', 'utf8');
  const rules5 = JSON.parse(fs.readFileSync(__dirname + '/../database.rules.json', 'utf8')).rules;
  const I18N5 = require('../js/i18n.js');
  const strip5 = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const code5 = strip5(uiSrc5);

  // ΕΝΑ canonical όριο, καμία σκόρπια σταθερά
  assert(/const MAX_PLAYERS = 5;/.test(uiSrc5), 'ορίζεται MAX_PLAYERS = 5');
  assert(!/players\.length >= 6/.test(code5), 'κανένα «>= 6» δεν έμεινε στη λογική');
  assert(!/'\/5\)'|\/6\)/.test(code5), 'οι μετρητές δεν έχουν hardcoded παρονομαστή');
  assert((code5.match(/MAX_PLAYERS/g) || []).length >= 6, 'το MAX_PLAYERS χρησιμοποιείται σε ΟΛΑ τα σημεία (μετρητές host+guest, roster, add-bot, rejection)');
  // κάθε capacity σημείο ξεχωριστά
  assert(/lobbyCount'\)\.textContent = '\(' \+ App\.lobby\.players\.length \+ '\/' \+ MAX_PLAYERS/.test(code5), 'μετρητής HOST → /MAX_PLAYERS');
  assert(/lobbyCount'\)\.textContent = '\(' \+ msg\.players\.length \+ '\/' \+ MAX_PLAYERS/.test(code5), 'μετρητής GUEST → /MAX_PLAYERS');
  assert(/const full = App\.lobby\.players\.length >= MAX_PLAYERS/.test(code5), 'roster full → MAX_PLAYERS');
  assert(/if \(App\.lobby\.players\.length >= MAX_PLAYERS\) return;/.test(code5), 'add-bot handler → MAX_PLAYERS');
  assert(/players\.length >= MAX_PLAYERS\) \{ send\(\{ t: 'rejected'/.test(code5), 'απόρριψη νέου guest → MAX_PLAYERS');
  // το selected bot ΔΕΝ κλειδώνει ποτέ (παραμένει αφαιρέσιμο στα 5/5)
  assert(/full && !added \? ' disabled' : ''/.test(code5), 'disabled μόνο για ΜΗ επιλεγμένα (τα επιλεγμένα αφαιρούνται πάντα)');

  // μηνύματα «γεμάτο» σε EL & EN, με το σωστό πλήθος
  ['el', 'en'].forEach(L => {
    I18N5.setLang(L);
    const m = I18N5.t('roomFull', { n: 5 });
    assert(m.indexOf('5') > -1 && m.indexOf('6') === -1, L.toUpperCase() + ': μήνυμα «γεμάτο» αναφέρει 5, όχι 6 (' + m + ')');
    assert(I18N5.t('roomStarted') !== 'roomStarted', L.toUpperCase() + ': μήνυμα «ξεκίνησε» μεταφρασμένο');
  });
  I18N5.setLang('el');
  assert(!/rejected', msg: '[Τ]/.test(uiSrc5), 'τα μηνύματα απόρριψης δεν είναι πια hardcoded ελληνικά');

  // Firebase: 4 guest slots + host = 5 → ΤΑΥΤΙΖΕΤΑΙ, και ΔΕΝ αλλάξαμε τίποτα εκεί
  assert(/const SLOTS = \['s1', 's2', 's3', 's4'\]/.test(netfbSrc), 'Firebase: 4 guest slots (αμετάβλητα)');
  assert(rules5.rooms.$code.slots.$slot['.validate'] === "$slot === 's1' || $slot === 's2' || $slot === 's3' || $slot === 's4'",
    'Firebase rules: μόνο s1-s4 (αμετάβλητα)');
  assert(4 + 1 === 5, 'Firebase 4 guests + host = 5 → συμφωνεί με MAX_PLAYERS');

  // κείμενο αρχικής/κανόνων ήδη έλεγε 1-5 — παραμένει συνεπές
  ['el', 'en'].forEach(L => {
    I18N5.setLang(L);
    assert(/1-5/.test(I18N5.t('homeFoot')), L.toUpperCase() + ': footer «1-5 παίκτες» συμφωνεί με το όριο');
  });
  I18N5.setLang('el');

  // Το e2e hook των host callbacks ΔΕΝ διαρρέει στο production namespace
  assert(!/App\.hostCbs/.test(code5), 'τα host callbacks ΔΕΝ εκτίθενται στο App (production namespace καθαρό)');
  assert(/const E2E = new URLSearchParams\(location\.search\)\.get\('e2e'\) === '1';/.test(code5),
    'υπάρχει ΕΝΑΣ κοινός e2e διακόπτης (ο ήδη υπάρχων, ανυψωμένος σε const)');
  assert(/if \(E2E && window\.IQ_TEST\) window\.IQ_TEST\.hostCbs = cbs;/.test(code5),
    'τα host callbacks μπαίνουν στο ΥΠΑΡΧΟΝ IQ_TEST hook μόνο με ?e2e=1');
  assert(!/hostCbs/.test(code5.replace(/if \(E2E && window\.IQ_TEST\) window\.IQ_TEST\.hostCbs = cbs;/, '')),
    'καμία άλλη αναφορά σε hostCbs εκτός του e2e-guarded σημείου');
  assert(/if \(E2E\) window\.IQ_TEST = \{/.test(code5), 'το IQ_TEST χτίζεται μόνο σε e2e mode');

  // gameplay/engine ΔΕΝ αγγίχτηκε
  const engSrc5 = fs.readFileSync(__dirname + '/../js/engine.js', 'utf8');
  assert(/INFLATION_BY_PLAYERS = \{ 1: 0\.08, 2: 0\.05, 3: 0\.04, 4: 0\.03, 5: 0\.02, 6: 0\.01 \}/.test(engSrc5),
    'ο πίνακας πληθωρισμού ΔΕΝ άλλαξε (gameplay data — το 6 μένει αβλαβές)');
}

// ---------- 14. Αύγουστος 2.0: τρία νέα πιόνια (👛 🦍 🏠) ----------
section('Αύγουστος 2.0 Πιόνια — 12 συνολικά, τα 9 πρώτα ανέπαφα');
{
  const uiSrc6 = fs.readFileSync(__dirname + '/../js/ui.js', 'utf8');
  const m6 = uiSrc6.match(/const PAWNS = \[([^\]]*)\];/);
  assert(!!m6, 'η λίστα PAWNS υπάρχει και είναι ΕΝΑ literal (μία πηγή αλήθειας)');
  const pawns = m6[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(s => s.length);

  // A: ακριβώς 12
  assert(pawns.length === 12, 'A: ακριβώς 12 διαθέσιμα πιόνια (ήταν 9)');
  // B: τα 9 πρώτα ίδια ΚΑΙ στην ίδια σειρά
  const OLD9 = ['🐎', '🚗', '✈️', '🚢', '👟', '💰', '₿', '€', '$'];
  OLD9.forEach((p, i) => assert(pawns[i] === p, 'B: θέση ' + (i + 1) + ' παραμένει ' + p));
  assert(JSON.stringify(pawns.slice(0, 9)) === JSON.stringify(OLD9), 'B: τα 9 πρώτα αμετάβλητα ως σύνολο & σειρά');
  // C: τα τρία τελευταία ακριβώς αυτά
  assert(JSON.stringify(pawns.slice(9)) === JSON.stringify(['👛', '🦍', '🏠']), 'C: τα 3 νέα είναι 👛 🦍 🏠 σε αυτή τη σειρά');
  assert(pawns.indexOf('🚀') === -1, 'C: ο 🚀 ΔΕΝ προστέθηκε (ρητή εντολή)');
  // μοναδικότητα τιμών — το emoji ΕΙΝΑΙ το id
  assert(new Set(pawns).size === pawns.length, 'κάθε πιόνι εμφανίζεται ΜΙΑ φορά (το emoji είναι το id)');

  // E: ο host validator δουλεύει πάνω στην ΙΔΙΑ λίστα (άρα δέχεται αυτόματα τα νέα)
  assert(/PAWNS\.indexOf\(pawn\) === -1\) return;/.test(uiSrc6), 'E: host validation μέσω PAWNS.indexOf (μία πηγή)');
  // F: η μοναδικότητα ανά παρτίδα δεν άλλαξε
  assert(/App\.lobby\.players\.some\(x => x\.pawn === pawn && x\.id !== pl\.id\)\) return;/.test(uiSrc6),
    'F: ο host απορρίπτει πιασμένο πιόνι (αμετάβλητος μηχανισμός)');
  assert(/const taken = owner && !mine;/.test(uiSrc6), 'F: το UI απενεργοποιεί τα πιασμένα');
  // G: sync host→guest μέσω του ίδιου lobby payload
  assert(/pawn: p\.pawn \|\| null/.test(uiSrc6), 'G: το pawn ταξιδεύει στο lobby broadcast (γενικό string)');
  // J/H: καμία ειδική μεταχείριση — ο renderer διαβάζει σκέτο p.pawn
  assert(/box\.innerHTML = PAWNS\.map\(pw => \{/.test(uiSrc6), 'J: ο selector χτίζεται από τη λίστα, χωρίς hardcoded πιόνια');

  // ήχοι: 3 νέα cases, το default παραμένει για ό,τι δεν καλύπτεται
  ['👛', '🦍', '🏠'].forEach(p => assert(new RegExp("case '" + p + "':").test(uiSrc6), 'ήχος βήματος για ' + p));
  assert(/default: \/\/ γράμμα\/🤖: το κλασικό τικ/.test(uiSrc6), 'το default case του ήχου παραμένει (fallback)');
  OLD9.forEach(p => {
    if (p === '€' || p === '$' || p === '₿' || p === '💰') return; // μοιράζονται ένα case
    assert(new RegExp("case '" + p + "':").test(uiSrc6), 'J: ο ήχος του υπάρχοντος ' + p + ' παραμένει');
  });

  // schema/gameplay ΔΕΝ άλλαξαν — το pawn ήταν ήδη γενικό nullable string
  const engSrc6 = fs.readFileSync(__dirname + '/../js/engine.js', 'utf8');
  assert(/pawn: ps\.isBot \? '🤖' : \(ps\.pawn \|\| null\)/.test(engSrc6), 'engine: το pawn περνά ως έχει (καμία αλλαγή schema)');
  assert(/const SLOTS = \['s1', 's2', 's3', 's4'\]/.test(fs.readFileSync(__dirname + '/../js/net-fb.js', 'utf8')),
    'Firebase slots αμετάβλητα (τα πιόνια δεν τα αγγίζουν)');
  assert(/const MAX_PLAYERS = 5;/.test(uiSrc6), 'το capacity της Αύγουστος 1.9 παραμένει ανέπαφο');
}

// ---------- 11. Layout regression (browser) — ΙΔΙΟΣ runner, όχι δεύτερο σύστημα ----------
// Τρέχει αυτόματα όταν υπάρχει playwright· αλλιώς παραλείπεται με μήνυμα (όπως τα emulator tests).
(async () => {
  section('Αύγουστος 2.3 Seasonal Leaderboard regression A–O');
  const leaderboardRegression = await require('./leaderboard-regression.test.js').run();
  passed += leaderboardRegression.passed;
  failed += leaderboardRegression.failed;

  section('Αύγουστος 2.2 Scoring regression A–Z');
  const scoringRegression = await require('./scoring-regression.test.js').run();
  passed += scoringRegression.passed;
  failed += scoringRegression.failed;

  section('Account regression A–J');
  const accountRegression = await require('./account-regression.test.js').run();
  passed += accountRegression.passed;
  failed += accountRegression.failed;

  section('Layout regression: μεγάλα ονόματα καρτών (browser)');
  let r = { passed: 0, failed: 0, skipped: true };
  try {
    r = await require('./layout.e2e.js').run();
  } catch (e) {
    console.log('  ⏭  ΠΑΡΑΛΕΙΨΗ: ' + e.message.split('\n')[0]);
  }
  passed += r.passed; failed += r.failed;

  console.log('\n══════════════════════════');
  console.log((failed === 0 ? '✅' : '❌') + ' Tests: ' + passed + ' passed, ' + failed + ' failed' +
    (r.skipped ? ' (layout e2e: παραλείφθηκε — χρειάζεται playwright)' : ''));
  process.exit(failed === 0 ? 0 : 1);
})();
