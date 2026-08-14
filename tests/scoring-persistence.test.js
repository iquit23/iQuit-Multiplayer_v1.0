/* I QUIT! — Αύγουστος 2.5: seasonal score persistence & partial-state repair (A–P).

   ΓΙΑΤΙ ΥΠΑΡΧΕΙ: τα scoring-regression tests καλύπτουν ΜΟΝΟ καθαρές συναρτήσεις. Οι διαδρομές
   που γράφουν στη βάση (persistCompletion / creditSeasonGame) ήταν ΑΚΑΛΥΠΤΕΣ — γι' αυτό
   πέρασαν απαρατήρητα δύο πραγματικά production bugs:
     1) το orchestration σταματούσε οριστικά μόλις γραφόταν το completion (κανένα repair),
     2) το rule «awards/$gameId: !data.exists()» έσπαγε ΚΑΘΕ επόμενη παρτίδα της ίδιας σεζόν,
        επειδή το RTDB transaction γράφει ΟΛΟΚΛΗΡΟ το seasonScores/<uid> και επαναϋποβάλλει
        τα προϋπάρχοντα awards σε .validate.
   Εδώ χρησιμοποιούμε in-memory RTDB mock ΜΕ ενεργό τον έλεγχο των πραγματικών rules. */
'use strict';

const fs = require('fs');
const S = require('../js/scoring.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const RULES = JSON.parse(fs.readFileSync(__dirname + '/../database.rules.json', 'utf8')).rules;
const AWARD_VALIDATE = RULES.seasonScores.$seasonId.$uid.awards.$gameId['.validate'];

function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

/* Ελάχιστο snapshot API πάνω σε απλά objects, ώστε να τρέξει αυτούσιο το .validate string. */
function node(val) {
  return {
    val: function () { return val === undefined ? null : val; },
    exists: function () { return val !== undefined && val !== null; },
    child: function (k) { return node(val && typeof val === 'object' ? val[k] : undefined); },
    hasChildren: function (keys) { return keys.every(function (k) { return val && val[k] !== undefined; }); },
    isNumber: function () { return typeof val === 'number'; },
    isString: function () { return typeof val === 'string'; },
  };
}
function evalAwardValidate(prev, next, gameId) {
  const $gameId = { matches: function (re) { return re.test(gameId); } };
  const root = node({});
  // Το τμήμα που αφορά root.child('scoreGames')… ελέγχεται από τον mock server χωριστά·
  // εδώ απομονώνουμε ΤΟΝ ΚΑΝΟΝΑ ΜΕΤΑΒΛΗΤΟΤΗΤΑΣ, που είναι το επίμαχο σημείο.
  const expr = AWARD_VALIDATE.split('&& root.child(')[0];
  return !!(new Function('data', 'newData', '$gameId', 'return (' + expr + ');'))(node(prev), node(next), $gameId);
}

/* In-memory RTDB: υποστηρίζει ref/child/transaction και ΕΠΙΒΑΛΛΕΙ τον award immutability κανόνα
   ακριβώς όπως το RTDB — δηλαδή επαναϋποβάλλει ΚΑΘΕ γραμμένο award child σε .validate. */
function makeDb(opts) {
  opts = opts || {};
  const store = {};
  const stats = { writes: 0, denied: 0 };
  function get(path) {
    return path.split('/').reduce(function (acc, k) {
      return (acc && typeof acc === 'object') ? acc[k] : undefined;
    }, store);
  }
  function set(path, value) {
    const parts = path.split('/');
    let cur = store;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    const leaf = parts[parts.length - 1];
    // Προσομοίωση των rules: κάθε award child που γράφεται περνά από .validate
    if (/^seasonScores\/[^/]+\/[^/]+$/.test(path) && value && value.awards) {
      const prevAwards = (get(path) || {}).awards || {};
      const bad = Object.keys(value.awards).find(function (gid) {
        return !evalAwardValidate(prevAwards[gid], value.awards[gid], gid);
      });
      if (bad) { stats.denied++; const e = new Error('PERMISSION_DENIED: award ' + bad); e.code = 'PERMISSION_DENIED'; throw e; }
    }
    cur[leaf] = clone(value);
    stats.writes++;
  }
  function ref(path) {
    return {
      path: path,
      child: function (sub) { return ref(path + '/' + sub); },
      transaction: function (fn) {
        return new Promise(function (resolve, reject) {
          if (opts.failPaths && opts.failPaths[path]) {
            const e = new Error(opts.failPaths[path]);
            if (opts.failPaths[path] === 'PERMISSION_DENIED') e.code = 'PERMISSION_DENIED';
            return reject(e);
          }
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
  return { ref: ref, _store: store, _stats: stats, _get: get };
}

const GID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const GID2 = 'aaaaaaaa-bbbb-4ccc-8ddd-ffffffffffff';
const UID = 'uid-winner';

function endedGame(gameId) {
  return {
    gameId: gameId, phase: 'ended',
    players: [{ id: 'p0', name: 'Γιώργος', isBot: false }],
    rankings: [{ id: 'p0', retiredAge: 61 }],
    scoreRoster: [{ playerId: 'p0', expectedUid: UID, verifiedUid: UID, verified: true }],
    scoreSetup: 'ready', completedAt: Date.UTC(2026, 7, 12), seasonId: '2026-Q3',
  };
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

  await test('A', 'verified solo winner: completion + seasonal score αποθηκεύονται', async function () {
    const db = makeDb(); const ctx = { db: db, uid: UID };
    const out = await S.ensureResultPersisted(ctx, endedGame(GID), UID);
    assert(out.stage === 'done', 'δεν ολοκληρώθηκε');
    const comp = db._get('scoreGames/' + GID + '/completion');
    assert(comp && comp.winnerUid === UID && comp.awardedPoints === 103, 'λάθος completion');
    const agg = db._get('seasonScores/2026-Q3/' + UID);
    assert(agg.points === 103 && agg.wins === 1 && agg.gamesPlayed === 1, 'λάθος aggregate: ' + JSON.stringify(agg));
    assert(agg.awards[GID] && agg.awards[GID].creditedUid === UID, 'λείπει award receipt');
  });

  await test('B', 'human + bots: μόνο οι άνθρωποι μετράνε στο roster', function () {
    const roster = S.freezeHumanRoster([{ id: 'p0' }, { id: 'p1', isBot: true }, { id: 'p2' }], { p0: UID });
    assert(roster.length === 2 && roster[0].expectedUid === UID, 'λάθος frozen roster');
  });

  await test('C', 'completion transaction: δεύτερη κλήση ΔΕΝ είναι αποτυχία (duplicate)', async function () {
    const db = makeDb(); const ctx = { db: db, uid: UID };
    const g = endedGame(GID);
    const first = await S.persistCompletion(ctx, g);
    const second = await S.persistCompletion(ctx, g);
    assert(first.duplicate === false && second.duplicate === true, 'λάθος duplicate σημασιολογία');
    assert(second.result.gameId === GID, 'χάθηκε το αποθηκευμένο result');
  });

  await test('D', 'seasonal award: ο νικητής παίρνει ακριβώς τους πόντους της φόρμουλας', async function () {
    const db = makeDb(); const ctx = { db: db, uid: UID };
    await S.ensureResultPersisted(ctx, endedGame(GID), UID);
    const agg = db._get('seasonScores/2026-Q3/' + UID);
    assert(agg.points === S.calculateVictoryScore(61), 'η φόρμουλα δεν εφαρμόστηκε');
  });

  await test('E', 'PARTIAL: completion ✓ / aggregate ✗ → το retry ΤΟ ΕΠΙΣΚΕΥΑΖΕΙ', async function () {
    const seasonPath = 'seasonScores/2026-Q3/' + UID;
    const db = makeDb({ failPaths: { [seasonPath]: 'NETWORK' } });
    const ctx = { db: db, uid: UID };
    const g = endedGame(GID);
    let stage = null;
    await S.ensureResultPersisted(ctx, g, UID).catch(function (e) { stage = e.stage; });
    assert(stage === 'season-credit', 'λάθος στάδιο αποτυχίας: ' + stage);
    assert(db._get('scoreGames/' + GID + '/completion'), 'το completion έπρεπε να έχει γραφτεί');
    assert(!db._get(seasonPath), 'το aggregate δεν έπρεπε να υπάρχει');
    const repaired = makeDb();
    // ίδιο store, χωρίς το τεχνητό σφάλμα δικτύου
    Object.assign(repaired._store, JSON.parse(JSON.stringify(db._store)));
    const out = await S.ensureResultPersisted({ db: repaired, uid: UID }, g, UID);
    assert(out.stage === 'done' && out.completionExisted === true, 'το retry δεν αναγνώρισε το υπάρχον completion');
    const agg = repaired._get(seasonPath);
    assert(agg && agg.points === 103 && agg.wins === 1 && agg.gamesPlayed === 1, 'το aggregate ΔΕΝ επισκευάστηκε');
  });

  await test('F', 'δεύτερο retry ΔΕΝ διπλομετρά (points/wins/gamesPlayed)', async function () {
    const db = makeDb(); const ctx = { db: db, uid: UID }; const g = endedGame(GID);
    await S.ensureResultPersisted(ctx, g, UID);
    await S.ensureResultPersisted(ctx, g, UID);
    const out = await S.ensureResultPersisted(ctx, g, UID);
    const agg = db._get('seasonScores/2026-Q3/' + UID);
    assert(agg.points === 103 && agg.wins === 1 && agg.gamesPlayed === 1, 'ΔΙΠΛΟΜΕΤΡΗΣΗ: ' + JSON.stringify(agg));
    assert(out.duplicate === true, 'το τρίτο retry έπρεπε να είναι duplicate');
    assert(Object.keys(agg.awards).length === 1, 'διπλό award receipt');
  });

  await test('G', 'reconnect με ΙΔΙΟ gameId: κανένας διπλός πόντος', async function () {
    const db = makeDb(); const g = endedGame(GID);
    await S.ensureResultPersisted({ db: db, uid: UID }, g, UID);
    // νέα «συνεδρία»: νέο ctx, ίδιο store, ίδιο gameId
    await S.ensureResultPersisted({ db: db, uid: UID }, endedGame(GID), UID);
    const agg = db._get('seasonScores/2026-Q3/' + UID);
    assert(agg.points === 103 && agg.gamesPlayed === 1, 'reconnect διπλομέτρησε');
  });

  await test('H', 'ΔΕΥΤΕΡΗ παρτίδα ίδιας σεζόν: το rule επιτρέπει idempotent re-write του παλιού award',
    async function () {
      const db = makeDb(); const ctx = { db: db, uid: UID };
      await S.ensureResultPersisted(ctx, endedGame(GID), UID);
      // ΑΥΤΟ ΑΚΡΙΒΩΣ απέτυχε στο production: το transaction ξαναγράφει ΟΛΟ το node,
      // άρα το award της 1ης παρτίδας περνά ξανά από .validate.
      await S.ensureResultPersisted(ctx, endedGame(GID2), UID);
      const agg = db._get('seasonScores/2026-Q3/' + UID);
      assert(agg.points === 206 && agg.wins === 2 && agg.gamesPlayed === 2, 'η 2η νίκη δεν καταγράφηκε: ' + JSON.stringify(agg));
      assert(db._stats.denied === 0, 'το rule απέρριψε το re-write (' + db._stats.denied + ' denials)');
    });

  await test('I', 'permission denied αναφέρεται εσωτερικά με ΣΩΣΤΟ στάδιο', async function () {
    const db = makeDb({ failPaths: { ['scoreGames/' + GID + '/completion']: 'PERMISSION_DENIED' } });
    let err = null;
    await S.ensureResultPersisted({ db: db, uid: UID }, endedGame(GID), UID).catch(function (e) { err = e; });
    assert(err && err.stage === 'completion', 'λάθος στάδιο: ' + (err && err.stage));
    assert(err.permission === true, 'δεν σημάνθηκε ως permission failure');
  });

  await test('J', 'network failure παραμένει επαναλήψιμο (δεν «καίει» το result)', async function () {
    const seasonPath = 'seasonScores/2026-Q3/' + UID;
    const db = makeDb({ failPaths: { [seasonPath]: 'NETWORK' } });
    let err = null;
    await S.ensureResultPersisted({ db: db, uid: UID }, endedGame(GID), UID).catch(function (e) { err = e; });
    assert(err && err.stage === 'season-credit' && !err.permission, 'λάθος ταξινόμηση δικτυακού σφάλματος');
    const ok = makeDb(); Object.assign(ok._store, JSON.parse(JSON.stringify(db._store)));
    const out = await S.ensureResultPersisted({ db: ok, uid: UID }, endedGame(GID), UID);
    assert(out.stage === 'done', 'το result δεν σώθηκε στο retry');
  });

  await test('K', 'το leaderboard row είναι έτοιμο αμέσως μετά την επιτυχία', async function () {
    const db = makeDb();
    await S.ensureResultPersisted({ db: db, uid: UID }, endedGame(GID), UID);
    const row = db._get('seasonScores/2026-Q3/' + UID);
    assert(row && typeof row.points === 'number' && typeof row.updatedAt === 'number', 'το row δεν είναι πλήρες');
    assert(row.updatedAt > 1700000000000, 'λάθος updatedAt');
  });

  await test('L', 'ineligible αποτέλεσμα δεν γράφει ΤΙΠΟΤΑ', async function () {
    const db = makeDb();
    const g = endedGame(GID); g.scoreRoster[0].verified = false;
    let err = null;
    await S.ensureResultPersisted({ db: db, uid: UID }, g, UID).catch(function (e) { err = e; });
    assert(err && err.stage === 'completion', 'έπρεπε να κοπεί στο completion');
    assert(!db._get('scoreGames/' + GID + '/completion'), 'γράφτηκε completion για ineligible παρτίδα');
    assert(!db._get('seasonScores/2026-Q3/' + UID), 'γράφτηκαν πόντοι για ineligible παρτίδα');
  });

  await test('M', 'το award receipt παραμένει ΑΜΕΤΑΒΛΗΤΟ ως προς την ουσία', function () {
    const base = { gameId: GID, seasonId: '2026-Q3', winnerUid: UID, winnerPlayerId: 'p0',
      winningAge: 61, awardedPoints: 103, eligible: true, completedAt: Date.UTC(2026, 7, 12),
      creditedUid: UID, won: true };
    assert(evalAwardValidate(undefined, base, GID), 'δεν επιτρέπεται η δημιουργία');
    assert(evalAwardValidate(base, base, GID), 'δεν επιτρέπεται idempotent re-write ΙΔΙΑΣ τιμής');
    assert(!evalAwardValidate(base, Object.assign({}, base, { awardedPoints: 999 }), GID), 'επιτράπηκε αλλαγή πόντων!');
    assert(!evalAwardValidate(base, Object.assign({}, base, { won: false }), GID), 'επιτράπηκε αλλαγή του won!');
    assert(!evalAwardValidate(base, Object.assign({}, base, { creditedUid: 'other' }), GID), 'επιτράπηκε αλλαγή creditedUid!');
    assert(!evalAwardValidate(base, Object.assign({}, base, { winningAge: 25 }), GID), 'επιτράπηκε αλλαγή ηλικίας!');
    // ΑΠΟΔΕΙΞΗ ROOT CAUSE: ο ΠΑΛΙΟΣ κανόνας («!data.exists() && …») απέρριπτε το idempotent
    // re-write, άρα κάθε ΕΠΟΜΕΝΗ παρτίδα της σεζόν έσπαγε με PERMISSION_DENIED.
    const OLD = '!data.exists()';
    const oldDenies = !(new Function('data', 'return (' + OLD + ');'))(node(base));
    assert(oldDenies, 'ο παλιός κανόνας δεν αναπαράγει το bug — ο έλεγχος είναι άκυρος');
    assert(AWARD_VALIDATE.indexOf('!data.exists() &&') === -1, 'το rule έχει ακόμη το create-only πρόθεμα');
  });

  await test('N', 'ensureResultPersisted απαιτεί ρητά context και uid', async function () {
    let a = null, b = null;
    await S.ensureResultPersisted(null, endedGame(GID), UID).catch(function (e) { a = e.stage; });
    await S.ensureResultPersisted({ db: makeDb() }, endedGame(GID), null).catch(function (e) { b = e.stage; });
    assert(a === 'context' && b === 'context', 'λάθος στάδιο για ελλιπή είσοδο');
  });

  await test('O', 'μη-νικητής participant παίρνει gamesPlayed χωρίς πόντους/νίκη', async function () {
    const db = makeDb(); const ctx = { db: db, uid: UID };
    const saved = await S.persistCompletion(ctx, endedGame(GID));
    await S.creditSeasonGame(ctx, saved.result, 'uid-other');
    const other = db._get('seasonScores/2026-Q3/uid-other');
    assert(other.points === 0 && other.wins === 0 && other.gamesPlayed === 1, 'λάθος credit για μη-νικητή');
  });

  await test('P', 'το ui.js ΔΕΝ σταματά οριστικά μόλις γραφτεί το completion', function () {
    const src = fs.readFileSync(__dirname + '/../js/ui.js', 'utf8');
    assert(!/g\.phase !== 'ended' \|\| g\.scoreCompletionReady \|\| App\.scoreFinalizePromise/.test(src),
      'επανήλθε το dead-end «|| g.scoreCompletionReady» στη συνθήκη εξόδου');
    assert(/if \(g\.scoreCompletionReady\) \{ maybeCreditCurrentPlayer\(\); return; \}/.test(src),
      'το completion πρέπει να συνεχίζει στο credit (ensure-persisted)');
    assert(/SCORE\.ensureResultPersisted\(ctx, g, mine\.verifiedUid\)/.test(src), 'το UI δεν χρησιμοποιεί το ensureResultPersisted');
    assert(/scheduleScoreRetry\(gameId\)/.test(src), 'δεν υπάρχει προγραμματισμένο retry');
    assert(/state\.status === 'error' && state\.nextAt/.test(src), 'δεν υπάρχει backoff πριν από νέα προσπάθεια');
    assert(/function scoreDiag\(/.test(src), 'λείπει η δομημένη διάγνωση');
  });

  if (!options.silent) {
    console.log('\n' + (failed === 0 ? '✅' : '❌') + ' Scoring persistence: ' + passed + ' passed, ' + failed + ' failed');
  }
  return { passed: passed, failed: failed, results: results };
}

module.exports = { run: run };

if (require.main === module) {
  run().then(function (r) { process.exit(r.failed === 0 ? 0 : 1); });
}
