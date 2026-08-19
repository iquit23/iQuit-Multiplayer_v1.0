/* I QUIT! — Stage 3: per-player seasonal crediting (A–Z).
   ΚΑΘΕ verified human παίρνει τους ΔΙΚΟΥΣ του πόντους· όποιος δεν έκανε I QUIT παίρνει 0
   αλλά +1 gamesPlayed. Όλα μέσω του ΙΔΙΟΥ atomic transaction και του ΙΔΙΟΥ award receipt. */
'use strict';
const fs = require('fs');
const S = require('../js/scoring.js');
function assert(c, m) { if (!c) throw new Error(m); }

const RULES = JSON.parse(fs.readFileSync(__dirname + '/../database.rules.json', 'utf8')).rules;
const G = '11111111-2222-4333-8444-555555555555';
const G2 = '66666666-7777-4888-9999-aaaaaaaaaaaa';
const SEASON = '2026-Q3';
const UA = 'uid-A', UB = 'uid-B', UC = 'uid-C';
const AT = Date.UTC(2026, 7, 12);
const P = (age) => S.calculateVictoryScore(age);

function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function node(val) {
  return { val: () => (val === undefined ? null : val), exists: () => val !== undefined && val !== null,
    child: (k) => node(val && typeof val === 'object' ? val[k] : undefined) };
}
function makeDb(store, authUid) {
  const data = clone(store) || {};
  const get = (p) => p.split('/').reduce((a, k) => (a && typeof a === 'object') ? a[k] : undefined, data);
  function set(p, v) {
    const m = /^seasonScores\/[^/]+\/([^/]+)$/.exec(p);
    if (m && authUid && m[1] !== authUid) { const e = new Error('PERMISSION_DENIED'); e.code = 'PERMISSION_DENIED'; throw e; }
    const parts = p.split('/'); let cur = data;
    for (let i = 0; i < parts.length - 1; i++) { if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {}; cur = cur[parts[i]]; }
    cur[parts[parts.length - 1]] = clone(v);
  }
  const ref = (p) => ({ path: p, child: (x) => ref(p + '/' + x),
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
const R = (uid, playerId, age, gameId) => ({
  gameId: gameId || G, seasonId: SEASON, playerId, uid, human: true, eligible: true,
  quit: age !== null, quitAge: age !== null ? age : undefined,
  awardedPoints: age !== null ? P(age) : 0, resultAt: AT,
});
function gameNode(results) {
  const out = { meta: { gameId: G, hostUid: UA, roomCode: 'ABCD', transport: 'firebase', humanCount: 3, createdAt: 1 },
    roster: {}, proofs: {}, participants: {}, results: {} };
  results.forEach((r) => { out.results[r.uid] = r; out.participants[r.uid] = { playerId: r.playerId };
    out.roster[r.playerId] = { human: true, expectedUid: r.uid }; out.proofs[r.playerId] = { uid: r.uid, verifiedAt: 1 }; });
  return out;
}
const agg = (db, uid) => db._get('seasonScores/' + SEASON + '/' + uid);

async function run(options) {
  options = options || {};
  let passed = 0, failed = 0; const results = [];
  async function test(letter, name, fn) {
    try { await fn(); passed++; results.push({ letter, name, passed: true });
      if (!options.silent) console.log('  ✓ ' + letter + '. ' + name);
    } catch (e) { failed++; results.push({ letter, name, passed: false, error: e.message });
      if (!options.silent) console.error('  ✗ ' + letter + '. ' + name + ' — ' + e.message); }
  }

  await test('A', '2 verified humans, και οι δύο I QUIT → και οι δύο credited', async function () {
    const db = makeDb({});
    await S.creditPlayerResult({ db }, R(UA, 'p0', 58));
    await S.creditPlayerResult({ db }, R(UB, 'p1', 62));
    assert(agg(db, UA).points === P(58) && agg(db, UB).points === P(62), 'λάθος πόντοι');
    assert(agg(db, UA).wins === 1 && agg(db, UB).wins === 1, 'λάθος wins');
  });

  await test('B', 'ίδια ηλικία 62 → και οι δύο +' + P(62), async function () {
    const db = makeDb({});
    await S.creditPlayerResult({ db }, R(UA, 'p0', 62));
    await S.creditPlayerResult({ db }, R(UB, 'p1', 62));
    assert(agg(db, UA).points === P(62) && agg(db, UB).points === P(62), 'ίδια ηλικία → ίδιοι πόντοι');
    assert(agg(db, UA).sumWinningAge === 62 && agg(db, UB).sumWinningAge === 62, 'λάθος sumWinningAge');
  });

  await test('C', 'A age58 → +' + P(58) + ', B age62 → +' + P(62), async function () {
    const db = makeDb({});
    await S.creditPlayerResult({ db }, R(UA, 'p0', 58));
    await S.creditPlayerResult({ db }, R(UB, 'p1', 62));
    assert(agg(db, UA).points === 106 && agg(db, UB).points === 102, 'λάθος: ' + agg(db, UA).points + '/' + agg(db, UB).points);
  });

  await test('D+H', 'τρίτος χωρίς I QUIT → 0 points, 0 wins, +1 gamesPlayed', async function () {
    const db = makeDb({});
    const res = await S.creditPlayerResult({ db }, R(UC, 'p2', null));
    const a = agg(db, UC);
    assert(a.points === 0 && a.wins === 0 && a.sumWinningAge === 0, 'πήρε πόντους/νίκη: ' + JSON.stringify(a));
    assert(a.gamesPlayed === 1, 'λάθος gamesPlayed: ' + a.gamesPlayed);
    assert(a.awards[G].won === false && a.awards[G].awardedPoints === 0, 'λάθος receipt');
    assert(a.awards[G].quitAge === undefined, 'non-winner receipt δεν πρέπει να έχει quitAge');
    assert(res.won === false && res.points === 0, 'λάθος επιστροφή');
  });

  await test('E', '10 retries ίδιου UID/game → aggregates αλλάζουν ΜΙΑ φορά', async function () {
    const db = makeDb({});
    for (let i = 0; i < 10; i++) await S.creditPlayerResult({ db }, R(UA, 'p0', 58));
    const a = agg(db, UA);
    assert(a.points === P(58) && a.wins === 1 && a.gamesPlayed === 1 && a.sumWinningAge === 58,
      'ΔΙΠΛΟΜΕΤΡΗΣΗ μετά από 10 retries: ' + JSON.stringify(a));
    assert(Object.keys(a.awards).length === 1, 'πολλαπλά receipts');
  });

  await test('F+V', 'ίδιο game, διαφορετικά UIDs → ανεξάρτητα receipts, καμία παρεμβολή', async function () {
    const db = makeDb({});
    await S.creditPlayerResult({ db }, R(UA, 'p0', 58));
    await S.creditPlayerResult({ db }, R(UB, 'p1', 62));
    await S.creditPlayerResult({ db }, R(UC, 'p2', null));
    assert(agg(db, UA).awards[G].creditedUid === UA && agg(db, UB).awards[G].creditedUid === UB, 'λάθος receipts');
    assert(agg(db, UA).points === 106 && agg(db, UB).points === 102 && agg(db, UC).points === 0, 'αλληλοεπηρεασμός');
    [UA, UB, UC].forEach((u) => assert(agg(db, u).gamesPlayed === 1, u + ': λάθος gamesPlayed'));
  });

  await test('G', 'winner: gamesPlayed+1, wins+1, sumWinningAge+age, points+score', async function () {
    const db = makeDb({});
    await S.creditPlayerResult({ db }, R(UA, 'p0', 58));
    const a = agg(db, UA);
    assert(a.gamesPlayed === 1 && a.wins === 1 && a.sumWinningAge === 58 && a.points === P(58),
      'λάθος aggregate νικητή: ' + JSON.stringify(a));
    assert(a.awards[G].source === 'result' && a.awards[G].quitAge === 58, 'λάθος receipt shape');
  });

  await test('I', 'bot → κανένα result, άρα καμία διαδρομή προς seasonScores', async function () {
    const db = makeDb({});
    const g = { gameId: G, phase: 'ended', scoreSetup: 'ready', completedAt: AT, seasonId: SEASON,
      players: [{ id: 'p0', isBot: false }, { id: 'p1', isBot: true }],
      rankings: [{ id: 'p0', retiredAge: 58 }, { id: 'p1', retiredAge: 40 }],
      scoreRoster: [{ playerId: 'p0', expectedUid: UA, verifiedUid: UA, verified: true }] };
    const ev = S.evaluatePlayerResults(g);
    assert(ev.results.length === 1 && ev.results[0].uid === UA, 'το bot παρήγαγε result');
    await S.creditResultsFromGameNode({ db }, G, gameNode(ev.results));
    assert(Object.keys(db._get('seasonScores/' + SEASON)).length === 1, 'γράφτηκε aggregate για bot');
  });

  await test('J', 'ineligible (ένας human unverified) → ΚΑΝΕΝΑΣ δεν παίρνει τίποτα', async function () {
    const db = makeDb({});
    const g = { gameId: G, phase: 'ended', scoreSetup: 'ready', completedAt: AT, seasonId: SEASON,
      players: [{ id: 'p0', isBot: false }, { id: 'p1', isBot: false }],
      rankings: [{ id: 'p0', retiredAge: 58 }, { id: 'p1', retiredAge: 62 }],
      scoreRoster: [{ playerId: 'p0', expectedUid: UA, verifiedUid: UA, verified: true },
        { playerId: 'p1', expectedUid: UB, verifiedUid: null, verified: false }] };
    const ev = S.evaluatePlayerResults(g);
    assert(ev.eligible === false && ev.reason === 'human-unverified', 'λάθος eligibility: ' + ev.reason);
    assert(ev.results.length === 0, 'παρήχθησαν results σε ineligible παρτίδα');
    assert(!db._get('seasonScores'), 'γράφτηκε seasonScores');
  });

  await test('K+L', 'verified solo → credited · human + bots → credited', async function () {
    const db = makeDb({});
    const solo = { gameId: G, phase: 'ended', scoreSetup: 'ready', completedAt: AT, seasonId: SEASON,
      players: [{ id: 'p0', isBot: false }], rankings: [{ id: 'p0', retiredAge: 58 }],
      scoreRoster: [{ playerId: 'p0', expectedUid: UA, verifiedUid: UA, verified: true }] };
    assert(S.evaluatePlayerResults(solo).eligible === true, 'solo verified έπρεπε να είναι eligible');
    const withBots = JSON.parse(JSON.stringify(solo));
    withBots.players.push({ id: 'p1', isBot: true });
    withBots.rankings.push({ id: 'p1', retiredAge: 45 });
    const ev = S.evaluatePlayerResults(withBots);
    assert(ev.eligible === true && ev.results.length === 1, 'human + bots έπρεπε να είναι eligible με 1 result');
    await S.creditPlayerResult({ db }, ev.results[0]);
    assert(agg(db, UA).points === P(58), 'ο solo/bots παίκτης δεν πιστώθηκε');
  });

  await test('M+W', 'δεύτερη eligible παρτίδα → gamesPlayed/sumWinningAge σωστά', async function () {
    const db = makeDb({});
    await S.creditPlayerResult({ db }, R(UA, 'p0', 58));
    await S.creditPlayerResult({ db }, R(UA, 'p0', 62, G2));
    const a = agg(db, UA);
    assert(a.gamesPlayed === 2 && a.wins === 2, 'λάθος μετρητές: ' + JSON.stringify(a));
    assert(a.points === P(58) + P(62), 'λάθος άθροισμα πόντων');
    assert(a.sumWinningAge === 58 + 62, 'λάθος sumWinningAge: ' + a.sumWinningAge);
    assert(Object.keys(a.awards).length === 2, 'λάθος πλήθος receipts');
  });

  await test('N', 'reconnect/recovery ίδιου game → κανένα διπλό gamesPlayed', async function () {
    const db = makeDb({});
    await S.creditResultsFromGameNode({ db }, G, gameNode([R(UA, 'p0', 58), R(UB, 'p1', 62), R(UC, 'p2', null)]));
    const again = await S.creditResultsFromGameNode({ db }, G, gameNode([R(UA, 'p0', 58), R(UB, 'p1', 62), R(UC, 'p2', null)]));
    assert(again.credited.length === 0 && again.duplicates.length === 3, 'δεν αναγνωρίστηκε ως duplicate');
    [UA, UB, UC].forEach((u) => assert(agg(db, u).gamesPlayed === 1, u + ': gamesPlayed διπλομετρήθηκε'));
  });

  await test('O', 'υπάρχον ΠΑΛΙΟ award receipt → κανένα duplicate', async function () {
    const oldReceipt = { gameId: G, seasonId: SEASON, winnerUid: UA, winnerPlayerId: 'p0',
      winningAge: 58, awardedPoints: P(58), eligible: true, completedAt: AT, creditedUid: UA, won: true };
    const db = makeDb({ seasonScores: { [SEASON]: { [UA]: {
      points: P(58), wins: 1, gamesPlayed: 1, sumWinningAge: 58, updatedAt: 1, awards: { [G]: oldReceipt } } } } });
    const res = await S.creditPlayerResult({ db }, R(UA, 'p0', 58));
    assert(res.duplicate === true && res.points === 0, 'ξαναπίστωσε παλιό receipt');
    const a = agg(db, UA);
    assert(a.points === P(58) && a.gamesPlayed === 1 && a.awards[G].winnerUid === UA, 'αλλοιώθηκε το παλιό receipt');
  });

  await test('R+S+T', 'άκυρα results απορρίπτονται πριν από κάθε εγγραφή', async function () {
    const db = makeDb({});
    let e1 = null, e2 = null, e3 = null;
    await S.creditPlayerResult({ db }, Object.assign(R(UA, 'p0', 58), { awardedPoints: 999 })).catch((e) => { e1 = e; });
    await S.creditPlayerResult({ db }, Object.assign(R(UA, 'p0', 58), { uid: null })).catch((e) => { e2 = e; });
    await S.creditPlayerResult({ db }, Object.assign(R(UC, 'p2', null), { awardedPoints: 50 })).catch((e) => { e3 = e; });
    assert(e1 && e1.stage === 'player-credit', 'points mismatch δεν απορρίφθηκε');
    assert(e2 && e2.stage === 'player-credit', 'λείπον uid δεν απορρίφθηκε');
    assert(e3 && e3.stage === 'player-credit', 'non-winner με πόντους δεν απορρίφθηκε');
    assert(!db._get('seasonScores'), 'γράφτηκε κάτι παρά τις απορρίψεις');
  });

  await test('U', 'RULES: το receipt δένεται με το αποθηκευμένο result και είναι immutable', function () {
    const v = RULES.seasonScores.$seasonId.$uid.awards.$gameId['.validate'];
    assert(/results'\)\.child\(auth\.uid\)\.child\('awardedPoints'\)\.val\(\) === newData\.child\('awardedPoints'\)/.test(v),
      'το receipt δεν διασταυρώνεται με το results/<uid>');
    assert(/newData\.child\('creditedUid'\)\.val\(\) === auth\.uid/.test(v), 'το creditedUid δεν δένεται στο auth.uid');
    assert(/won'\)\.val\(\) === false && !newData\.child\('quitAge'\)\.exists\(\) && newData\.child\('awardedPoints'\)\.val\(\) === 0/.test(v),
      'won=false δεν επιβάλλει 0 πόντους χωρίς quitAge');
    assert(/winnerUid/.test(v), 'χάθηκε η συμβατότητα με το ΠΑΛΙΟ receipt shape');
    assert(/data\.child\('awardedPoints'\)\.val\(\) === newData\.child\('awardedPoints'\)\.val\(\)/.test(v),
      'χάθηκε ο κανόνας immutability του receipt');
    const w = RULES.seasonScores.$seasonId.$uid['.write'];
    assert(/auth\.uid === \$uid/.test(w), 'χάθηκε το ownership του aggregate');
  });

  await test('X', 'leaderboard aggregate input παραμένει συμβατό', async function () {
    const db = makeDb({});
    await S.creditPlayerResult({ db }, R(UA, 'p0', 58));
    const a = agg(db, UA);
    ['points', 'wins', 'gamesPlayed', 'sumWinningAge', 'updatedAt', 'awards'].forEach((k) =>
      assert(a[k] !== undefined, 'λείπει το πεδίο ' + k + ' που χρησιμοποιεί το leaderboard'));
    assert(typeof a.points === 'number' && typeof a.wins === 'number', 'λάθος τύποι');
  });

  await test('Y', 'αποτυχία εγγραφής scoring δεν σπάει τη ροή (rejected promise, όχι throw)', async function () {
    const db = makeDb({});
    db.ref = () => ({ child: () => db.ref(), once: () => Promise.resolve(node(undefined)),
      transaction: () => Promise.reject(new Error('NETWORK')) });
    let err = null;
    await S.creditPlayerResult({ db }, R(UA, 'p0', 58)).catch((e) => { err = e; });
    assert(err && err.stage === 'player-credit', 'το σφάλμα δεν ταξινομήθηκε: ' + (err && err.message));
    // ο caller μπορεί να συνεχίσει — καμία εξαίρεση δεν διέρρευσε συγχρονισμένα
    const out = await S.creditResultsFromGameNode({ db }, G, gameNode([R(UA, 'p0', 58)]));
    assert(out.skipped.length === 1 && out.credited.length === 0, 'το batch δεν άντεξε την αποτυχία');
  });

  await test('Z', 'STATIC: καμία απευθείας μεταβολή πόντων εκτός του canonical transaction', function () {
    const src = fs.readFileSync(__dirname + '/../js/scoring.js', 'utf8');
    // Μόνο το ΑΠΟΘΗΚΕΥΜΕΝΟ aggregate μετράει· τα «out.points» είναι τοπικοί μετρητές αναφοράς
    // που δεν γράφονται ΠΟΤΕ στη βάση.
    const stored = src.match(/value\.points\s*\+=/g) || [];
    assert(stored.length === 1, 'βρέθηκαν ' + stored.length + ' μεταβολές ΑΠΟΘΗΚΕΥΜΕΝΩΝ πόντων (αναμενόταν 1)');
    const reportOnly = (src.match(/\.points\s*\+=/g) || []).length - stored.length;
    (src.match(/^.*\.points\s*\+=.*$/gm) || []).forEach(function (line) {
      assert(/value\.points \+=/.test(line) || /out\.points \+=/.test(line),
        'μεταβολή πόντων εκτός canonical reducer ή τοπικής αναφοράς: ' + line.trim());
    });
    assert(reportOnly >= 0, 'ασυνεπής μέτρηση');
    const fn = src.slice(src.indexOf('function applyGameTransaction'), src.indexOf('function applyAwardTransaction'));
    assert(/value\.points \+= result\.awardedPoints;/.test(fn), 'η μοναδική μεταβολή δεν είναι στο canonical reducer');
    assert(/function creditPlayerResult/.test(src) && /applyGameTransaction\(current, shim/.test(src),
      'το per-player credit δεν χρησιμοποιεί το canonical reducer');
    // Στο UI επιτρέπεται ΜΟΝΟ άθροιση τοπικής αναφοράς (out.points) για το μήνυμα ανάκτησης —
    // ποτέ μεταβολή αποθηκευμένου aggregate.
    const ui = fs.readFileSync(__dirname + '/../js/ui.js', 'utf8');
    (ui.match(/^.*\.points\s*\+=.*$/gm) || []).forEach(function (line) {
      assert(/out\.points \+=/.test(line), 'μεταβολή αποθηκευμένων πόντων στο UI: ' + line.trim());
    });
    assert(!/seasonScores\/.*points/.test(ui), 'το UI γράφει απευθείας στο seasonScores');
  });

  if (!options.silent) {
    console.log('\n' + (failed === 0 ? '✅' : '❌') + ' Stage 3 per-player crediting: ' + passed + ' passed, ' + failed + ' failed');
  }
  return { passed, failed, results };
}
module.exports = { run };
if (require.main === module) run().then((r) => process.exit(r.failed === 0 ? 0 : 1));
