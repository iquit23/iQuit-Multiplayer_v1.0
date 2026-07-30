/* rules-emulator.test.js — Επίσημα tests του database.rules.json με τον Firebase RTDB Emulator.
   ΔΕΝ τρέχει στο sandbox (το κατέβασμα του emulator JAR μπλοκάρεται) — τρέξε το ΤΟΠΙΚΑ:

     1) Χρειάζεται Java 11+ και Node στον υπολογιστή.
     2) cd 06_online && npm install --no-save firebase-tools @firebase/rules-unit-testing
     3) npx firebase setup:emulators:database
     4) npx firebase emulators:exec --only database --project iquit-online \
          "node tests/rules-emulator.test.js"

   Περιμένεις στο τέλος: «RULES TESTS: XX passed, 0 failed». */
'use strict';
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const fs = require('fs');

let passed = 0, failed = 0;
async function ok(name, p) { try { await p; passed++; console.log('  ✓ ' + name); } catch (e) { failed++; console.error('  ✗ ' + name + ' — ' + e.message); } }

(async () => {
  const env = await initializeTestEnvironment({
    projectId: 'iquit-online',
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

  await env.cleanup();
  console.log('\nRULES TESTS: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('SETUP FAIL:', e.message); process.exit(1); });
