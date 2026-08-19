/* I QUIT! — Stage 2: multi-scorer schema + backward-compatible reader (A–K).
   ΠΡΟΣΟΧΗ: εδώ ΔΕΝ γίνεται καμία seasonal πίστωση. Αποδεικνύουμε μόνο ότι πολλαπλά
   immutable per-player results γράφονται και διαβάζονται σωστά, και ότι τα ΠΑΛΙΑ
   single-winner records εξακολουθούν να διαβάζονται χωρίς migration. */
'use strict';
const fs = require('fs');
const S = require('../js/scoring.js');
function assert(c, m) { if (!c) throw new Error(m); }

const RULES = JSON.parse(fs.readFileSync(__dirname + '/../database.rules.json', 'utf8')).rules;
const RES_RULES = RULES.scoreGames.$gameId.results.$uid;
const G = '11111111-2222-4333-8444-555555555555';
const SEASON = '2026-Q3';
const UA = 'uid-A', UB = 'uid-B';
const AT = Date.UTC(2026, 7, 12);

function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function node(val) {
  return { val: () => (val === undefined ? null : val), exists: () => val !== undefined && val !== null,
    child: (k) => node(val && typeof val === 'object' ? val[k] : undefined) };
}
/* Mock που ΕΠΙΒΑΛΛΕΙ τους δύο κρίσιμους κανόνες: ιδιοκτησία UID + immutability. */
function makeDb(store, authUid) {
  const data = clone(store) || {};
  const get = (p) => p.split('/').reduce((a, k) => (a && typeof a === 'object') ? a[k] : undefined, data);
  function set(p, v) {
    const m = /^scoreGames\/[^/]+\/results\/([^/]+)$/.exec(p);
    if (m) {
      if (authUid && m[1] !== authUid) { const e = new Error('PERMISSION_DENIED'); e.code = 'PERMISSION_DENIED'; throw e; }
      if (get(p) !== undefined) { const e = new Error('PERMISSION_DENIED: immutable'); e.code = 'PERMISSION_DENIED'; throw e; }
    }
    const parts = p.split('/'); let cur = data;
    for (let i = 0; i < parts.length - 1; i++) { if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {}; cur = cur[parts[i]]; }
    cur[parts[parts.length - 1]] = clone(v);
  }
  const ref = (p) => ({ path: p, child: (s) => ref(p + '/' + s),
    once: () => Promise.resolve(node(get(p))),
    transaction: (fn) => new Promise((res, rej) => {
      const cur = get(p); let next;
      try { next = fn(cur === undefined ? null : clone(cur)); } catch (e) { return rej(e); }
      if (next === undefined) return res({ committed: false, snapshot: node(cur) });
      try { set(p, next); } catch (e) { return rej(e); }
      res({ committed: true, snapshot: node(get(p)) });
    }) });
  return { ref, _get: get, _data: data };
}

// Παρτίδα με 2 verified ανθρώπους (+ προαιρετικό bot)
function twoHumanGame(ageA, ageB, withBot) {
  const players = [{ id: 'p0', name: 'A', isBot: false }, { id: 'p1', name: 'B', isBot: false }];
  const rankings = [{ id: 'p0', retiredAge: ageA }, { id: 'p1', retiredAge: ageB }];
  if (withBot) { players.push({ id: 'p2', name: 'Bot', isBot: true }); rankings.push({ id: 'p2', retiredAge: 30 }); }
  return {
    gameId: G, phase: 'ended', players: players,
    rankings: rankings.slice().sort((a, b) => (a.retiredAge || 99) - (b.retiredAge || 99)),
    scoreRoster: [
      { playerId: 'p0', expectedUid: UA, verifiedUid: UA, verified: true },
      { playerId: 'p1', expectedUid: UB, verifiedUid: UB, verified: true },
    ],
    scoreSetup: 'ready', completedAt: AT, seasonId: SEASON,
  };
}
function baseGameNode() {
  return { meta: { gameId: G, hostUid: UA, roomCode: 'ABCD', transport: 'firebase', humanCount: 2, createdAt: 1 },
    roster: { p0: { human: true, expectedUid: UA }, p1: { human: true, expectedUid: UB } },
    proofs: { p0: { uid: UA, verifiedAt: 1 }, p1: { uid: UB, verifiedAt: 1 } },
    participants: { [UA]: { playerId: 'p0' }, [UB]: { playerId: 'p1' } } };
}

async function run(options) {
  options = options || {};
  let passed = 0, failed = 0; const results = [];
  async function test(letter, name, fn) {
    try { await fn(); passed++; results.push({ letter, name, passed: true });
      if (!options.silent) console.log('  ✓ ' + letter + '. ' + name);
    } catch (e) { failed++; results.push({ letter, name, passed: false, error: e.message });
      if (!options.silent) console.error('  ✗ ' + letter + '. ' + name + ' — ' + e.message); }
  }

  await test('A', 'δύο verified humans → δύο ΞΕΧΩΡΙΣΤΑ results στο ΙΔΙΟ gameId', async function () {
    const db = makeDb({ scoreGames: { [G]: baseGameNode() } });
    const out = await S.persistPlayerResults({ db, uid: UA }, twoHumanGame(58, 62));
    assert(out.count === 2, 'αναμένονταν 2 results, βρέθηκαν ' + out.count);
    const ra = db._get('scoreGames/' + G + '/results/' + UA);
    const rb = db._get('scoreGames/' + G + '/results/' + UB);
    assert(ra.quitAge === 58 && ra.awardedPoints === S.calculateVictoryScore(58), 'λάθος result A: ' + JSON.stringify(ra));
    assert(rb.quitAge === 62 && rb.awardedPoints === S.calculateVictoryScore(62), 'λάθος result B: ' + JSON.stringify(rb));
    assert(ra.uid === UA && rb.uid === UB && ra.playerId === 'p0' && rb.playerId === 'p1', 'λάθος ταυτότητες');
    assert(ra.human === true && ra.eligible === true && ra.quit === true, 'λείπουν πεδία');
    assert(ra.gameId === G && ra.seasonId === SEASON && ra.resultAt === AT, 'λάθος metadata');
  });

  await test('B', 'δύο humans ΙΔΙΑ quitAge 62 → και τα δύο έγκυρα, ίδιοι πόντοι', async function () {
    const db = makeDb({ scoreGames: { [G]: baseGameNode() } });
    await S.persistPlayerResults({ db, uid: UA }, twoHumanGame(62, 62));
    const ra = db._get('scoreGames/' + G + '/results/' + UA);
    const rb = db._get('scoreGames/' + G + '/results/' + UB);
    assert(ra.quitAge === 62 && rb.quitAge === 62, 'λάθος ηλικίες');
    assert(ra.awardedPoints === rb.awardedPoints && ra.awardedPoints === S.calculateVictoryScore(62),
      'ίδια ηλικία πρέπει να δίνει ίδιους πόντους: ' + ra.awardedPoints + '/' + rb.awardedPoints);
  });

  await test('C', 'UID A ΔΕΝ μπορεί να γράψει result του UID B', async function () {
    const db = makeDb({ scoreGames: { [G]: baseGameNode() } }, UA);   // authenticated ως A
    let err = null;
    await S.persistPlayerResult({ db, uid: UA }, {
      gameId: G, seasonId: SEASON, playerId: 'p1', uid: UB, human: true, eligible: true,
      quit: true, quitAge: 62, awardedPoints: S.calculateVictoryScore(62), resultAt: AT,
    }).catch((e) => { err = e; });
    assert(err && /PERMISSION_DENIED/.test(err.message), 'επιτράπηκε εγγραφή ξένου result: ' + (err && err.message));
    assert(!db._get('scoreGames/' + G + '/results/' + UB), 'γράφτηκε ξένο result!');
  });

  await test('D', 'awardedPoints mismatch → απόρριψη πριν από κάθε εγγραφή', async function () {
    const db = makeDb({ scoreGames: { [G]: baseGameNode() } });
    let err = null;
    await S.persistPlayerResult({ db, uid: UA }, {
      gameId: G, seasonId: SEASON, playerId: 'p0', uid: UA, human: true, eligible: true,
      quit: true, quitAge: 58, awardedPoints: 999, resultAt: AT,
    }).catch((e) => { err = e; });
    assert(err && err.stage === 'player-result', 'δεν απορρίφθηκε: ' + (err && err.message));
    assert(!db._get('scoreGames/' + G + '/results/' + UA), 'γράφτηκε result με λάθος πόντους');
  });

  await test('E', 'quitAge εκτός canonical πίνακα (65) → 0 πόντοι, όχι scoreable νίκη', async function () {
    const db = makeDb({ scoreGames: { [G]: baseGameNode() } });
    const ev = S.evaluatePlayerResults(twoHumanGame(58, 65));
    const b = ev.results.find((r) => r.uid === UB);
    assert(b.quit === false && b.awardedPoints === 0 && b.quitAge === null, 'η ηλικία 65 δεν έδωσε 0: ' + JSON.stringify(b));
    await S.persistPlayerResults({ db, uid: UA }, twoHumanGame(58, 65));
    const rb = db._get('scoreGames/' + G + '/results/' + UB);
    assert(rb.quit === false && rb.awardedPoints === 0 && rb.quitAge === undefined, 'λάθος αποθηκευμένο record: ' + JSON.stringify(rb));
    // …και μη-quit με πόντους απορρίπτεται ρητά
    let err = null;
    await S.persistPlayerResult({ db, uid: UA }, { gameId: G, seasonId: SEASON, playerId: 'p0', uid: 'uid-X',
      human: true, eligible: true, quit: false, quitAge: null, awardedPoints: 50, resultAt: AT }).catch((e) => { err = e; });
    assert(err, 'επιτράπηκαν πόντοι χωρίς I QUIT');
  });

  await test('F', 'bot → ΚΑΝΕΝΑ result (μη scoreable)', async function () {
    const db = makeDb({ scoreGames: { [G]: baseGameNode() } });
    const g = twoHumanGame(58, 62, true);
    const ev = S.evaluatePlayerResults(g);
    assert(ev.results.length === 2, 'το bot παρήγαγε result! (' + ev.results.length + ')');
    assert(!ev.results.some((r) => r.playerId === 'p2'), 'βρέθηκε result για bot');
    await S.persistPlayerResults({ db, uid: UA }, g);
    assert(Object.keys(db._get('scoreGames/' + G + '/results')).length === 2, 'γράφτηκε result για bot');
  });

  await test('G', 'υπάρχον result ΔΕΝ μπορεί να μεταλλαχθεί', async function () {
    const db = makeDb({ scoreGames: { [G]: baseGameNode() } }, UA);
    await S.persistPlayerResult({ db, uid: UA }, { gameId: G, seasonId: SEASON, playerId: 'p0', uid: UA,
      human: true, eligible: true, quit: true, quitAge: 58, awardedPoints: S.calculateVictoryScore(58), resultAt: AT });
    let err = null;
    await S.persistPlayerResult({ db, uid: UA }, { gameId: G, seasonId: SEASON, playerId: 'p0', uid: UA,
      human: true, eligible: true, quit: true, quitAge: 25, awardedPoints: S.calculateVictoryScore(25), resultAt: AT })
      .catch((e) => { err = e; });
    assert(err, 'επιτράπηκε mutation υπάρχοντος result');
    const stored = db._get('scoreGames/' + G + '/results/' + UA);
    assert(stored.quitAge === 58 && stored.awardedPoints === S.calculateVictoryScore(58), 'αλλοιώθηκε το result');
    // ίδιο record ξανά → ασφαλές duplicate, όχι σφάλμα
    const again = await S.persistPlayerResult({ db, uid: UA }, { gameId: G, seasonId: SEASON, playerId: 'p0', uid: UA,
      human: true, eligible: true, quit: true, quitAge: 58, awardedPoints: S.calculateVictoryScore(58), resultAt: AT });
    assert(again.duplicate === true && again.created === false, 'το idempotent re-write δεν αναγνωρίστηκε');
  });

  await test('H', 'READER: ΠΑΛΙΟ single-winner completion → σωστό normalized result', function () {
    const old = Object.assign(baseGameNode(), { completion: {
      gameId: G, seasonId: SEASON, winnerUid: UA, winnerPlayerId: 'p0',
      winningAge: 61, awardedPoints: S.calculateVictoryScore(61), eligible: true, completedAt: AT } });
    const r = S.readGameScorers(G, old);
    assert(r.schema === 'completion', 'λάθος schema: ' + r.schema);
    assert(r.scorers.length === 1, 'αναμενόταν 1 scorer');
    const sc = r.scorers[0];
    assert(sc.uid === UA && sc.playerId === 'p0' && sc.quit === true, 'λάθος normalization');
    assert(sc.quitAge === 61 && sc.awardedPoints === S.calculateVictoryScore(61), 'λάθος πόντοι/ηλικία');
    assert(sc.source === 'completion' && r.seasonId === SEASON, 'λάθος προέλευση');
  });

  await test('I', 'READER: ΝΕΑ results → πολλαπλοί normalized scorers', async function () {
    const db = makeDb({ scoreGames: { [G]: baseGameNode() } });
    await S.persistPlayerResults({ db, uid: UA }, twoHumanGame(58, 62));
    const r = S.readGameScorers(G, db._get('scoreGames/' + G));
    assert(r.schema === 'results', 'λάθος schema: ' + r.schema);
    assert(r.scorers.length === 2, 'αναμένονταν 2 scorers');
    const a = r.scorers.find((x) => x.uid === UA), b = r.scorers.find((x) => x.uid === UB);
    assert(a.quitAge === 58 && a.awardedPoints === S.calculateVictoryScore(58), 'λάθος A');
    assert(b.quitAge === 62 && b.awardedPoints === S.calculateVictoryScore(62), 'λάθος B');
    assert(r.problems.length === 0, 'απρόσμενα problems: ' + r.problems.join(','));
  });

  await test('J', 'READER: MIXED old+new → ΚΑΝΕΝΑΣ διπλός normalized scorer', async function () {
    const db = makeDb({ scoreGames: { [G]: baseGameNode() } });
    await S.persistPlayerResults({ db, uid: UA }, twoHumanGame(58, 62));
    const gameNode = db._get('scoreGames/' + G);
    // το ΙΔΙΟ game έχει ΚΑΙ παλιό completion για τον UA (όπως θα συνέβαινε σε migration)
    gameNode.completion = { gameId: G, seasonId: SEASON, winnerUid: UA, winnerPlayerId: 'p0',
      winningAge: 58, awardedPoints: S.calculateVictoryScore(58), eligible: true, completedAt: AT };
    const r = S.readGameScorers(G, gameNode);
    assert(r.schema === 'mixed', 'λάθος schema: ' + r.schema);
    assert(r.scorers.length === 2, 'ΔΙΠΛΟΣ scorer! βρέθηκαν ' + r.scorers.length);
    const uids = r.scorers.map((x) => x.uid).sort();
    assert(uids[0] === UA && uids[1] === UB, 'λάθος uids: ' + uids.join(','));
    assert(r.scorers.find((x) => x.uid === UA).source === 'results', 'το new schema πρέπει να υπερισχύει');
    // παλιό completion για ΤΡΙΤΟ uid → προστίθεται κανονικά
    gameNode.completion.winnerUid = 'uid-C'; gameNode.completion.winnerPlayerId = 'p9';
    assert(S.readGameScorers(G, gameNode).scorers.length === 3, 'ο τρίτος scorer χάθηκε');
  });

  await test('K', 'READER: αλλοιωμένο result απορρίπτεται· Rules ownership/immutability παρόντα', function () {
    const bad = Object.assign(baseGameNode(), { results: { [UA]: {
      gameId: G, seasonId: SEASON, playerId: 'p0', uid: UA, human: true, eligible: true,
      quit: true, quitAge: 58, awardedPoints: 999, resultAt: AT } } });
    const r = S.readGameScorers(G, bad);
    assert(r.scorers.length === 0 && /points mismatch/.test(r.problems.join()), 'δεν εντοπίστηκε η αλλοίωση');
    // Rules
    const w = RES_RULES['.write'];
    assert(/auth\.uid === \$uid/.test(w), 'λείπει ownership');
    assert(/email_verified === true/.test(w), 'λείπει verified');
    assert(/!data\.exists\(\)/.test(w), 'το result δεν είναι immutable/create-only');
    assert(/participants/.test(w) && /proofs/.test(w), 'λείπει participant/proof match');
    const v = RES_RULES['.validate'];
    assert(/newData\.child\('human'\)\.val\(\) === true/.test(v), 'δεν απαιτείται human === true');
    assert(/newData\.child\('uid'\)\.val\(\) === \$uid/.test(v), 'το uid δεν δεσμεύεται στο path');
    assert(RES_RULES.$other['.validate'] === false, 'επιτρέπονται άγνωστα πεδία');
    assert(!RULES.scoreGames['.read'], 'προστέθηκε broad read στο scoreGames');
  });

  await test('K2', 'STAGE 2 ΟΡΙΟ: το νέο schema ΔΕΝ αγγίζει seasonScores/points/wins', async function () {
    const db = makeDb({ scoreGames: { [G]: baseGameNode() } });
    await S.persistPlayerResults({ db, uid: UA }, twoHumanGame(58, 62));
    assert(!db._get('seasonScores'), 'το Stage 2 έγραψε στο seasonScores!');
    const src = fs.readFileSync(__dirname + '/../js/scoring.js', 'utf8');
    const fn = src.slice(src.indexOf('function persistPlayerResults'), src.indexOf('function readGameScorers'));
    assert(!/seasonScores|creditSeasonGame|applyGameTransaction/.test(fn),
      'το persistPlayerResults συνδέθηκε πρόωρα με seasonal crediting');
  });

  if (!options.silent) {
    console.log('\n' + (failed === 0 ? '✅' : '❌') + ' Multi-scorer schema: ' + passed + ' passed, ' + failed + ' failed');
  }
  return { passed, failed, results };
}
module.exports = { run };
if (require.main === module) run().then((r) => process.exit(r.failed === 0 ? 0 : 1));
