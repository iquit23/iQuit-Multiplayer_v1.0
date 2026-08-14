/* rules-emulator.test.js — Επίσημα tests του database.rules.json με τον Firebase RTDB Emulator.
   ΔΕΝ τρέχει στο sandbox (το κατέβασμα του emulator JAR μπλοκάρεται) — τρέξε το ΤΟΠΙΚΑ:

     1) Χρειάζεται Java 11+ και Node στον υπολογιστή.
     2) cd 06_online && npm install --no-save firebase-tools @firebase/rules-unit-testing
     3) npx firebase setup:emulators:database
     4) npx firebase emulators:exec --only database --project iquit-online-8d69b \
          "node tests/rules-emulator.test.js"

   Περιμένεις στο τέλος: «RULES TESTS: XX passed, 0 failed».

   ΚΑΛΥΨΗ: δωμάτια (auth, host authority, slots, ουρές, μεγέθη, GC) + ΛΟΓΑΡΙΑΣΜΟΙ:
   verified claim, unverified/anonymous deny, διπλό username, george/George/GEORGE,
   ξένο users/{uid}, ξένο mapping, ξένο uid στο mapping, αυθαίρετα πεδία, email/emailVerified,
   ατομικότητα (καμία ορφανή/μισή εγγραφή), επαναληπτική εγγραφή από τον ίδιο ιδιοκτήτη,
   scoring roster self-proofs, immutable completion και owner-only seasonal aggregates. */
'use strict';
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const fs = require('fs');

let passed = 0, failed = 0;
async function ok(name, p) { try { await p; passed++; console.log('  ✓ ' + name); } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); } }

(async () => {
  const env = await initializeTestEnvironment({
    projectId: 'iquit-online-8d69b',
    database: { rules: fs.readFileSync(__dirname + '/../database.rules.json', 'utf8') },
  });
  const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).database();
  const NOW = () => Date.now();
  const meta = (uid, extra) => Object.assign({ hostUid: uid, hostBeat: NOW(), createdAt: NOW(), hostSeq: 1 }, extra || {});
  // βοηθητικό: γράψιμο ΕΚΤΟΣ rules (στήσιμο σεναρίων, π.χ. μπαγιάτικο hostBeat)
  const raw = (path, val) => env.withSecurityRulesDisabled((c) => c.database().ref(path).set(val));

  console.log('— Πρόσβαση χωρίς authentication');
  await ok('unauthenticated read rooms → DENY', assertFails(db(null).ref('rooms/AAAA/meta').once('value')));
  await ok('unauthenticated write meta → DENY', assertFails(db(null).ref('rooms/AAAA/meta').set(meta('x'))));

  console.log('— Δημιουργία δωματίου');
  await ok('authed host δημιουργεί δωμάτιο (δικό του uid) → ALLOW', assertSucceeds(db('host1').ref('rooms/AAAA/meta').set(meta('host1'))));
  await ok('δημιουργία με ΞΕΝΟ hostUid → DENY', assertFails(db('mallory').ref('rooms/AAAB/meta').set(meta('victim'))));
  await ok('hostBeat στο μακρινό μέλλον → DENY', assertFails(db('h2').ref('rooms/AAAC/meta').set(meta('h2', { hostBeat: NOW() + 3600000 }))));

  console.log('— Θέσεις guests (όριο 4 + host = 5 συνολικά)');
  for (let i = 1; i <= 4; i++) {
    await ok('guest' + i + ' παίρνει slot s' + i + ' → ALLOW', assertSucceeds(db('g' + i).ref('rooms/AAAA/slots/s' + i).set({ uid: 'g' + i, ts: NOW() })));
  }
  await ok('5ος guest: slot s5 ΔΕΝ ΥΠΑΡΧΕΙ δομικά → DENY', assertFails(db('g5').ref('rooms/AAAA/slots/s5').set({ uid: 'g5', ts: NOW() })));
  await ok('κλέψιμο κατειλημμένης θέσης άλλου → DENY', assertFails(db('g9').ref('rooms/AAAA/slots/s1').set({ uid: 'g9', ts: NOW() })));
  await ok('slot με ΞΕΝΟ uid (πλαστοπροσωπία) → DENY', assertFails(db('g9').ref('rooms/AAAA/slots/s1').set({ uid: 'g1', ts: NOW() })));

  console.log('— Διαδοχή host');
  await raw('rooms/BBBB/meta', { hostUid: 'oldhost', hostBeat: NOW() - 60000, createdAt: NOW() - 600000, hostSeq: 1 });
  await raw('rooms/BBBB/slots/s1', { uid: 'member1', ts: NOW() });
  await ok('outsider (χωρίς slot) διεκδικεί stale δωμάτιο → DENY', assertFails(db('outsider').ref('rooms/BBBB/meta').set(meta('outsider', { hostSeq: 2 }))));
  await ok('ΜΕΛΟΣ διεκδικεί μετά από stale hostBeat → ALLOW', assertSucceeds(db('member1').ref('rooms/BBBB/meta').set(meta('member1', { hostSeq: 2 }))));
  await raw('rooms/CCCC/meta', { hostUid: 'livehost', hostBeat: NOW(), createdAt: NOW(), hostSeq: 1 });
  await raw('rooms/CCCC/slots/s1', { uid: 'm2', ts: NOW() });
  await ok('μέλος διεκδικεί δωμάτιο με ΦΡΕΣΚΟ hostBeat → DENY', assertFails(db('m2').ref('rooms/CCCC/meta').set(meta('m2', { hostSeq: 2 }))));

  console.log('— Ουρές μηνυμάτων');
  const msg = (uid, len) => ({ uid, m: 'x'.repeat(len || 100) });
  await ok('μέλος γράφει στο toHost (δικό του uid) → ALLOW', assertSucceeds(db('g1').ref('rooms/AAAA/toHost/m1').set(msg('g1'))));
  await ok('toHost με ΞΕΝΟ uid → DENY', assertFails(db('g1').ref('rooms/AAAA/toHost/m2').set(msg('g2'))));
  await ok('ΜΗ μέλος γράφει στο toHost → DENY', assertFails(db('stranger').ref('rooms/AAAA/toHost/m3').set(msg('stranger'))));
  await ok('υπερμέγεθος toHost (5KB > 4KB) → DENY', assertFails(db('g1').ref('rooms/AAAA/toHost/m4').set(msg('g1', 5000))));
  await ok('host διαβάζει toHost → ALLOW', assertSucceeds(db('host1').ref('rooms/AAAA/toHost').once('value')));
  await ok('guest διαβάζει toHost → DENY', assertFails(db('g1').ref('rooms/AAAA/toHost').once('value')));
  await ok('host γράφει στο inbox guest → ALLOW', assertSucceeds(db('host1').ref('rooms/AAAA/toGuest/g1/w1').set({ m: 'x' })));
  await ok('guest ΔΕΝ γράφει σε inbox ΑΛΛΟΥ guest → DENY', assertFails(db('g2').ref('rooms/AAAA/toGuest/g1/w2').set({ m: 'x' })));
  await ok('guest διαβάζει ΤΟ ΔΙΚΟ ΤΟΥ inbox → ALLOW', assertSucceeds(db('g1').ref('rooms/AAAA/toGuest/g1').once('value')));
  await ok('guest ΔΕΝ διαβάζει inbox άλλου → DENY', assertFails(db('g2').ref('rooms/AAAA/toGuest/g1').once('value')));
  await ok('υπερμέγεθος toGuest (150KB > 120KB) → DENY', assertFails(db('host1').ref('rooms/AAAA/toGuest/g1/w3').set({ m: 'x'.repeat(150000) })));

  console.log('— Broadcasts');
  await ok('host γράφει broadcast → ALLOW', assertSucceeds(db('host1').ref('rooms/AAAA/bcast/b1').set({ m: 'x', ts: NOW() })));
  await ok('guest γράφει broadcast → DENY', assertFails(db('g1').ref('rooms/AAAA/bcast/b2').set({ m: 'x', ts: NOW() })));
  await ok('μέλος διαβάζει broadcasts → ALLOW', assertSucceeds(db('g1').ref('rooms/AAAA/bcast').once('value')));
  await ok('ΜΗ μέλος διαβάζει broadcasts → DENY', assertFails(db('stranger').ref('rooms/AAAA/bcast').once('value')));
  await ok('υπερμέγεθος broadcast (150KB) → DENY', assertFails(db('host1').ref('rooms/AAAA/bcast/b3').set({ m: 'x'.repeat(150000), ts: NOW() })));

  console.log('— Διαγραφή δωματίων');
  await ok('ΞΕΝΟΣ διαγράφει ενεργό δωμάτιο → DENY', assertFails(db('mallory').ref('rooms/AAAA').remove()));
  await raw('rooms/DEAD/meta', { hostUid: 'ghost', hostBeat: NOW() - 90000000, createdAt: NOW() - 90000000, hostSeq: 1 });
  await ok('οποιοσδήποτε authed διαγράφει δωμάτιο νεκρό >24h → ALLOW', assertSucceeds(db('cleaner').ref('rooms/DEAD').remove()));
  await ok('host διαγράφει το ΔΙΚΟ του δωμάτιο → ALLOW', assertSucceeds(db('host1').ref('rooms/AAAA').remove()));

  // ==================================================================================
  // ΛΟΓΑΡΙΑΣΜΟΙ (beta): users/{uid} + usernames/{normalized}
  // Το claim γίνεται ΠΑΝΤΑ ως ΕΝΑ atomic multi-location update — ή γράφονται και τα δύο, ή κανένα.
  // ==================================================================================
  console.log('— Λογαριασμοί: atomic κατοχύρωση username');
  const V = (uid) => env.authenticatedContext(uid, { email_verified: true, email: uid + '@example.invalid' }).database();
  const U = (uid) => env.authenticatedContext(uid, { email_verified: false, email: uid + '@example.invalid' }).database();
  const ANON = (uid) => env.authenticatedContext(uid, { provider_id: 'anonymous' }).database();
  const T = () => Date.now();
  const profile = (name, norm, extra) => Object.assign({ username: name, usernameNormalized: norm, createdAt: T(), updatedAt: T() }, extra || {});
  // ΕΝΑ atomic update: mapping + profile μαζί (ακριβώς ό,τι κάνει το account.js)
  const claim = (db, uid, name, norm, extra) => {
    const up = {};
    up['usernames/' + norm] = uid;
    up['users/' + uid] = profile(name, norm, extra);
    return db.ref().update(up);
  };
  // ΠΡΟΣΟΧΗ: το withSecurityRulesDisabled() επιστρέφει Promise<void> — ΔΕΝ προωθεί την τιμή του
  // callback. Η τιμή πρέπει να «πιαστεί» σε εξωτερική μεταβλητή, αλλιώς παίρνουμε undefined
  // (αυτό προκαλούσε τα «Cannot read properties of undefined (reading 'val')»).
  const readRaw = async (path) => {
    let out;
    await env.withSecurityRulesDisabled(async (c) => { out = (await c.database().ref(path).once('value')).val(); });
    return out === undefined ? null : out;
  };

  // 1) Verified user δημιουργεί το δικό του profile + ελεύθερο username
  await ok('1. verified: atomic claim (profile + username) → ALLOW', assertSucceeds(claim(V('alice'), 'alice', 'Alice_1', 'alice_1')));
  await ok('1β. γράφτηκαν ΚΑΙ ΤΑ ΔΥΟ paths', (async () => {
    const map = await readRaw('usernames/alice_1');
    const name = await readRaw('users/alice/username');
    if (map !== 'alice' || name !== 'Alice_1') throw new Error('λείπει path: map=' + map + ' user=' + name);
  })());

  // 2) Unverified user απορρίπτεται
  await ok('2. unverified: atomic claim → DENY', assertFails(claim(U('bob'), 'bob', 'Bob_1', 'bob_1')));
  await ok('2β. unverified: μόνο profile → DENY', assertFails(U('bob').ref('users/bob').set(profile('Bob_1', 'bob_1'))));
  await ok('2γ. unverified: μόνο mapping → DENY', assertFails(U('bob').ref('usernames/bob_1').set('bob')));

  // 3) Anonymous user απορρίπτεται
  await ok('3. anonymous: atomic claim → DENY', assertFails(claim(ANON('anon1'), 'anon1', 'Anon_1', 'anon_1')));
  await ok('3β. anonymous: ανάγνωση ξένου profile → DENY', assertFails(ANON('anon1').ref('users/alice').once('value')));

  // 4) Δεύτερος uid ΔΕΝ μπορεί να πάρει το ίδιο normalized username
  await ok('4. δεύτερος verified uid στο ΙΔΙΟ username → DENY', assertFails(claim(V('mallory'), 'mallory', 'Alice_1', 'alice_1')));
  await ok('4β. το mapping ΠΑΡΑΜΕΝΕΙ στον αρχικό κάτοχο', (async () => {
    const v = await readRaw('usernames/alice_1');
    if (v !== 'alice') throw new Error('ΚΑΤΑΛΗΨΗ! → ' + v);
  })());
  await ok('4γ. ο αποτυχημένος ΔΕΝ άφησε profile (τίποτα μισό)', (async () => {
    const v = await readRaw('users/mallory');
    if (v !== null) throw new Error('έμεινε μισό profile: ' + JSON.stringify(v));
  })());

  // 5) george / George / GEORGE συγκρούονται (ίδιο normalized → ίδιο κλειδί)
  await ok('5. «George» → george → ALLOW (πρώτος)', assertSucceeds(claim(V('gA'), 'gA', 'George', 'george')));
  await ok('5β. «george» από άλλον → DENY', assertFails(claim(V('gB'), 'gB', 'george', 'george')));
  await ok('5γ. «GEORGE» από τρίτον → DENY', assertFails(claim(V('gC'), 'gC', 'GEORGE', 'george')));

  // 6) Δεν γράφεις στο users/{άλλοUid}
  await ok('6. γραφή σε ΞΕΝΟ users/{uid} → DENY', assertFails(V('mallory').ref('users/alice').set(profile('Hacked', 'alice_1'))));
  await ok('6β. διαγραφή ΞΕΝΟΥ profile → DENY', assertFails(V('mallory').ref('users/alice').remove()));

  // 7) Δεν αλλάζεις το mapping άλλου
  await ok('7. ξαναγραφή ΞΕΝΟΥ mapping (με δικό μου uid) → DENY', assertFails(V('mallory').ref('usernames/alice_1').set('mallory')));
  await ok('7β. διαγραφή ΞΕΝΟΥ mapping → DENY', assertFails(V('mallory').ref('usernames/alice_1').remove()));

  // 8) Δεν γράφεις ΞΕΝΟ uid στο mapping (ακόμη και σε ελεύθερο κλειδί)
  await ok('8. ελεύθερο κλειδί με uid ΑΛΛΟΥ → DENY', assertFails(V('mallory').ref('usernames/free_name').set('alice')));
  await ok('8β. atomic claim με uid άλλου στο mapping → DENY', (async () => {
    const up = { 'usernames/other_name': 'alice', 'users/mallory': profile('Other', 'other_name') };
    await assertFails(V('mallory').ref().update(up));
  })());

  // 9) Αυθαίρετα επιπλέον πεδία απορρίπτονται
  await ok('9. profile με επιπλέον πεδίο (role) → DENY', assertFails(claim(V('carol'), 'carol', 'Carol', 'carol', { role: 'admin' })));
  await ok('9β. profile με επιπλέον πεδίο (score) → DENY', assertFails(claim(V('carol'), 'carol', 'Carol', 'carol', { score: 9999 })));

  // 10) email / emailVerified ΔΕΝ επιτρέπονται στη βάση
  await ok('10. πεδίο email στο profile → DENY', assertFails(claim(V('dave'), 'dave', 'Dave', 'dave', { email: 'dave@example.invalid' })));
  await ok('10β. πεδίο emailVerified στο profile → DENY', assertFails(claim(V('dave'), 'dave', 'Dave', 'dave', { emailVerified: true })));

  // 11) Αποτυχία μέρους → ΤΙΠΟΤΑ δεν γράφεται (ατομικότητα)
  await ok('11. atomic update με ΕΝΑ άκυρο μέρος → DENY συνολικά', (async () => {
    const up = { 'usernames/atomic_x': 'erin', 'users/erin': profile('Erin', 'atomic_x', { hacked: true }) };
    await assertFails(V('erin').ref().update(up));
  })());
  await ok('11β. ΚΑΝΕΝΑ ορφανό mapping μετά την αποτυχία', (async () => {
    const v = await readRaw('usernames/atomic_x');
    if (v !== null) throw new Error('ΟΡΦΑΝΟ mapping: ' + v);
  })());
  await ok('11γ. ΚΑΝΕΝΑ μισό profile μετά την αποτυχία', (async () => {
    const v = await readRaw('users/erin');
    if (v !== null) throw new Error('ΜΙΣΟ profile: ' + JSON.stringify(v));
  })());
  await ok('11δ. profile ΧΩΡΙΣ κατοχυρωμένο mapping → DENY', assertFails(V('frank').ref('users/frank').set(profile('Frank', 'frank_free'))));

  // 12) Επαναληπτική εγγραφή από τον ΙΔΙΟ ιδιοκτήτη δεν καταστρέφει τα δεδομένα του
  await ok('12. ο ίδιος ξαναγράφει το ΔΙΚΟ του claim → ALLOW', assertSucceeds(claim(V('alice'), 'alice', 'Alice_1', 'alice_1')));
  await ok('12β. ο ίδιος ενημερώνει μόνο το profile (mapping υπάρχει ήδη) → ALLOW', assertSucceeds(V('alice').ref('users/alice').set(profile('Alice_1', 'alice_1'))));
  await ok('12γ. τα δεδομένα του παραμένουν ακέραια', (async () => {
    const v = await readRaw('users/alice');
    if (!v || v.username !== 'Alice_1' || v.usernameNormalized !== 'alice_1') throw new Error('κατεστραμμένο: ' + JSON.stringify(v));
    const m = await readRaw('usernames/alice_1');
    if (m !== 'alice') throw new Error('χάθηκε το mapping → ' + m);
  })());
  await ok('12δ. ο ίδιος διαβάζει το προφίλ του → ALLOW', assertSucceeds(V('alice').ref('users/alice').once('value')));
  await ok('12δε. authenticated leaderboard reader διαβάζει μόνο δημόσιο username → ALLOW', assertSucceeds(ANON('leaderboard-reader').ref('users/alice/username').once('value')));
  await ok('12δστ. authenticated leaderboard reader ΔΕΝ διαβάζει ολόκληρο ξένο profile → DENY', assertFails(ANON('leaderboard-reader').ref('users/alice').once('value')));
  await ok('12ε. δεύτερη διαδοχική idempotent επανεγγραφή → ALLOW', assertSucceeds(claim(V('alice'), 'alice', 'Alice_1', 'alice_1')));
  await ok('12στ. ο κάτοχος ΔΕΝ βάζει ΞΕΝΟ uid στο ΔΙΚΟ του mapping → DENY', assertFails(V('alice').ref('usernames/alice_1').set('mallory')));
  await ok('12ζ. τρίτος ΔΕΝ κάνει «idempotent» επανεγγραφή ξένου mapping → DENY', assertFails(V('mallory').ref('usernames/alice_1').set('alice')));
  await ok('12η. ο ίδιος ελευθερώνει το ΔΙΚΟ του username → ALLOW', assertSucceeds(V('gA').ref('usernames/george').remove()));
  await ok('12θ. μετά την απελευθέρωση, το username είναι διαθέσιμο σε ΑΛΛΟΝ → ALLOW', assertSucceeds(claim(V('gB'), 'gB', 'George', 'george')));

  // Επιπλέον έλεγχοι μορφής
  await ok('+ username < 3 χαρακτήρες → DENY', assertFails(claim(V('shorty'), 'shorty', 'ab', 'ab')));
  await ok('+ username > 20 χαρακτήρες → DENY', assertFails(claim(V('longy'), 'longy', 'x'.repeat(21), 'x'.repeat(21))));
  await ok('+ normalized με κεφαλαία → DENY', assertFails(claim(V('caps'), 'caps', 'CapsName', 'CapsName')));
  await ok('+ username με κενό → DENY', assertFails(claim(V('spacey'), 'spacey', 'a b c', 'a b c')));
  await ok('+ createdAt στο μακρινό μέλλον → DENY', assertFails(claim(V('futu'), 'futu', 'Futu', 'futu', { createdAt: Date.now() + 3600000 })));

  // ==================================================================================
  // ΑΥΓΟΥΣΤΟΣ 2.2 SCORING: verified self-proofs + immutable result + owner aggregate
  // ==================================================================================
  console.log('— Scoring: frozen roster, result ledger και seasonal aggregate');
  const GAME = '123e4567-e89b-42d3-a456-426614174000';
  const metaScore = { gameId: GAME, hostUid: 'score-host', roomCode: 'SCOR', transport: 'firebase', humanCount: 2, createdAt: T() };
  await ok('score meta: verified host δημιουργεί immutable game record → ALLOW',
    assertSucceeds(V('score-host').ref('scoreGames/' + GAME + '/meta').set(metaScore)));
  await ok('score meta: δεύτερη δημιουργία ίδιου gameId → DENY',
    assertFails(V('score-host').ref('scoreGames/' + GAME + '/meta').set(metaScore)));
  await ok('score roster: host παγώνει human slots → ALLOW', (async () => {
    await assertSucceeds(V('score-host').ref('scoreGames/' + GAME + '/roster/p0').set({ human: true, expectedUid: 'score-host' }));
    await assertSucceeds(V('score-host').ref('scoreGames/' + GAME + '/roster/p1').set({ human: true, expectedUid: 'score-guest' }));
  })());
  await ok('score roster: guest δεν αλλάζει frozen roster → DENY',
    assertFails(V('score-guest').ref('scoreGames/' + GAME + '/roster/p1').set({ human: true, expectedUid: 'score-guest' })));
  await ok('score proof: verified human αποδεικνύει μόνο το δικό του UID → ALLOW', (async () => {
    await assertSucceeds(V('score-host').ref('scoreGames/' + GAME + '/proofs/p0').set({ uid: 'score-host', verifiedAt: T() }));
    await assertSucceeds(V('score-host').ref('scoreGames/' + GAME + '/participants/score-host').set({ playerId: 'p0' }));
    await assertSucceeds(V('score-guest').ref('scoreGames/' + GAME + '/proofs/p1').set({ uid: 'score-guest', verifiedAt: T() }));
    await assertSucceeds(V('score-guest').ref('scoreGames/' + GAME + '/participants/score-guest').set({ playerId: 'p1' }));
  })());
  await ok('score proof: unverified account → DENY',
    assertFails(U('score-unverified').ref('scoreGames/' + GAME + '/proofs/p1').set({ uid: 'score-unverified', verifiedAt: T() })));
  await ok('score proof: verified UID δεν πλαστοπροσωπεί άλλο UID → DENY',
    assertFails(V('mallory').ref('scoreGames/' + GAME + '/proofs/p1').set({ uid: 'score-guest', verifiedAt: T() })));
  const completion = {
    gameId: GAME, seasonId: '2026-Q3', winnerUid: 'score-guest', winnerPlayerId: 'p1',
    winningAge: 61, awardedPoints: 103, eligible: true, completedAt: T(),
  };
  await ok('score completion: verified participant/host γράφει το result μία φορά → ALLOW',
    assertSucceeds(V('score-host').ref('scoreGames/' + GAME + '/completion').set(completion)));
  await ok('score completion: ίδιο result/gameId δεύτερη φορά → DENY',
    assertFails(V('score-host').ref('scoreGames/' + GAME + '/completion').set(completion)));
  await ok('season aggregate: μόνο ο verified winner ενημερώνει το δικό του row → ALLOW',
    assertSucceeds(V('score-guest').ref('seasonScores/2026-Q3/score-guest').set({
      points: 103, wins: 1, gamesPlayed: 1, sumWinningAge: 61, updatedAt: T(),
      awards: { [GAME]: Object.assign({}, completion, { creditedUid: 'score-guest', won: true }) },
    })));
  await ok('season aggregate: άλλος UID δεν γράφει το row του winner → DENY',
    assertFails(V('mallory').ref('seasonScores/2026-Q3/score-guest').set({
      points: 103, wins: 1, gamesPlayed: 1, sumWinningAge: 61, updatedAt: T(),
      awards: { [GAME]: Object.assign({}, completion, { creditedUid: 'score-guest', won: true }) },
    })));
  await ok('season aggregate: verified non-winner παίρνει μόνο gamesPlayed → ALLOW',
    assertSucceeds(V('score-host').ref('seasonScores/2026-Q3/score-host').set({
      points: 0, wins: 0, gamesPlayed: 1, sumWinningAge: 0, updatedAt: T(),
      awards: { [GAME]: Object.assign({}, completion, { creditedUid: 'score-host', won: false }) },
    })));
  await ok('season aggregate: altered receipt που δεν ταιριάζει με completion → DENY', (async () => {
    const bad = Object.assign({}, completion, { gameId: '223e4567-e89b-42d3-a456-426614174000', awardedPoints: 999, creditedUid: 'score-guest', won: true });
    await assertFails(V('score-guest').ref('seasonScores/2026-Q3/score-guest').set({
      points: 999, wins: 1, gamesPlayed: 1, sumWinningAge: 61, updatedAt: T(), awards: { [bad.gameId]: bad },
    }));
  })());
  // Αύγουστος 2.5 — ΤΟ PRODUCTION BUG: το RTDB transaction γράφει ΟΛΟΚΛΗΡΟ το
  // seasonScores/<uid>, άρα σε ΚΑΘΕ επόμενη παρτίδα της σεζόν τα ΠΡΟΫΠΑΡΧΟΝΤΑ awards
  // ξαναπερνούν από .validate. Με το παλιό «!data.exists()» η 2η νίκη έπαιρνε PERMISSION_DENIED.
  await ok('season aggregate: 2η παρτίδα ίδιας σεζόν ξαναγράφει ΙΔΙΟ παλιό award → ALLOW', (async () => {
    const first = { [GAME]: Object.assign({}, completion, { creditedUid: 'score-host', won: false }) };
    await assertSucceeds(V('score-host').ref('seasonScores/2026-Q3/score-host').set({
      points: 0, wins: 0, gamesPlayed: 1, sumWinningAge: 0, updatedAt: T(), awards: first,
    }));
    // δεύτερη παρτίδα: το payload περιέχει ΚΑΙ το προηγούμενο award, αυτούσιο
    await assertSucceeds(V('score-host').ref('seasonScores/2026-Q3/score-host').set({
      points: 0, wins: 0, gamesPlayed: 2, sumWinningAge: 0, updatedAt: T(), awards: first,
    }));
  })());
  await ok('season aggregate: ΑΛΛΑΓΜΕΝΟ υπάρχον award (πόντοι) → DENY', (async () => {
    const tampered = { [GAME]: Object.assign({}, completion, { creditedUid: 'score-host', won: true, awardedPoints: 999 }) };
    await assertFails(V('score-host').ref('seasonScores/2026-Q3/score-host').set({
      points: 999, wins: 1, gamesPlayed: 2, sumWinningAge: 61, updatedAt: T(), awards: tampered,
    }));
  })());
  await ok('leaderboard: authenticated guest διαβάζει current season aggregates → ALLOW',
    assertSucceeds(ANON('leaderboard-reader').ref('seasonScores/2026-Q3').once('value')));
  await ok('leaderboard: πραγματικά unauthenticated client δεν διαβάζει season aggregates → DENY',
    assertFails(env.unauthenticatedContext().database().ref('seasonScores/2026-Q3').once('value')));

  await env.cleanup();
  console.log('\nRULES TESTS: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('SETUP FAIL:', e.message); process.exit(1); });
