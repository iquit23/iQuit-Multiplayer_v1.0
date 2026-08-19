/* I QUIT! — Αύγουστος 2.5: recovery detector για χαμένα seasonal awards (A–J).
   Read-only λογική: τι θεωρείται ανακτήσιμο, τι παραλείπεται, τι πάει σε manual review. */
'use strict';

const B = require('../tools/score-backfill.js');
const S = require('../js/scoring.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const G1 = '11111111-2222-4333-8444-555555555555';
const G2 = '66666666-7777-4888-9999-aaaaaaaaaaaa';
const G3 = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
const UID = 'uid-georgios';
const UID2 = 'uid-eleni';
const SEASON = '2026-Q3';

function completion(gameId, uid, age, over) {
  return Object.assign({
    gameId: gameId, seasonId: SEASON, winnerUid: uid, winnerPlayerId: 'p0',
    winningAge: age, awardedPoints: S.calculateVictoryScore(age), eligible: true, completedAt: Date.UTC(2026, 7, 12),
  }, over || {});
}

function game(gameId, uid, age, over) {
  const c = completion(gameId, uid, age, (over || {}).completion);
  return Object.assign({
    meta: { gameId: gameId, hostUid: uid, roomCode: 'ABCD', transport: 'firebase', humanCount: 1, createdAt: 1 },
    roster: { p0: { human: true, expectedUid: uid } },
    proofs: { p0: { uid: uid, verifiedAt: 1 } },
    participants: { [uid]: { playerId: 'p0' } },
    completion: c,
  }, over && over.game ? over.game : {});
}

function receiptFor(c, uid, won) {
  return Object.assign({}, c, { creditedUid: uid, won: won !== false });
}

function snapshot(games, seasonScores, users) {
  return { scoreGames: games || {}, seasonScores: seasonScores || {}, users: users || {} };
}

async function run(options) {
  options = options || {};
  let passed = 0, failed = 0;
  const results = [];
  async function test(letter, name, fn) {
    try {
      await fn();
      passed++; results.push({ letter: letter, name: name, passed: true });
      if (!options.silent) console.log('  ✓ ' + letter + '. ' + name);
    } catch (e) {
      failed++; results.push({ letter: letter, name: name, passed: false, error: e.message });
      if (!options.silent) console.error('  ✗ ' + letter + '. ' + name + ' — ' + e.message);
    }
  }

  await test('A', 'valid completion + λείπει award → ΑΝΑΚΤΗΣΙΜΟ', function () {
    const r = B.detectMissedAwards(snapshot({ [G1]: game(G1, UID, 61) }, {}, { [UID]: { username: 'giorgos' } }));
    assert(r.recoverable.length === 1, 'δεν εντοπίστηκε');
    const x = r.recoverable[0];
    assert(x.gameId === G1 && x.uid === UID && x.username === 'giorgos', 'λάθος στοιχεία');
    assert(x.winningAge === 61 && x.points === 103, 'λάθος πόντοι');
    assert(x.resultingAggregate.points === 103 && x.resultingAggregate.wins === 1 &&
      x.resultingAggregate.gamesPlayed === 1, 'λάθος προεπισκόπηση aggregate');
    assert(r.totals.recoverablePoints === 103, 'λάθος σύνολο');
  });

  await test('B', 'υπάρχον σωστό award → SKIP (ήδη πιστωμένο)', function () {
    const c = completion(G1, UID, 61);
    const r = B.detectMissedAwards(snapshot({ [G1]: game(G1, UID, 61) },
      { [SEASON]: { [UID]: { points: 103, wins: 1, gamesPlayed: 1, sumWinningAge: 61, updatedAt: 1, awards: { [G1]: receiptFor(c, UID) } } } }));
    assert(r.recoverable.length === 0, 'δεν έπρεπε να θεωρηθεί ανακτήσιμο');
    assert(r.alreadyCredited.length === 1, 'δεν καταγράφηκε ως πιστωμένο');
    assert(r.manualReview.length === 0, 'δεν έπρεπε να μπει σε review');
  });

  await test('C', 'idempotency: δεύτερη ανίχνευση μετά την πίστωση δίνει 0 ανακτήσιμα', function () {
    const g = { [G1]: game(G1, UID, 61) };
    const before = B.detectMissedAwards(snapshot(g, {}));
    assert(before.recoverable.length === 1, 'πρώτο πέρασμα λάθος');
    // εφαρμόζουμε ΤΟ ΙΔΙΟ canonical transaction που θα έκανε το apply
    const applied = before.recoverable[0].resultingAggregate;
    const after = B.detectMissedAwards(snapshot(g, { [SEASON]: { [UID]: applied } }));
    assert(after.recoverable.length === 0, 'δεύτερο πέρασμα ξαναπρότεινε πίστωση');
    assert(after.alreadyCredited.length === 1, 'δεν αναγνωρίστηκε ως πιστωμένο');
    // και τρίτο πέρασμα: καμία μεταβολή
    const third = B.detectMissedAwards(snapshot(g, { [SEASON]: { [UID]: applied } }));
    assert(third.totals.recoverablePoints === 0, 'τρίτο πέρασμα πρότεινε πόντους');
  });

  await test('D', 'χωρίς completion → ΔΕΝ είναι χαμένη νίκη (ημιτελής παρτίδα)', function () {
    const g = game(G1, UID, 61); delete g.completion;
    const r = B.detectMissedAwards(snapshot({ [G1]: g }));
    assert(r.recoverable.length === 0 && r.manualReview.length === 0, 'ημιτελής παρτίδα δεν αγνοήθηκε');
    assert(r.totals.completions === 0, 'μετρήθηκε ως completion');
  });

  await test('E', 'ineligible completion → MANUAL REVIEW', function () {
    const r = B.detectMissedAwards(snapshot({ [G1]: game(G1, UID, 61, { completion: { eligible: false } }) }));
    assert(r.recoverable.length === 0, 'ineligible θεωρήθηκε ανακτήσιμο');
    assert(r.manualReview.length === 1 && /eligible/.test(r.manualReview[0].reasons.join()), 'λάθος αιτιολογία');
  });

  await test('F', 'awardedPoints ≠ 164−winningAge → CONFLICT σε manual review', function () {
    const r = B.detectMissedAwards(snapshot({ [G1]: game(G1, UID, 61, { completion: { awardedPoints: 999 } }) }));
    assert(r.recoverable.length === 0, 'πιστώθηκαν λάθος πόντοι');
    assert(/awardedPoints/.test(r.manualReview[0].reasons.join()), 'δεν εντοπίστηκε η ασυμφωνία φόρμουλας');
  });

  await test('G', 'winnerUid που δεν ταιριάζει με το proof → CONFLICT', function () {
    const g = game(G1, UID, 61);
    g.completion.winnerUid = 'uid-impostor';
    const r = B.detectMissedAwards(snapshot({ [G1]: g }));
    assert(r.recoverable.length === 0, 'πιστώθηκε λάθος νικητής');
    assert(/proofs|participants/.test(r.manualReview[0].reasons.join()), 'λάθος αιτιολογία: ' + r.manualReview[0].reasons.join());
  });

  await test('H', 'partial aggregate (υπάρχει row, λείπει το award) → ασφαλής συμπλήρωση', function () {
    const other = completion(G2, UID, 50);
    const existing = { points: 114, wins: 1, gamesPlayed: 1, sumWinningAge: 50, updatedAt: 1, awards: { [G2]: receiptFor(other, UID) } };
    const r = B.detectMissedAwards(snapshot({ [G1]: game(G1, UID, 61), [G2]: game(G2, UID, 50) },
      { [SEASON]: { [UID]: existing } }));
    assert(r.recoverable.length === 1 && r.recoverable[0].gameId === G1, 'λάθος εντοπισμός');
    assert(/awards\//.test(r.recoverable[0].missing), 'δεν αναγνωρίστηκε ως partial');
    const res = r.recoverable[0].resultingAggregate;
    assert(res.points === 217 && res.wins === 2 && res.gamesPlayed === 2, 'λάθος συμπλήρωση: ' + JSON.stringify(res));
    assert(Object.keys(res.awards).length === 2, 'χάθηκε το προηγούμενο award');
  });

  await test('I', 'πολλές χαμένες νίκες ίδιου χρήστη → κάθε μία μετράει ΜΙΑ φορά', function () {
    const r = B.detectMissedAwards(snapshot({ [G1]: game(G1, UID, 61), [G2]: game(G2, UID, 50), [G3]: game(G3, UID2, 40) },
      {}, { [UID]: { username: 'giorgos' }, [UID2]: { username: 'eleni' } }));
    assert(r.recoverable.length === 3, 'λάθος πλήθος');
    const users = B.summariseByUser(r);
    const g = users.find(function (u) { return u.username === 'giorgos'; });
    assert(g.wins === 2 && g.points === S.calculateVictoryScore(61) + S.calculateVictoryScore(50) && g.games.length === 2, 'λάθος σύνοψη: ' + JSON.stringify(g));
    const e = users.find(function (u) { return u.username === 'eleni'; });
    assert(e.wins === 1 && e.points === S.calculateVictoryScore(40), 'λάθος σύνοψη eleni');
    assert(users[0].points >= users[1].points, 'δεν ταξινομήθηκε κατά πόντους');
  });

  await test('J', 'υπάρχον receipt με ΔΙΑΦΟΡΕΤΙΚΑ δεδομένα → CONFLICT, καμία αλλοίωση', function () {
    const c = completion(G1, UID, 61);
    const tampered = Object.assign(receiptFor(c, UID), { awardedPoints: 999 });
    const r = B.detectMissedAwards(snapshot({ [G1]: game(G1, UID, 61) },
      { [SEASON]: { [UID]: { points: 999, wins: 1, gamesPlayed: 1, sumWinningAge: 61, updatedAt: 1, awards: { [G1]: tampered } } } }));
    assert(r.recoverable.length === 0, 'θα ξαναπίστωνε πάνω σε conflicting receipt');
    assert(r.alreadyCredited.length === 0, 'θεωρήθηκε έγκυρο');
    assert(/receipt διαφέρει/.test(r.manualReview[0].reasons.join()), 'δεν σημάνθηκε ως conflict');
  });

  await test('K', 'το φίλτρο σεζόν απομονώνει σωστά την τρέχουσα σεζόν', function () {
    const old = game(G2, UID, 55, { completion: { seasonId: '2026-Q2' } });
    const r = B.detectMissedAwards(snapshot({ [G1]: game(G1, UID, 61), [G2]: old }), { season: SEASON });
    assert(r.recoverable.length === 1 && r.recoverable[0].seasonId === SEASON, 'το φίλτρο δεν λειτούργησε');
  });

  await test('L', 'ο detector δεν εκθέτει ΠΟΤΕ email ή προσωπικά δεδομένα', function () {
    const users = { [UID]: { username: 'giorgos', email: 'secret@example.com', usernameNormalized: 'giorgos' } };
    const r = B.detectMissedAwards(snapshot({ [G1]: game(G1, UID, 61) }, {}, users));
    const dump = JSON.stringify(r);
    assert(dump.indexOf('secret@example.com') === -1 && dump.indexOf('email') === -1, 'διέρρευσε email!');
    assert(r.recoverable[0].username === 'giorgos', 'δεν επιλύθηκε το username');
  });

  await test('M', 'η φόρμουλα χρησιμοποιείται ΜΟΝΟ μέσω της canonical συνάρτησης', function () {
    const fs = require('fs');
    const src = fs.readFileSync(__dirname + '/../tools/score-backfill.js', 'utf8');
    assert(/const inspectCompletion = S\.inspectStoredCompletion;/.test(src),
      'το tool πρέπει να ΑΝΑΘΕΤΕΙ την εγκυρότητα στην canonical συνάρτηση, όχι να την αντιγράφει');
    assert(!/164\s*[-−]\s*c\.winningAge/.test(src), 'βρέθηκε αντιγραμμένη φόρμουλα στο tool');
    assert(/S\.applyGameTransaction\(/.test(src), 'δεν χρησιμοποιεί το canonical transaction');
    assert(!/points\s*\+=\s*\d/.test(src), 'βρέθηκε χειροποίητη αριθμητική πόντων');
    assert(/apply.{0,400}δεν εκτελείται/s.test(src) || /Το --apply δεν εκτελείται/.test(src), 'το apply δεν είναι φραγμένο');
  });

  if (!options.silent) {
    console.log('\n' + (failed === 0 ? '✅' : '❌') + ' Score backfill detector: ' + passed + ' passed, ' + failed + ' failed');
  }
  return { passed: passed, failed: failed, results: results };
}

module.exports = { run: run };

if (require.main === module) {
  run().then(function (r) { process.exit(r.failed === 0 ? 0 : 1); });
}
