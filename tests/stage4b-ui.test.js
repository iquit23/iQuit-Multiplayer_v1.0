/* I QUIT! — Stage 4b: endgame UI ανά παίκτη (A–N). Καμία αλλαγή backend/Rules/ranking. */
'use strict';
const fs = require('fs');
const S = require('../js/scoring.js');
const I = require('../js/i18n.js');
function assert(c, m) { if (!c) throw new Error(m); }

const UI = fs.readFileSync(__dirname + '/../js/ui.js', 'utf8');
const FN = UI.slice(UI.indexOf('function endScoreHtml'), UI.indexOf('function showEnd'));
const G = '11111111-2222-4333-8444-555555555555';
const P = (a) => S.calculateVictoryScore(a);

/* Καθαρή αναπαραγωγή της λογικής επιλογής μηνύματος του endScoreHtml (ίδιες συνθήκες,
   ίδια i18n κλειδιά) — ελέγχουμε ΤΙ ΒΛΕΠΕΙ ο τοπικός παίκτης, ανά κατάσταση. */
function render(own, opts) {
  opts = opts || {};
  const ineligible = opts.eligibility === 'ineligible' || opts.setup === 'casual';
  if (own) {
    if (ineligible) return { kind: 'ineligible', text: I.t('scoreIneligible') };
    if (!own.quit) return { kind: 'none', text: '' };
    if (own.status === 'saved') {
      return { kind: 'success', text: I.t('scoreIQuit', { points: own.points }) + ' ' + I.t('scoreIndependence', { age: own.quitAge }) };
    }
    if (own.status === 'error') return { kind: 'pending', text: I.t('scorePendingRetry') };
    return { kind: 'saving', text: I.t('scorePending') };
  }
  return { kind: 'legacy', text: '' };
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
  const saved = (age) => ({ status: 'saved', quit: true, quitAge: age, points: P(age) });

  await test('A', 'age 58 credited → το UI δείχνει +' + P(58), function () {
    I.setLang('el');
    const r = render(saved(58));
    assert(r.kind === 'success', 'λάθος κατάσταση');
    assert(/\+106 πόντοι/.test(r.text), 'λάθος πόντοι: ' + r.text);
    assert(/στα 58/.test(r.text), 'λάθος ηλικία: ' + r.text);
  });

  await test('B', 'age 62 credited → το UI δείχνει +' + P(62), function () {
    I.setLang('el');
    assert(/\+102 πόντοι/.test(render(saved(62)).text), 'λάθος πόντοι για 62');
  });

  await test('C+E', 'δύο παίκτες ίδιου game βλέπουν ο καθένας ΤΟ ΔΙΚΟ ΤΟΥ score', function () {
    I.setLang('el');
    const a = render(saved(58)), b = render(saved(62));
    assert(/\+106/.test(a.text) && /\+102/.test(b.text), 'τα δύο clients δεν είναι ανεξάρτητα');
    assert(a.kind === 'success' && b.kind === 'success', 'ο 2ος scorer μπλοκαρίστηκε στο UI');
  });

  await test('D', 'ίδια ηλικία 62 → και οι δύο βλέπουν +' + P(62), function () {
    I.setLang('el');
    assert(render(saved(62)).text === render(saved(62)).text, 'ασυνεπές μήνυμα');
    assert(/\+102 πόντοι/.test(render(saved(62)).text), 'λάθος κοινή τιμή');
  });

  await test('F', 'pending credit → ακριβές μήνυμα, ΧΩΡΙΣ ψευδή επιβεβαίωση αποθήκευσης', function () {
    I.setLang('el');
    const r = render({ status: 'error', quit: true, quitAge: 58, points: P(58) });
    assert(r.kind === 'pending', 'λάθος κατάσταση');
    assert(/καταγράφηκε/.test(r.text) && /θα επαναληφθεί/.test(r.text), 'λάθος κείμενο: ' + r.text);
    assert(!/\+106/.test(r.text), 'το pending μήνυμα δεν πρέπει να δείχνει πόντους ως πιστωμένους');
    assert(!/αποθηκεύτηκ/.test(r.text), 'υπονοεί ότι αποθηκεύτηκαν');
  });

  await test('G', 'already credited (duplicate) → κανονικό final score, κανένα technical warning', function () {
    I.setLang('el');
    const r = render(Object.assign(saved(58), { duplicate: true }));
    assert(r.kind === 'success' && /\+106/.test(r.text), 'δεν δείχνει το κανονικό αποτέλεσμα');
    assert(!/duplicate|ήδη|σφάλμα|error/i.test(r.text), 'εμφανίστηκε technical/duplicate μήνυμα');
  });

  await test('H', 'ineligible + I QUIT → ΚΑΝΕΝΑ seasonal +points', function () {
    I.setLang('el');
    const r = render(saved(58), { eligibility: 'ineligible' });
    assert(r.kind === 'ineligible', 'λάθος κατάσταση');
    assert(!/\+106|πόντοι/.test(r.text), 'εμφανίστηκαν πόντοι σε ineligible παρτίδα: ' + r.text);
    assert(/παρτίδα δεν προσμετράται/.test(r.text), 'λάθος κείμενο: ' + r.text);
  });

  await test('I', 'χωρίς I QUIT → ΚΑΝΕΝΑ «+0» και κανένα victory message', function () {
    I.setLang('el');
    const r = render({ status: 'saved', quit: false, points: 0 });
    assert(r.kind === 'none' && r.text === '', 'εμφανίστηκε μήνυμα για non-quit: ' + r.text);
  });

  await test('J', 'COPY: κανένα κείμενο δεν λέει ότι μόνο ο νικητής παίρνει πόντους', function () {
    ['el', 'en'].forEach(function (l) {
      I.setLang(l);
      const inel = I.t('scoreIneligible');
      assert(!/νίκη|victory/i.test(inel), l + ': το ineligible αναφέρεται σε «νίκη» αντί για παρτίδα: ' + inel);
      const why = I.t('scoreWhy');
      assert(!/μόνο|only|winner|νικητ/i.test(why), l + ': το scoreWhy υπονοεί αποκλειστικότητα νικητή');
      const pend = I.t('scorePendingRetry');
      assert(!/νίκη|victory/i.test(pend), l + ': το pending αναφέρεται σε «νίκη»: ' + pend);
    });
    I.setLang('el');
  });

  await test('K', 'παλιό completion-only game → το backward-compatible μονοπάτι διατηρείται', function () {
    assert(/backward compatible/i.test(FN), 'λείπει το legacy fallback');
    assert(/g\.scoreResult/.test(FN), 'χάθηκε το παλιό single-winner μονοπάτι');
    assert(/const own = App\.ownResultState\[g\.gameId\];/.test(FN), 'δεν διαβάζει το own result');
    assert(FN.indexOf('const own') < FN.indexOf('g.rankings'), 'το per-player path πρέπει να προηγείται');
  });

  await test('L', 'ΚΑΝΕΝΑ gate #1 στο νέο μονοπάτι· καμία ταυτότητα από username', function () {
    const perPlayer = FN.slice(FN.indexOf('if (own) {'), FN.indexOf('// ---- backward compatible'));
    assert(!/rankings\[0\]|winner|winnerUid/.test(perPlayer), 'βρέθηκε winner gate στο per-player UI');
    assert(!/username|playerName/.test(FN), 'το UI χρησιμοποιεί username ως ταυτότητα σκορ');
    assert(/own\.points/.test(perPlayer) && /own\.quitAge/.test(perPlayer), 'δεν διαβάζει canonical τιμές');
    assert(!/164|VICTORY_POINTS/.test(FN), 'το UI ξαναϋπολογίζει πόντους');
  });

  await test('M', 'EL copy ακριβώς όπως ζητήθηκε', function () {
    I.setLang('el');
    assert(I.t('scoreIQuit', { points: 106 }) === '🏆 I QUIT! +106 πόντοι', 'λάθος EL success');
    assert(I.t('scoreIndependence', { age: 58 }) === 'Απέκτησες οικονομική ανεξαρτησία στα 58.', 'λάθος EL independence');
    assert(I.t('scoreIneligible') === 'Η παρτίδα δεν προσμετράται στο seasonal ranking.', 'λάθος EL ineligible');
  });

  await test('N', 'EN copy ακριβώς όπως ζητήθηκε', function () {
    I.setLang('en');
    assert(I.t('scoreIQuit', { points: 102 }) === '🏆 I QUIT! +102 points', 'λάθος EN success');
    assert(I.t('scoreIndependence', { age: 62 }) === 'You achieved financial independence at age 62.', 'λάθος EN independence');
    assert(I.t('scoreIneligible') === 'This game does not count toward the seasonal ranking.', 'λάθος EN ineligible');
    I.setLang('el');
  });

  await test('O', 'STATIC: το 4b ΔΕΝ άλλαξε backend/Rules/ranking', function () {
    const sc = fs.readFileSync(__dirname + '/../js/scoring.js', 'utf8');
    ['creditPlayerResult', 'persistPlayerResult', 'applyGameTransaction', 'evaluatePlayerResults', 'readGameScorers']
      .forEach((f) => assert(new RegExp('function ' + f + '\\(').test(sc), 'λείπει η backend συνάρτηση ' + f));
    const rules = JSON.parse(fs.readFileSync(__dirname + '/../database.rules.json', 'utf8')).rules;
    assert(/auth\.uid === \$uid/.test(rules.scoreGames.$gameId.results.$uid['.write']), 'άλλαξαν τα Rules');
    assert(/auth\.uid === \$uid/.test(rules.seasonScores.$seasonId.$uid['.write']), 'άλλαξαν τα Rules');
    assert(/const winner = g\.rankings && g\.rankings\[0\];/.test(FN), 'το game ranking δεν πρέπει να αλλάξει');
  });

  if (!options.silent) {
    console.log('\n' + (failed === 0 ? '✅' : '❌') + ' Stage 4b UI: ' + passed + ' passed, ' + failed + ' failed');
  }
  return { passed, failed, results };
}
module.exports = { run };
if (require.main === module) run().then((r) => process.exit(r.failed === 0 ? 0 : 1));
