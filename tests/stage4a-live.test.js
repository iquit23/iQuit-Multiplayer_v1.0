/* I QUIT! — Stage 4a: live per-player result wiring (A–R), BACKEND ONLY.
   Κάθε client γράφει ΜΟΝΟ το δικό του results/<uid> και πιστώνει ΜΟΝΟ το δικό του
   seasonScores/<uid>. Ο host δεν γράφει ΠΟΤΕ για guest. Καμία αλλαγή UI copy. */
'use strict';
const fs = require('fs');
const S = require('../js/scoring.js');
function assert(c, m) { if (!c) throw new Error(m); }

const RULES = JSON.parse(fs.readFileSync(__dirname + '/../database.rules.json', 'utf8')).rules;
const UI = fs.readFileSync(__dirname + '/../js/ui.js', 'utf8');
const G = '11111111-2222-4333-8444-555555555555';
const SEASON = '2026-Q3', AT = Date.UTC(2026, 7, 12);
const UA = 'uid-A', UB = 'uid-B', UC = 'uid-C';
const P = (a) => S.calculateVictoryScore(a);

function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function node(v) { return { val: () => v === undefined ? null : v, exists: () => v !== undefined && v !== null,
  child: (k) => node(v && typeof v === 'object' ? v[k] : undefined) }; }
/* Mock που ΕΠΙΒΑΛΛΕΙ ownership + immutability όπως τα πραγματικά Rules. */
function makeDb(store, authUid) {
  const d = clone(store) || {};
  const get = (p) => p.split('/').reduce((a, k) => (a && typeof a === 'object') ? a[k] : undefined, d);
  function set(p, v) {
    const r = /^scoreGames\/[^/]+\/results\/([^/]+)$/.exec(p);
    const a = /^seasonScores\/[^/]+\/([^/]+)$/.exec(p);
    if (r && authUid && r[1] !== authUid) { const e = new Error('PERMISSION_DENIED'); e.code = 'PERMISSION_DENIED'; throw e; }
    if (r && get(p) !== undefined) { const e = new Error('PERMISSION_DENIED: immutable'); e.code = 'PERMISSION_DENIED'; throw e; }
    if (a && authUid && a[1] !== authUid) { const e = new Error('PERMISSION_DENIED'); e.code = 'PERMISSION_DENIED'; throw e; }
    const q = p.split('/'); let c = d;
    for (let i = 0; i < q.length - 1; i++) { if (!c[q[i]] || typeof c[q[i]] !== 'object') c[q[i]] = {}; c = c[q[i]]; }
    c[q[q.length - 1]] = clone(v);
  }
  const ref = (p) => ({ child: (x) => ref(p + '/' + x), once: () => Promise.resolve(node(get(p))),
    transaction: (fn) => new Promise((res, rej) => {
      const cur = get(p); let n;
      try { n = fn(cur === undefined ? null : clone(cur)); } catch (e) { return rej(e); }
      if (n === undefined) return res({ committed: false, snapshot: node(cur) });
      try { set(p, n); } catch (e) { return rej(e); }
      res({ committed: true, snapshot: node(get(p)) });
    }) });
  return { ref, _get: get, _data: d };
}
// Παρτίδα σε τελική κατάσταση, με ρυθμιζόμενες ηλικίες/verification
function endedGame(specs, opts) {
  opts = opts || {};
  const players = specs.map((s) => ({ id: s.pid, name: s.pid, isBot: !!s.bot }));
  const rankings = specs.map((s) => ({ id: s.pid, retiredAge: s.age }));
  return { gameId: G, phase: 'ended', players, rankings, scoreSetup: opts.setup || 'ready',
    completedAt: AT, seasonId: SEASON,
    scoreRoster: specs.filter((s) => !s.bot).map((s) => ({ playerId: s.pid, expectedUid: s.uid,
      verifiedUid: s.unverified ? null : s.uid, verified: !s.unverified })) };
}
// Προσομοίωση του live path ενός ΣΥΓΚΕΚΡΙΜΕΝΟΥ client (ό,τι κάνει το maybePersistOwnResult)
function localClient(db, game, myPlayerId, myUid) {
  const ev = S.evaluatePlayerResults(game);
  if (!ev.eligible) return Promise.resolve({ skipped: 'ineligible' });
  const mine = ev.results.find((r) => r.playerId === myPlayerId);
  if (!mine) return Promise.resolve({ skipped: 'no-result' });
  if (mine.uid !== myUid) return Promise.resolve({ skipped: 'uid-mismatch' });
  return S.persistPlayerResult({ db }, mine)
    .then(() => S.creditPlayerResult({ db }, mine))
    .catch((e) => ({ error: e }));
}
const agg = (db, uid) => db._get('seasonScores/' + SEASON + '/' + uid);
const res = (db, uid) => db._get('scoreGames/' + G + '/results/' + uid);

async function run(options) {
  options = options || {};
  let passed = 0, failed = 0; const results = [];
  async function test(letter, name, fn) {
    try { await fn(); passed++; results.push({ letter, name, passed: true });
      if (!options.silent) console.log('  ✓ ' + letter + '. ' + name);
    } catch (e) { failed++; results.push({ letter, name, passed: false, error: e.message });
      if (!options.silent) console.error('  ✗ ' + letter + '. ' + name + ' — ' + e.message); }
  }

  const twoHumans = () => endedGame([{ pid: 'p0', uid: UA, age: 58 }, { pid: 'p1', uid: UB, age: 62 }]);

  await test('A', 'host local player I QUIT 58 → persist + credit +' + P(58), async function () {
    const db = makeDb({}, UA);
    await localClient(db, twoHumans(), 'p0', UA);
    assert(res(db, UA).quitAge === 58 && res(db, UA).quit === true, 'λάθος result');
    assert(agg(db, UA).points === P(58) && agg(db, UA).wins === 1 && agg(db, UA).gamesPlayed === 1, 'λάθος credit');
  });

  await test('B', 'guest local player I QUIT 62 → persist + credit +' + P(62), async function () {
    const db = makeDb({}, UB);
    await localClient(db, twoHumans(), 'p1', UB);
    assert(res(db, UB).quitAge === 62, 'λάθος result guest');
    assert(agg(db, UB).points === P(62) && agg(db, UB).wins === 1, 'λάθος credit guest');
  });

  await test('C+D+E', 'ίδιο game: host+guest ανεξάρτητα· ο 1ος δεν μπλοκάρει τον 2ο', async function () {
    const dbA = makeDb({}, UA);
    await localClient(dbA, twoHumans(), 'p0', UA);
    const dbB = makeDb(dbA._data, UB);          // ο guest βλέπει το ίδιο authoritative state
    await localClient(dbB, twoHumans(), 'p1', UB);
    assert(agg(dbB, UA).points === P(58) && agg(dbB, UB).points === P(62), 'ο 2ος scorer μπλοκαρίστηκε');
    assert(res(dbB, UA) && res(dbB, UB), 'λείπουν results');
    // ίδια ηλικία 62 και για τους δύο
    const same = endedGame([{ pid: 'p0', uid: UA, age: 62 }, { pid: 'p1', uid: UB, age: 62 }]);
    const d2 = makeDb({}, UA); await localClient(d2, same, 'p0', UA);
    const d3 = makeDb(d2._data, UB); await localClient(d3, same, 'p1', UB);
    assert(agg(d3, UA).points === P(62) && agg(d3, UB).points === P(62), 'ίδια ηλικία → ίδιοι πόντοι');
  });

  await test('F', 'local player φτάνει 65 → quit=false, μόνο gamesPlayed', async function () {
    const g = endedGame([{ pid: 'p0', uid: UA, age: 58 }, { pid: 'p2', uid: UC, age: 65 }]);
    const db = makeDb({}, UC);
    await localClient(db, g, 'p2', UC);
    assert(res(db, UC).quit === false && res(db, UC).awardedPoints === 0, 'λάθος result');
    assert(res(db, UC).quitAge === undefined, 'non-quit δεν πρέπει να έχει quitAge');
    const a = agg(db, UC);
    assert(a.gamesPlayed === 1 && a.wins === 0 && a.points === 0 && a.sumWinningAge === 0, 'λάθος aggregate: ' + JSON.stringify(a));
  });

  await test('G', 'bot → κανένα result, καμία seasonScores εγγραφή', async function () {
    const g = endedGame([{ pid: 'p0', uid: UA, age: 58 }, { pid: 'p1', bot: true, age: 40 }]);
    const db = makeDb({}, UA);
    const ev = S.evaluatePlayerResults(g);
    assert(ev.results.length === 1, 'το bot παρήγαγε result');
    await localClient(db, g, 'p1', 'uid-bot');
    assert(!db._get('seasonScores'), 'γράφτηκε seasonScores για bot');
  });

  await test('H', 'ineligible multiplayer → καμία seasonal εγγραφή για κανέναν', async function () {
    const g = endedGame([{ pid: 'p0', uid: UA, age: 58 }, { pid: 'p1', uid: UB, age: 62, unverified: true }]);
    const db = makeDb({}, UA);
    const out = await localClient(db, g, 'p0', UA);
    assert(out.skipped === 'ineligible', 'δεν αναγνωρίστηκε ως ineligible');
    assert(!db._get('scoreGames/' + G + '/results'), 'γράφτηκε result σε ineligible παρτίδα');
    assert(!db._get('seasonScores'), 'γράφτηκε seasonScores σε ineligible παρτίδα');
  });

  await test('I', 'refresh: result γράφτηκε αλλά credit απέτυχε → το credit ολοκληρώνεται', async function () {
    const db = makeDb({}, UA);
    const ev = S.evaluatePlayerResults(twoHumans());
    const mine = ev.results.find((r) => r.playerId === 'p0');
    await S.persistPlayerResult({ db }, mine);              // result ✓
    assert(res(db, UA) && !db._get('seasonScores'), 'προϋπόθεση: result χωρίς credit');
    await localClient(db, twoHumans(), 'p0', UA);           // «refresh» → ξαναπροσπαθεί
    assert(agg(db, UA).points === P(58), 'το credit δεν ολοκληρώθηκε μετά το refresh');
  });

  await test('J+K', 'reconnect / 10 retries → ένα aggregate, κανένα duplicate', async function () {
    const db = makeDb({}, UA);
    for (let i = 0; i < 10; i++) await localClient(db, twoHumans(), 'p0', UA);
    const a = agg(db, UA);
    assert(a.points === P(58) && a.wins === 1 && a.gamesPlayed === 1, 'ΔΙΠΛΟΜΕΤΡΗΣΗ: ' + JSON.stringify(a));
    assert(Object.keys(a.awards).length === 1, 'πολλαπλά receipts');
  });

  await test('L', 'host migration: ο νέος host δεν διπλοπιστώνει τον εαυτό του', async function () {
    const db = makeDb({}, UB);
    await localClient(db, twoHumans(), 'p1', UB);
    await localClient(db, twoHumans(), 'p1', UB);   // ίδιος παίκτης, νέα «συνεδρία» ως host
    assert(agg(db, UB).gamesPlayed === 1 && agg(db, UB).points === P(62), 'duplicate μετά από migration');
  });

  await test('M+N', 'παλιό completion-only και mixed → κανένα duplicate', async function () {
    const comp = { gameId: G, seasonId: SEASON, winnerUid: UA, winnerPlayerId: 'p0',
      winningAge: 58, awardedPoints: P(58), eligible: true, completedAt: AT };
    // OLD μόνο
    let r = S.readGameScorers(G, { completion: comp });
    assert(r.schema === 'completion' && r.scorers.length === 1, 'το παλιό path έσπασε');
    // MIXED: υπάρχει ΚΑΙ result για τον ίδιο UID
    const db = makeDb({}, UA);
    await localClient(db, twoHumans(), 'p0', UA);
    const nodeMixed = Object.assign({}, db._get('scoreGames/' + G), { completion: comp });
    r = S.readGameScorers(G, nodeMixed);
    assert(r.schema === 'mixed' && r.scorers.length === 1, 'ΔΙΠΛΟΣ scorer σε mixed: ' + r.scorers.length);
    // δεύτερη πίστωση μέσω του παλιού μονοπατιού → no-op
    const before = agg(db, UA).points;
    const again = await S.creditSeasonGame({ db }, comp, UA);
    assert(again.duplicate === true && agg(db, UA).points === before, 'το παλιό path ξαναπίστωσε');
  });

  await test('O', 'UID A ΔΕΝ μπορεί να προκαλέσει πίστωση του UID B', async function () {
    const db = makeDb({}, UA);                       // authenticated ως A
    let err = null;
    const ev = S.evaluatePlayerResults(twoHumans());
    const bResult = ev.results.find((r) => r.playerId === 'p1');
    await S.persistPlayerResult({ db }, bResult).catch((e) => { err = e; });
    assert(err, 'ο A έγραψε result του B!');
    await S.creditPlayerResult({ db }, bResult).catch(() => {});
    assert(!agg(db, UB), 'ο A πίστωσε το aggregate του B!');
  });

  await test('P', 'STATIC: καμία ταυτότητα βαθμολογίας βασισμένη σε username', function () {
    const fn = UI.slice(UI.indexOf('function maybePersistOwnResult'), UI.indexOf('function scheduleOwnResultRetry'));
    assert(!/username|playerName|\.name\b/.test(fn), 'το live path χρησιμοποιεί όνομα αντί για uid');
    assert(/snapshot\.user\.uid/.test(fn), 'το uid πρέπει να προέρχεται από το verified auth snapshot');
    assert(/mineLocal\.uid !== uid/.test(fn), 'λείπει ο έλεγχος ταύτισης local UID');
  });

  await test('Q', 'STATIC: κανένα winner/#1 gate στο νέο per-player path', function () {
    const fn = UI.slice(UI.indexOf('function maybePersistOwnResult'), UI.indexOf('function scheduleOwnResultRetry'));
    assert(!/winnerUid|rankings\[0\]|scoreResult/.test(fn), 'βρέθηκε single-winner gate στο νέο path');
    assert(/evaluatePlayerResults\(g\)/.test(fn), 'δεν χρησιμοποιεί το per-player evaluation');
    assert(/r\.playerId === App\.myId/.test(fn), 'δεν επιλέγει τον ΤΟΠΙΚΟ παίκτη');
    assert(/if \(!ev\.eligible\) return;/.test(fn), 'λείπει ο έλεγχος eligibility');
  });

  await test('R', 'STATIC: role-agnostic, retry, και ownership Rules αμετάβλητα', function () {
    const fn = UI.slice(UI.indexOf('function maybePersistOwnResult'), UI.indexOf('function scheduleOwnResultRetry'));
    assert(!/App\.role !== 'host'/.test(fn), 'το live path είναι host-only!');
    assert(/App\.role === 'tour'/.test(fn), 'η Ξενάγηση πρέπει να εξαιρείται');
    assert(/scheduleOwnResultRetry\(gameId\)/.test(UI), 'λείπει το retry');
    assert(/ownResultState\[gameId\] = Object\.assign\(\{\}, info, \{ status: 'error'/.test(UI), 'λείπει το error state με backoff');
    assert(/nextAt: Date\.now\(\) \+ Math\.min\(30000/.test(UI), 'λείπει ο exponential backoff');
    // Rules ΔΕΝ χαλάρωσαν
    assert(/auth\.uid === \$uid/.test(RULES.scoreGames.$gameId.results.$uid['.write']), 'χαλάρωσε το ownership του results');
    assert(/auth\.uid === \$uid/.test(RULES.seasonScores.$seasonId.$uid['.write']), 'χαλάρωσε το ownership του seasonScores');
    // ΚΑΜΙΑ αλλαγή UI copy σε αυτό το batch
    assert(!/scoreRecovered|🏆 I QUIT/.test(fn), 'το 4a δεν πρέπει να αγγίζει UI copy');
  });

  if (!options.silent) {
    console.log('\n' + (failed === 0 ? '✅' : '❌') + ' Stage 4a live wiring: ' + passed + ' passed, ' + failed + ' failed');
  }
  return { passed, failed, results };
}
module.exports = { run };
if (require.main === module) run().then((r) => process.exit(r.failed === 0 ? 0 : 1));
