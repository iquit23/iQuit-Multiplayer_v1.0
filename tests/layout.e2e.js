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

  // Αύγουστος 2.4 (intro): η αρχική οθόνη ξεκινά με ένα overlay που καλύπτει τα κουμπιά μέχρι να
  // το κλείσει ο παίκτης. Στα e2e το κλείνουμε μέσω του ΙΔΙΟΥ public API που χρησιμοποιεί το
  // προϊόν (IQ_INTRO.dismiss) — δεν παρακάμπτουμε ούτε αλλάζουμε τη συμπεριφορά του feature.
  async function goHome(pg) {
    await pg.goto('http://localhost:' + PORT + '/?e2e=1&fast=1&transport=peer');
    await pg.evaluate(() => { if (window.IQ_INTRO && window.IQ_INTRO.dismiss) window.IQ_INTRO.dismiss(); });
    await pg.waitForFunction(() => {
      const o = document.querySelector('.intro-overlay');
      return !o || o.classList.contains('hidden') || !o.offsetParent;
    }, null, { timeout: 5000 });
  }
  async function newGame(ctx, w, h) {
    const pg = await ctx.newPage();
    await pg.setViewportSize({ width: w, height: h });
    await goHome(pg);
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
    await goHome(H);
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
      await goHome(T2);
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
    await goHome(S3);
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
      await goHome(R);
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
    await goHome(C);
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

    // ---------- Αύγουστος 2.0: τρία νέα πιόνια (👛 🦍 🏠) ----------
    const NEW3 = ['👛', '🦍', '🏠'];
    const OLD9 = ['🐎', '🚗', '✈️', '🚢', '👟', '💰', '₿', '€', '$'];

    // K) μηδέν οριζόντια υπερχείλιση σε 4 πλάτη + σωστός αριθμός/σειρά κουμπιών
    for (const [w, h, tag] of [[1280, 900, '1280'], [390, 844, '390'], [360, 780, '360'], [320, 700, '320']]) {
      const ctxP = await newCtx(w, h, w < 500);
      const P4 = await ctxP.newPage();
      await P4.setViewportSize({ width: w, height: h });
      await goHome(P4);
      await P4.fill('#playerName', 'Γ');
      await P4.click('#btnCreate');
      await P4.waitForFunction(() => /^[A-Z2-9]{4}$/.test(document.getElementById('lobbyCode').textContent), null, { timeout: 15000 });
      const st = await P4.evaluate(() => {
        const bs = [...document.querySelectorAll('#pawnPick .pawnbtn')];
        const box = document.getElementById('pawnPick').getBoundingClientRect();
        return {
          list: bs.map(b => b.dataset.pawn),
          maxRight: Math.max(...bs.map(b => Math.round(b.getBoundingClientRect().right))),
          boxRight: Math.round(box.right),
          doc: Math.round(document.documentElement.scrollWidth), win: innerWidth,
        };
      });
      ok(st.list.length === 12, tag + ' A: εμφανίζονται 12 πιόνια (' + st.list.length + ')');
      ok(JSON.stringify(st.list.slice(0, 9)) === JSON.stringify(OLD9), tag + ' B/J: τα 9 πρώτα ίδια & στη σειρά');
      ok(JSON.stringify(st.list.slice(9)) === JSON.stringify(NEW3), tag + ' C: τα 3 τελευταία = 👛 🦍 🏠');
      ok(st.doc <= st.win + 1, tag + ' K: καμία οριζόντια κύλιση σελίδας (' + st.doc + ' ≤ ' + st.win + ')');
      ok(st.maxRight <= st.boxRight + 1, tag + ' K: κανένα κουμπί δεν ξεφεύγει από την περιοχή');
      await ctxP.close();
    }

    // D/E/F/G/H/I) λειτουργική συμπεριφορά των νέων πιονιών (desktop)
    const ctxQ = await newCtx(1280, 900);
    const Q = await ctxQ.newPage();
    await goHome(Q);
    await Q.fill('#playerName', 'Γιώργος');
    await Q.click('#btnCreate');
    await Q.waitForFunction(() => /^[A-Z2-9]{4}$/.test(document.getElementById('lobbyCode').textContent), null, { timeout: 15000 });

    for (const pw of NEW3) {
      // D) επιλογή από το lobby με πραγματικό click
      await Q.click('#pawnPick .pawnbtn[data-pawn="' + pw + '"]');
      await Q.waitForTimeout(120);
      const sel = await Q.evaluate((p) => {
        const T = window.IQ_TEST, btn = document.querySelector('#pawnPick .pawnbtn[data-pawn="' + p + '"]');
        const me = T.App.lobby.players.find(x => x.id === T.App.myId);
        return { cls: btn.className, mine: me ? me.pawn : null, app: T.App.myPawn, ls: localStorage.getItem('iquit_pawn') };
      }, pw);
      ok(sel.mine === pw && sel.app === pw, 'D: ' + pw + ' επιλέγεται από το lobby');
      ok(/\bsel\b/.test(sel.cls), 'D: ' + pw + ' σημειώνεται ως επιλεγμένο (.sel)');
      ok(sel.ls === pw, 'I: ' + pw + ' αποθηκεύεται στο localStorage (persistence σε reload)');
    }

    // E/F/G/I) host-side λογική μέσω των ΠΡΑΓΜΑΤΙΚΩΝ callbacks
    const pawnHost = await Q.evaluate((NEW) => {
      const T = window.IQ_TEST, out = { accepted: {}, dup: {}, sync: {} };
      // καθαρό lobby: μόνο ο host
      T.App.lobby.players = T.App.lobby.players.filter(p => p.id === T.App.myId);
      const me = T.App.lobby.players[0]; me.pawn = null;
      // δύο ανθρώπινοι guests
      const mk = (n) => { let r = null; T.hostCbs.onHello('c-' + n, { name: n }, (m) => { if (!r || r.t === 'chatlog') r = m; }); return r; };
      mk('Άννα'); mk('Βασίλης');
      const A = T.App.lobby.players.find(p => p.name === 'Άννα');
      const B = T.App.lobby.players.find(p => p.name === 'Βασίλης');
      NEW.forEach(pw => {
        // E) ο host δέχεται το νέο πιόνι ως valid
        A.pawn = null; B.pawn = null;
        T.hostCbs.onPawn('c-Άννα', pw);
        out.accepted[pw] = A.pawn === pw;
        // F) ο δεύτερος ΔΕΝ μπορεί να πάρει το ίδιο
        T.hostCbs.onPawn('c-Βασίλης', pw);
        out.dup[pw] = B.pawn === null;
      });
      // άκυρο πιόνι εκτός λίστας → απορρίπτεται (ο guard δεν χαλάρωσε)
      A.pawn = null; T.hostCbs.onPawn('c-Άννα', '🚀');
      out.rocketRejected = A.pawn === null;
      // G) sync host→guest: το πιόνι μπαίνει στο lobby payload που βλέπει ο guest
      A.pawn = NEW[1]; B.pawn = NEW[2];
      const payload = T.App.lobby.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected, pawn: p.pawn || null }));
      T.renderLobbyGuest({ code: 'T', players: payload });
      out.sync.payload = payload.filter(p => p.pawn).map(p => p.pawn);
      out.sync.dom = [...document.querySelectorAll('#lobbyPlayers .avatar')].map(a => a.textContent);
      // H) πέρασμα στο game state μέσω του ΠΡΑΓΜΑΤΙΚΟΥ engine
      const spec = T.App.lobby.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, pawn: p.pawn, strategy: p.strategy }));
      spec[0].pawn = NEW[0];
      const g = window.IQ_ENGINE ? window.IQ_ENGINE.newGame(spec, 12345) : null;
      out.engine = g ? g.players.map(p => p.pawn) : null;
      return out;
    }, NEW3);

    NEW3.forEach(pw => {
      ok(pawnHost.accepted[pw] === true, 'E: ο host δέχεται το ' + pw + ' ως valid pawn');
      ok(pawnHost.dup[pw] === true, 'F: δεύτερος παίκτης ΔΕΝ παίρνει το ήδη πιασμένο ' + pw);
    });
    ok(pawnHost.rocketRejected === true, 'E: πιόνι εκτός λίστας (🚀) απορρίπτεται — ο guard δεν χαλάρωσε');
    ok(JSON.stringify(pawnHost.sync.payload) === JSON.stringify([NEW3[1], NEW3[2]]), 'G: τα νέα πιόνια μπαίνουν στο lobby payload host→guest');
    ok(NEW3.slice(1).every(p => pawnHost.sync.dom.indexOf(p) > -1), 'G: ο guest τα βλέπει στα avatars (' + pawnHost.sync.dom.join(' ') + ')');
    if (pawnHost.engine) ok(NEW3.every(p => pawnHost.engine.indexOf(p) > -1), 'H: και τα 3 περνούν στο game state του engine');

    // H) πραγματική εμφάνιση πάνω στο board μετά την έναρξη
    const onBoard = await Q.evaluate(() => {
      const T = window.IQ_TEST;
      return [...document.querySelectorAll('.pawnspot .pawn')].map(s => s.textContent);
    });
    await Q.evaluate(() => document.getElementById('btnStart').click());
    await Q.waitForFunction(() => window.IQ_TEST && window.IQ_TEST.App.game, null, { timeout: 15000 });
    const boardPawns = await Q.evaluate((NEW) => {
      const T = window.IQ_TEST;
      T.App.game.players.forEach((p, i) => { if (!p.isBot && NEW[i]) p.pawn = NEW[i]; });
      T.render();
      return [...document.querySelectorAll('.pawnspot .pawn')].map(s => ({ txt: s.textContent, emo: s.classList.contains('emo') }));
    }, NEW3);
    NEW3.forEach((pw, i) => {
      const hit = boardPawns.find(b => b.txt === pw);
      if (i < boardPawns.length) {
        ok(!!hit, 'H: το ' + pw + ' εμφανίζεται πάνω στο board');
        if (hit) ok(hit.emo === true, 'H: το ' + pw + ' παίρνει την κλάση .emo (σωστό μέγεθος γραμματοσειράς)');
      }
    });
    void onBoard;
    await ctxQ.close();

    // I) ΠΡΑΓΜΑΤΙΚΟ reload: το νέο πιόνι επιβιώνει και ξαναδηλώνεται μετά την επανασύνδεση
    const ctxR = await newCtx(1280, 900);
    const R = await ctxR.newPage();
    await goHome(R);
    await R.fill('#playerName', 'Ρία');
    await R.click('#btnCreate');
    await R.waitForFunction(() => /^[A-Z2-9]{4}$/.test(document.getElementById('lobbyCode').textContent), null, { timeout: 15000 });
    await R.click('#pawnPick .pawnbtn[data-pawn="🦍"]');
    await R.waitForTimeout(150);
    const savedSession = await R.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('iquit_host_v1') || 'null');
      return { inSession: s ? (s.lobby.players.find(p => p.pawn) || {}).pawn : null, ls: localStorage.getItem('iquit_pawn') };
    });
    ok(savedSession.inSession === '🦍', 'I: το 🦍 αποθηκεύεται στο host session (save/load)');
    await R.reload();
    await R.evaluate(() => { if (window.IQ_INTRO && window.IQ_INTRO.dismiss) window.IQ_INTRO.dismiss(); });
    await R.waitForFunction(() => window.IQ_TEST, null, { timeout: 15000 });
    const afterReload = await R.evaluate(() => ({ myPawn: window.IQ_TEST.App.myPawn, ls: localStorage.getItem('iquit_pawn') }));
    ok(afterReload.myPawn === '🦍' && afterReload.ls === '🦍', 'I: μετά από reload το 🦍 διατηρείται (App.myPawn + localStorage)');
    await ctxR.close();

    // I) resume ΞΕΚΙΝΗΜΕΝΗΣ παρτίδας — το κουμπί επαναφοράς εμφανίζεται μόνο με phase === 'playing',
    // άρα χρειάζεται καθαρό context: lobby → επιλογή πιονιού → έναρξη → reload → resume.
    const ctxResume = await newCtx(1280, 900);
    const R2 = await ctxResume.newPage();
    await goHome(R2);
    await R2.fill('#playerName', 'Ρία');
    await R2.click('#btnCreate');
    await R2.waitForFunction(() => /^[A-Z2-9]{4}$/.test(document.getElementById('lobbyCode').textContent), null, { timeout: 15000 });
    await R2.click('#pawnPick .pawnbtn[data-pawn="🦍"]');
    await R2.waitForTimeout(150);
    await R2.evaluate(() => document.getElementById('btnStart').click());
    await R2.waitForFunction(() => window.IQ_TEST && window.IQ_TEST.App.game, null, { timeout: 15000 });
    const inGame = await R2.evaluate(() => {
      const T = window.IQ_TEST;
      return (T.App.game.players.find(p => p.id === T.App.myId) || {}).pawn;
    });
    ok(inGame === '🦍', 'I/H: το 🦍 περνά στο game state κατά την έναρξη');
    await R2.reload();
    await R2.evaluate(() => { if (window.IQ_INTRO && window.IQ_INTRO.dismiss) window.IQ_INTRO.dismiss(); });
    await R2.waitForFunction(() => document.getElementById('btnResumeHost'), null, { timeout: 15000 });
    await R2.evaluate(() => document.getElementById('btnResumeHost').click());
    await R2.waitForFunction(() => window.IQ_TEST && window.IQ_TEST.App.game, null, { timeout: 15000 });
    const afterResume = await R2.evaluate(() => {
      const T = window.IQ_TEST;
      return {
        pawn: (T.App.game.players.find(p => p.id === T.App.myId) || {}).pawn,
        onBoard: [...document.querySelectorAll('.pawnspot .pawn')].map(s => s.textContent),
      };
    });
    ok(afterResume.pawn === '🦍', 'I: μετά από reload + resume παρτίδας το 🦍 παραμένει στον παίκτη');
    ok(afterResume.onBoard.indexOf('🦍') > -1, 'I: και εξακολουθεί να φαίνεται πάνω στο board');
    await ctxResume.close();

    // ================= ΕΡΩΤΗΜΑΤΟΛΟΓΙΟ: mobile responsive (ΑΙΤΙΑ: input{width:100%} έπιανε τα radio)
    for (const [w, h, tag] of [[1280, 900, 'desktop 1280'], [768, 1024, 'tablet 768'], [390, 844, 'iPhone 390'], [360, 780, '360'], [320, 700, '320']]) {
      const ctxF = await newCtx(w, h, w < 500);
      const F = await ctxF.newPage();
      await F.setViewportSize({ width: w, height: h });
      await goHome(F);
      await F.evaluate(() => window.IQ_UI.showFeedback());
      await F.waitForTimeout(250);
      const q = await F.evaluate(() => {
        const opts = [...document.querySelectorAll('.fbopt')];
        let outside = 0, tooSmall = 0, fatRadio = 0;
        opts.forEach(o => {
          const ob = o.getBoundingClientRect();
          const sp = o.querySelector('span'), rd = o.querySelector('input[type=radio]');
          const rb = rd.getBoundingClientRect();
          if (rb.width > 26 || rb.height > 26) fatRadio++;      // ο καθολικός κανόνας θα έδινε ~100%
          if (ob.height < 43.5) tooSmall++;                      // touch target iOS
          if (sp) {
            const sb = sp.getBoundingClientRect();
            if (sb.right > ob.right + 1 || sb.left < ob.left - 1 || sb.bottom > ob.bottom + 1) outside++;
          }
        });
        const box = document.querySelector('.rulesbox');
        const acts = document.querySelector('.modal .acts');
        const wide = [...opts].filter(o => o.getBoundingClientRect().width > box.clientWidth + 1).length;
        return {
          n: opts.length, outside, tooSmall, fatRadio, wide,
          docOver: Math.round(document.documentElement.scrollWidth) - window.innerWidth,
          boxScrollX: box.scrollWidth - box.clientWidth,
          scrollable: box.scrollHeight > box.clientHeight,
          modalFits: document.querySelector('.modal').getBoundingClientRect().height <= window.innerHeight + 1,
          actsIn: acts.getBoundingClientRect().bottom <= window.innerHeight + 1,
          textareas: [...document.querySelectorAll('.fbtext')].every(t => t.getBoundingClientRect().width <= box.clientWidth + 1),
        };
      });
      ok(q.n === 57, tag + ' — ερωτηματολόγιο: όλες οι επιλογές αποδόθηκαν (' + q.n + ')');
      ok(q.outside === 0, tag + ' — ΚΑΝΕΝΑ label δεν βγαίνει έξω από το card (' + q.outside + ')');
      ok(q.fatRadio === 0, tag + ' — κανένα radio δεν «φουσκώνει» σε ολόκληρο το card');
      ok(q.tooSmall === 0, tag + ' — κάθε επιλογή ≥44px touch target');
      ok(q.wide === 0, tag + ' — καμία επιλογή πλατύτερη από τον γονέα');
      ok(q.docOver <= 1 && q.boxScrollX === 0, tag + ' — μηδέν οριζόντιο scroll (doc ' + q.docOver + ', box ' + q.boxScrollX + ')');
      ok(q.scrollable, tag + ' — το ερωτηματολόγιο κάνει ΚΑΘΕΤΟ scroll (14 ερωτήσεις)');
      ok(q.modalFits && q.actsIn, tag + ' — modal εντός viewport, Αποστολή/Άκυρο προσβάσιμα');
      ok(q.textareas, tag + ' — το textarea της Q14 δεν ξεπερνά το πλάτος');

      // selected state + όλο το card clickable (κλικ στο ΚΕΙΜΕΝΟ, όχι στο radio)
      const sel = await F.evaluate(() => {
        const o = document.querySelectorAll('.fbopt')[1];
        const sp = o.querySelector('span'), r = sp.getBoundingClientRect();
        document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).click();
        const cs = getComputedStyle(o);
        return { checked: o.querySelector('input').checked, border: cs.borderColor, bg: cs.backgroundColor };
      });
      ok(sel.checked, tag + ' — κλικ στο ΚΕΙΜΕΝΟ επιλέγει (όλο το card είναι tappable)');
      ok(sel.bg !== 'rgb(10, 19, 32)', tag + ' — η επιλεγμένη επιλογή έχει ορατό selected state');
      await ctxF.close();
    }

    // πολύ μακρύ label: πρέπει να σπάει μέσα στο card, όχι να ξεφεύγει
    const ctxL = await newCtx(360, 780, true);
    const L = await ctxL.newPage();
    await goHome(L);
    const longFit = await L.evaluate(() => {
      window.IQ_UI.showFeedback();
      const o = document.querySelector('.fbopt'), sp = o.querySelector('span');
      sp.textContent = 'Πολύ μεγάλη απάντηση με πάρα πολλές λέξεις που κανονικά θα ξεχείλιζε οριζόντια έξω από το κουτί της επιλογής';
      const ob = o.getBoundingClientRect(), sb = sp.getBoundingClientRect();
      return { inside: sb.right <= ob.right + 1 && sb.bottom <= ob.bottom + 1, lines: Math.round(sb.height / 18),
        docOver: Math.round(document.documentElement.scrollWidth) - window.innerWidth };
    });
    ok(longFit.inside, 'ΜΑΚΡΥ label: παραμένει ΜΕΣΑ στο card (σπάει σε ' + longFit.lines + ' γραμμές)');
    ok(longFit.docOver <= 1, 'ΜΑΚΡΥ label: κανένα οριζόντιο overflow σελίδας');
    await ctxL.close();

    // ================= TOASTS: compact stacking σε mobile + dedupe + καθαρισμός
    for (const [w, h, tag, maxExpected] of [[390, 844, 'mobile 390', 2], [1280, 900, 'desktop', 3]]) {
      const ctxT = await newCtx(w, h, w < 500);
      const TP = await ctxT.newPage();
      await TP.setViewportSize({ width: w, height: h });
      await goHome(TP);
      const st = await TP.evaluate(() => {
        const T = window.IQ_TEST, box = document.getElementById('toasts');
        ['📈 Πληθωρισμός 5%: τα μηνιαία έξοδα όλων των παικτών αυξήθηκαν κατά 5%, όπως και όλες οι κάρτες Lifestyle.',
          '⚠️ Δεν υπάρχει εκκρεμής απόφαση.', '⚠️ Δεν υπάρχει εκκρεμής απόφαση.',
          '👑 Τρίτο μήνυμα', 'Τέταρτο', 'Πέμπτο'].forEach(m => T.toast(m));
        const kids = [...box.children], r = box.getBoundingClientRect();
        return {
          n: kids.length,
          dupes: kids.length - new Set(kids.map(k => k.textContent)).size,
          overlap: kids.some((k, i) => i > 0 && k.getBoundingClientRect().top < kids[i - 1].getBoundingClientRect().bottom - 1),
          gapOk: kids.every((k, i) => i === 0 || k.getBoundingClientRect().top - kids[i - 1].getBoundingClientRect().bottom >= 4),
          pct: Math.round(r.height / window.innerHeight * 100),
          wOk: r.width <= window.innerWidth - 10,
          clipped: kids.some(k => k.scrollWidth > k.clientWidth + 1 || k.scrollHeight > k.clientHeight + 1),
          docOver: Math.round(document.documentElement.scrollWidth) - window.innerWidth,
        };
      });
      ok(st.n === maxExpected, tag + ' — η στοίβα περιορίζεται σε ' + maxExpected + ' (βρέθηκαν ' + st.n + ')');
      ok(st.dupes === 0, tag + ' — κανένα διπλότυπο toast');
      ok(!st.overlap && st.gapOk, tag + ' — σωστό spacing, καμία επικάλυψη');
      ok(!st.clipped, tag + ' — κανένα μήνυμα δεν κόβεται (σωστό wrapping)');
      ok(st.wOk && st.docOver <= 1, tag + ' — σωστό max-width, μηδέν overflow');
      if (w < 500) ok(st.pct <= 40, tag + ' — τα toasts καλύπτουν μόνο ' + st.pct + '% της οθόνης');

      // cleanup: εξαφανίζονται με την ΥΠΑΡΧΟΥΣΑ χρονική λογική (4200 + 400ms)
      await TP.waitForTimeout(4900);
      const left = await TP.evaluate(() => document.getElementById('toasts').children.length);
      ok(left === 0, tag + ' — τα toasts καθαρίζονται μόνα τους (' + left + ' έμειναν)');
      await ctxT.close();
    }

    // ================= «Δεν υπάρχει εκκρεμής απόφαση»: root-cause regression
    const ctxD = await newCtx(390, 844, true);
    const D = await ctxD.newPage();
    await goHome(D);
    await D.fill('#playerName', 'Δ');
    await D.click('#btnCreate');
    await D.waitForFunction(() => /^[A-Z2-9]{4}$/.test(document.getElementById('lobbyCode').textContent), null, { timeout: 15000 });
    await D.evaluate(() => document.getElementById('btnStart').click());
    await D.waitForFunction(() => window.IQ_TEST && window.IQ_TEST.App.game, null, { timeout: 15000 });
    const dbl = await D.evaluate(() => {
      const T = window.IQ_TEST, out = {};
      // 1) τριπλό tap στην ΙΔΙΑ απόφαση → μία μόνο ενέργεια φεύγει
      T.App.game.pending = { type: 'reveal', special: 'inflation', playerId: T.App.myId };
      let sent = 0;
      const orig = window.IQ_ENGINE.applyAction;
      window.IQ_ENGINE.applyAction = function (g, pid, a) { if (a && a.a === 'resolve') sent++; return orig.apply(this, arguments); };
      T.act({ a: 'resolve', choice: 'ok' }); T.act({ a: 'resolve', choice: 'ok' }); T.act({ a: 'resolve', choice: 'ok' });
      out.sentForSamePending = sent;
      // 2) resolve χωρίς καμία απόφαση → ΔΕΝ φεύγει καθόλου (άρα ούτε error toast)
      T.App.game.pending = null; T.App._resolveSent = null;
      sent = 0; document.getElementById('toasts').innerHTML = '';
      T.act({ a: 'resolve', choice: 'ok' });
      out.sentWithoutPending = sent;
      out.toasts = document.getElementById('toasts').children.length;
      // 3) ΝΕΑ απόφαση → ξεκλειδώνει κανονικά
      T.App.game.pending = { type: 'reveal', special: 'crash', playerId: T.App.myId };
      sent = 0; T.act({ a: 'resolve', choice: 'ok' });
      out.newPendingWorks = sent;
      window.IQ_ENGINE.applyAction = orig;
      return out;
    });
    ok(dbl.sentForSamePending === 1, 'resolve: τριπλό tap στην ίδια κάρτα → 1 ενέργεια (ήταν 3)');
    ok(dbl.sentWithoutPending === 0 && dbl.toasts === 0, 'resolve χωρίς pending: καμία ενέργεια, ΚΑΝΕΝΑ «Δεν υπάρχει εκκρεμής απόφαση»');
    ok(dbl.newPendingWorks === 1, 'ΝΕΑ απόφαση ξεκλειδώνει κανονικά (δεν κολλάει ο παίκτης)');

    // stale modal: όσο τρέχει animation χωρίς pending, η παλιά κάρτα ΚΛΕΙΝΕΙ...
    const stale = await D.evaluate(() => {
      const T = window.IQ_TEST, ov = document.getElementById('overlay');
      T.App.localModal = null;
      ov.classList.remove('hidden');
      T.App.game.pending = null;
      T.App.anim = { playerId: T.App.myId, at: 0, to: 3, remaining: 3, phase: 'walk' };
      T.render();
      const closed = ov.classList.contains('hidden');
      // ...αλλά ΤΑ ΠΛΗΡΟΦΟΡΙΑΚΑ dialogs (Κανόνες/Ερωτηματολόγιο) ΔΕΝ κλείνουν
      ov.classList.remove('hidden'); T.App.localModal = true;
      T.render();
      const kept = !ov.classList.contains('hidden');
      T.App.anim = null; T.App.localModal = null; T.closeOverlay();
      return { closed, kept };
    });
    ok(stale.closed, 'stale modal: η λυμένη κάρτα κλείνει και όσο τρέχει animation');
    ok(stale.kept, 'stale modal: Κανόνες/Ερωτηματολόγιο ΔΕΝ κλείνουν (App.localModal)');
    await ctxD.close();

    // ================= INTRO BANNER (Αύγουστος 2.4) — ΠΡΑΓΜΑΤΙΚΗ συμπεριφορά στον browser.
    // Το tests/intro-regression.test.js καλύπτει source/controller· εδώ ελέγχουμε ό,τι μόνο
    // ένας browser μπορεί: ορατότητα, overflow, αλλαγή γλώσσας ΕΝΩ είναι ανοιχτό, dismiss με
    // tap, χρησιμότητα της αρχικής μετά, και ότι ΤΙΠΟΤΑ δεν το ξανανοίγει.
    // ΠΡΟΣΟΧΗ: δεν χρησιμοποιούμε goHome() εδώ — αυτό ακριβώς το κλείνει.
    for (const [w, h, tag, touch] of [[1280, 900, 'desktop', false], [430, 932, 'mobile 430', true],
                                      [390, 844, 'mobile 390', true], [360, 780, 'mobile 360', true],
                                      [320, 700, 'mobile 320', true], [740, 360, 'landscape 740×360', true]]) {
      const ctxI = await newCtx(w, h, touch);
      const N = await ctxI.newPage();
      await N.setViewportSize({ width: w, height: h });
      await N.goto('http://localhost:' + PORT + '/');
      await N.waitForTimeout(350);

      const shown = await N.evaluate(() => {
        const o = document.getElementById('introOverlay'), bn = document.getElementById('introBanner');
        const ob = o.getBoundingClientRect(), bb = bn.getBoundingClientRect();
        return {
          visible: !o.classList.contains('hidden') && getComputedStyle(o).display !== 'none',
          aria: o.getAttribute('aria-hidden'),
          hasCopy: /I QUIT!/.test(bn.innerText) && bn.innerText.length > 80,
          fitsX: bb.width <= ob.width + 1,
          docOver: Math.round(document.documentElement.scrollWidth - window.innerWidth),
          tallOk: bb.height <= window.innerHeight || o.scrollHeight > o.clientHeight,
          focus: document.activeElement && document.activeElement.id,
          // ΟΡΙΖΟΝΤΙΟ ΚΕΝΤΡΑΡΙΣΜΑ: τα δύο ΕΞΩΤΕΡΙΚΑ κενά πρέπει να είναι ίσα
          gapL: Math.round(bb.left),
          gapR: Math.round(document.documentElement.clientWidth - bb.right),
          borderVisible: bb.left >= 0 && bb.right <= document.documentElement.clientWidth + 0.5,
        };
      });
      ok(Math.abs(shown.gapL - shown.gapR) <= 2, tag + ' intro: κεντραρισμένο οριζόντια — κενό αριστερά '
        + shown.gapL + 'px, δεξιά ' + shown.gapR + 'px');
      ok(shown.borderVisible, tag + ' intro: ολόκληρο το border του card είναι ορατό');
      ok(shown.visible && shown.aria === 'false', tag + ' intro: εμφανίζεται σε κάθε full page load');
      ok(shown.hasCopy, tag + ' intro: το κείμενο αποδίδεται');
      ok(shown.docOver <= 1 && shown.fitsX, tag + ' intro: μηδέν οριζόντιο overflow (' + shown.docOver + 'px)');
      ok(shown.tallOk, tag + ' intro: όταν δεν χωράει κάθετα, το overlay scrollάρει');
      ok(shown.focus === 'introBanner', tag + ' intro: το banner παίρνει focus (a11y)');

      // αλλαγή γλώσσας ΕΝΩ είναι ανοιχτό → ενημερώνεται, ΔΕΝ κλείνει
      const el0 = await N.evaluate(() => document.getElementById('introBanner').innerText);
      await N.click('#btnLangHome'); await N.waitForTimeout(200);
      const en = await N.evaluate(() => ({ txt: document.getElementById('introBanner').innerText,
        open: !document.getElementById('introOverlay').classList.contains('hidden') }));
      ok(en.open && /financial literacy/i.test(en.txt) && en.txt !== el0, tag + ' intro: EN ενημέρωση χωρίς να κλείσει');
      await N.click('#btnLangHome'); await N.waitForTimeout(200);
      ok(/οικονομικού αλφαβητισμού/.test(await N.evaluate(() => document.getElementById('introBanner').innerText)),
        tag + ' intro: επιστροφή σε EL');

      // dismiss με tap/click ΠΑΝΩ στο banner
      if (touch) await N.tap('#introBanner'); else await N.click('#introBanner');
      await N.waitForTimeout(200);
      const gone = await N.evaluate(() => {
        const o = document.getElementById('introOverlay'), btn = document.getElementById('btnCreate');
        const r = btn.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { hidden: o.classList.contains('hidden'), display: getComputedStyle(o).display,
          aria: o.getAttribute('aria-hidden'), top: top ? (top.id || top.className) : 'null',
          focus: document.activeElement && document.activeElement.id };
      });
      ok(gone.hidden && gone.display === 'none' && gone.aria === 'true', tag + ' intro: κλείνει με ' + (touch ? 'tap' : 'click') + ' στο banner');
      ok(gone.top === 'btnCreate', tag + ' intro: η αρχική είναι ξανά πλήρως χρησιμοποιήσιμη');
      ok(gone.focus === 'btnCreate', tag + ' intro: το focus περνά στο επόμενο ενεργό στοιχείο');

      // ΤΙΠΟΤΑ δεν το ξανανοίγει
      await N.click('#btnLangHome'); await N.waitForTimeout(150);
      const reopened = await N.evaluate(() => {
        const isOpen = () => !document.getElementById('introOverlay').classList.contains('hidden');
        const afterLang = isOpen();
        window.IQ_INTRO.render();
        if (window.IQ_INTRO.controller) window.IQ_INTRO.controller.refresh();
        const afterRender = isOpen();
        window.IQ_INTRO.mount(document);
        return { afterLang, afterRender, afterMount: isOpen() };
      });
      ok(!reopened.afterLang, tag + ' intro: αλλαγή γλώσσας ΜΕΤΑ το κλείσιμο δεν το ξανανοίγει');
      ok(!reopened.afterRender, tag + ' intro: internal rerender/refresh δεν το ξανανοίγει');
      ok(!reopened.afterMount, tag + ' intro: δεύτερο mount() δεν το ξανανοίγει');
      await ctxI.close();
    }

    // κάθε ΝΕΟ full load το ξαναδείχνει — χωρίς localStorage/cookie
    const ctxR3 = await newCtx(390, 844, true);
    const N2 = await ctxR3.newPage();
    // ΜΕ e2e params (χρειάζεται το IQ_TEST hook παρακάτω) αλλά ΧΩΡΙΣ goHome, ώστε το intro να φανεί
    await N2.goto('http://localhost:' + PORT + '/?e2e=1&fast=1&transport=peer');
    await N2.waitForTimeout(300);
    await N2.tap('#introBanner'); await N2.waitForTimeout(150);
    await N2.reload(); await N2.waitForTimeout(600);
    const persisted = await N2.evaluate(() => ({
      visible: !document.getElementById('introOverlay').classList.contains('hidden'),
      keys: Object.keys(localStorage).filter(k => /intro/i.test(k)),
      cookie: /intro/i.test(document.cookie),
    }));
    ok(persisted.visible, 'intro: εμφανίζεται ΞΑΝΑ μετά από reload (κάθε full page load)');
    ok(persisted.keys.length === 0 && !persisted.cookie, 'intro: κανένα localStorage/cookie για μόνιμο dismissal');

    // δεν επηρεάζει ερωτηματολόγιο / λογαριασμό / παρτίδα
    const untouched = await N2.evaluate(() => {
      window.IQ_INTRO.dismiss();
      window.IQ_UI.showFeedback();
      const fb = document.querySelectorAll('.fbopt').length;
      window.IQ_TEST.closeOverlay();
      return { fb, hasScoring: !!window.IQ_SCORING, hasLb: !!window.IQ_LEADERBOARD, hasAcc: !!window.IQ_ACCOUNT };
    });
    ok(untouched.fb === 57, 'intro: το ερωτηματολόγιο λειτουργεί κανονικά μετά το intro');
    await N2.fill('#playerName', 'Ι');
    await N2.click('#btnCreate');
    await N2.waitForFunction(() => /^[A-Z2-9]{4}$/.test(document.getElementById('lobbyCode').textContent), null, { timeout: 15000 });
    await N2.evaluate(() => document.getElementById('btnStart').click());
    await N2.waitForFunction(() => window.IQ_TEST && window.IQ_TEST.App.game, null, { timeout: 15000 });
    const play = await N2.evaluate(() => ({ started: !!window.IQ_TEST.App.game,
      introHidden: document.getElementById('introOverlay').classList.contains('hidden') }));
    ok(play.started && play.introHidden, 'intro: η παρτίδα ξεκινά κανονικά και το intro μένει κλειστό');
    await ctxR3.close();
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
