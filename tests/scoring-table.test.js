/* I QUIT! — Νέος canonical πίνακας ηλικία → πόντοι (O, P + static safety).
   Ο ΡΗΤΟΣ πίνακας είναι η μοναδική πηγή αλήθειας· η έκφραση των Rules επαληθεύεται
   έναντι αυτού για ΚΑΘΕ ηλικία, ώστε client και server να μη μπορούν να αποκλίνουν. */
'use strict';
const fs = require('fs');
const S = require('../js/scoring.js');
function assert(c, m) { if (!c) throw new Error(m); }

const TABLE = {
  25: 170, 26: 169, 27: 168, 28: 167, 29: 166, 30: 165, 31: 164, 32: 163, 33: 162, 34: 161, 35: 160,
  36: 149, 37: 148, 38: 147, 39: 146, 40: 145, 41: 144, 42: 143, 43: 142, 44: 141, 45: 140,
  46: 129, 47: 128, 48: 127, 49: 126, 50: 125, 51: 124, 52: 123, 53: 122, 54: 121, 55: 120,
  56: 108, 57: 107, 58: 106, 59: 105, 60: 104, 61: 103, 62: 102, 63: 101, 64: 100,
};

async function run(options) {
  options = options || {};
  let passed = 0, failed = 0;
  const results = [];
  async function test(letter, name, fn) {
    try { await fn(); passed++; results.push({ letter, name, passed: true });
      if (!options.silent) console.log('  ✓ ' + letter + '. ' + name);
    } catch (e) { failed++; results.push({ letter, name, passed: false, error: e.message });
      if (!options.silent) console.error('  ✗ ' + letter + '. ' + name + ' — ' + e.message); }
  }

  await test('O', 'ακριβή όρια των τεσσάρων ζωνών', function () {
    [[25, 170], [35, 160], [36, 149], [45, 140], [46, 129], [55, 120], [56, 108], [64, 100]]
      .forEach(function (p) {
        assert(S.calculateVictoryScore(p[0]) === p[1],
          'ηλικία ' + p[0] + ' → ' + S.calculateVictoryScore(p[0]) + ', αναμενόταν ' + p[1]);
      });
    assert(S.calculateVictoryScore(65) === 0, 'η ηλικία 65 πρέπει να δίνει 0');
  });

  await test('P', 'ΚΑΘΕ ηλικία 25-64 ταιριάζει ακριβώς με τον πίνακα', function () {
    for (let a = 25; a <= 64; a++) {
      assert(S.calculateVictoryScore(a) === TABLE[a],
        'ηλικία ' + a + ' → ' + S.calculateVictoryScore(a) + ', αναμενόταν ' + TABLE[a]);
    }
    assert(Object.keys(S.VICTORY_POINTS).length === 40, 'ο πίνακας πρέπει να έχει ακριβώς 40 ηλικίες');
  });

  await test('P2', 'εκτός εύρους / άκυρη είσοδος → ασφαλές 0', function () {
    [24, 65, 0, -5, 100, null, undefined, NaN, '58', 58.5].forEach(function (v) {
      assert(S.calculateVictoryScore(v) === 0, 'η τιμή ' + String(v) + ' έπρεπε να δώσει 0');
    });
  });

  await test('P3', 'ο ΠΑΛΙΟΣ τύπος 164−age ΔΕΝ ισχύει πλέον (πλην 56-64)', function () {
    const differ = [];
    for (let a = 25; a <= 64; a++) if (S.calculateVictoryScore(a) !== 164 - a) differ.push(a);
    assert(differ.length === 31, 'αναμένονταν 31 ηλικίες με διαφορά, βρέθηκαν ' + differ.length);
    assert(differ[0] === 25 && differ[differ.length - 1] === 55, 'λάθος εύρος διαφορών');
    for (let a = 56; a <= 64; a++) {
      assert(S.calculateVictoryScore(a) === 164 - a, 'η ζώνη 56-64 έπρεπε να συμπίπτει (ηλικία ' + a + ')');
    }
  });

  await test('P4', 'STATIC: καμία αριθμητική «164 - age» ως canonical φόρμουλα στον κώδικα', function () {
    const src = fs.readFileSync(__dirname + '/../js/scoring.js', 'utf8');
    assert(/const VICTORY_POINTS = \{/.test(src), 'λείπει ο ρητός πίνακας');
    assert(/return VICTORY_POINTS\[winningAge\] \|\| 0;/.test(src), 'η συνάρτηση δεν διαβάζει από τον πίνακα');
    assert(!/return 164 - winningAge/.test(src), 'επανήλθε το αριθμητικό shortcut!');
    const ui = fs.readFileSync(__dirname + '/../js/ui.js', 'utf8');
    assert(!/164\s*-\s*\w*[Aa]ge/.test(ui), 'βρέθηκε αντιγραμμένη φόρμουλα στο UI');
    const lb = fs.readFileSync(__dirname + '/../js/leaderboard.js', 'utf8');
    assert(!/164\s*-\s*\w*[Aa]ge/.test(lb), 'βρέθηκε αντιγραμμένη φόρμουλα στο leaderboard');
  });

  await test('P5', 'RULES ≡ πίνακας: η έκφραση επικύρωσης συμφωνεί σε ΚΑΘΕ ηλικία', function () {
    const rules = JSON.parse(fs.readFileSync(__dirname + '/../database.rules.json', 'utf8')).rules;
    const v = rules.scoreGames.$gameId.completion['.validate'];
    const m = v.match(/newData\.child\('awardedPoints'\)\.val\(\) === \((.*?)\)\)\)\)/);
    assert(m, 'δεν βρέθηκε η έκφραση επικύρωσης πόντων στα Rules');
    const expr = (m[1] + ')))').replace(/newData\.child\('winningAge'\)\.val\(\)/g, 'age');
    const evalRule = new Function('age', 'return (' + expr + ');');
    for (let a = 25; a <= 64; a++) {
      assert(evalRule(a) === S.calculateVictoryScore(a),
        'ΑΠΟΚΛΙΣΗ client/server στην ηλικία ' + a + ': rules=' + evalRule(a) + ' table=' + S.calculateVictoryScore(a));
    }
    assert(!/=== 164 - newData/.test(v), 'τα Rules έχουν ακόμη τον παλιό τύπο');
  });

  await test('P6', 'STATIC: το username ΔΕΝ χρησιμοποιείται ως ταυτότητα βαθμολογίας', function () {
    // Αφαιρούμε ΣΧΟΛΙΑ πρώτα — αλλιώς ο έλεγχος πιάνει την ίδια την τεκμηρίωση («ποτέ username»).
    const src = fs.readFileSync(__dirname + '/../js/scoring.js', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    assert(!/username/i.test(src), 'το scoring.js χρησιμοποιεί username — η ταυτότητα πρέπει να είναι ΜΟΝΟ uid');
    assert(/creditedUid|winnerUid|\.uid/.test(src), 'η ταυτότητα βαθμολογίας πρέπει να είναι uid-based');
  });

  await test('P7', 'STATIC: τα bots δεν φτάνουν ποτέ στο seasonScores', function () {
    const src = fs.readFileSync(__dirname + '/../js/scoring.js', 'utf8');
    assert(/filter\(function \(p\) \{ return p && !p\.isBot; \}\)/.test(src),
      'το frozen roster πρέπει να φιλτράρει τα bots');
    assert(/if \(!winner \|\| winner\.isBot\) return no\('bot-winner'\);/.test(src),
      'ο έλεγχος bot-winner πρέπει να παραμένει');
  });

  if (!options.silent) {
    console.log('\n' + (failed === 0 ? '✅' : '❌') + ' Scoring table: ' + passed + ' passed, ' + failed + ' failed');
  }
  return { passed, failed, results };
}
module.exports = { run };
if (require.main === module) run().then(function (r) { process.exit(r.failed === 0 ? 0 : 1); });
