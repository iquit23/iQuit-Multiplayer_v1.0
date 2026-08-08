/* layout.e2e.js — REGRESSION TEST: μεγάλα ονόματα καρτών στο Χαρτοφυλάκιο ΔΕΝ διογκώνουν τη
   δεξιά στήλη και δεν μικραίνουν το ταμπλό (grid blowout από min-content).

   Καλύπτει: A) board width πριν/μετά · B) έως 2 γραμμές + aria-label πλήρους ονόματος
   C) κοντό όνομα → όχι focusable · D) mobile tap open/close/outside/resize · E) πληκτρολόγιο
   F) το κόστος παραμένει ορατό · G) 1280/1024/900/390 · + z-index, bubbling, disclosure semantics.

   Εκτελείται ΑΥΤΟΜΑΤΑ από το tests/run-tests.js όταν υπάρχει playwright· αλλιώς παραλείπεται
   με μήνυμα (όπως και τα emulator tests). Standalone: node tests/layout.e2e.js
   Απαιτεί: playwright ή playwright-core. Προαιρετικά env IQUIT_CHROMIUM=<path σε chromium>. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');

const ONLINE = path.join(__dirname, '..');
const LONG = 'Πλατφόρμα δημιουργικής απασχόλησης και κοινωνικοποίησης για μεγαλύτερες ηλικίες.';
// Στα 1280 το LONG χωράει ΑΚΡΙΒΩΣ σε 2 γραμμές (άρα σωστά ΔΕΝ κόβεται). Για τον έλεγχο της
// κοπής χρειάζεται κάτι σαφώς μεγαλύτερο — καθολικά, χωρίς κανένα check συγκεκριμένου ID.
const LONGER = LONG + ' Πρόσθετη περιγραφή με ακόμη περισσότερες λέξεις για έλεγχο κοπής κειμένου.';
const SHORT = 'Ομόλογο';
const PORT = 8176;

// Ελάχιστο stub του PeerJS: αρκεί για solo παρτίδα (?transport=peer) — καμία πραγματική δικτύωση,
// καμία εξωτερική εξάρτηση, κανένα δεύτερο mock framework.
const PEER_STUB = 'window.Peer=function(id){var s=this;s.id=id;s.destroyed=false;' +
  's.on=function(e,f){if(e==="open")setTimeout(function(){f(id||"peer-stub");},10);};' +
  's.destroy=function(){s.destroyed=true;};s.reconnect=function(){};' +
  's.connect=function(){return{on:function(){},send:function(){},open:false};};};';

function findPlaywright() {
  for (const m of ['playwright', 'playwright-core']) {
    try { return require(m); } catch (e) { /* δοκίμασε το επόμενο */ }
  }
  return null;
}

async function run() {
  const pwLib = findPlaywright();
  if (!pwLib) {
    console.log('  ⏭  ΠΑΡΑΛΕΙΨΗ: δεν βρέθηκε playwright. Εγκατάσταση: npm install --no-save playwright');
    return { passed: 0, failed: 0, skipped: true };
  }
  let passed = 0, failed = 0;
  const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ FAIL: ') + m); c ? passed++ : failed++; };

  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    let f = req.url.split('?')[0]; if (f === '/') f = '/index.html';
    const fp = path.join(ONLINE, f);
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) { res.writeHead(200, { 'content-type': MIME[path.extname(fp)] || 'text/plain' }); res.end(fs.readFileSync(fp)); }
    else { res.writeHead(404); res.end(); }
  }).listen(PORT);

  const launchOpts = { args: ['--no-sandbox'], headless: true };
  if (process.env.IQUIT_CHROMIUM) launchOpts.executablePath = process.env.IQUIT_CHROMIUM;
  let browser;
  try {
    browser = await pwLib.chromium.launch(launchOpts);
  } catch (e) {
    console.log('  ⏭  ΠΑΡΑΛΕΙΨΗ: ο browser δεν ξεκίνησε (' + e.message.split('\n')[0] + ')');
    server.close();
    return { passed: 0, failed: 0, skipped: true };
  }

  const ctxOpts = () => ({});
  async function newCtx(w, h, mobile) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: w, height: h } }, mobile ? { hasTouch: true, isMobile: true } : {}, ctxOpts()));
    await ctx.route('**/peerjs.min.js', r => r.fulfill({ contentType: 'text/javascript', body: PEER_STUB }));
    return ctx;
  }
  async function newGame(ctx, w, h) {
    const pg = await ctx.newPage();
    await pg.setViewportSize({ width: w, height: h });
    await pg.goto('http://localhost:' + PORT + '/?e2e=1&fast=1&transport=peer');
    await pg.fill('#playerName', 'Γ');
    await pg.click('#btnCreate');
    await pg.waitForFunction(() => /^[A-Z2-9]{4}$/.test(document.getElementById('lobbyCode').textContent), null, { timeout: 15000 });
    await pg.evaluate(() => document.getElementById('btnStart').click());
    await pg.waitForFunction(() => window.IQ_TEST && window.IQ_TEST.App.game, null, { timeout: 15000 });
    return pg;
  }
  // cardId:null ⇒ χρησιμοποιείται το i.title (ελεγχόμενο μήκος). Με realId δοκιμάζεται η
  // ΠΡΑΓΜΑΤΙΚΗ κάρτα του παιχνιδιού μέσω invTitle().
  const addCard = (pg, title, kind, realId) => pg.evaluate(([t, k, id]) => {
    const T = window.IQ_TEST, g = T.App.game, me = g.players.find(x => x.id === T.App.myId);
    me.inv.push({ uid: 'u' + me.inv.length, cardId: id, kind: k, title: t, cost: 5000, income: 300, tokens: 0 });
    T.render();
  }, [title, kind || 'bb', realId || null]);
  const widths = (pg) => pg.evaluate(() => {
    const g = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().width) : null; };
    return { board: g('.boardbox'), right: g('#colRight'), doc: Math.round(document.documentElement.scrollWidth), win: innerWidth };
  });

  try {
    // ---------- A + G: πλάτη σε 4 μεγέθη, με την ΠΡΑΓΜΑΤΙΚΗ κάρτα BB20 ----------
    for (const [w, h, tag] of [[1280, 900, '1280'], [1024, 800, '1024'], [900, 800, '900'], [390, 844, '390 (mobile)']]) {
      const ctx = await newCtx(w, h);
      const pg = await newGame(ctx, w, h);
      const before = await widths(pg);
      await addCard(pg, LONG, 'bb', 'BB20');
      await pg.waitForTimeout(250);
      const after = await widths(pg);
      if (w >= 900) {
        ok(before.board === after.board, tag + ': board ΑΜΕΤΑΒΛΗΤΟ (' + before.board + ' → ' + after.board + ')');
        ok(before.right === after.right, tag + ': δεξιά στήλη ΑΜΕΤΑΒΛΗΤΗ (' + before.right + ' → ' + after.right + ')');
      }
      ok(after.doc <= after.win + 1, tag + ': καμία οριζόντια κύλιση σελίδας (doc ' + after.doc + ' ≤ ' + after.win + ')');
      await ctx.close();
    }

    // ---------- B, C, F ----------
    const ctx2 = await newCtx(1280, 900);
    const P = await newGame(ctx2, 1280, 900);
    await addCard(P, LONGER);
    await addCard(P, SHORT, 'bond');
    await P.waitForTimeout(300);
    const info = await P.evaluate((full) => {
      const els = [...document.querySelectorAll('.inv .nm')];
      const long = els.find(e => (e.getAttribute('data-full') || '').length > 80);
      const short = els.find(e => (e.getAttribute('data-full') || '').length < 40);
      const lh = parseFloat(getComputedStyle(long).lineHeight);
      const costs = [...document.querySelectorAll('.inv .cost')].map(c => ({ text: c.textContent.trim(), w: Math.round(c.getBoundingClientRect().width), sw: c.scrollWidth }));
      return {
        longAria: long.getAttribute('aria-label'), longRole: long.getAttribute('role'), longExp: long.getAttribute('aria-expanded'),
        longLines: Math.round(long.clientHeight / lh), longScrollH: long.scrollHeight, longClientH: long.clientHeight,
        longScrollW: long.scrollWidth, longClientW: long.clientWidth,
        longTab: long.getAttribute('tabindex'), longTrunc: long.classList.contains('trunc'),
        shortAria: short.getAttribute('aria-label'), shortFull: short.getAttribute('data-full'), shortText: short.textContent.trim(),
        shortTab: short.getAttribute('tabindex'), shortRole: short.getAttribute('role'), shortExp: short.getAttribute('aria-expanded'),
        shortTrunc: short.classList.contains('trunc'), costs,
        textEqualsFull: long.textContent.trim() === full,
      };
    }, LONGER);

    ok(info.longAria === LONGER, 'B: aria-label = ΠΛΗΡΕΣ όνομα');
    ok(!!info.shortAria && info.shortAria === info.shortFull && info.shortAria === info.shortText,
      'B: aria-label υπάρχει ΚΑΙ σε κοντό όνομα, ανεξάρτητα από κοπή («' + info.shortAria + '»)');
    ok(info.textEqualsFull, 'B: το DOM κρατά ΟΛΟΚΛΗΡΟ το όνομα (κόβεται μόνο οπτικά)');
    ok(info.longLines <= 2, 'B: το μεγάλο όνομα σε ΕΩΣ 2 γραμμές (' + info.longLines + ')');
    ok(info.longScrollW <= info.longClientW + 1, 'B: καμία οριζόντια επέκταση του ονόματος');
    ok(info.longScrollH > info.longClientH, 'B: το κείμενο ΟΝΤΩΣ κόπηκε (scrollH ' + info.longScrollH + ' > clientH ' + info.longClientH + ')');
    ok(info.longTab === '0' && info.longTrunc, 'B: το κομμένο όνομα είναι focusable + .trunc');
    // disclosure semantics
    ok(info.longRole === 'button' && info.longExp === 'false', 'A11y: κομμένο όνομα = role="button" + aria-expanded="false"');
    ok(info.shortTab === null && !info.shortTrunc, 'C: το ΚΟΝΤΟ όνομα ΔΕΝ είναι focusable');
    ok(info.shortRole === null && info.shortExp === null, 'A11y: το ΚΟΝΤΟ όνομα ΔΕΝ παίρνει role/aria-expanded');
    ok(info.costs.length === 2 && info.costs.every(c => /5\.000/.test(c.text) && c.w > 20 && c.sw <= c.w + 1),
      'F: το κόστος ΠΛΗΡΩΣ ορατό σε κάθε γραμμή (' + JSON.stringify(info.costs.map(c => c.text)) + ')');

    // ---------- E: πληκτρολόγιο ----------
    const tipOpenIn = (pg) => pg.evaluate(() => { const t = document.getElementById('tipPop'); return !!(t && !t.classList.contains('hidden')); });
    await P.evaluate(() => document.querySelector('.inv .nm.trunc').focus());
    await P.waitForTimeout(150);
    const tipTxt = await P.evaluate(() => { const t = document.getElementById('tipPop'); return t && !t.classList.contains('hidden') ? t.textContent : null; });
    ok(tipTxt === LONGER, 'E: focus (Tab) → popover με το πλήρες όνομα');
    ok(await P.evaluate(() => document.querySelector('.inv .nm.trunc').getAttribute('aria-expanded')) === 'true', 'A11y: aria-expanded="true" όσο είναι ανοιχτό');
    ok(await P.evaluate(() => document.getElementById('tipPop').getAttribute('aria-hidden')) === 'true', 'A11y: το popover είναι aria-hidden (οπτικό διπλότυπο του aria-label)');
    await P.keyboard.press('Escape');
    await P.waitForTimeout(150);
    ok(!(await tipOpenIn(P)), 'E: Escape κλείνει');
    ok(await P.evaluate(() => document.querySelector('.inv .nm.trunc').getAttribute('aria-expanded')) === 'false', 'A11y: aria-expanded επιστρέφει σε "false"');
    await P.evaluate(() => document.querySelector('.inv .nm.trunc').focus());
    await P.waitForTimeout(120);
    await P.keyboard.press('Enter'); await P.waitForTimeout(150);
    ok(!(await tipOpenIn(P)), 'E: Enter σε ανοιχτό → κλείνει (toggle)');
    await P.keyboard.press('Enter'); await P.waitForTimeout(150);
    ok(await tipOpenIn(P), 'E: Enter ξανά → ανοίγει');
    await P.keyboard.press(' '); await P.waitForTimeout(150);
    ok(!(await tipOpenIn(P)), 'E: Space → toggle κλείσιμο');

    const z = await P.evaluate(() => {
      document.querySelector('.inv .nm.trunc').focus();
      const gz = (s) => { const e = document.querySelector(s); return e ? +getComputedStyle(e).zIndex || 0 : null; };
      return { tip: gz('#tipPop'), dash: gz('#myDash'), hint: gz('#hintBox'), toasts: gz('#toasts') };
    });
    ok(z.tip > z.dash && z.tip < z.hint && z.tip < z.toasts, 'z-index: tip(' + z.tip + ') > myDash(' + z.dash + ') και < hintBox(' + z.hint + ')/toasts(' + z.toasts + ')');

    const bubble = await P.evaluate(() => {
      let fired = 0;
      document.querySelector('.inv').addEventListener('click', () => fired++);
      document.querySelector('.inv .nm.trunc').click();
      return fired;
    });
    ok(bubble === 0, 'bubbling: click στο όνομα ΔΕΝ φτάνει στη γραμμή (κανένα κατά λάθος κουμπί)');
    await ctx2.close();

    // ---------- D: mobile ----------
    const ctx3 = await newCtx(390, 844, true);
    const M = await newGame(ctx3, 390, 844);
    await addCard(M, LONG);
    await M.waitForTimeout(300);
    const tapName = () => M.evaluate(() => document.querySelector('.inv .nm.trunc').click());
    const tipOpen = () => tipOpenIn(M);
    ok(await M.evaluate(() => !!document.querySelector('.inv .nm.trunc')), 'D: mobile — το όνομα είναι κομμένο & διαδραστικό');
    await tapName(); await M.waitForTimeout(150);
    ok(await tipOpen(), 'D: πρώτο tap → ανοίγει');
    ok(await M.evaluate(() => { const r = document.getElementById('tipPop').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1; }), 'D: το popover είναι ΕΝΤΟΣ οθόνης');
    await tapName(); await M.waitForTimeout(150);
    ok(!(await tipOpen()), 'D: δεύτερο tap στο ΙΔΙΟ → κλείνει');
    await tapName(); await M.waitForTimeout(150);
    await M.evaluate(() => document.getElementById('boardCenter').click());
    await M.waitForTimeout(150);
    ok(!(await tipOpen()), 'D: tap ΕΚΤΟΣ → κλείνει');
    await tapName(); await M.waitForTimeout(120);
    await M.evaluate(() => window.dispatchEvent(new Event('resize')));
    await M.waitForTimeout(150);
    ok(!(await tipOpen()), 'D: resize → κλείνει');
    await ctx3.close();
  } catch (e) {
    failed++;
    console.error('  ✗ FAIL (εξαίρεση): ' + e.message.split('\n')[0]);
  }

  await browser.close();
  server.close();
  return { passed, failed, skipped: false };
}

module.exports = { run };

// standalone εκτέλεση
if (require.main === module) {
  run().then(r => {
    console.log('\n' + (r.skipped ? '⏭ SKIPPED' : (r.failed === 0 ? '✅' : '❌') + ' Layout: ' + r.passed + ' passed, ' + r.failed + ' failed'));
    process.exit(r.failed === 0 ? 0 : 1);
  }).catch(e => { console.error('FAIL:', e.message); process.exit(1); });
}
