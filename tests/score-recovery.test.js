/* I QUIT! — Αύγουστος 2.5: in-app self-repair παλιών, μη πιστωμένων νικών (A–N).
   Ο συνδεδεμένος verified χρήστης ανακτά ΜΟΝΟ δικά του results, ΜΟΝΟ με authoritative
   evidence, μέσω της ΙΔΙΑΣ canonical creditSeasonGame — καμία δεύτερη υλοποίηση. */
'use strict';

const fs = require('fs');
const S = require('../js/scoring.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const RULES = JSON.parse(fs.readFileSync(__dirname + '/../database.rules.json', 'utf8')).rules;

function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function node(val) {
  return {
    val: function () { return val === undefined ? null : val; },
    exists: function () { return val !== undefined && val !== null; },
    child: function (k) { return node(val && typeof val === 'object' ? val[k] : undefined); },
  };
}

/* In-memory RTDB με ΕΠΙΒΟΛΗ του ιδιοκτησιακού κανόνα: γράφω μόνο στο seasonScores/<δικό μου uid>. */
function makeDb(store, opts) {
  opts = opts || {};
  const data = clone(store) || {};
  const stats = { denied: 0, reads: 0 };
  function get(path) {
    return path.split('/').reduce(function (a, k) { return (a && typeof a === 'object') ? a[k] : undefined; }, data);
  }
  function set(path, value) {
    const parts = path.split('/');
    let cur = data;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    // Rule: seasonScores/$seasonId/$uid → auth.uid === $uid
    const m = /^seasonScores\/([^/]+)\/([^/]+)$/.exec(path);
    if (m && opts.authUid && m[2] !== opts.authUid) {
      stats.denied++;
      const e = new Error('PERMISSION_DENIED'); e.code = 'PERMISSION_DENIED'; throw e;
    }
    cur[parts[parts.length - 1]] = clone(value);
  }
  function ref(path) {
    return {
      path: path,
      child: function (sub) { return ref(path + '/' + sub); },
      once: function () {
        stats.reads++;
        if (opts.failReads && opts.failReads[path]) return Promise.reject(new Error(opts.failReads[path]));
        return Promise.resolve(node(get(path)));
      },
      transaction: function (fn) {
        return new Promise(function (resolve, reject) {
          if (opts.failPaths && opts.failPaths[path]) return reject(new Error(opts.failPaths[path]));
          const current = get(path);
          let next;
          try { next = fn(current === undefined ? null : clone(current)); } catch (e) { return reject(e); }
          if (next === undefined) return resolve({ committed: false, snapshot: node(current) });
          try { set(path, next); } catch (e) { return reject(e); }
          resolve({ committed: true, snapshot: node(get(path)) });
        });
      },
    };
  }
  return { ref: ref, _get: get, _data: data, _stats: stats };
}

const G1 = '11111111-2222-4333-8444-555555555555';
const G2 = '66666666-7777-4888-9999-aaaaaaaaaaaa';
const G3 = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
const ME = 'uid-me';
const OTHER = 'uid-other';
const SEASON = '2026-Q3';

function completion(gameId, uid, age, over) {
  return Object.assign({
    gameId: gameId, seasonId: SEASON, winnerUid: uid, winnerPlayerId: 'p0',
    winningAge: age, awardedPoints: 164 - age, eligible: true, completedAt: Date.UTC(2026, 7, 12),
  }, over || {});
}
function scoreGame(gameId, uid, age, over) {
  return {
    meta: { gameId: gameId, hostUid: uid, roomCode: 'ABCD', transport: 'firebase', humanCount: 1, createdAt: 1 },
    roster: { p0: { human: true, expectedUid: uid } },
    proofs: { p0: { uid: uid, verifiedAt: 1 } },
    participants: { [uid]: { playerId: 'p0' } },
    completion: completion(gameId, uid, age, over),
  };
}
function world(games, seasonScores, index) {
  return { scoreGames: games || {}, seasonScores: seasonScores || {}, userGames: index || {} };
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

  await test('A', 'verified χρήστης + έγκυρη χαμένη νίκη → ΑΝΑΚΤΑΤΑΙ', async function () {
    const db = makeDb(world({ [G1]: scoreGame(G1, ME, 61) }), { authUid: ME });
    const out = await S.recoverMissedAwards({ db: db, uid: ME }, ME, [G1]);
    assert(out.recovered.length === 1 && out.points === 103 && out.wins === 1, 'δεν ανακτήθηκε: ' + JSON.stringify(out));
    const agg = db._get('seasonScores/' + SEASON + '/' + ME);
    assert(agg.points === 103 && agg.wins === 1 && agg.gamesPlayed === 1, 'λάθος aggregate');
    assert(agg.awards[G1].creditedUid === ME, 'λείπει receipt');
  });

  await test('B', 'ήδη πιστωμένο → ΚΑΜΙΑ αλλαγή', async function () {
    const credited = { points: 103, wins: 1, gamesPlayed: 1, sumWinningAge: 61, updatedAt: 1,
      awards: { [G1]: Object.assign(completion(G1, ME, 61), { creditedUid: ME, won: true }) } };
    const db = makeDb(world({ [G1]: scoreGame(G1, ME, 61) }, { [SEASON]: { [ME]: credited } }), { authUid: ME });
    const out = await S.recoverMissedAwards({ db: db, uid: ME }, ME, [G1]);
    assert(out.recovered.length === 0 && out.points === 0, 'ξαναπίστωσε');
    assert(out.skipped[0].reason === 'already-credited', 'λάθος αιτιολογία');
    const agg = db._get('seasonScores/' + SEASON + '/' + ME);
    assert(agg.points === 103 && agg.gamesPlayed === 1, 'αλλοιώθηκε το aggregate');
  });

  await test('C', 'δεύτερη εκτέλεση → ΜΗΔΕΝ διπλοί πόντοι', async function () {
    const db = makeDb(world({ [G1]: scoreGame(G1, ME, 61) }), { authUid: ME });
    const ctx = { db: db, uid: ME };
    await S.recoverMissedAwards(ctx, ME, [G1]);
    const second = await S.recoverMissedAwards(ctx, ME, [G1]);
    const third = await S.recoverMissedAwards(ctx, ME, [G1]);
    assert(second.points === 0 && third.points === 0, 'δεύτερη/τρίτη εκτέλεση πίστωσε ξανά');
    const agg = db._get('seasonScores/' + SEASON + '/' + ME);
    assert(agg.points === 103 && agg.wins === 1 && agg.gamesPlayed === 1, 'ΔΙΠΛΟΜΕΤΡΗΣΗ: ' + JSON.stringify(agg));
  });

  await test('D', 'δύο χαμένες νίκες → και οι δύο ανακτώνται ακριβώς μία φορά', async function () {
    const db = makeDb(world({ [G1]: scoreGame(G1, ME, 61), [G2]: scoreGame(G2, ME, 50) }), { authUid: ME });
    const out = await S.recoverMissedAwards({ db: db, uid: ME }, ME, [G1, G2]);
    assert(out.recovered.length === 2 && out.points === 103 + 114 && out.wins === 2, 'λάθος: ' + JSON.stringify(out));
    const agg = db._get('seasonScores/' + SEASON + '/' + ME);
    assert(agg.points === 217 && agg.wins === 2 && agg.gamesPlayed === 2, 'λάθος aggregate: ' + JSON.stringify(agg));
    assert(Object.keys(agg.awards).length === 2, 'λάθος πλήθος receipts');
  });

  await test('E', 'completion ΑΛΛΟΥ χρήστη → αγνοείται (καμία εγγραφή)', async function () {
    const db = makeDb(world({ [G3]: scoreGame(G3, OTHER, 40) }), { authUid: ME });
    const out = await S.recoverMissedAwards({ db: db, uid: ME }, ME, [G3]);
    assert(out.recovered.length === 0 && out.points === 0, 'ανακτήθηκε ξένο σκορ!');
    assert(out.skipped[0].reason === 'not-winner', 'λάθος αιτιολογία: ' + out.skipped[0].reason);
    assert(!db._get('seasonScores/' + SEASON + '/' + OTHER), 'γράφτηκε στο aggregate άλλου χρήστη');
    assert(!db._get('seasonScores/' + SEASON + '/' + ME), 'γράφτηκε δικό μου aggregate για ξένη νίκη');
  });

  await test('F', 'awardedPoints ≠ 164−age → παραλείπεται', async function () {
    const db = makeDb(world({ [G1]: scoreGame(G1, ME, 61, { awardedPoints: 999 }) }), { authUid: ME });
    const out = await S.recoverMissedAwards({ db: db, uid: ME }, ME, [G1]);
    assert(out.recovered.length === 0, 'πιστώθηκαν λάθος πόντοι');
    assert(/awardedPoints/.test(out.skipped[0].reason), 'λάθος αιτιολογία');
    assert(!db._get('seasonScores/' + SEASON + '/' + ME), 'γράφτηκε aggregate');
  });

  await test('G', 'ineligible result → παραλείπεται', async function () {
    const db = makeDb(world({ [G1]: scoreGame(G1, ME, 61, { eligible: false }) }), { authUid: ME });
    const out = await S.recoverMissedAwards({ db: db, uid: ME }, ME, [G1]);
    assert(out.recovered.length === 0 && /eligible/.test(out.skipped[0].reason), 'ineligible ανακτήθηκε');
  });

  await test('H', 'conflicting receipt → CONFLICT, καμία αλλοίωση', async function () {
    const tampered = Object.assign(completion(G1, ME, 61), { creditedUid: ME, won: true, awardedPoints: 999 });
    const agg = { points: 999, wins: 1, gamesPlayed: 1, sumWinningAge: 61, updatedAt: 1, awards: { [G1]: tampered } };
    const db = makeDb(world({ [G1]: scoreGame(G1, ME, 61) }, { [SEASON]: { [ME]: agg } }), { authUid: ME });
    const out = await S.recoverMissedAwards({ db: db, uid: ME }, ME, [G1]);
    assert(out.recovered.length === 0 && out.conflicts.length === 1, 'δεν σημάνθηκε conflict');
    assert(/receipt-mismatch/.test(out.conflicts[0].reason), 'λάθος αιτιολογία');
    assert(db._get('seasonScores/' + SEASON + '/' + ME).points === 999, 'αλλοιώθηκαν τα υπάρχοντα δεδομένα');
  });

  await test('I', 'network failure → επαναλήψιμο, δεν σπάει η ροή', async function () {
    const w = world({ [G1]: scoreGame(G1, ME, 61) });
    const bad = makeDb(w, { authUid: ME, failReads: { ['scoreGames/' + G1]: 'NETWORK' } });
    const out = await S.recoverMissedAwards({ db: bad, uid: ME }, ME, [G1]);
    assert(out.errors === 1 && out.recovered.length === 0, 'το σφάλμα δεν καταγράφηκε σωστά');
    assert(Array.isArray(out.skipped) && /error:/.test(out.skipped[0].reason), 'λάθος διάγνωση');
    // δεύτερη προσπάθεια χωρίς σφάλμα: ανακτάται κανονικά
    const good = makeDb(w, { authUid: ME });
    const retry = await S.recoverMissedAwards({ db: good, uid: ME }, ME, [G1]);
    assert(retry.recovered.length === 1 && retry.points === 103, 'το retry απέτυχε');
  });

  await test('J', 'το leaderboard row ενημερώνεται αμέσως μετά την ανάκτηση', async function () {
    const db = makeDb(world({ [G1]: scoreGame(G1, ME, 61) }), { authUid: ME });
    await S.recoverMissedAwards({ db: db, uid: ME }, ME, [G1]);
    const row = db._get('seasonScores/' + SEASON + '/' + ME);
    assert(row && row.points === 103 && typeof row.updatedAt === 'number' && row.updatedAt > 1700000000000,
      'το row δεν είναι έτοιμο για το leaderboard');
  });

  await test('K', 'bounded season window: παλιά σεζόν εκτός εύρους παραλείπεται', async function () {
    const old = scoreGame(G2, ME, 50, { seasonId: '2025-Q1' });
    const db = makeDb(world({ [G1]: scoreGame(G1, ME, 61), [G2]: old }), { authUid: ME });
    const out = await S.recoverMissedAwards({ db: db, uid: ME }, ME, [G1, G2], { seasons: [SEASON, '2026-Q2'] });
    assert(out.recovered.length === 1 && out.recovered[0].gameId === G1, 'το φίλτρο σεζόν δεν λειτούργησε');
    assert(out.skipped.some(function (x) { return x.reason === 'out-of-range-season'; }), 'λάθος αιτιολογία');
    // …αλλά ΤΡΕΧΟΥΣΑ + ΠΡΟΗΓΟΥΜΕΝΗ επιτρέπονται
    const seasons = S.recentSeasonIds(Date.UTC(2026, 7, 12), 1);
    assert(seasons.length === 2 && seasons[0] === '2026-Q3' && seasons[1] === '2026-Q2', 'λάθος παράθυρο: ' + seasons);
  });

  await test('L', 'ο index είναι per-user και bounded', async function () {
    const idx = {}; for (let i = 0; i < 60; i++) idx['g' + i] = i;
    idx[G1] = 5; idx[G2] = 9;
    const db = makeDb(world({}, {}, { [ME]: idx, [OTHER]: { [G3]: 1 } }), { authUid: ME });
    const ids = await S.listUserGameIds({ db: db, uid: ME }, ME, 40);
    assert(ids.length === 2, 'πέρασαν μη έγκυρα gameIds: ' + ids.length);
    assert(ids[0] === G2 && ids[1] === G1, 'δεν ταξινομήθηκε με τα πιο πρόσφατα πρώτα');
    const capped = await S.listUserGameIds({ db: db, uid: ME }, ME, 500);
    assert(capped.length <= 100, 'το όριο δεν επιβλήθηκε');
  });

  await test('M', 'RULES: γράφω μόνο στο ΔΙΚΟ μου seasonScores· ο index είναι ιδιωτικός', function () {
    const w = RULES.seasonScores.$seasonId.$uid['.write'];
    assert(/auth\.uid === \$uid/.test(w), 'λείπει ο έλεγχος ιδιοκτησίας στο seasonScores');
    assert(/email_verified === true/.test(w), 'λείπει ο έλεγχος verified');
    const ug = RULES.userGames && RULES.userGames.$uid;
    assert(ug, 'δεν προστέθηκε ο index');
    assert(ug['.read'] === 'auth != null && auth.uid === $uid', 'ο index ΔΕΝ είναι ιδιωτικός: ' + ug['.read']);
    const uw = ug.$gameId['.write'];
    assert(/auth\.uid === \$uid/.test(uw), 'ο index γράφεται από τρίτους');
    assert(/email_verified === true/.test(uw), 'ο index γράφεται από unverified');
    assert(/!data\.exists\(\)/.test(uw), 'ο index δεν είναι create-only');
    assert(/participants'\)\.child\(auth\.uid\)\.exists\(\)/.test(uw), 'ο index γράφεται χωρίς αποδεδειγμένη συμμετοχή');
  });

  await test('N', 'ΚΑΝΕΝΑ broad read: το scoreGames δεν έγινε enumerable', function () {
    assert(!RULES.scoreGames['.read'], 'προστέθηκε read στο scoreGames root — enumeration!');
    assert(Object.keys(RULES.scoreGames).join() === '$gameId', 'άλλαξε η δομή του scoreGames');
    assert(RULES.scoreGames.$gameId['.read'] === "auth != null && auth.token.email_verified === true",
      'άλλαξε το per-game read');
    const src = fs.readFileSync(__dirname + '/../js/ui.js', 'utf8');
    assert(/SCORE\.recoverMissedAwards\(/.test(src), 'το UI δεν καλεί το canonical recovery');
    assert(/App\.scoreRecoveryDone/.test(src), 'δεν υπάρχει guard «μία φορά ανά session»');
    assert(/scoreRecovered1?'/.test(src), 'λείπει το μήνυμα ανάκτησης');
  });

  /* ---------- LEGACY SEEDING (A–O) ---------- */

  await test('LA', 'legacy: έγκυρο game του ΤΡΕΧΟΝΤΟΣ νικητή → seed + recover', async function () {
    const db = makeDb(world({ [G1]: scoreGame(G1, ME, 61) }), { authUid: ME });
    const row = await S.seedLegacyGameForCurrentUser({ db: db, uid: ME }, ME, G1);
    assert(row.action === 'RECOVERED' && row.recoveredPoints === 103, 'δεν ανακτήθηκε: ' + JSON.stringify(row));
    assert(db._get('userGames/' + ME + '/' + G1), 'δεν γράφτηκε index entry');
    const agg = db._get('seasonScores/' + SEASON + '/' + ME);
    assert(agg.points === 103 && agg.wins === 1 && agg.gamesPlayed === 1, 'λάθος aggregate');
  });

  await test('LB', 'legacy: δεύτερη φορά ΙΔΙΟ game → no-op', async function () {
    const db = makeDb(world({ [G1]: scoreGame(G1, ME, 61) }), { authUid: ME });
    const ctx = { db: db, uid: ME };
    await S.seedLegacyGameForCurrentUser(ctx, ME, G1);
    const second = await S.seedLegacyGameForCurrentUser(ctx, ME, G1);
    assert(second.action === 'ALREADY_CREDITED', 'δεύτερη εκτέλεση δεν ήταν no-op: ' + second.action);
    const agg = db._get('seasonScores/' + SEASON + '/' + ME);
    assert(agg.points === 103 && agg.wins === 1 && agg.gamesPlayed === 1, 'ΔΙΠΛΟΜΕΤΡΗΣΗ: ' + JSON.stringify(agg));
  });

  await test('LC', 'legacy: ήδη πιστωμένο → κανένα duplicate', async function () {
    const credited = { points: 103, wins: 1, gamesPlayed: 1, sumWinningAge: 61, updatedAt: 1,
      awards: { [G1]: Object.assign(completion(G1, ME, 61), { creditedUid: ME, won: true }) } };
    const db = makeDb(world({ [G1]: scoreGame(G1, ME, 61) }, { [SEASON]: { [ME]: credited } }), { authUid: ME });
    const row = await S.seedLegacyGameForCurrentUser({ db: db, uid: ME }, ME, G1);
    assert(row.action === 'ALREADY_CREDITED' && row.hasAward === true, 'λάθος action: ' + row.action);
    assert(db._get('seasonScores/' + SEASON + '/' + ME).points === 103, 'άλλαξαν οι πόντοι');
  });

  await test('LD', 'legacy: game ΑΛΛΟΥ UID → απορρίπτεται, καμία εγγραφή', async function () {
    const db = makeDb(world({ [G3]: scoreGame(G3, OTHER, 40) }), { authUid: ME });
    const row = await S.seedLegacyGameForCurrentUser({ db: db, uid: ME }, ME, G3);
    assert(row.action === 'SKIP' && row.reason === 'not-winner', 'δεν απορρίφθηκε: ' + JSON.stringify(row));
    assert(!db._get('userGames/' + ME + '/' + G3), 'γράφτηκε index για ξένο game!');
    assert(!db._get('seasonScores/' + SEASON + '/' + ME), 'γράφτηκε aggregate');
  });

  await test('LE', 'legacy: ineligible → απορρίπτεται', async function () {
    const db = makeDb(world({ [G1]: scoreGame(G1, ME, 61, { eligible: false }) }), { authUid: ME });
    const row = await S.seedLegacyGameForCurrentUser({ db: db, uid: ME }, ME, G1);
    assert(row.action === 'CONFLICT' && /eligible/.test(row.reason), 'λάθος: ' + JSON.stringify(row));
    assert(!db._get('userGames/' + ME + '/' + G1), 'γράφτηκε index');
  });

  await test('LF', 'legacy: awardedPoints ≠ 164−age → απορρίπτεται', async function () {
    const db = makeDb(world({ [G1]: scoreGame(G1, ME, 61, { awardedPoints: 999 }) }), { authUid: ME });
    const row = await S.seedLegacyGameForCurrentUser({ db: db, uid: ME }, ME, G1);
    assert(row.action === 'CONFLICT' && /awardedPoints/.test(row.reason), 'λάθος: ' + JSON.stringify(row));
    assert(!db._get('seasonScores/' + SEASON + '/' + ME), 'πιστώθηκαν λάθος πόντοι');
  });

  await test('LG', 'legacy: conflicting receipt → CONFLICT χωρίς αλλοίωση', async function () {
    const tampered = Object.assign(completion(G1, ME, 61), { creditedUid: ME, won: true, awardedPoints: 999 });
    const agg = { points: 999, wins: 1, gamesPlayed: 1, sumWinningAge: 61, updatedAt: 1, awards: { [G1]: tampered } };
    const db = makeDb(world({ [G1]: scoreGame(G1, ME, 61) }, { [SEASON]: { [ME]: agg } }), { authUid: ME });
    const row = await S.seedLegacyGameForCurrentUser({ db: db, uid: ME }, ME, G1);
    assert(row.action === 'CONFLICT' && /receipt-mismatch/.test(row.reason), 'λάθος: ' + JSON.stringify(row));
    assert(db._get('seasonScores/' + SEASON + '/' + ME).points === 999, 'αλλοιώθηκαν δεδομένα');
  });

  await test('LH', 'legacy: άκυρο gameId → απορρίπτεται πριν από κάθε read', async function () {
    const db = makeDb(world({}), { authUid: ME });
    const row = await S.seedLegacyGameForCurrentUser({ db: db, uid: ME }, ME, 'not-a-uuid');
    assert(row.action === 'SKIP' && row.reason === 'invalid-gameId', 'λάθος: ' + JSON.stringify(row));
    assert(db._stats.reads === 0, 'έγιναν reads για άκυρο gameId');
  });

  await test('LI', 'legacy: game χωρίς completion/proof → απορρίπτεται', async function () {
    const noComp = scoreGame(G1, ME, 61); delete noComp.completion;
    const noProof = scoreGame(G2, ME, 50); delete noProof.proofs;
    const db = makeDb(world({ [G1]: noComp, [G2]: noProof }), { authUid: ME });
    const a = await S.seedLegacyGameForCurrentUser({ db: db, uid: ME }, ME, G1);
    const b = await S.seedLegacyGameForCurrentUser({ db: db, uid: ME }, ME, G2);
    assert(a.action === 'SKIP' && a.reason === 'no-completion', 'λάθος για no-completion');
    assert(b.action === 'CONFLICT' && /proof/.test(b.reason), 'λάθος για missing proof: ' + b.reason);
    assert(!db._get('seasonScores/' + SEASON + '/' + ME), 'γράφτηκαν πόντοι');
  });

  await test('LJ', 'legacy batch: 2 έγκυρα + 1 άκυρο → ανακτώνται μόνο τα 2', async function () {
    const db = makeDb(world({
      [G1]: scoreGame(G1, ME, 61), [G2]: scoreGame(G2, ME, 50), [G3]: scoreGame(G3, OTHER, 40),
    }), { authUid: ME });
    const rep = await S.seedLegacyGamesForCurrentUser({ db: db, uid: ME }, ME, [G1, G2, G3]);
    assert(rep.recovered === 2 && rep.points === 103 + 114, 'λάθος batch: ' + JSON.stringify(rep));
    assert(rep.skipped === 1, 'το ξένο game δεν παραλείφθηκε');
    assert(rep.rows.length === 3, 'λάθος πλήθος γραμμών');
    const agg = db._get('seasonScores/' + SEASON + '/' + ME);
    assert(agg.points === 217 && agg.wins === 2 && agg.gamesPlayed === 2, 'λάθος aggregate: ' + JSON.stringify(agg));
  });

  await test('LK', 'legacy DRY RUN: ΜΗΔΕΝ writes, πλήρες σχέδιο', async function () {
    const db = makeDb(world({ [G1]: scoreGame(G1, ME, 61), [G3]: scoreGame(G3, OTHER, 40) }), { authUid: ME });
    const rep = await S.seedLegacyGamesForCurrentUser({ db: db, uid: ME }, ME, [G1, G3], { dryRun: true });
    assert(rep.dryRun === true, 'δεν σημάνθηκε ως dry run');
    const r1 = rep.rows.find(function (r) { return r.gameId === G1; });
    assert(r1.action === 'WOULD_SEED' && r1.uidMatch === true && r1.eligible === true, 'λάθος σχέδιο: ' + JSON.stringify(r1));
    assert(r1.winningAge === 61 && r1.awardedPoints === 103 && r1.hasIndex === false && r1.hasAward === false, 'ελλιπές σχέδιο');
    const r3 = rep.rows.find(function (r) { return r.gameId === G3; });
    assert(r3.uidMatch === false && r3.action === 'SKIP', 'το ξένο game δεν σημάνθηκε');
    assert(!db._get('userGames/' + ME + '/' + G1), 'DRY RUN έγραψε index!');
    assert(!db._get('seasonScores/' + SEASON + '/' + ME), 'DRY RUN έγραψε πόντους!');
  });

  await test('LL', 'legacy: μετά από seed+repair, νέο audit δίνει 0 ανακτήσιμα', async function () {
    const db = makeDb(world({ [G1]: scoreGame(G1, ME, 61) }), { authUid: ME });
    const ctx = { db: db, uid: ME };
    await S.seedLegacyGamesForCurrentUser(ctx, ME, [G1]);
    const audit = await S.seedLegacyGamesForCurrentUser(ctx, ME, [G1], { dryRun: true });
    assert(audit.rows[0].action === 'ALREADY_CREDITED', 'το audit βρήκε ξανά ανακτήσιμο: ' + audit.rows[0].action);
    const B = require('../tools/score-backfill.js');
    const det = B.detectMissedAwards({ scoreGames: db._get('scoreGames'), seasonScores: db._get('seasonScores') });
    assert(det.recoverable.length === 0 && det.alreadyCredited.length === 1, 'το offline audit δεν συμφωνεί');
  });

  await test('LM', 'RULES: ο χρήστης δεν γράφει index άλλου UID (ownership)', function () {
    const w = RULES.userGames.$uid.$gameId['.write'];
    assert(/auth\.uid === \$uid/.test(w), 'λείπει ownership στο userGames');
    assert(/participants'\)\.child\(auth\.uid\)\.exists\(\)/.test(w), 'ο index γράφεται χωρίς συμμετοχή');
    // ο mock επιβάλλει το ίδιο για το seasonScores
    assert(/auth\.uid === \$uid/.test(RULES.seasonScores.$seasonId.$uid['.write']), 'λείπει ownership στο seasonScores');
  });

  await test('LN', 'ΚΑΝΕΝΑ broad read/write από το legacy feature', function () {
    assert(!RULES.scoreGames['.read'], 'προστέθηκε read στο scoreGames root');
    assert(!RULES.userGames['.read'], 'προστέθηκε read στο userGames root');
    const src = fs.readFileSync(__dirname + '/../js/ui.js', 'utf8');
    assert(/const RECOVERY_MODE = /.test(src), 'λείπει ο διακόπτης recovery mode');
    assert(/if \(!RECOVERY_MODE\) return;/.test(src), 'το panel δεν είναι φραγμένο');
    assert(/recovery=1/.test(src) && /localhost/.test(src), 'το panel δεν είναι κρυφό/τοπικό');
    assert(/SCORE\.seedLegacyGamesForCurrentUser\(/.test(src), 'το UI δεν χρησιμοποιεί την canonical seed');
    assert(!/points\s*\+=\s*\d/.test(src), 'βρέθηκε χειροποίητη αριθμητική πόντων στο UI');
  });

  await test('LO', 'legacy: το seed ΔΕΝ πιστώνει μόνο του — καλεί την canonical recovery', function () {
    const src = fs.readFileSync(__dirname + '/../js/scoring.js', 'utf8');
    assert(/return recoverMissedAwards\(ctx, uid, \[gameId\]\)/.test(src),
      'το seed πρέπει να αναθέτει την πίστωση στην canonical recovery');
    assert(/row\.action !== 'WOULD_SEED' && row\.action !== 'WOULD_RECOVER'/.test(src),
      'λείπει ο φραγμός πριν από κάθε εγγραφή');
  });

  /* ---------- ΓΝΩΣΤΗ LEGACY ΠΕΡΙΠΤΩΣΗ: ManosMicha (KA–KK) ---------- */

  const MM_UID = 'X7wNB2CKamTO8GeyyKZXoMQs2Q62';
  const MM_GAME = '4964d37c-1309-48be-a8b4-670d6802da63';
  const MM_SEASON = '2026-Q3';
  function mmGame(over) {
    const c = Object.assign({
      gameId: MM_GAME, seasonId: MM_SEASON, winnerUid: MM_UID, winnerPlayerId: 'p0',
      winningAge: 57, awardedPoints: 107, eligible: true, completedAt: Date.UTC(2026, 7, 10),
    }, over || {});
    return {
      meta: { gameId: MM_GAME, hostUid: MM_UID, roomCode: 'ZZZZ', transport: 'firebase', humanCount: 1, createdAt: 1 },
      roster: { p0: { human: true, expectedUid: MM_UID } },
      proofs: { p0: { uid: c.winnerUid, verifiedAt: 1 } },
      participants: { [c.winnerUid]: { playerId: 'p0' } },
      completion: c,
    };
  }
  const mmWorld = function (over, season) { return world({ [MM_GAME]: mmGame(over) }, season || {}); };

  await test('KA', 'ManosMicha: γνωστό legacy game → seed + ανάκτηση +107 αυτόματα', async function () {
    const db = makeDb(mmWorld(), { authUid: MM_UID });
    const out = await S.autoRecoverKnownLegacy({ db: db, uid: MM_UID }, MM_UID);
    assert(out.checked === 1 && out.verified.length === 1, 'δεν επαληθεύτηκε: ' + JSON.stringify(out));
    assert(out.recovered === 1 && out.points === 107, 'λάθος πίστωση: ' + JSON.stringify(out));
    const agg = db._get('seasonScores/' + MM_SEASON + '/' + MM_UID);
    assert(agg.points === 107 && agg.wins === 1 && agg.gamesPlayed === 1, 'λάθος aggregate: ' + JSON.stringify(agg));
    assert(agg.awards[MM_GAME].creditedUid === MM_UID && agg.awards[MM_GAME].won === true, 'λάθος receipt');
    assert(db._get('userGames/' + MM_UID + '/' + MM_GAME), 'δεν γράφτηκε index entry');
  });

  await test('KB', 'ManosMicha: 2ο login → +0', async function () {
    const db = makeDb(mmWorld(), { authUid: MM_UID });
    const ctx = { db: db, uid: MM_UID };
    await S.autoRecoverKnownLegacy(ctx, MM_UID);
    const second = await S.autoRecoverKnownLegacy(ctx, MM_UID);
    assert(second.points === 0 && second.recovered === 0, '2ο login πίστωσε ξανά: ' + JSON.stringify(second));
    const agg = db._get('seasonScores/' + MM_SEASON + '/' + MM_UID);
    assert(agg.points === 107 && agg.wins === 1 && agg.gamesPlayed === 1, 'ΔΙΠΛΟΜΕΤΡΗΣΗ: ' + JSON.stringify(agg));
  });

  await test('KC', 'ManosMicha: 3ο και 10ο login → +0, aggregate σταθερό', async function () {
    const db = makeDb(mmWorld(), { authUid: MM_UID });
    const ctx = { db: db, uid: MM_UID };
    for (let i = 0; i < 10; i++) await S.autoRecoverKnownLegacy(ctx, MM_UID);
    const agg = db._get('seasonScores/' + MM_SEASON + '/' + MM_UID);
    assert(agg.points === 107 && agg.wins === 1 && agg.gamesPlayed === 1, '10 logins διπλομέτρησαν: ' + JSON.stringify(agg));
    assert(Object.keys(agg.awards).length === 1, 'πολλαπλά receipts');
  });

  await test('KD', 'ΑΛΛΟΣ χρήστης δεν μπορεί να χρησιμοποιήσει το mapping', async function () {
    const db = makeDb(mmWorld(), { authUid: ME });
    const out = await S.autoRecoverKnownLegacy({ db: db, uid: ME }, ME);
    assert(out.checked === 0 && out.points === 0, 'το mapping ίσχυσε για άλλο uid: ' + JSON.stringify(out));
    assert(!db._get('seasonScores/' + MM_SEASON + '/' + ME), 'γράφτηκαν πόντοι σε άλλο χρήστη');
    assert(!db._get('seasonScores/' + MM_SEASON + '/' + MM_UID), 'γράφτηκαν πόντοι στον ManosMicha από τρίτον');
  });

  await test('KE', 'winnerUid mismatch στο αποθηκευμένο completion → απόρριψη', async function () {
    const db = makeDb(mmWorld({ winnerUid: 'someone-else' }), { authUid: MM_UID });
    const out = await S.autoRecoverKnownLegacy({ db: db, uid: MM_UID }, MM_UID);
    assert(out.verified.length === 0 && out.points === 0, 'πιστώθηκε παρά το mismatch');
    assert(out.rejected.length === 1, 'δεν καταγράφηκε απόρριψη: ' + JSON.stringify(out));
    assert(!db._get('seasonScores/' + MM_SEASON + '/' + MM_UID), 'γράφτηκαν πόντοι');
  });

  await test('KF', 'points/age mismatch με τον πίνακα → απόρριψη', async function () {
    // Το αποθηκευμένο completion λέει άλλη ηλικία από τον πίνακα (57)
    const db = makeDb(mmWorld({ winningAge: 40, awardedPoints: 124 }), { authUid: MM_UID });
    const out = await S.autoRecoverKnownLegacy({ db: db, uid: MM_UID }, MM_UID);
    assert(out.verified.length === 0 && out.rejected[0].reason === 'stored-completion-mismatch',
      'δεν απορρίφθηκε το mismatch: ' + JSON.stringify(out));
    assert(!db._get('seasonScores/' + MM_SEASON + '/' + MM_UID), 'γράφτηκαν πόντοι');
  });

  await test('KG', 'λείπει completion → ασφαλές skip', async function () {
    const g = mmGame(); delete g.completion;
    const db = makeDb(world({ [MM_GAME]: g }), { authUid: MM_UID });
    const out = await S.autoRecoverKnownLegacy({ db: db, uid: MM_UID }, MM_UID);
    assert(out.verified.length === 0 && out.points === 0, 'πιστώθηκε χωρίς completion');
    assert(out.rejected[0].reason === 'no-completion', 'λάθος αιτιολογία: ' + out.rejected[0].reason);
  });

  await test('KH', 'ήδη πιστωμένο πριν το login → no-op', async function () {
    const receipt = Object.assign({}, mmGame().completion, { creditedUid: MM_UID, won: true });
    const pre = { [MM_SEASON]: { [MM_UID]: { points: 107, wins: 1, gamesPlayed: 1, sumWinningAge: 57, updatedAt: 1, awards: { [MM_GAME]: receipt } } } };
    const db = makeDb(mmWorld(null, pre), { authUid: MM_UID });
    const out = await S.autoRecoverKnownLegacy({ db: db, uid: MM_UID }, MM_UID);
    assert(out.points === 0 && out.recovered === 0, 'ξαναπίστωσε ήδη πιστωμένο');
    const agg = db._get('seasonScores/' + MM_SEASON + '/' + MM_UID);
    assert(agg.points === 107 && agg.wins === 1, 'αλλοιώθηκε το aggregate');
  });

  await test('KI', 'το leaderboard row αντικατοπτρίζει το νέο σύνολο', async function () {
    const pre = { [MM_SEASON]: { [MM_UID]: { points: 50, wins: 1, gamesPlayed: 1, sumWinningAge: 60, updatedAt: 1, awards: { 'other-id': { gameId: 'other-id' } } } } };
    const db = makeDb(mmWorld(null, pre), { authUid: MM_UID });
    await S.autoRecoverKnownLegacy({ db: db, uid: MM_UID }, MM_UID);
    const row = db._get('seasonScores/' + MM_SEASON + '/' + MM_UID);
    assert(row.points === 157 && row.wins === 2 && row.gamesPlayed === 2, 'λάθος σύνολο: ' + JSON.stringify(row));
    assert(typeof row.updatedAt === 'number' && row.updatedAt > 1700000000000, 'λάθος updatedAt');
  });

  await test('KJ', 'network failure → δεν σπάει τίποτα, παραμένει επαναλήψιμο', async function () {
    const bad = makeDb(mmWorld(), { authUid: MM_UID, failReads: { ['scoreGames/' + MM_GAME]: 'NETWORK' } });
    const out = await S.autoRecoverKnownLegacy({ db: bad, uid: MM_UID }, MM_UID);
    assert(out.points === 0 && out.verified.length === 0, 'πιστώθηκε παρά το σφάλμα');
    assert(!bad._get('seasonScores/' + MM_SEASON + '/' + MM_UID), 'γράφτηκαν πόντοι');
    const good = makeDb(mmWorld(), { authUid: MM_UID });
    const retry = await S.autoRecoverKnownLegacy({ db: good, uid: MM_UID }, MM_UID);
    assert(retry.points === 107, 'το retry δεν πέτυχε');
  });

  await test('KK', 'ο πίνακας είναι ρητός, ελάχιστος και αφαιρέσιμος — καμία χειροκίνητη πίστωση', function () {
    const map = S.KNOWN_LEGACY_RECOVERY;
    assert(Array.isArray(map) && map.length === 1, 'ο πίνακας πρέπει να έχει ΜΟΝΟ την επιβεβαιωμένη περίπτωση');
    assert(map[0].uid === MM_UID && map[0].gameId === MM_GAME, 'λάθος εγγραφή');
    assert(map[0].awardedPoints === S.calculateVictoryScore(map[0].winningAge), 'ο πίνακας δεν συμφωνεί με τη φόρμουλα');
    const src = fs.readFileSync(__dirname + '/../js/scoring.js', 'utf8');
    assert(/return seedLegacyGamesForCurrentUser\(ctx, uid, out\.verified, options\)/.test(src),
      'το auto-recovery πρέπει να περνά από το canonical seed → recovery');
    assert(!/points\s*\+=\s*107/.test(src), 'βρέθηκε χειροκίνητη πίστωση 107!');
    const ui = fs.readFileSync(__dirname + '/../js/ui.js', 'utf8');
    assert(/SCORE\.autoRecoverKnownLegacy\(ctx, uid\)/.test(ui), 'το login flow δεν καλεί το auto-recovery');
    assert(!/4964d37c/.test(ui), 'το gameId δεν πρέπει να είναι hardcoded στο UI');
  });

  if (!options.silent) {
    console.log('\n' + (failed === 0 ? '✅' : '❌') + ' Score recovery + legacy + known-legacy: ' + passed + ' passed, ' + failed + ' failed');
  }
  return { passed: passed, failed: failed, results: results };
}

module.exports = { run: run };

if (require.main === module) {
  run().then(function (r) { process.exit(r.failed === 0 ? 0 : 1); });
}
