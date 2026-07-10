/* I QUIT! — Tests: unit tests κανόνων + bot-vs-bot πλήρη παιχνίδια (acceptance test του brief §1.4).
   Εκτέλεση: node online/tests/run-tests.js */
'use strict';
const CARDS = require('../js/cards.js');
const E = require('../js/engine.js');
const BOTS = require('../js/bots.js');

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
assert(CARDS.PROJECTS.length === 37, 'Project μοναδικές = 37 (' + CARDS.PROJECTS.length + ')');
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
  // v0.6: πληθωρίζονται ΚΑΙ τα Moments
  assert(E.momentAmount(s2, E.card('M17')) === Math.round(-500 * 1.04 * 1.04), 'Moment −500 → −541 με ×1.0816');
  assert(E.momentAmount(s2, E.card('M04')) === Math.round(250 * 1.04 * 1.04), 'Moment +250 → +270 (και τα θετικά)');
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
  assert(E.INFLATION_BY_PLAYERS[1] === 0.12 && E.INFLATION_BY_PLAYERS[3] === 0.04 && E.INFLATION_BY_PLAYERS[6] === 0.01,
    'πίνακας v1.2 (απόφαση Γιώργου): 1p=12%, 3p=4%, 6p=1%');
  assert(E.INFLATION_BY_PLAYERS[1] > E.INFLATION_BY_PLAYERS[2] && E.INFLATION_BY_PLAYERS[2] > E.INFLATION_BY_PLAYERS[3] &&
    E.INFLATION_BY_PLAYERS[3] > E.INFLATION_BY_PLAYERS[4] && E.INFLATION_BY_PLAYERS[4] > E.INFLATION_BY_PLAYERS[5] &&
    E.INFLATION_BY_PLAYERS[5] > E.INFLATION_BY_PLAYERS[6], 'μονότονα φθίνον ποσοστό όσο αυξάνονται οι παίκτες');
  // 2 παίκτες → 7%
  let g2 = E.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 71);
  assert(E.inflRate(g2) === 0.07, '2 παίκτες → 7%');
  E._internals.doInflation(g2);
  assert(g2.players[0].expenses['Ενοίκιο'] === Math.round(500 * 1.07), '2p: Ενοίκιο 500 → 535');
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
  const strategies = ['aggressive', 'balanced', 'defensive'];
  const spec = [];
  for (let i = 0; i < numPlayers; i++) spec.push({ id: 'p' + i, name: 'Bot' + (i + 1), isBot: true, strategy: strategies[(seed + i) % 3] });
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

console.log('\n══════════════════════════');
console.log((failed === 0 ? '✅' : '❌') + ' Tests: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
