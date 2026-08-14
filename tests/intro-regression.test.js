/* I QUIT! — Welcome / Intro regression A–M. */
'use strict';

const fs = require('fs');
const INTRO = require('../js/intro.js');
const I = require('../js/i18n.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run(options) {
  options = options || {};
  let passed = 0, failed = 0;
  const results = [];

  async function test(letter, name, fn) {
    try {
      await fn();
      passed++;
      results.push({ letter, name, passed: true });
      if (!options.silent) console.log('  ✓ ' + letter + '. ' + name);
    } catch (error) {
      failed++;
      results.push({ letter, name, passed: false, error: error.message });
      if (!options.silent) console.error('  ✗ ' + letter + '. ' + name + ' — ' + error.message);
    }
  }

  await test('A', 'intro is open on initial page lifecycle', function () {
    assert(INTRO.createController().open === true, 'initial controller is not open');
    const index = fs.readFileSync(__dirname + '/../index.html', 'utf8');
    assert(index.includes('id="introOverlay"') && index.includes('id="introBanner"'), 'intro markup is missing');
  });

  await test('B', 'banner click/tap dismissal uses the shared one-way dismiss path', function () {
    const controller = INTRO.createController();
    assert(controller.dismiss() === true && controller.open === false, 'dismiss did not close');
    assert(controller.dismiss() === false && controller.open === false, 'dismiss was not idempotent');
    const source = fs.readFileSync(__dirname + '/../js/intro.js', 'utf8');
    assert(source.includes("banner.addEventListener('click', onBannerClick)"), 'banner click is not wired');
  });

  await test('C', 'internal refresh never reopens a dismissed intro', function () {
    const states = [];
    const controller = INTRO.createController((open) => states.push(open));
    controller.dismiss();
    controller.refresh();
    controller.refresh();
    assert(controller.open === false && states.every((state) => state === false), 'refresh reopened intro');
  });

  await test('D', 'open intro renders the active EL/EN language', function () {
    I.setLang('el');
    const el = INTRO.introHtml(I.t);
    I.setLang('en');
    const en = INTRO.introHtml(I.t);
    assert(el.includes('Το παιχνίδι οικονομικού αλφαβητισμού') && en.includes('The financial literacy game'), 'language did not update');
    const source = fs.readFileSync(__dirname + '/../js/intro.js', 'utf8');
    assert(source.includes('onLanguageChange') && source.includes('controller.refresh()'), 'language toggle is not wired to render');
  });

  await test('E', 'language refresh after dismissal leaves intro closed', function () {
    const controller = INTRO.createController();
    controller.dismiss();
    I.setLang('el');
    controller.refresh();
    I.setLang('en');
    controller.refresh();
    assert(controller.open === false, 'language refresh reopened intro');
  });

  await test('F', 'a full new page lifecycle gets a fresh open controller', function () {
    const firstLoad = INTRO.createController();
    firstLoad.dismiss();
    const nextLoad = INTRO.createController();
    assert(!firstLoad.open && nextLoad.open, 'new lifecycle did not reopen intro');
  });

  await test('G', 'dismissal uses no persistent browser storage or cookie', function () {
    const source = fs.readFileSync(__dirname + '/../js/intro.js', 'utf8');
    assert(!/localStorage|sessionStorage|document\.cookie|indexedDB/.test(source), 'persistent dismissal mechanism found');
  });

  await test('H', 'Greek copy matches the approved wording exactly', function () {
    I.setLang('el');
    const html = INTRO.introHtml(I.t);
    [
      'I QUIT! — Το παιχνίδι οικονομικού αλφαβητισμού.',
      'Μια προσομοίωση της οικονομικής ζωής, όπου κάθε απόφαση έχει συνέπειες.',
      'Επένδυσε, δημιούργησε παθητικό εισόδημα και προσπάθησε να αποκτήσεις οικονομική ανεξαρτησία πριν τα 65.',
      'Θα καταφέρεις να κάνεις I QUIT! ή οι υποχρεώσεις και τα ρίσκα θα σε κρατήσουν στη δουλειά;',
      'Πάτησε για συνέχεια'
    ].forEach((copy) => assert(html.includes(copy), 'missing EL copy: ' + copy));
  });

  await test('I', 'English copy is complete and natural', function () {
    I.setLang('en');
    const html = INTRO.introHtml(I.t);
    [
      'I QUIT! — The financial literacy game.',
      'A simulation of financial life, where every decision has consequences.',
      'Invest, build passive income, and try to achieve financial independence before the age of 65.',
      'Will you manage to say I QUIT!, or will obligations and risks keep you working?',
      'Tap to continue'
    ].forEach((copy) => assert(html.includes(copy), 'missing EN copy: ' + copy));
  });

  await test('J', 'Escape, Enter and Space dismiss keys are supported accessibly', function () {
    ['Escape', 'Enter', ' ', 'Spacebar'].forEach((key) => assert(INTRO.keyDismisses(key), 'unsupported key: ' + key));
    assert(!INTRO.keyDismisses('Tab'), 'Tab must not dismiss');
    const index = fs.readFileSync(__dirname + '/../index.html', 'utf8');
    assert(/id="introBanner"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*tabindex="0"/.test(index), 'dialog accessibility attributes missing');
  });

  await test('K', 'desktop modal width and overlay prevent horizontal overflow', function () {
    const css = fs.readFileSync(__dirname + '/../css/style.css', 'utf8');
    assert(/\.intro-banner\{width:min\(560px,100%\)/.test(css), 'desktop width is not bounded');
    assert(/\.intro-overlay\{[^}]*overflow-x:hidden/.test(css), 'horizontal overflow guard missing');
  });

  await test('L', 'mobile/narrow and short-height layouts remain readable and scrollable', function () {
    const css = fs.readFileSync(__dirname + '/../css/style.css', 'utf8');
    assert(css.includes('@media(max-width:520px)') && css.includes('.intro-overlay{padding:14px;}'), 'mobile layout missing');
    assert(/\.intro-overlay\{[^}]*overflow-y:auto/.test(css), 'vertical scrolling missing');
    assert(css.includes('@media(max-height:520px)') && css.includes('.intro-banner{margin:0;}'), 'short-height layout missing');
  });

  await test('M', 'intro is isolated from account, leaderboard, scoring and gameplay modules', function () {
    const index = fs.readFileSync(__dirname + '/../index.html', 'utf8');
    assert(index.indexOf('js/intro.js') > index.indexOf('js/i18n.js') && index.indexOf('js/intro.js') < index.indexOf('js/ui.js'), 'intro load order is unsafe');
    const source = fs.readFileSync(__dirname + '/../js/intro.js', 'utf8');
    assert(!/firebase|account|leaderboard|scoring|engine|IQ_NET|database/i.test(source), 'intro is coupled to an unrelated subsystem');
  });

  return { passed, failed, results };
}

if (require.main === module) {
  run().then((result) => {
    console.log('\n' + (result.failed === 0 ? '✅' : '❌') + ' Intro regression: ' + result.passed + ' passed, ' + result.failed + ' failed');
    process.exit(result.failed === 0 ? 0 : 1);
  });
}

module.exports = { run };
