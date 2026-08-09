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

    // ================= STACKING: πληροφοριακά dialogs vs κάρτες παιχνιδιού =================
    // Τα ΠΛΗΡΟΦΟΡΙΑΚΑ (Κανόνες/Ερωτηματολόγιο/Αναλυτικά) πρέπει να καλύπτουν το #myDash.
    // Οι ΚΑΡΤΕΣ-ΑΠΟΦΑΣΕΙΣ πρέπει να το αφήνουν ορατό (σκόπιμο feature v1.10).
    const ctx4 = await newCtx(1280, 900);
    const S = await newGame(ctx4, 1280, 900);
    // Ποιο στοιχείο είναι μπροστά ΕΚΕΙ ΠΟΥ ΕΠΙΚΑΛΥΠΤΟΝΤΑΙ modal και dashboard;
    // Το #overlay έχει inset:0 — το backdrop του καλύπτει ΟΛΗ την οθόνη. Άρα ο καθοριστικός
    // έλεγχος είναι: πάνω στο ΙΔΙΟ το dashboard, ποιο στοιχείο επιστρέφει το elementFromPoint;
    //   informational dialog → #overlay (το dashboard είναι από κάτω, σκοτεινιασμένο)
    //   κάρτα παιχνιδιού     → #myDash (μένει φωτισμένο & κλικαμπλ — feature v1.10)
    const whoIsOnTop = () => S.evaluate(() => {
      const dash = document.getElementById('myDash').getBoundingClientRect();
      const pts = [[dash.left + dash.width / 2, dash.top + 20], [dash.left + dash.width / 2, dash.top + dash.height / 2]];
      const hits = pts.map(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return { inOverlay: !!(el && el.closest('#overlay')), inDash: !!(el && el.closest('#myDash')) };
      });
      const ov = document.getElementById('overlay');
      return {
        inOverlay: hits.every(h => h.inOverlay),
        inDash: hits.every(h => h.inDash),
        dashVisible: dash.width > 0 && dash.height > 0,
        dlg: ov.classList.contains('dlg'),
        z: getComputedStyle(ov).zIndex,
        dashZ: getComputedStyle(document.getElementById('myDash')).zIndex,
      };
    });
    // τα πληροφοριακά dialogs καλούνται από το δημόσιο IQ_UI· το showStats είναι διαθέσιμο
    // μόνο μέσω του e2e hook (δεν ανήκει στο δημόσιο API)
    const openDlg = async (fn) => {
      await S.evaluate((f) => ((window.IQ_UI && window.IQ_UI[f]) || window.IQ_TEST[f])(), fn);
      await S.waitForTimeout(350);
    };
    const closeDlg = () => S.evaluate(() => { const b = document.querySelector('#overlay:not(.hidden) .ghost, #overlay:not(.hidden) [id$="Close"], #overlay:not(.hidden) #fbCancel'); if (b) b.click(); });

    // A) Κανόνες
    await openDlg('showRules');
    let st = await whoIsOnTop();
    ok(st.dashVisible, 'A: Κανόνες — το #myDash είναι ορατό στο παρασκήνιο (το σενάριο ισχύει)');
    ok(st.dlg && st.z === '130', 'A: το overlay πήρε .dlg (z-index ' + st.z + ')');
    ok(st.inOverlay && !st.inDash, 'A: στο σημείο επικάλυψης μπροστά είναι ΤΟ DIALOG, όχι το #myDash');
    // προαιρετικό screenshot ΜΟΝΟ αν ζητηθεί ρητά — τα tests δεν αφήνουν artifacts στο repo
    if (process.env.IQUIT_SHOTS) await S.screenshot({ path: path.join(process.env.IQUIT_SHOTS, 'rules-over-dash.png') }).catch(() => {});
    // D) κλείσιμο
    await closeDlg(); await S.waitForTimeout(300);
    const afterClose = await S.evaluate(() => {
      const ov = document.getElementById('overlay');
      const d = document.getElementById('myDash').getBoundingClientRect();
      const el = document.elementFromPoint(d.left + d.width / 2, d.top + 20);
      return { hidden: ov.classList.contains('hidden'), dashHit: !!(el && el.closest('#myDash')), dlg: ov.classList.contains('dlg') };
    });
    ok(afterClose.hidden, 'D: το overlay κρύφτηκε μετά το κλείσιμο');
    ok(afterClose.dashHit, 'D: το dashboard επανήλθε και δέχεται κλικ');

    // B) Ερωτηματολόγιο
    await openDlg('showFeedback');
    st = await whoIsOnTop();
    ok(st.dlg && st.inOverlay && !st.inDash, 'B: Ερωτηματολόγιο πάνω από το dashboard');
    await closeDlg(); await S.waitForTimeout(250);

    // C) Αναλυτικά παρτίδας (χρειάζεται rankings)
    await S.evaluate(() => {
      const T = window.IQ_TEST, g = T.App.game;
      g.rankings = g.players.map((p, i) => ({ name: p.name, retiredAge: null, months: 100 - i, bankrupt: false, id: p.id }));
      T.render();
    });
    await openDlg('showStats');
    st = await whoIsOnTop();
    ok(st.dlg && st.inOverlay && !st.inDash, 'C: Αναλυτικά παρτίδας πάνω από το dashboard');
    await closeDlg(); await S.waitForTimeout(250);

    // E) REGRESSION GUARD: κάρτα παιχνιδιού (μη-wide) → το #myDash ΠΑΡΑΜΕΝΕΙ πάνω (v1.10)
    await S.evaluate(() => {
      const T = window.IQ_TEST, g = T.App.game;
      g.pending = { type: 'reveal', playerId: T.App.myId, special: 'inflation' };
      T.render();
    });
    await S.waitForTimeout(350);
    st = await whoIsOnTop();
    ok(!st.dlg && st.z === '100', 'E: κάρτα παιχνιδιού → overlay ΧΩΡΙΣ .dlg (z-index ' + st.z + ')');
    ok(st.inDash && !st.inOverlay, 'E: το #myDash παραμένει ΠΑΝΩ από την κάρτα (feature v1.10 ανέπαφο)');

    // F) wide → close → μη-wide: η .dlg ΔΕΝ έμεινε κολλημένη
    await S.evaluate(() => { document.getElementById('overlay').classList.add('hidden'); const T = window.IQ_TEST; T.App.game.pending = null; T.render(); });
    await openDlg('showRules');
    ok((await whoIsOnTop()).dlg, 'F: μετά το άνοιγμα Κανόνων υπάρχει .dlg');
    await closeDlg(); await S.waitForTimeout(250);
    await S.evaluate(() => {
      const T = window.IQ_TEST, g = T.App.game;
      g.pending = { type: 'reveal', playerId: T.App.myId, special: 'inflation' };
      T.render();
    });
    await S.waitForTimeout(350);
    st = await whoIsOnTop();
    ok(!st.dlg && st.z === '100' && st.inDash, 'F: κάρτα ΜΕΤΑ από dialog → η .dlg καθαρίστηκε, το dashboard ξανά πάνω');
    await ctx4.close();

    // ============ BOTS: εικονίδιο + όνομα, ΚΑΜΙΑ ορατή στρατηγική (host & guest, EL & EN) ============
    // Τα ΠΡΑΓΜΑΤΙΚΑ strings από το i18n.js (όχι υποθέσεις):
    const STRAT_EL = ['Επιθετικός', 'Αμυντικός', 'Ισορροπημένος', 'Μεγιστάνας', 'Χρηματιστής', 'Ακαδημαϊκός'];
    const STRAT_EN = ['Aggressive', 'Defensive', 'Balanced', 'Tycoon', 'Stock Picker', 'Scholar'];
    // Τα εικονίδια διαβάζονται από την ΠΡΑΓΜΑΤΙΚΗ πηγή (bots.js), όχι hardcoded στο test
    const PROFILES = require('../js/bots.js').PROFILES;
    const BOTS_ALL = [['Ίκαρος', 'aggressive'], ['Καλυψώ', 'balanced'], ['Δανάη', 'defensive'],
      ['Κροίσος', 'tycoon'], ['Ερμής', 'stockpicker'], ['Αθηνά', 'scholar']]
      .map(([n, s]) => [n, PROFILES[s].icon]);
    const ctx5 = await newCtx(1280, 900);
    const H = await ctx5.newPage();
    await H.goto('http://localhost:' + PORT + '/?e2e=1&fast=1&transport=peer');
    await H.fill('#playerName', 'Γιώργος');
    await H.click('#btnCreate');
    await H.waitForFunction(() => /^[A-Z2-9]{4}$/.test(document.getElementById('lobbyCode').textContent), null, { timeout: 15000 });
    // D) το roster δείχνει ΟΛΑ τα ονόματα (τα icons ελέγχονται από τα unit tests μέσω PROFILES)
    const rosterTxt = await H.evaluate(() => document.getElementById('botRoster').textContent);
    BOTS_ALL.forEach(([n]) => ok(rosterTxt.indexOf(n) > -1, 'D: roster δείχνει «' + n + '»'));
    ok(await H.evaluate(() => document.querySelectorAll('#botRoster .botbtn').length) === 6, 'D: 6 κουμπιά bot');
    // E) κανένας χαρακτηρισμός — ούτε ως κείμενο, ούτε ως title/aria-label
    const scan = async (pg, where) => pg.evaluate((sel) => {
      const el = document.querySelector(sel);
      const attrs = [...el.querySelectorAll('*')].map(n => (n.getAttribute('title') || '') + ' ' + (n.getAttribute('aria-label') || '')).join(' ');
      return { text: el.textContent, attrs };
    }, where);
    let rs = await scan(H, '#botRoster');
    STRAT_EL.forEach(s => ok(rs.text.indexOf(s) === -1 && rs.attrs.indexOf(s) === -1, 'E(EL): «' + s + '» ΔΕΝ εμφανίζεται στο roster (ούτε σε title/aria)'));
    // προσθήκη 3 bots → λίστα παικτών (host view)
    for (const n of ['Ίκαρος', 'Δανάη', 'Κροίσος']) await H.evaluate((nm) => document.querySelector('[data-addbot="' + nm + '"]').click(), n);
    await H.waitForTimeout(300);
    // v1.31: ο host βλέπει τα επιλεγμένα bots στο ROSTER (πράσινο + ✕), όχι ως γραμμές παικτών
    let ps = await scan(H, '#botRoster');
    ['Ίκαρος', 'Δανάη', 'Κροίσος'].forEach(n => ok(ps.text.indexOf(n) > -1, 'D: roster (host) δείχνει «' + n + '»'));
    const addedIcons = ['Ίκαρος', 'Δανάη', 'Κροίσος'].map(n => (BOTS_ALL.find(b => b[0] === n) || [])[1]);
    ok(addedIcons.every(ic => ic && ps.text.indexOf(ic) > -1), 'D: τα εικονίδια των bots στο roster (host: ' + addedIcons.join(' ') + ')');
    ok(await H.evaluate(() => document.getElementById('lobbyPlayers').querySelectorAll('.lobby-player').length) === 1,
      'D: ο host βλέπει ΜΟΝΟ τη δική του γραμμή στη λίστα παικτών');
    STRAT_EL.forEach(s => ok(ps.text.indexOf(s) === -1 && ps.attrs.indexOf(s) === -1, 'E(EL): «' + s + '» ΔΕΝ εμφανίζεται στη λίστα παικτών (host)'));
    // F) EN
    await H.evaluate(() => document.getElementById('btnLang').click());
    await H.waitForTimeout(300);
    rs = await scan(H, '#botRoster'); ps = await scan(H, '#lobbyPlayers');
    STRAT_EN.forEach(s => ok(rs.text.indexOf(s) === -1 && ps.text.indexOf(s) === -1 && rs.attrs.indexOf(s) === -1 && ps.attrs.indexOf(s) === -1,
      'E(EN): «' + s + '» ΔΕΝ εμφανίζεται πουθενά στο lobby'));
    await H.evaluate(() => document.getElementById('btnLang').click());
    await H.waitForTimeout(200);
    // F) GUEST view — ίδιος έλεγχος στο renderLobbyGuest
    const guestLobby = await H.evaluate(() => {
      // προσομοίωση του μηνύματος «lobby» που λαμβάνει ο guest, με τα ΙΔΙΑ δεδομένα
      const msg = { code: 'TEST', players: window.IQ_TEST.App.lobby.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, strategy: p.strategy || null, connected: true, pawn: null })) };
      window.IQ_TEST.renderLobbyGuest(msg);
      // v1.31: τα bots του guest ζουν στην compact γραμμή #botLine, όχι σε .lobby-player rows
      const el = document.getElementById('lobbyPlayers'), line = document.getElementById('botLine');
      const nodes = [el, line, ...el.querySelectorAll('*'), ...line.querySelectorAll('*')];
      const attrs = nodes.map(n => (n.getAttribute('title') || '') + ' ' + (n.getAttribute('aria-label') || '')).join(' ');
      return { text: el.textContent + ' ' + line.textContent, attrs, strategies: msg.players.filter(p => p.isBot).map(p => p.strategy) };
    });
    ['Ίκαρος', 'Δανάη', 'Κροίσος'].forEach(n => ok(guestLobby.text.indexOf(n) > -1, 'F: guest view δείχνει «' + n + '»'));
    STRAT_EL.forEach(s => ok(guestLobby.text.indexOf(s) === -1 && guestLobby.attrs.indexOf(s) === -1, 'F: «' + s + '» ΔΕΝ εμφανίζεται στο guest view'));
    // C) το strategy ΥΠΑΡΧΕΙ στα δεδομένα που στέλνονται στον guest (κρυφό, όχι χαμένο)
    ok(guestLobby.strategies.length === 3 && guestLobby.strategies.every(s => !!s),
      'C: το strategy ταξιδεύει κανονικά στο lobby payload (' + guestLobby.strategies.join(',') + ')');
    if (process.env.IQUIT_SHOTS) await H.screenshot({ path: path.join(process.env.IQUIT_SHOTS, 'lobby-bots-desktop.png') }).catch(() => {});
    await ctx5.close();

    // ============ BOT TOGGLE (v1.31): ίδιο κουμπί = προσθήκη/αφαίρεση, κόκκινο ✕ όταν επιλεγμένο ============
    const botState = (pg) => pg.evaluate(() => ({
      count: document.getElementById('lobbyCount').textContent,
      rows: document.querySelectorAll('#lobbyPlayers .lobby-player').length,
      btns: [...document.querySelectorAll('[data-addbot]')].map(b => ({
        name: b.getAttribute('data-addbot'),
        added: b.classList.contains('added'),
        pressed: b.getAttribute('aria-pressed'),
        disabled: b.disabled,
        hasX: !!b.querySelector('.bx'),
        xColor: b.querySelector('.bx') ? getComputedStyle(b.querySelector('.bx')).color : null,
        xHidden: b.querySelector('.bx') ? b.querySelector('.bx').getAttribute('aria-hidden') : null,
        nestedBtns: b.querySelectorAll('button').length,
        name_: b.textContent.trim(),
      })),
    }));
    const tapBot = (pg, n) => pg.evaluate((nm) => document.querySelector('[data-addbot="' + nm + '"]').click(), n);

    for (const [w, h, tag] of [[1280, 800, 'desktop'], [390, 844, 'mobile']]) {
      const ctxT = await newCtx(w, h);
      const T2 = await ctxT.newPage();
      await T2.setViewportSize({ width: w, height: h });
      await T2.goto('http://localhost:' + PORT + '/?e2e=1&fast=1&transport=peer');
      await T2.fill('#playerName', 'Γιώργος');
      await T2.click('#btnCreate');
      await T2.waitForFunction(() => /^[A-Z2-9]{4}$/.test(document.getElementById('lobbyCode').textContent), null, { timeout: 15000 });

      // αρχική κατάσταση: κανένα επιλεγμένο, κανένα ✕
      let bs = await botState(T2);
      ok(bs.btns.length === 6 && bs.btns.every(b => !b.added && b.pressed === 'false' && !b.hasX && !b.disabled),
        tag + ' 0: 6 κουμπιά, κανένα επιλεγμένο, κανένα ✕, κανένα disabled');
      ok(bs.btns.every(b => b.nestedBtns === 0), tag + ' 0: ΚΑΝΕΝΑ nested <button> μέσα στο κουμπί bot');

      // 1) unselected → click → προστίθεται
      await tapBot(T2, 'Ίκαρος'); await T2.waitForTimeout(150);
      bs = await botState(T2);
      let ik = bs.btns.find(b => b.name === 'Ίκαρος');
      ok(bs.count === '(2/5)' && bs.rows === 1, tag + ' 1: το bot προστέθηκε (μετρητής +1, ΧΩΡΙΣ νέα γραμμή — v1.31)');
      // 3) selected state: visual + ✕ + aria-pressed
      ok(ik.added && ik.pressed === 'true', tag + ' 3: selected styling + aria-pressed="true"');
      ok(ik.hasX && ik.xHidden === 'true', tag + ' 3: υπάρχει ✕ ως aria-hidden οπτική ένδειξη');
      ok(/rgb\(226, 91, 84\)/.test(ik.xColor || ''), tag + ' 3: το ✕ είναι ΚΟΚΚΙΝΟ (' + ik.xColor + ')');
      ok(!ik.disabled, tag + ' 3: το επιλεγμένο bot ΠΑΡΑΜΕΝΕΙ clickable');

      // 2 + 4) second click → αφαίρεση, ✕ φεύγει, aria-pressed=false
      await tapBot(T2, 'Ίκαρος'); await T2.waitForTimeout(150);
      bs = await botState(T2);
      ik = bs.btns.find(b => b.name === 'Ίκαρος');
      ok(bs.count === '(1/5)' && bs.rows === 1, tag + ' 2: δεύτερο click → ΑΦΑΙΡΕΘΗΚΕ');
      ok(!ik.hasX && ik.pressed === 'false' && !ik.added, tag + ' 4: το ✕ εξαφανίστηκε, aria-pressed="false", χωρίς selected styling');

      // 5 + 6) capacity με το ΥΠΑΡΧΟΝ threshold (>= 6)
      for (const n of ['Ίκαρος', 'Καλυψώ', 'Δανάη', 'Κροίσος']) { await tapBot(T2, n); await T2.waitForTimeout(120); }
      bs = await botState(T2);
      const sel5 = bs.btns.filter(b => b.added), unsel5 = bs.btns.filter(b => !b.added);
      ok(sel5.length === 4, tag + ' 5/6: 4 bots επιλεγμένα → host + 4 = 5 ΣΥΝΟΛΙΚΑ (v1.32)');
      ok(sel5.every(b => !b.disabled && b.hasX), tag + ' 5: τα ΕΠΙΛΕΓΜΕΝΑ παραμένουν ενεργά με ✕ (αφαιρέσιμα)');
      ok(unsel5.every(b => b.disabled), tag + ' 6: τα ΜΗ επιλεγμένα είναι disabled όταν γεμίσει');
      // πράγματι αφαιρείται ενώ είναι «γεμάτο»
      await tapBot(T2, 'Κροίσος'); await T2.waitForTimeout(150);
      bs = await botState(T2);
      ok(bs.btns.filter(b => b.added).length === 3 && bs.btns.filter(b => !b.added).every(b => !b.disabled),
        tag + ' 5: αφαίρεση ΕΝΩ ήταν γεμάτο → ξεκλειδώνουν ξανά τα υπόλοιπα');

      // 9) καμία στρατηγική σε text/title/aria
      const leak2 = await T2.evaluate(() => {
        const el = document.getElementById('screen-lobby');
        const nodes = [el, ...el.querySelectorAll('*')];
        return el.textContent + ' ' + nodes.map(n => (n.getAttribute('title') || '') + ' ' + (n.getAttribute('aria-label') || '')).join(' ');
      });
      ['Επιθετικός', 'Αμυντικός', 'Ισορροπημένος', 'Μεγιστάνας', 'Χρηματιστής', 'Ακαδημαϊκός']
        .forEach(s => ok(leak2.indexOf(s) === -1, tag + ' 9: καμία στρατηγική «' + s + '»'));
      // το accessible name περιέχει το ΟΝΟΜΑ του bot
      ok(bs.btns.every(b => b.name_.indexOf(b.name) > -1), tag + ' 9: το κουμπί περιέχει το όνομα του bot');

      // 10) layout: τα κουμπιά δεν ξεχειλίζουν
      const geo2 = await T2.evaluate(() => {
        const r = document.getElementById('botRoster').getBoundingClientRect();
        const bad = [...document.querySelectorAll('.botbtn')].filter(b => b.scrollWidth > b.clientWidth + 1).length;
        return { w: Math.round(r.width), vw: innerWidth, overflowing: bad };
      });
      ok(geo2.w <= geo2.vw && geo2.overflowing === 0, tag + ' 10: layout ΟΚ, κανένα κουμπί δεν ξεχειλίζει');

      if (process.env.IQUIT_SHOTS) {
        await T2.screenshot({ path: path.join(process.env.IQUIT_SHOTS, 'bots-selected-' + tag + '.png'), fullPage: w < 500 }).catch(() => {});
      }
      await ctxT.close();
    }

    // 7 + 8) host/guest sync + strategy values ανέπαφα
    const ctxS = await newCtx(1280, 800);
    const S3 = await ctxS.newPage();
    await S3.goto('http://localhost:' + PORT + '/?e2e=1&fast=1&transport=peer');
    await S3.fill('#playerName', 'Γιώργος');
    await S3.click('#btnCreate');
    await S3.waitForFunction(() => /^[A-Z2-9]{4}$/.test(document.getElementById('lobbyCode').textContent), null, { timeout: 15000 });
    await tapBot(S3, 'Ίκαρος'); await S3.waitForTimeout(120);
    await tapBot(S3, 'Δανάη'); await S3.waitForTimeout(120);
    const syncAdd = await S3.evaluate(() => {
      const T = window.IQ_TEST;
      const msg = { code: 'T', players: T.App.lobby.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, strategy: p.strategy || null, connected: true, pawn: null })) };
      T.renderLobbyGuest(msg);
      return { guestText: document.getElementById('lobbyPlayers').textContent + ' ' + document.getElementById('botLine').textContent,
        strategies: msg.players.filter(p => p.isBot).map(p => p.strategy) };
    });
    ok(syncAdd.guestText.indexOf('Ίκαρος') > -1 && syncAdd.guestText.indexOf('Δανάη') > -1, '7: ο guest βλέπει τα bots που πρόσθεσε ο host');
    ok(syncAdd.strategies.join() === 'aggressive,defensive', '8: τα strategy values ταξιδεύουν ΑΝΕΠΑΦΑ (' + syncAdd.strategies.join(',') + ')');
    await tapBot(S3, 'Ίκαρος'); await S3.waitForTimeout(150); // αφαίρεση
    const syncDel = await S3.evaluate(() => {
      const T = window.IQ_TEST;
      const msg = { code: 'T', players: T.App.lobby.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, strategy: p.strategy || null, connected: true, pawn: null })) };
      T.renderLobbyGuest(msg);
      return document.getElementById('lobbyPlayers').textContent + ' ' + document.getElementById('botLine').textContent;
    });
    ok(syncDel.indexOf('Ίκαρος') === -1 && syncDel.indexOf('Δανάη') > -1, '7: μετά την αφαίρεση, ο guest ενημερώθηκε σωστά');
    await ctxS.close();

    // ====== v1.31: τα bots ΔΕΝ πιάνουν .lobby-player row — host στο roster, guest σε compact γραμμή ======
    const rowState = (pg) => pg.evaluate(() => {
      const list = document.getElementById('lobbyPlayers'), line = document.getElementById('botLine');
      const rows = [...list.querySelectorAll('.lobby-player')];
      const card = list.closest('.card');
      return {
        count: document.getElementById('lobbyCount').textContent,
        rows: rows.length,
        rowNames: rows.map(r => r.querySelector('.nm').textContent.trim()),
        listText: list.textContent,
        lineVisible: !!(line && !line.classList.contains('hidden')),
        lineText: line ? line.textContent.trim() : '',
        lineAria: line ? (line.getAttribute('aria-label') || '') : '',
        lineLines: line && !line.classList.contains('hidden')
          ? Math.round(line.getBoundingClientRect().height / parseFloat(getComputedStyle(line).lineHeight || 20)) : 0,
        cardH: Math.round(card.getBoundingClientRect().height),
        selectedBots: [...document.querySelectorAll('[data-addbot]')].filter(b => b.classList.contains('added')).map(b => b.getAttribute('data-addbot')),
        docW: Math.round(document.documentElement.scrollWidth), vw: innerWidth,
      };
    });

    for (const [w, h, tag] of [[1280, 800, 'desktop'], [390, 844, 'mobile']]) {
      const ctxR = await newCtx(w, h);
      const R = await ctxR.newPage();
      await R.setViewportSize({ width: w, height: h });
      await R.goto('http://localhost:' + PORT + '/?e2e=1&fast=1&transport=peer');
      await R.fill('#playerName', 'Legend');
      await R.click('#btnCreate');
      await R.waitForFunction(() => /^[A-Z2-9]{4}$/.test(document.getElementById('lobbyCode').textContent), null, { timeout: 15000 });
      const base = await rowState(R);

      // 1) host + 1 bot
      await tapBot(R, 'Ίκαρος'); await R.waitForTimeout(150);
      let rsx = await rowState(R);
      ok(rsx.count === '(2/5)', tag + ' 1: μετρητής (2/5) — το bot μετράει κανονικά');
      ok(rsx.rows === 1 && rsx.rowNames[0] === 'Legend', tag + ' 1: στη λίστα ΜΟΝΟ ο host');
      ok(rsx.listText.indexOf('Ίκαρος') === -1, tag + ' 1: το bot ΔΕΝ έχει γραμμή στη λίστα');
      ok(rsx.selectedBots.join() === 'Ίκαρος', tag + ' 1: το bot φαίνεται selected στο roster');
      ok(!rsx.lineVisible, tag + ' 1: ο HOST δεν βλέπει compact γραμμή (τα βλέπει στο roster)');

      // 2) host + 4 bots
      for (const n of ['Δανάη', 'Καλυψώ', 'Κροίσος']) { await tapBot(R, n); await R.waitForTimeout(120); }
      rsx = await rowState(R);
      ok(rsx.count === '(5/5)', tag + ' 2: μετρητής (5/5) με 4 bots');
      ok(rsx.rows === 1, tag + ' 2: ΠΑΡΑΜΕΝΕΙ μία μόνο ανθρώπινη γραμμή');
      ok(rsx.selectedBots.length === 4, tag + ' 2: και τα 4 bots selected στο roster');
      ok(rsx.docW <= rsx.vw + 1, tag + ' 8: καμία οριζόντια κύλιση');
      // 8) μείωση ύψους της κάρτας «ΠΑΙΚΤΕΣ» σε σχέση με ΜΙΑ row ανά bot (55px το καθένα)
      const saved = 4 * 55;
      ok(rsx.cardH <= base.cardH + 8, tag + ' 8: η κάρτα ΠΑΙΚΤΕΣ δεν μεγάλωσε (' + base.cardH + '→' + rsx.cardH + 'px· εξοικονόμηση ~' + saved + 'px)');

      // 4 + 5) remove μέσω του κουμπιού
      await tapBot(R, 'Καλυψώ'); await R.waitForTimeout(150);
      rsx = await rowState(R);
      ok(rsx.count === '(4/5)' && rsx.selectedBots.length === 3 && rsx.selectedBots.indexOf('Καλυψώ') === -1,
        tag + ' 4/5: αφαίρεση δουλεύει — μετρητής και selected state ενημερώθηκαν');
      const noX = await R.evaluate(() => !document.querySelector('[data-addbot="Καλυψώ"] .bx'));
      ok(noX, tag + ' 5: το ✕ αφαιρέθηκε από το αποεπιλεγμένο bot');

      // 7) καμία στρατηγική
      const leak3 = await R.evaluate(() => {
        const el = document.getElementById('screen-lobby');
        const nodes = [el, ...el.querySelectorAll('*')];
        return el.textContent + ' ' + nodes.map(n => (n.getAttribute('title') || '') + ' ' + (n.getAttribute('aria-label') || '')).join(' ');
      });
      ['Επιθετικός', 'Αμυντικός', 'Ισορροπημένος', 'Μεγιστάνας', 'Χρηματιστής', 'Ακαδημαϊκός']
        .forEach(s => ok(leak3.indexOf(s) === -1, tag + ' 7: καμία στρατηγική «' + s + '»'));

      // 6) GUEST view — humans σε rows, bots σε ΜΙΑ compact γραμμή
      const gv = await R.evaluate(() => {
        const T = window.IQ_TEST;
        const players = T.App.lobby.players.concat([{ id: 'p9', name: 'Ελένη', isBot: false, connected: true, pawn: null }]);
        const msg = { code: 'T', players: players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, strategy: p.strategy || null, connected: true, pawn: null })) };
        T.App.role = 'guest';
        T.renderLobbyGuest(msg);
        const list = document.getElementById('lobbyPlayers'), line = document.getElementById('botLine');
        return {
          rows: list.querySelectorAll('.lobby-player').length,
          rowNames: [...list.querySelectorAll('.nm')].map(n => n.textContent.trim()),
          listText: list.textContent,
          lineVisible: !line.classList.contains('hidden'),
          lineText: line.textContent.trim(), lineAria: line.getAttribute('aria-label') || '',
          lineH: Math.round(line.getBoundingClientRect().height),
          clickable: line.querySelectorAll('button, [role="button"], [tabindex]').length,
        };
      });
      // 3) κάθε άνθρωπος έχει row, κανένα bot δεν έχει
      ok(gv.rows === 2 && gv.rowNames.some(n => n.indexOf('Legend') > -1) && gv.rowNames.some(n => n.indexOf('Ελένη') > -1),
        tag + ' 3/6: guest — ΚΑΘΕ άνθρωπος έχει γραμμή (2 rows)');
      ok(gv.listText.indexOf('Ίκαρος') === -1 && gv.listText.indexOf('Δανάη') === -1, tag + ' 3/6: κανένα bot ΔΕΝ έχει .lobby-player row');
      ok(gv.lineVisible && gv.lineText.indexOf('Ίκαρος') > -1 && gv.lineText.indexOf('Δανάη') > -1 && gv.lineText.indexOf('Κροίσος') > -1,
        tag + ' 6: όλα τα bots σε ΜΙΑ compact γραμμή με ονόματα');
      ok(gv.lineAria.indexOf('Ίκαρος') > -1 && gv.lineAria.indexOf('Δανάη') > -1, tag + ' 6: accessible name με τα πραγματικά ονόματα');
      ok(gv.clickable === 0, tag + ' 6: η γραμμή του guest είναι READ-ONLY (κανένα control)');
      ok(gv.lineH <= 70, tag + ' 6: το πολύ 2 σειρές (' + gv.lineH + 'px), όχι μία row ανά bot');

      if (process.env.IQUIT_SHOTS) await R.screenshot({ path: path.join(process.env.IQUIT_SHOTS, 'v131-guest-' + tag + '.png'), fullPage: w < 500 }).catch(() => {});
      await ctxR.close();
    }

    // ================= CAPACITY (v1.32): host + 4 = 5 ΣΥΝΟΛΙΚΑ, ποτέ 6/5 =================
    const capState = (pg) => pg.evaluate(() => ({
      count: document.getElementById('lobbyCount').textContent,
      total: window.IQ_TEST.App.lobby ? window.IQ_TEST.App.lobby.players.length : 0,
      selected: [...document.querySelectorAll('[data-addbot].added')].map(b => b.getAttribute('data-addbot')),
      disabled: [...document.querySelectorAll('[data-addbot')].filter(b => b.disabled).map(b => b.getAttribute('data-addbot')),
    }));
    const ctxC = await newCtx(1280, 900);
    const C = await ctxC.newPage();
    await C.goto('http://localhost:' + PORT + '/?e2e=1&fast=1&transport=peer');
    await C.fill('#playerName', 'Γιώργος');
    await C.click('#btnCreate');
    await C.waitForFunction(() => /^[A-Z2-9]{4}$/.test(document.getElementById('lobbyCode').textContent), null, { timeout: 15000 });

    // A) host μόνος
    let cs = await capState(C);
    ok(cs.count === '(1/5)' && cs.total === 1, 'A: host μόνος → 1/5');
    // B) host + 4 bots
    for (const n of ['Ίκαρος', 'Καλυψώ', 'Δανάη', 'Κροίσος']) { await tapBot(C, n); await C.waitForTimeout(120); }
    cs = await capState(C);
    ok(cs.count === '(5/5)' && cs.total === 5, 'B: host + 4 bots → 5/5');
    // C) 5ο bot ΔΕΝ προστίθεται
    await tapBot(C, 'Ερμής'); await C.waitForTimeout(200);
    cs = await capState(C);
    ok(cs.count === '(5/5)' && cs.total === 5 && cs.selected.length === 4, 'C: 5ο bot ΔΕΝ προστέθηκε (παραμένει 5/5)');
    ok(cs.count !== '(6/5)', 'K: πουθενά «6/5»');
    // D) στα 5/5: unselected disabled, selected αφαιρέσιμα
    ok(cs.disabled.length === 2 && cs.disabled.indexOf('Ερμής') > -1 && cs.disabled.indexOf('Αθηνά') > -1,
      'D: στα 5/5 τα ΜΗ επιλεγμένα είναι disabled');
    ok(cs.selected.every(n => cs.disabled.indexOf(n) === -1), 'D: τα ΕΠΙΛΕΓΜΕΝΑ παραμένουν αφαιρέσιμα');
    // E) αφαίρεση → 4/5 και ανοίγει θέση
    await tapBot(C, 'Κροίσος'); await C.waitForTimeout(150);
    cs = await capState(C);
    ok(cs.count === '(4/5)' && cs.total === 4 && cs.disabled.length === 0, 'E: αφαίρεση → 4/5 και ξεκλειδώνουν όλα');
    await tapBot(C, 'Ερμής'); await C.waitForTimeout(150);
    ok((await capState(C)).count === '(5/5)', 'E: η ελεύθερη θέση δέχεται νέο bot');

    // F/G/H/I/J) ανθρώπινοι guests μέσω του πραγματικού onHello (host-side λογική)
    const humanTests = await C.evaluate(() => {
      const T = window.IQ_TEST, out = {};
      // καθαρό lobby: host + 2 bots
      T.App.lobby.players = T.App.lobby.players.filter(p => !p.isBot).concat(
        [{ id: 'p1', name: 'Bot1', isBot: true, strategy: 'aggressive', connected: true, token: null },
         { id: 'p2', name: 'Bot2', isBot: true, strategy: 'defensive', connected: true, token: null }]);
      // H) mixed: + 2 άνθρωποι = 5 συνολικά
      const rejects = [];
      const join = (name) => {
        let res = null; // ΠΡΟΣΟΧΗ: ο host στέλνει welcome ΚΑΙ chatlog — κρατάμε το πρώτο ουσιαστικό
        T.hostCbs.onHello('c-' + name, { name: name }, (m) => { if (!res || res.t === 'chatlog') res = m; });
        if (res && res.t === 'rejected') rejects.push(res.msg);
        return res;
      };
      const a = join('Άννα'), b = join('Βασίλης');
      out.afterTwo = T.App.lobby.players.length;
      // G) 5ος άνθρωπος → απόρριψη
      const c = join('Γιάννα');
      out.afterThird = T.App.lobby.players.length;
      out.rejectMsg = rejects[0] || '';
      out.rejected = !!(c && c.t === 'rejected');
      // I) reconnect κατόχου slot: ίδιο token → δεν μετράει ως νέος
      const tok = (a && a.token) || null;
      let rec = null;
      T.hostCbs.onHello('c-again', { name: 'Άννα', token: tok }, (m) => { if (!rec) rec = m; });
      out.afterReconnect = T.App.lobby.players.length;
      out.reconnectOk = !!(rec && rec.t === 'welcome');
      T.renderLobby();
      out.count = document.getElementById('lobbyCount').textContent;
      return out;
    });
    ok(humanTests.afterTwo === 5, 'F/H: host + 2 bots + 2 άνθρωποι = 5 συνολικά');
    ok(humanTests.afterThird === 5 && humanTests.rejected, 'G: ο επόμενος άνθρωπος ΑΠΟΡΡΙΠΤΕΤΑΙ (παραμένει 5)');
    ok(/5/.test(humanTests.rejectMsg) && humanTests.rejectMsg.indexOf('6') === -1,
      'G: το μήνυμα αναφέρει 5 παίκτες («' + humanTests.rejectMsg + '»)');
    ok(humanTests.afterReconnect === 5 && humanTests.reconnectOk, 'I: reconnect κατόχου θέσης ΔΕΝ μετράει ως 6ος');
    ok(humanTests.count === '(5/5)', 'J/K: ο μετρητής δείχνει (5/5), ποτέ (6/5)');
    // J) ο guest βλέπει επίσης παρονομαστή 5
    const gDen = await C.evaluate(() => {
      const T = window.IQ_TEST;
      T.renderLobbyGuest({ code: 'T', players: T.App.lobby.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, strategy: p.strategy || null, connected: true, pawn: null })) });
      return document.getElementById('lobbyCount').textContent;
    });
    ok(gDen === '(5/5)', 'J: και ο guest βλέπει παρονομαστή 5 (' + gDen + ')');
    await ctxC.close();
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
