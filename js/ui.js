/* I QUIT! Online — UI controller.
   Host: τρέχει engine + bots, κάνει broadcast state. Guest: στέλνει actions, κάνει render το snapshot. */
(function () {
  'use strict';
  // Αύγουστος 1.2: Firebase default· PeerJS μόνο με ?transport=peer.
  // Το ρητό ?transport=firebase διατηρείται για συμβατότητα με ήδη μοιρασμένα links.
  const TPORT = window.IQ_TRANSPORT;
  const TRANSPORT_INFO = TPORT.select(location.search);
  const FB_TRANSPORT = TRANSPORT_INFO.mode === 'firebase';
  document.documentElement.dataset.transport = TRANSPORT_INFO.mode; // διαγνωστικό/e2e, χωρίς αλλαγή ροής
  const E = window.IQ_ENGINE, BOTS = window.IQ_BOTS, NET = FB_TRANSPORT ? window.IQ_NET_FB : window.IQ_NET, CARDS = window.IQ_CARDS, I = window.IQ_I18N;
  const $ = (id) => document.getElementById(id);
  const fmt = E.fmt;
  const t = I.t;
  // Τίτλος κάρτας/επένδυσης στη γλώσσα του παίκτη (τα inv κρατούν το ελληνικό snapshot — κοιτάμε την κάρτα)
  function invTitle(i) { const c = i.cardId && E.card(i.cardId); return c ? I.cardTitle(c) : i.title; }

  // v0.5: επώνυμα bots με στρατηγική — αυτά επιλέγει ο host στο lobby
  // v1.9: ένα bot ανά χαρακτήρα (έφυγαν τα διπλά Ηλέκτρα/Φοίβος/Ορφέας)
  const BOT_ROSTER = [
    { name: 'Ίκαρος', strategy: 'aggressive' },
    { name: 'Καλυψώ', strategy: 'balanced' },
    { name: 'Δανάη', strategy: 'defensive' },
    { name: 'Κροίσος', strategy: 'tycoon' },
    { name: 'Ερμής', strategy: 'stockpicker' },
    { name: 'Αθηνά', strategy: 'scholar' },
  ];
  // v1.8: fast mode για automated tests (?fast=1) — μικρά διαστήματα heartbeat/migration/bots
  const FAST = /[?&]fast=1/.test(location.search);
  const BOT_DELAY = FAST ? 900 : 5200, DISCO_DELAY = FAST ? 3000 : 25000; // αρκετό ώστε να ολοκληρώνεται το πιο αργό βήμα-βήμα animation
  const HB_MS = FAST ? 1200 : 5000;          // κάθε πότε «χτυπά» ο host
  const HB_LOST_MS = FAST ? 4000 : 15000;    // πόση σιωπή = χαμένος host
  const MIG_BASE_MS = FAST ? 2500 : 12000;   // αναμονή πριν το takeover (πρώτος διάδοχος)
  const MIG_STEP_MS = FAST ? 4000 : 10000;   // επιπλέον αναμονή ανά επόμενο διάδοχο
  const HOST_KEY = 'iquit_host_v1', GUEST_KEY = 'iquit_guest_v1', NAME_KEY = 'iquit_name';
  const PAWNS = ['🐎', '🚗', '✈️', '🚢', '👟', '💰', '₿', '€', '$'];

  const App = {
    role: null, myId: null, net: null,
    lobby: null,      // host: {code, players:[{id,name,isBot,connected,clientId,token,pawn}]}
    game: null,
    botTimer: null,
    lastToastSeq: 0,
    localModal: null, // client-side modal (π.χ. πώληση funding)
    guestRetry: null,
    chat: [],
    myPawn: localStorage.getItem('iquit_pawn') || null,
    guestLobby: null, // τελευταίο lobby snapshot (guest)
    anim: null, lastAnimSeq: null,
    tipFor: null,     // v1.28: ποιο κομμένο όνομα έχει ανοιχτό popover (singleton)
    logOpen: localStorage.getItem('iquit_log') !== '0',
    muted: localStorage.getItem('iquit_mute') === '1',
    board3d: localStorage.getItem('iquit_3d') !== null ? localStorage.getItem('iquit_3d') === '1' : (typeof window !== 'undefined' && window.innerWidth >= 900),
  };

  // ============================================================ ΗΧΟΙ (WebAudio — χωρίς αρχεία)
  let _ac = null;
  function ac() { if (!_ac) { try { _ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return _ac; }
  function beep(freq, dur, type, gain, when) {
    const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(gain || 0.06, a.currentTime + (when || 0));
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + (when || 0) + dur);
    o.connect(g); g.connect(a.destination);
    o.start(a.currentTime + (when || 0)); o.stop(a.currentTime + (when || 0) + dur + 0.02);
  }
  function noiseBurst(dur, freq, gain, when) {
    const a = ac(); if (!a) return;
    const len = Math.max(1, Math.floor(a.sampleRate * dur));
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = a.createGain(); g.gain.value = gain || 0.08;
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start(a.currentTime + (when || 0));
  }
  function sweep(f1, f2, dur, type, gain, when) {
    const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sawtooth';
    o.frequency.setValueAtTime(f1, a.currentTime + (when || 0));
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), a.currentTime + (when || 0) + dur);
    g.gain.setValueAtTime(gain || 0.05, a.currentTime + (when || 0));
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + (when || 0) + dur);
    o.connect(g); g.connect(a.destination);
    o.start(a.currentTime + (when || 0)); o.stop(a.currentTime + (when || 0) + dur + 0.02);
  }
  // v0.6: κάθε πιόνι έχει τον δικό του ήχο βημάτων
  function pawnStepSound(pawn) {
    switch (pawn) {
      case '🐎': // καλπασμός: διπλό χαμηλό "κλοπ"
        noiseBurst(.045, 320, .12); noiseBurst(.04, 260, .09, .09); break;
      case '🚗': // γκάζι: σύντομο rev
        sweep(75, 190, .16, 'sawtooth', .05); break;
      case '✈️': // whoosh
        noiseBurst(.16, 1800, .05); sweep(300, 900, .16, 'sine', .02); break;
      case '🚢': // καραβίσια κόρνα (κοντή)
        beep(98, .14, 'sine', .07); beep(147, .12, 'sine', .04, .01); break;
      case '👟': // βήμα παπουτσιού: σκουπ
        noiseBurst(.05, 900, .1); break;
      case '💰': case '₿': case '€': case '$': // κέρματα: κλινκ
        beep(1900 + Math.random() * 500, .05, 'sine', .05); beep(2600, .07, 'sine', .035, .03); break;
      default: // γράμμα/🤖: το κλασικό τικ
        beep(App._stepAlt ? 900 : 700, .045, 'square', .045); App._stepAlt = !App._stepAlt;
    }
  }
  // v1.3: «νότα εκκλησιαστικού οργάνου» — θεμελίωση + υποοκτάβα + αρμονική, για δραματικό χαρακτήρα
  function organNote(f, dur, when, g) {
    beep(f, dur, 'sawtooth', (g || .05) * .45, when);   // σώμα
    beep(f / 2, dur, 'sine', (g || .05), when);          // υποοκτάβα (βάθος)
    beep(f * 2.004, dur, 'sine', (g || .05) * .22, when); // αρμονική, ελαφρά detuned (organ feel)
  }
  function sound(kind, pawn) {
    if (App.muted) return;
    try {
      if (kind === 'dice') { [0, .09, .19, .3, .42].forEach((t) => noiseBurst(.05, 700 + Math.random() * 900, .07, t)); }
      else if (kind === 'step') { pawnStepSound(pawn); }
      else if (kind === 'land') { beep(500, .1, 'triangle', .07); beep(750, .12, 'triangle', .06, .08); }
      else if (kind === 'win') { [523, 659, 784, 1047].forEach((f, i) => beep(f, .18, 'triangle', .08, i * .13)); }
      else if (kind === 'chat') { beep(1200, .05, 'sine', .04); }
      else if (kind === 'inflation') {
        // v1.3: δραματικό ΚΑΤΗΦΟΡΙΚΟ μοτίβο οργάνου σε ρε ελάσσονα (~3.5s, πρωτότυπο,
        // στο πνεύμα «Phantom of the Opera»): Λα–Σολ–Φα–Μι ↓ και σκοτεινή συγχορδία ρε ελάσσονα
        organNote(440.00, .38, 0.00, .055); // Λα4
        organNote(392.00, .38, 0.40, .055); // Σολ4
        organNote(349.23, .38, 0.80, .055); // Φα4
        organNote(329.63, .55, 1.20, .055); // Μι4
        // τελική συγχορδία: Ρε ελάσσων, χαμηλά και βαριά
        organNote(146.83, 1.7, 1.85, .07);  // Ρε3
        organNote(220.00, 1.7, 1.85, .05);  // Λα3
        organNote(349.23, 1.7, 1.85, .035); // Φα4
        noiseBurst(.5, 90, .04, 1.85);      // υπόκωφο «μπουμ»
      }
    } catch (e) {}
  }

  // ============================================================ HELPERS
  function show(screen) {
    ['home', 'lobby', 'game'].forEach(s => $('screen-' + s).classList.toggle('hidden', s !== screen));
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function myName() { return ($('playerName').value || '').trim() || 'Παίκτης'; }
  function me() { return App.game && App.game.players.find(p => p.id === App.myId); }
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.innerHTML = msg;
    const box = $('toasts');
    box.appendChild(t);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; setTimeout(() => t.remove(), 400); }, 4200);
  }
  function homeErr(msg) { const e = $('homeErr'); e.textContent = msg; e.style.display = 'block'; }

  // ============================================================ CHAT
  function addChat(item, silent) {
    App.chat.push(item);
    if (App.chat.length > 80) App.chat.splice(0, App.chat.length - 80);
    renderChat();
    if (!silent && item.from !== App.myId) sound('chat');
  }
  function renderChat() {
    const el = $('chatLog');
    if (!el) return;
    el.innerHTML = App.chat.length
      ? App.chat.map(m => '<div class="chatmsg"><b style="color:' + (m.color || 'var(--accent)') + '">' + esc(m.name) + ':</b> ' + esc(m.text) + '</div>').join('')
      : '<div class="muted">' + t('chatHello') + '</div>';
    el.scrollTop = el.scrollHeight;
  }
  function sendChat() {
    if (App.role === 'tour') return; // v1.15: demo συνομιλία μόνο για ανάγνωση
    const inp = $('chatInput');
    const text = (inp.value || '').trim().slice(0, 200);
    if (!text) return;
    inp.value = '';
    if (App.role === 'guest') { App.net.send({ t: 'chat', text }); return; }
    hostChat(App.myId, text);
  }
  function hostChat(playerId, text) {
    const pl = App.lobby.players.find(x => x.id === playerId);
    if (!pl) return;
    const gp = App.game && App.game.players.find(x => x.id === playerId);
    const item = { from: playerId, name: pl.name, color: (gp && gp.color) || 'var(--accent)', text, ts: Date.now() };
    addChat(item, playerId === App.myId);
    App.net && App.net.broadcast({ t: 'chat', item });
    saveHostSession();
  }

  // ============================================================ ΚΙΝΗΣΗ ΠΙΟΝΙΟΥ ΒΗΜΑ-ΒΗΜΑ
  function checkAnim(g) {
    // v0.7: baseline στο ΠΡΩΤΟ state — αν δεν έχει γίνει ζαριά ακόμα, βάλε -1 ώστε
    // να παίξει animation και η ΠΡΩΤΗ ζαριά (πριν: χανόταν). Σε reconnect (υπάρχει ήδη
    // lastRoll) η τρέχουσα ζαριά δεν ξανα-παίζεται.
    if (App.lastAnimSeq === null) { App.lastAnimSeq = g.lastRoll ? g.lastRoll.seq : -1; if (g.lastRoll) return; }
    const lr = g.lastRoll;
    if (!lr || g.phase !== 'playing') return;
    if (lr.seq !== App.lastAnimSeq) {
      App.lastAnimSeq = lr.seq;
      const steps = (lr.to - lr.from + 28) % 28;
      if (steps > 0) {
        // v0.6: πρώτα τα ζάρια "γυρνάνε" με αγωνία, μετά αποκαλύπτονται, μετά περπατάει το πιόνι
        App.anim = { playerId: lr.playerId, at: lr.from, to: lr.to, remaining: steps, phase: 'dice' };
        App.animStartedAt = Date.now(); // v1.7: για το watchdog κολλημένων animations (mobile)
        sound('dice');
        render(); // ζωγραφίζει τα ζάρια σε κατάσταση "rolling"
        let spins = 0;
        const spinTimer = setInterval(() => {
          spins++;
          const dies = document.querySelectorAll('#boardCenter .die');
          dies.forEach(d => { d.textContent = 1 + Math.floor(Math.random() * 6); });
          if (spins >= 12) { // ~1,3s αγωνία
            clearInterval(spinTimer);
            if (App.anim) App.anim.phase = 'move';
            sound('land');
            render(); // αποκάλυψη πραγματικής ζαριάς
            setTimeout(tickAnim, 500);
          }
        }, 110);
      }
    }
  }
  function tickAnim() {
    if (!App.anim || !App.game) { App.anim = null; return; }
    App.anim.at = (App.anim.at + 1) % 28;
    App.anim.remaining--;
    const mover = App.game.players.find(x => x.id === App.anim.playerId);
    if (App.anim.remaining <= 0) sound('land');
    else sound('step', mover && mover.pawn);
    renderBoard(App.game);
    if (App.anim.remaining <= 0) {
      // v0.7 (#1): το πιόνι ΠΑΤΑΕΙ το κουτάκι και μένει εκεί λίγο —
      // η κάρτα/απόφαση ανοίγει ΜΕΤΑ, όχι ενώ ακόμα προσγειώνεται.
      setTimeout(() => { App.anim = null; render(); maybeToastNewLog(); }, 750);
      return;
    }
    setTimeout(tickAnim, 340); // v0.5: πιο αργό βήμα για να φαίνεται η διαδρομή
  }

  // ============================================================ ACTIONS (κοινό μονοπάτι host/guest)
  function act(action) {
    if (App.role === 'tour') return; // v1.15: στην Ξενάγηση τίποτα δεν εκτελείται
    if (App.role === 'guest') { App.net.act(action); return; }
    applyAs(App.myId, action);
  }

  function applyAs(playerId, action) {
    if (!App.game || !action) return;
    App._lastActorId = playerId; // v1.17: ποιος ΕΚΑΝΕ την ενέργεια (για σωστή απόδοση των hints)
    const r = E.applyAction(App.game, playerId, action);
    if (r && r.error) {
      if (playerId === App.myId) toast('⚠️ ' + esc(r.error));
      else if (App.role === 'host') sendToPlayer(playerId, { t: 'err', msg: r.error });
      return;
    }
    afterChange();
  }

  function afterChange() {
    updateHintState(); // v1.13: ο host αποφασίζει ποιο hint είναι ενεργό ΠΡΙΝ το broadcast
    saveHostSession();
    broadcastState();
    render();
    maybeToastNewLog();
    scheduleAuto();
  }

  // v1.13 (αίτημα Γιώργου): κάθε εκπαιδευτικό hint εμφανίζεται ΜΙΑ ΦΟΡΑ σε όλο το παιχνίδι
  // (σε όλους τους παίκτες ταυτόχρονα, την πρώτη φορά που ο μηχανισμός συμβαίνει σε
  // ΟΠΟΙΟΝΔΗΠΟΤΕ) και μένει ορατό μέχρι ο παίκτης που τον σκανδάλισε να δώσει τη σειρά του.
  // v1.17: ΜΟΝΟ αυτά τα συννεφάκια επιτρέπονται (λίστα Γιώργου + 3 χρώματα + χρηματοδοτήσεις).
  // Καθένα εμφανίζεται ΜΙΑ φορά σε όλο το παιχνίδι, για όλους.
  const HINTABLE = { PG: 1, PY: 1, PR: 1, funding: 1, bb: 1, project: 1, crash: 1, moments: 1, inflation: 1, lifestyle: 1, tax: 1, salary: 1, savings: 1, ffail: 1 };

  function updateHintState() {
    if (App.role !== 'host' || !App.game || App.game.phase !== 'playing') return;
    const g = App.game;
    if (!g.hintSeen) g.hintSeen = {};
    // Νέες εγγραφές ιστορικού ΑΥΤΗΣ της ενέργειας — όχι σάρωση παλιών (v1.16 bug:
    // παλιά lg_collect πυροδοτούσαν το «SALARY» πάνω σε άσχετα κουτιά/κάρτες)
    const prevSeq = App._hintSeq || 0;
    const freshCount = Math.max(0, Math.min(g.log.length, g.logSeq - prevSeq));
    const fresh = freshCount ? g.log.slice(-freshCount) : [];
    App._hintSeq = g.logSeq;

    // 1) Υποψήφιο ΜΟΝΟ από το ανοιχτό pending — ό,τι βλέπει μπροστά του ο παίκτης
    const pend = g.pending;
    let k = pend ? hintKeyFor(pend) : null;
    if (pend && pend.type === 'card' && pend.deck === 'project') {
      // Κάρτες Project: πρώτα η γενική εξήγηση «PROJECT»· μετά ΜΟΝΟ χρώματα/χρηματοδοτήσεις
      if (!g.hintSeen.project) k = 'project';
      else if (!HINTABLE[k]) k = null; // ομόλογα/μεταπτυχιακά/φόροι/δάνεια: κανένα συννεφάκι
    }
    if (k && !HINTABLE[k]) k = null; // εκτός λίστας (forced/offer κ.λπ.)
    if (k && !g.hintSeen[k]) {
      g.hintSeen[k] = true;
      g.hintActive = { k: k, playerId: pend.playerId, round: g.round };
    }

    // 2) Λήξη: όταν η δράση περάσει σε ΑΛΛΟΝ παίκτη — ή σε νέο γύρο (κάλυψη solo,
    // όπου ο παίκτης δεν αλλάζει ποτέ)
    if (g.hintActive) {
      const actorNow = pend ? pend.playerId : (g.players[g.turn] && g.players[g.turn].id);
      if (actorNow !== g.hintActive.playerId || (g.hintActive.round != null && g.round !== g.hintActive.round)) g.hintActive = null;
    }

    // 3) Salary/Tax (χωρίς «απόφαση»): ΜΟΝΟ αν συνέβησαν ΣΕ ΑΥΤΗ την ενέργεια
    //    και ΔΕΝ υπάρχει ανοιχτό modal — ώστε το συννεφάκι να ταιριάζει με ό,τι βλέπεις
    if (!g.hintActive && !pend && App._lastActorId) {
      if (!g.hintSeen.salary && fresh.some(e => e && e.k && e.k.indexOf('lg_collect') === 0)) {
        g.hintSeen.salary = true;
        g.hintActive = { k: 'salary', playerId: App._lastActorId, round: g.round };
      } else if (!g.hintSeen.tax && fresh.some(e => e && (e.k === 'lg_tax' || e.k === 'lg_taxNone' || e.k === 'lg_savTax'))) {
        g.hintSeen.tax = true;
        g.hintActive = { k: 'tax', playerId: App._lastActorId, round: g.round };
      }
    }
  }

  // ============================================================ HOST
  function hostCreate(resume, asId) {
    // v1.8: το asId επιτρέπει σε ΔΙΑΔΟΧΟ guest να γίνει host κρατώντας τη δική του ταυτότητα παίκτη
    const saved = resume ? JSON.parse(localStorage.getItem(HOST_KEY) || 'null') : null;
    App.role = 'host'; App.myId = asId || 'p0';
    const cbs = {
      onReady(code) {
        if (saved) {
          App.lobby = saved.lobby;
          App.game = saved.game;
          App.chat = saved.chat || [];
          App.lobby.players.forEach(p => { if (!p.isBot && p.id !== App.myId) p.connected = false; });
          // v1.8 BUGFIX: τα connected flags συγχρονίζονται ΚΑΙ στο game state — αλλιώς
          // οι απόντες δείχνουν «συνδεδεμένοι» και δεν παίζει ποτέ κανείς για αυτούς (stall)
          if (App.game) App.game.players.forEach(gp => {
            const lp = App.lobby.players.find(x => x.id === gp.id);
            gp.connected = gp.isBot ? true : !!(lp && lp.connected);
          });
        } else {
          App.lobby = { code, players: [{ id: 'p0', name: myName(), isBot: false, connected: true, clientId: null, token: NET.makeToken() }] };
        }
        if (App.migrating) { App.migrating = false; App.migAt = null; toast('👑 ' + t('nowHost')); }
        saveHostSession();
        if (App.game) { show('game'); render(); scheduleAuto(); }
        else { show('lobby'); renderLobby(); }
      },
      onError(msg, type) {
        // v1.8α: αποτυχία claim κατά τη ΜΕΤΑΒΑΣΗ (ο παλιός host επέστρεψε ή άλλος πρόλαβε) → πίσω σε guest
        if (type === 'unavailable-id' && App.migrating && App.migGuestSaved) {
          const s = App.migGuestSaved;
          App.migrating = false; App.migAt = null; App.role = 'guest';
          try { localStorage.setItem(GUEST_KEY, JSON.stringify(s)); localStorage.removeItem(HOST_KEY); } catch (e) {}
          guestJoin(s.code, s.token);
          return;
        }
        // v1.8β: ο ΠΑΛΙΟΣ host επιστρέφει αλλά το δωμάτιο συνεχίζεται από διάδοχο → μπαίνει ως παίκτης (p0)
        if (type === 'unavailable-id' && resume && saved && saved.game) {
          const me0 = saved.lobby.players.find(x => x.id === 'p0');
          if (me0 && me0.token) {
            App.role = 'guest'; App.myId = 'p0'; App.game = saved.game; App.chat = saved.chat || [];
            try { localStorage.setItem(GUEST_KEY, JSON.stringify({ code: saved.lobby.code, name: me0.name, token: me0.token, playerId: 'p0' })); localStorage.removeItem(HOST_KEY); } catch (e) {}
            toast('👑 ' + t('roomTakenJoin'));
            guestJoin(saved.lobby.code, me0.token);
            return;
          }
        }
        show('home'); homeErr(msg);
      },
      onHello(clientId, msg, send) {
        // Επανασύνδεση με token;
        const existing = App.lobby.players.find(p => p.token && p.token === msg.token);
        if (existing) {
          existing.connected = true; existing.clientId = clientId;
          if (msg.name) existing.name = String(msg.name).slice(0, 14);
          send({ t: 'welcome', playerId: existing.id, token: existing.token, code: App.lobby.code });
          send({ t: 'chatlog', items: App.chat });
          if (App.game) {
            const gp = App.game.players.find(p => p.id === existing.id);
            if (gp) gp.connected = true;
            send({ t: 'state', state: App.game });
            toast(t('reconn', { name: esc(existing.name) }));
            afterChange();
          } else broadcastLobby();
          return;
        }
        if (App.game) { send({ t: 'rejected', msg: 'Το παιχνίδι έχει ήδη ξεκινήσει σε αυτό το δωμάτιο.' }); return; }
        if (App.lobby.players.length >= 6) { send({ t: 'rejected', msg: 'Το δωμάτιο είναι γεμάτο (6 παίκτες).' }); return; }
        const id = 'p' + (App.lobby.players.reduce((m, p) => Math.max(m, +p.id.slice(1)), 0) + 1);
        let name = String(msg.name || 'Παίκτης').slice(0, 14);
        while (App.lobby.players.some(p => p.name === name)) name += '2';
        const pl = { id, name, isBot: false, connected: true, clientId, token: NET.makeToken(), pawn: null };
        App.lobby.players.push(pl);
        send({ t: 'welcome', playerId: id, token: pl.token, code: App.lobby.code });
        send({ t: 'chatlog', items: App.chat });
        saveHostSession(); broadcastLobby(); renderLobby();
      },
      onChat(clientId, text) {
        const pl = App.lobby.players.find(p => p.clientId === clientId);
        if (pl && text && typeof text === 'string') hostChat(pl.id, text.trim().slice(0, 200));
      },
      onPawn(clientId, pawn) {
        const pl = App.lobby.players.find(p => p.clientId === clientId);
        if (!pl || App.game || PAWNS.indexOf(pawn) === -1) return;
        if (App.lobby.players.some(x => x.pawn === pawn && x.id !== pl.id)) return; // πιασμένο
        pl.pawn = pawn;
        saveHostSession(); broadcastLobby(); renderLobby();
      },
      onAction(clientId, action) {
        const pl = App.lobby.players.find(p => p.clientId === clientId);
        if (pl && App.game) applyAs(pl.id, action);
      },
      onLeave(clientId) {
        const pl = App.lobby.players.find(p => p.clientId === clientId);
        if (!pl) return;
        pl.connected = false;
        if (!App.game) {
          App.lobby.players = App.lobby.players.filter(p => p !== pl);
          saveHostSession(); broadcastLobby(); renderLobby();
        } else {
          const gp = App.game.players.find(p => p.id === pl.id);
          if (gp) gp.connected = false;
          toast(t('disconn', { name: esc(pl.name) }));
          afterChange();
        }
      },
    };
    App.net = NET.createHost(cbs, saved ? saved.lobby.code : undefined);
  }

  function sendToPlayer(playerId, msg) {
    if (App.role !== 'host' || !App.net) return;
    const pl = App.lobby.players.find(p => p.id === playerId);
    if (pl && pl.clientId) App.net.sendTo(pl.clientId, msg);
  }
  function broadcastLobby() {
    if (App.role !== 'host' || !App.net) return;
    App.net.broadcast({ t: 'lobby', code: App.lobby.code, players: App.lobby.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, strategy: p.strategy || null, connected: p.connected, pawn: p.pawn || null })) });
  }
  function broadcastState() {
    if (App.role !== 'host' || !App.net || !App.game) return;
    // v1.8: μαζί με το state ταξιδεύει η «προίκα διαδοχής» — ό,τι χρειάζεται ένας guest
    // για να αναλάβει το δωμάτιο αν χαθεί ο host (lobby με tokens + πρόσφατο chat)
    App.net.broadcast({
      t: 'state', state: App.game,
      mig: {
        lobby: { code: App.lobby.code, players: App.lobby.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, strategy: p.strategy || null, connected: p.connected, pawn: p.pawn || null, token: p.token || null })) },
        chat: (App.chat || []).slice(-40),
      },
    });
  }
  function saveHostSession() {
    if (App.role !== 'host' || !App.lobby) return;
    try { localStorage.setItem(HOST_KEY, JSON.stringify({ lobby: App.lobby, game: App.game, chat: App.chat })); } catch (e) {}
  }

  function hostStart() {
    const spec = App.lobby.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot, pawn: p.pawn, strategy: p.strategy }));
    if (spec.length < 1) return; // v1.2: επιτρέπεται SOLO παιχνίδι (1 άνθρωπος, χωρίς bot)
    App.game = E.newGame(spec, Date.now() & 0x7fffffff);
    App.game.players.forEach(gp => {
      const lp = App.lobby.players.find(x => x.id === gp.id);
      gp.connected = lp.isBot ? true : !!lp.connected;
    });
    afterChange();
    show('game');
  }

  // Αυτόματο παίξιμο: bots + αποσυνδεδεμένοι
  function scheduleAuto() {
    if (App.role !== 'host') return; // v1.15: bots/auto-play ΜΟΝΟ στον host (όχι guest/tour)
    clearTimeout(App.botTimer);
    if (!App.game || App.game.phase !== 'playing') return;
    const actorId = App.game.pending ? App.game.pending.playerId : E.currentPlayer(App.game).id;
    const p = App.game.players.find(x => x.id === actorId);
    if (!p) return;
    if (p.isBot) {
      App.botTimer = setTimeout(() => {
        const a = BOTS.decide(App.game, actorId);
        if (a) applyAs(actorId, a);
      }, BOT_DELAY);
    } else if (!p.connected) {
      App.botTimer = setTimeout(() => {
        const pl = App.game.players.find(x => x.id === actorId);
        if (pl && !pl.connected && App.game.phase === 'playing') {
          const a = BOTS.decide(App.game, actorId);
          if (a) { toast(t('autoMove', { name: esc(pl.name) })); applyAs(actorId, a); }
        }
      }, DISCO_DELAY);
    }
  }

  // ============================================================ GUEST
  function guestJoin(code, token) {
    App.role = 'guest';
    const name = myName();
    show('lobby');
    $('lobbyCode').textContent = code;
    $('hostControls').classList.add('hidden');
    $('guestWait').classList.remove('hidden');
    $('lobbyPlayers').innerHTML = '<div class="muted">Σύνδεση…</div>';
    App.net = NET.createGuest(code, { name, token }, {
      onStatus(t) { // v0.8: δείξε ΤΙ ακριβώς συμβαίνει όσο συνδεόμαστε
        const el = $('lobbyPlayers');
        if (el && !App.game) el.innerHTML = '<div class="muted">⏳ ' + esc(t) + '</div>';
      },
      onOpen() {},
      onMessage(msg) {
        if (!msg) return;
        App.lastHostMsg = Date.now(); // v1.8: κάθε μήνυμα από τον host μηδενίζει το ρολόι σιωπής
        if (msg.t === 'welcome') {
          App.myId = msg.playerId;
          App.guestRetryCount = 0; App.migAt = null; App.migrating = false; // v1.8: επανασύνδεση ΟΚ
          try { localStorage.setItem(GUEST_KEY, JSON.stringify({ code: msg.code, name, token: msg.token, playerId: msg.playerId })); } catch (e) {}
          if (App.myPawn) App.net.send({ t: 'pawn', pawn: App.myPawn }); // ξαναδήλωσε το αγαπημένο πιόνι
        } else if (msg.t === 'chat') {
          addChat(msg.item);
        } else if (msg.t === 'chatlog') {
          App.chat = Array.isArray(msg.items) ? msg.items : [];
          renderChat();
        } else if (msg.t === 'lobby') {
          App.guestLobby = msg;
          renderLobbyGuest(msg);
        } else if (msg.t === 'state') {
          App.game = msg.state;
          if (msg.mig) { App.migLobby = msg.mig.lobby; App.migChat = msg.mig.chat; } // v1.8: προίκα διαδοχής
          if ($('screen-game').classList.contains('hidden')) show('game');
          render(); maybeToastNewLog();
        } else if (msg.t === 'rejected') {
          App.net.close(); show('home'); homeErr(msg.msg);
          localStorage.removeItem(GUEST_KEY);
        } else if (msg.t === 'err') {
          toast('⚠️ ' + esc(msg.msg));
        }
      },
      onClosed() {
        onHostLost();
      },
      onError(msg) {
        if (App.game) onHostLost();
        else { show('home'); homeErr(msg); }
      },
    });
  }

  // v1.8: ο host χάθηκε — πρώτα προσπαθούμε επανασύνδεση (μπορεί απλώς να κάνει refresh),
  // και αν αργεί, ο πρώτος διαθέσιμος guest ΑΝΑΛΑΜΒΑΝΕΙ το δωμάτιο (host migration).
  function onHostLost() {
    if (App.migrating) return;
    const s = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null');
    if (!s) return;
    if (!App.migAt) {
      toast('🔌 ' + t('hostLost'));
      App.migAt = Date.now() + MIG_BASE_MS + migRank() * MIG_STEP_MS;
    }
    if (App.game && App.migLobby && Date.now() >= App.migAt) { attemptTakeover(s); return; }
    retryGuest();
  }

  // Σειρά διαδοχής: η θέση μου ανάμεσα στους ανθρώπους-guests (κατά σειρά εισόδου)
  function migRank() {
    if (!App.game) return 0;
    const humans = App.game.players.filter(x => !x.isBot && x.id !== 'p0').map(x => x.id);
    const i = humans.indexOf(App.myId);
    return i < 0 ? 0 : i;
  }

  function attemptTakeover(s) {
    App.migrating = true;
    App.migGuestSaved = s; // για επιστροφή σε guest mode αν το claim αποτύχει
    try { if (App.net) App.net.close(); } catch (e) {}
    const lobby = JSON.parse(JSON.stringify(App.migLobby));
    lobby.players.forEach(pl => { pl.clientId = null; if (!pl.isBot) pl.connected = (pl.id === App.myId); });
    try {
      localStorage.setItem(HOST_KEY, JSON.stringify({ lobby, game: App.game, chat: App.migChat || App.chat || [] }));
      localStorage.removeItem(GUEST_KEY);
    } catch (e) {}
    toast('👑 ' + t('takingOver'));
    hostCreate(true, App.myId);
  }

  function retryGuest() {
    clearTimeout(App.guestRetry);
    const s = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null');
    if (!s) return;
    App.guestRetry = setTimeout(() => {
      try { App.net.close(); } catch (e) {}
      guestJoin(s.code, s.token);
      if (App.game) { show('game'); render(); }
    }, FAST ? 1500 : 4000);
  }

  // ============================================================ LOBBY RENDER
  function avatarHtml(p, i) {
    const colors = ['#3b82f6', '#e25b54', '#3ec46d', '#e8c43d', '#a98cf0', '#f08c4b'];
    const c = colors[i % colors.length];
    const glyph = p.isBot ? '🤖' : (p.pawn || esc(p.name[0] || '?').toUpperCase());
    return '<span class="avatar" style="background:' + c + '">' + glyph + '</span>';
  }

  function renderPawnPick(players) {
    const box = $('pawnPick');
    if (!box) return;
    const takenBy = {};
    (players || []).forEach(p => { if (p.pawn) takenBy[p.pawn] = p.id; });
    box.innerHTML = PAWNS.map(pw => {
      const owner = takenBy[pw];
      const mine = owner && owner === App.myId;
      const taken = owner && !mine;
      return '<button class="pawnbtn' + (mine ? ' sel' : '') + (taken ? ' taken' : '') + '" data-pawn="' + pw + '" ' + (taken ? 'disabled' : '') + '>' + pw + '</button>';
    }).join('');
    box.querySelectorAll('[data-pawn]').forEach(b => b.onclick = () => {
      const pw = b.dataset.pawn;
      App.myPawn = pw;
      try { localStorage.setItem('iquit_pawn', pw); } catch (e) {}
      if (App.role === 'host') {
        // v1.8: ο host δεν είναι απαραίτητα ο p0 (μετά από migration)
        if (App.lobby.players.some(x => x.pawn === pw && x.id !== App.myId)) return;
        const meL = App.lobby.players.find(x => x.id === App.myId);
        if (meL) meL.pawn = pw;
        saveHostSession(); broadcastLobby(); renderLobby();
      } else {
        App.net.send({ t: 'pawn', pawn: pw });
      }
    });
  }
  function stratTag(strategy) {
    const prof = BOTS.PROFILES[strategy];
    return prof ? '<span class="tag">' + prof.icon + ' ' + t('strat_' + strategy) + '</span>' : '';
  }

  // v0.9: μετάφραση των στατικών στοιχείων της σελίδας
  function applyStatic() {
    const set = (id, key, html) => { const el = $(id); if (el) { if (html) el.innerHTML = t(key); else el.textContent = t(key); } };
    set('lblTagline', 'tagline'); set('lblName', 'yourName'); set('lblNew', 'newGame');
    set('lblJoin', 'joinRoom'); set('lblHomeFoot', 'homeFoot', true);
    set('btnCreate', 'createRoom'); set('btnJoin', 'joinBtn'); set('btnRulesHome', 'rulesBtn'); set('btnTour', 'tourBtn');
    $('playerName').placeholder = t('namePh'); $('joinCode').placeholder = t('codePh');
    set('lblRoom', 'room'); set('btnShare', 'shareBtn'); set('lblPlayers', 'players');
    set('lblPickPawn', 'pickPawn'); set('lblAddBot', 'addBot'); set('btnStart', 'startBtn');
    set('guestWait', 'guestWait'); set('btnRulesLobby', 'rulesBtn'); set('btnLeaveLobby', 'leave');
    set('lblChat', 'chat'); set('lblLog', 'log');
    const ci = $('chatInput'); if (ci) ci.placeholder = t('chatPh');
    const flag = I.lang === 'el' ? '🇬🇧' : '🇬🇷';
    if ($('btnLang')) $('btnLang').textContent = flag;
    if ($('btnLangHome')) $('btnLangHome').textContent = flag + (I.lang === 'el' ? ' EN' : ' ΕΛ');
    // v1.27 SEO: τίτλος/περιγραφή/lang & εισαγωγική ενότητα ακολουθούν τη γλώσσα
    set('aboutTitle', 'aboutTitle'); set('aboutBody', 'aboutBody', true);
    document.title = t('pageTitle');
    const md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', t('metaDesc'));
    document.documentElement.lang = I.lang;
  }

  function toggleLang() {
    I.setLang(I.lang === 'el' ? 'en' : 'el');
    applyStatic();
    if (App.game) render();
    if (App.role === 'host' && App.lobby && !App.game) renderLobby();
    if (App.role === 'guest' && App.guestLobby && !App.game) renderLobbyGuest(App.guestLobby);
    renderChat();
  }

  // v0.9: Κανόνες — διαθέσιμοι από παντού
  function showRules() {
    App.localModal = true;
    overlay('<div class="rulesbox">' + I.RULES[I.lang] + '</div>' +
      '<div class="acts" style="margin-top:12px;"><button class="ghost" id="rulesClose">✕ ' + t('cancel') + '</button></div>', true);
    $('rulesClose').onclick = () => { closeOverlay(); if (App.game) render(); };
  }

  // v0.9: Ερωτηματολόγιο feedback → αποστέλλεται ανώνυμα στον δημιουργό
  function showFeedback() {
    App.localModal = true;
    let html = '<div class="rulesbox"><h2 style="margin:0 0 4px;">' + t('fbTitle') + '</h2>' +
      '<div class="muted" style="margin-bottom:14px;">' + t('fbIntro') + '</div>';
    I.QUEST.forEach((q, qi) => {
      html += '<div class="fbq"><div class="q">' + (qi + 1) + '. ' + esc(q.q[I.lang]) + '</div>';
      if (q.text) {
        html += '<textarea class="fbtext" data-q="' + q.id + '" rows="2" maxlength="300"></textarea>';
      } else if (q.scale) {
        html += '<div class="fbrow">';
        for (let v = 1; v <= q.scale; v++) html += '<label class="fbopt"><input type="radio" name="fb_' + q.id + '" value="' + v + '"> ' + v + '</label>';
        html += '</div>';
      } else {
        html += '<div class="fbrow">' + q.opts.map(o => '<label class="fbopt"><input type="radio" name="fb_' + q.id + '" value="' + esc(o[I.lang]) + '"> ' + esc(o[I.lang]) + '</label>').join('') + '</div>';
        if (q.other) html += '<input class="fbother" data-q="' + q.id + '_other" placeholder="…" maxlength="120" style="margin-top:4px;">';
      }
      html += '</div>';
    });
    html += '</div><div class="acts" style="margin-top:12px;">' +
      '<button class="buy" id="fbSend">' + t('fbSubmit') + '</button>' +
      '<button class="ghost" id="fbCancel">' + t('cancel') + '</button></div>';
    overlay(html, true);
    $('fbCancel').onclick = () => { closeOverlay(); if (App.game) render(); };
    $('fbSend').onclick = () => {
      // v1.2 (αίτημα Γιώργου): στο email μπαίνει ΟΛΟΚΛΗΡΗ η ερώτηση δίπλα σε κάθε
      // απάντηση + μία γραμμή Excel (τιμές χωρισμένες με ;) για copy-paste συλλογή.
      const data = { _subject: 'I QUIT! — Feedback παίκτη', _template: 'table', _captcha: 'false', lang: I.lang, date: new Date().toISOString() };
      const xlHdr = ['date', 'lang'], xlVal = [new Date().toISOString().slice(0, 16).replace('T', ' '), I.lang];
      I.QUEST.forEach((q, qi) => {
        const label = (qi + 1) + '. ' + q.q[I.lang];
        let val = '';
        if (q.text) { const el = document.querySelector('.fbtext[data-q="' + q.id + '"]'); if (el && el.value.trim()) val = el.value.trim(); }
        else {
          const sel = document.querySelector('input[name="fb_' + q.id + '"]:checked');
          if (sel) val = sel.value;
          const oth = document.querySelector('.fbother[data-q="' + q.id + '_other"]');
          if (oth && oth.value.trim()) val += (val ? ' — ' : '') + oth.value.trim();
        }
        if (val) data[label] = val;
        xlHdr.push('Q' + (qi + 1) + ' (' + q.id + ')');
        xlVal.push(val.replace(/[;\n]/g, ','));
      });
      // v1.5 (αίτημα Γιώργου): player analytics του παίκτη που στέλνει το feedback —
      // αγορές & απορρίψεις-ενώ-μπορούσε ανά κατηγορία (χωρίς wild, βλ. engine)
      const meP = me();
      if (meP && meP.stats) {
        STAT_CATS.forEach(cat => {
          const b = meP.stats.buy[cat] || 0, s = meP.stats.skip[cat] || 0;
          data['📊 ' + t('stat_' + cat)] = '✔ ' + t('statBought') + ': ' + b + ' · ✋ ' + t('statSkipped') + ': ' + s;
          xlHdr.push('buy_' + cat, 'skip_' + cat);
          xlVal.push(String(b), String(s));
        });
      }
      data['📋 Excel ΓΡΑΜΜΗ ΤΙΤΛΩΝ (επικόλληση → Δεδομένα → Κείμενο σε στήλες, διαχωριστικό ";")'] = xlHdr.join(';');
      data['📋 Excel ΓΡΑΜΜΗ ΑΠΑΝΤΗΣΕΩΝ'] = xlVal.join(';');
      $('fbSend').disabled = true; $('fbSend').textContent = '…';
      // v1.0 (#1): ελέγχουμε το ΠΕΡΙΕΧΟΜΕΝΟ της απάντησης — το FormSubmit επιστρέφει 200
      // ακόμα κι όταν απλώς ζητά ενεργοποίηση, οπότε το 200 ΔΕΝ σημαίνει «στάλθηκε email».
      fetch('https://formsubmit.co/ajax/' + I.FEEDBACK_EMAIL.toLowerCase(), {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json().catch(() => ({})).then(j => ({ httpOk: r.ok, j })))
        .then(({ httpOk, j }) => {
          const ok = httpOk && j && (j.success === 'true' || j.success === true);
          if (ok) { closeOverlay(); toast(t('fbThanks')); if (App.game) render(); }
          else {
            $('fbSend').disabled = false; $('fbSend').textContent = t('fbSubmit');
            toast('⚠️ ' + ((j && j.message) ? j.message : t('fbErr')));
          }
        })
        .catch(() => {
          $('fbSend').disabled = false; $('fbSend').textContent = t('fbSubmit');
          toast('⚠️ ' + t('fbErr'));
        });
    };
  }

  function renderLobby() {
    if (App.role !== 'host') return;
    show('lobby');
    $('lobbyCode').textContent = App.lobby.code;
    $('hostControls').classList.remove('hidden');
    $('guestWait').classList.add('hidden');
    $('lobbyCount').textContent = '(' + App.lobby.players.length + '/5)'; // v1.18: δείχνουμε 5 (χωράνε 6)
    $('lobbyPlayers').innerHTML = App.lobby.players.map((p, i) =>
      '<div class="lobby-player">' + avatarHtml(p, i) +
      '<span class="nm">' + esc(p.name) + '</span>' +
      (p.id === 'p0' ? '<span class="tag">HOST</span>' : '') +
      (p.isBot ? stratTag(p.strategy) : (p.connected ? '<span class="tag" style="color:var(--green)">online</span>' : '<span class="tag">offline</span>')) +
      (p.isBot ? '<button class="kick" data-kick="' + p.id + '">✕</button>' : '') +
      '</div>').join('');
    $('lobbyPlayers').querySelectorAll('[data-kick]').forEach(b => b.onclick = () => {
      App.lobby.players = App.lobby.players.filter(x => x.id !== b.dataset.kick);
      saveHostSession(); broadcastLobby(); renderLobby();
    });
    // v0.5: roster από επώνυμα bots με στρατηγική
    const full = App.lobby.players.length >= 6;
    $('botRoster').innerHTML = BOT_ROSTER.map(b => {
      const added = App.lobby.players.some(x => x.isBot && x.name === b.name);
      const prof = BOTS.PROFILES[b.strategy];
      return '<button class="botbtn' + (added ? ' added' : '') + '" data-addbot="' + esc(b.name) + '" ' + (added || full ? 'disabled' : '') + '>' +
        prof.icon + ' <b>' + esc(b.name) + '</b> <span class="muted">' + t('strat_' + b.strategy) + '</span>' + (added ? ' ✓' : '') + '</button>';
    }).join('');
    $('botRoster').querySelectorAll('[data-addbot]').forEach(btn => btn.onclick = () => {
      const spec = BOT_ROSTER.find(b => b.name === btn.dataset.addbot);
      if (!spec || App.lobby.players.length >= 6) return;
      const id = 'p' + (App.lobby.players.reduce((m, p) => Math.max(m, +p.id.slice(1)), 0) + 1);
      App.lobby.players.push({ id, name: spec.name, isBot: true, strategy: spec.strategy, connected: true, token: null });
      saveHostSession(); renderLobby();
    });
    $('btnStart').disabled = App.lobby.players.length < 1; // v1.2: επιτρέπεται και SOLO (χωρίς bot)
    renderPawnPick(App.lobby.players);
    broadcastLobby();
  }
  function renderLobbyGuest(msg) {
    $('lobbyCount').textContent = '(' + msg.players.length + '/5)'; // v1.18
    $('lobbyPlayers').innerHTML = msg.players.map((p, i) =>
      '<div class="lobby-player">' + avatarHtml(p, i) +
      '<span class="nm">' + esc(p.name) + (p.id === App.myId ? ' <span class="muted">' + t('you') + '</span>' : '') + '</span>' +
      (p.id === 'p0' ? '<span class="tag">HOST</span>' : '') +
      (p.isBot ? stratTag(p.strategy) : '') +
      '</div>').join('');
    renderPawnPick(msg.players);
  }

  // ============================================================ GAME RENDER
  const SQ_ICONS = { start: '🏁', salary: '💰', bb: '🏆', lifestyle: '🏠', project: '📊', moments: '🎁', crash: '💥', inflation: '📈', tax: '🧾', fundingfails: '📉' };
  const COLOR_HEX = { G: 'var(--green)', Y: 'var(--yellow)', R: 'var(--red)' };
  function cellOf(i) {
    if (i <= 7) return [8, 8 - i];
    if (i <= 14) return [8 - (i - 7), 1];
    if (i <= 21) return [1, (i - 14) + 1];
    return [(i - 21) + 1, 8];
  }

  function render() {
    const g = App.game;
    if (!g) return;
    // v1.14: όταν η παρτίδα τελειώσει, η καρτέλα του παίκτη γίνεται «δευτερεύουσα» —
    // τα modals τέλους (Αναλυτικά, κατάταξη) φαίνονται πλέον ολόκληρα
    document.body.classList.toggle('game-over', g.phase === 'ended');
    checkAnim(g);
    $('boardbox').classList.toggle('tilt', App.board3d);
    // v1.0 (#6): όσο το πιόνι περπατάει, ΔΕΝ αποκαλύπτουμε ιστορικό/ταμεία/κάρτες — μόνο ταμπλό & ζάρια
    if (App.anim && g.phase === 'playing') {
      renderBoard(g);
      renderCenter(g, g.pending ? g.pending.playerId : g.players[g.turn].id);
      renderHint(g); // κρύβεται όσο κινείται το πιόνι
      return;
    }
    $('gameCode').textContent = App.lobby ? App.lobby.code : (JSON.parse(localStorage.getItem(GUEST_KEY) || '{}').code || '');
    const cur = g.players[g.turn];
    const actorId = g.pending ? g.pending.playerId : cur.id;
    const actor = g.players.find(p => p.id === actorId);
    $('turnWho').textContent = g.phase === 'ended' ? t('gameOver') :
      (actorId === App.myId ? t('yourTurn') : t('playing', { name: (actor.isBot ? '🤖 ' : '') + actor.name }));

    renderBoard(g);
    renderCenter(g, actorId);
    // v1.7 (αίτημα Γιώργου): όσο μια κάρτα reveal (Moments/Lifestyle/Πληθωρισμός) είναι
    // ανοιχτή, ταμεία/έξοδα/ιστορικό ΔΕΝ ενημερώνονται — πρώτα διαβάζεις την κάρτα,
    // και μόλις την κλείσεις βλέπεις την αλλαγή με δείκτες +/− στα ποσά.
    const frozenPanels = g.phase === 'playing' && g.pending && g.pending.type === 'reveal';
    if (!frozenPanels) {
      renderMyDash(g);
      renderOthers(g, actorId);
      renderLog(g);
    }
    renderHint(g);
    // v1.19: πανηγυρισμός τη στιγμή που Ο ΔΙΚΟΣ ΜΟΥ παίκτης πετυχαίνει I QUIT
    const meP = me();
    if (meP && meP.retiredAge === null) App.celebrated = false;
    else if (meP && meP.retiredAge !== null && !App.celebrated && App.role !== 'tour') {
      App.celebrated = true;
      showCelebration(meP);
    }
    renderModal(g, actorId);
  }

  // v1.9 (αίτημα Γιώργου): επεξηγηματικό «συννεφάκι» αριστερά από το ταμπλό —
  // εξηγεί ΤΙ σημαίνει το κουτί/η κάρτα που είναι σε εξέλιξη, για όσο διαρκεί η απόφαση
  function hintKeyFor(pend) {
    if (!pend) return null;
    if (pend.type === 'tax-pay') return 'tax'; // v1.19
    if (pend.type === 'savings') return 'savings';
    if (pend.type === 'forced-sale') return 'forced';
    if (pend.type === 'funding-offer') return 'offer';
    if (pend.type === 'lifestyle-partner') return 'lifestyle';
    if (pend.type === 'reveal') {
      if (pend.special === 'inflation') return 'inflation';
      if (pend.special === 'crash') return 'crash';
      if (pend.special === 'ffail') return 'ffail';
      return pend.deck === 'moments' ? 'moments' : 'lifestyle';
    }
    if (pend.type === 'card') {
      if (pend.deck === 'bb') return 'bb';
      const c = E.card(pend.cardId);
      if (!c) return null;
      if (c.kind === 'P') return 'P' + c.color; // PG / PY / PR
      return c.kind; // funding / bond / masters / taxprepay / betterloan
    }
    return null;
  }
  function renderHint(g) {
    const box = $('hintBox');
    if (!box) return;
    // v1.13: όλοι (host & guests) δείχνουν απλώς το g.hintActive που όρισε ο host
    const h = (g && g.phase === 'playing' && !App.anim && !App.drawAnimBusy) ? g.hintActive : null;
    if (!h || !h.k) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    $('hintT').innerHTML = t('hintT_' + h.k);
    $('hintB').innerHTML = t('hintB_' + h.k);
  }

  // v0.7: το ταμπλό είναι πλέον το πραγματικό board art — τα πάντα τοποθετούνται σε % πάνω του
  function posPct(i) { const [r, c] = cellOf(i); return [(c - 0.5) * 12.5, (r - 0.5) * 12.5]; } // [x%, y%]
  // Οι 4 στοίβες καρτών στα διαγώνια κουτιά του ταμπλό (θέσεις πάνω στο artwork)
  // Κάθε στοίβα στραμμένη προς τη ΔΙΚΗ ΤΗΣ γωνία (η κορυφή της κάρτας δείχνει προς
  // τη γωνία όπου κάθεται), ώστε να "κάθεται" σωστά μέσα στον ρόμβο του ταμπλό.
  const STACKS = [
    { deck: 'lifestyle', x: 27.2, y: 27.2, rot: -45 },  // πάνω-αριστερά
    { deck: 'moments', x: 72.8, y: 27.2, rot: 45 },     // πάνω-δεξιά
    { deck: 'project', x: 27.2, y: 72.8, rot: 45 },     // κάτω-αριστερά — ίδια διαγώνιος, όρθιο κείμενο
    { deck: 'bb', x: 72.8, y: 72.8, rot: -45 },         // κάτω-δεξιά — ίδια διαγώνιος, όρθιο κείμενο
  ];
  const STACK_LABEL = { lifestyle: 'LIFESTYLE', moments: 'MOMENTS', project: 'PROJECT', bb: 'BIG BUSINESS' };

  function renderBoard(g) {
    const b = $('boardOverlay');
    if (!b) return;
    b.classList.toggle('bigpawns', g.players.length <= 3); // v1.0 (#9)
    const curId = g.phase === 'playing' ? g.players[g.turn].id : null;
    let html = '';
    // Στοίβες καρτών με μετρητή υπολοίπων
    // v1.0 (#2): οι στοίβες δείχνουν την ΠΡΑΓΜΑΤΙΚΗ πίσω όψη των καρτών (λογότυπο + όνομα)
    STACKS.forEach(s => {
      const cnt = s.deck === 'bb' ? g.decks.bb.length : (g.decks[s.deck].length + g.decks[s.deck + 'Discard'].length);
      html += '<div class="stack st-' + s.deck + '" id="stack-' + s.deck + '" style="left:' + s.x + '%; top:' + s.y + '%; --rot:' + s.rot + 'deg">' +
        '<div class="cardback"><img src="cardback.png" alt=""><span>' + STACK_LABEL[s.deck] + '</span></div><span class="cnt">' + cnt + '</span></div>';
    });
    // Highlight στο κουτάκι προορισμού (όταν έχει ολοκληρωθεί η κίνηση)
    if (!App.anim && g.lastRoll && g.phase === 'playing') {
      const [gx, gy] = posPct(g.lastRoll.to);
      html += '<div class="sqglow" style="left:' + gx + '%; top:' + gy + '%"></div>';
    }
    // Πιόνια ανά κουτάκι
    const posOf = (p) => (App.anim && App.anim.playerId === p.id) ? App.anim.at : p.pos;
    for (let i = 0; i < 28; i++) {
      const here = g.players.filter(p => posOf(p) === i);
      if (!here.length) continue;
      const [x, y] = posPct(i);
      html += '<div class="pawnspot" style="left:' + x + '%; top:' + y + '%">' +
        here.map(p => '<span class="pawn' + (p.id === curId ? ' cur' : '') + (p.pawn ? ' emo' : '') + '" title="' + esc(p.name) + '" style="background:' + p.color +
          (p.retiredAge !== null || p.finished ? ';opacity:.35' : '') + '">' + (p.pawn || esc((p.name[0] || '?').toUpperCase())) + '</span>').join('') +
        '</div>';
    }
    b.innerHTML = html;
  }

  function renderCenter(g, actorId) {
    const c = $('boardCenter');
    let html = ''; // v0.7: το λογότυπο υπάρχει πάνω στο board art
    if (g.lastRoll) {
      const rolling = App.anim && App.anim.phase === 'dice';
      const d1 = rolling ? '?' : g.lastRoll.d1, d2 = rolling ? '?' : g.lastRoll.d2;
      html += '<div class="dice"><span class="die' + (rolling ? ' rolling' : '') + '">' + d1 + '</span><span class="die' + (rolling ? ' rolling' : '') + '">' + d2 + '</span></div>';
    }
    if (g.phase === 'ended') {
      html += '<button id="rollBtn" onclick="IQ_UI.showEnd()">' + t('results') + '</button>';
    } else if (!g.pending && g.players[g.turn].id === App.myId) {
      html += '<button id="rollBtn">' + t('roll') + '</button>';
    } else {
      const actor = g.players.find(p => p.id === actorId);
      const what = g.pending ? t('deciding') : t('rolling');
      html += '<span class="turnBanner">' + (actorId === App.myId ? t('yourDecision') : (actor.isBot ? '🤖 ' : '') + esc(actor.name) + what) + '</span>';
    }
    c.innerHTML = html;
    const rb = $('rollBtn');
    if (rb && g.phase === 'playing') rb.onclick = () => act({ a: 'roll' });
  }

  function renderMyDash(g) {
    const p = me();
    const box = $('myDash');
    if (!p) { box.innerHTML = '<div class="muted">' + t('spectating') + '</div>'; return; }
    const exp = E.totalExp(p), pas = E.passive(p), pct = E.quitPct(p);
    // v1.0 (#4α): Καθαρό = Μισθός − Έξοδα + Επενδύσεις (παθητικό + τόκοι ομολόγων) − Δόσεις δανείων
    const bondInc = p.inv.filter(i => i.kind === 'bond').reduce((s, i) => s + E.bondInterestOf(i), 0);
    const loanPay = p.loans.reduce((s, l) => s + l.payment, 0);
    const net = p.salary - exp + pas + bondInc - loanPay;
    const myTurn = g.phase === 'playing' && !g.pending && g.players[g.turn].id === p.id;

    // v1.7 (αίτημα Γιώργου): δείκτες παρατήρησης — όταν αλλάζουν μετρητά/αποταμίευση/έξοδα,
    // εμφανίζεται +X€/−X€ πάνω από το αντίστοιχο κουτάκι (και δίπλα στην κατηγορία εξόδων)
    if (!App.deltas) App.deltas = { exp: {} };
    const nowTs = Date.now();
    if (App.prevMe && App.prevMe.id === p.id && p.age >= App.prevMe.age) {
      const dC = p.cash - App.prevMe.cash;
      if (dC) App.deltas.cash = { v: dC, ts: nowTs };
      const dS = (p.savings || 0) - App.prevMe.savings;
      if (dS) App.deltas.savings = { v: dS, ts: nowTs };
      Object.keys(p.expenses).forEach(k => {
        const d = p.expenses[k] - (App.prevMe.exp[k] || 0);
        if (d) App.deltas.exp[k] = { v: d, ts: nowTs };
      });
      const dT = exp - App.prevMe.total;
      if (dT) App.deltas.total = { v: dT, ts: nowTs };
    } else {
      App.deltas = { exp: {} }; // νέο παιχνίδι/παίκτης — καθαρό ξεκίνημα χωρίς δείκτες
    }
    App.prevMe = { id: p.id, age: p.age, cash: p.cash, savings: p.savings || 0, exp: Object.assign({}, p.expenses), total: exp };
    // dpop: αιωρούμενος δείκτης πάνω από stat box · inv=true αντιστρέφει χρώματα (για έξοδα: αύξηση=κόκκινο)
    const dpop = (d, ms, inv) => (d && nowTs - d.ts < ms)
      ? '<span class="dpop" style="color:var(--' + ((d.v > 0) !== !!inv ? 'green' : 'red') + ')">' + (d.v > 0 ? '+' : '−') + fmt(Math.abs(d.v)) + '</span>' : '';
    const dinline = (d) => (d && nowTs - d.ts < 6000)
      ? ' <b style="color:var(--' + (d.v > 0 ? 'red' : 'green') + '); font-size:11px;">' + (d.v > 0 ? '+' : '−') + fmt(Math.abs(d.v)) + '</b>' : '';
    const anyFresh = [App.deltas.cash, App.deltas.savings, App.deltas.total].concat(Object.values(App.deltas.exp)).some(d => d && nowTs - d.ts < 6000);
    if (anyFresh) { clearTimeout(App.deltaTimer); App.deltaTimer = setTimeout(() => { if (App.game) render(); }, 6300); }

    let status = '';
    if (p.retiredAge !== null) status = '<div class="notice" style="margin-bottom:10px;">' + t('retired', { age: p.retiredAge }) + '</div>';
    else if (p.bankrupt) status = '<div class="notice" style="margin-bottom:10px; border-color:var(--red); color:var(--red);">' + t('bankruptNote') + '</div>';
    else if (p.finished) status = '<div class="muted" style="margin-bottom:10px;">' + t('finished65') + '</div>';

    // v0.6: ταξινόμηση κατά απόδοση, από τη μικρότερη στη μεγαλύτερη
    const invSorted = p.inv.slice().sort((a, b) => {
      const ya = a.kind === 'bond' ? 0.04 : a.income / a.cost;
      const yb = b.kind === 'bond' ? 0.04 : b.income / b.cost;
      return ya - yb;
    });
    let inv = invSorted.length ? invSorted.map(i => {
      // v0.6: BB πορτοκαλί (το κίτρινο ανήκει στα REITs), Χρηματοδοτήσεις ροζ
      const color = i.kind === 'P' ? COLOR_HEX[i.color] : i.kind === 'bb' ? 'var(--orange)' : i.kind === 'funding' ? 'var(--funding)' : 'var(--bond)';
      let right = i.kind === 'bond'
        ? '<span class="inc" style="color:var(--bond)">+' + fmt(E.bondInterestOf(i)) + t('perCollect') + ' · ' + i.tokens + '/10</span>'
        : '<span class="inc">+' + fmt(i.income) + '</span>';
      let btns = '';
      if (myTurn && i.kind === 'bond') btns = '<button class="mini sell" data-redeem="' + i.uid + '">' + t('sellBond', { v: fmt(i.cost) }) + '</button>';
      if (myTurn && i.kind === 'funding') btns = '<button class="mini sell" data-sellf="' + i.uid + '">' + t('sellToPlayer') + '</button>';
      const ttl = invTitle(i);
      // Το ΟΝΟΜΑ κόβεται στις 2 γραμμές (CSS), το ΚΟΣΤΟΣ είναι ξεχωριστό αδελφό στοιχείο ώστε
      // να παραμένει πάντα ορατό. Το aria-label έχει ΠΑΝΤΑ το πλήρες όνομα (και όταν χωράει).
      return '<div class="inv"><span class="dot" style="background:' + color + '"></span>' +
        '<span class="nm" data-full="' + esc(ttl) + '" aria-label="' + esc(ttl) + '" title="' + esc(ttl) + '">' + esc(ttl) + '</span>' +
        '<span class="cost">' + fmt(i.cost) + '</span>' + btns + right + '</div>';
    }).join('') : '<div class="muted">' + t('noInv') + '</div>';

    let loanHtml = '';
    if (g.phase === 'playing' && p.retiredAge === null && !p.finished) {
      const max = E.maxLoan(p);
      loanHtml = '<h3 style="font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.6px; margin:12px 0 4px;">' + t('loans') +
        (p.loans.length ? ' <span style="color:var(--red)">' + t('debt', { v: fmt(E.loanOwedNow(p)) }) + '</span>' : '') + '</h3>';
      p.loans.forEach(l => {
        loanHtml += '<div class="inv"><span class="dot" style="background:var(--red)"></span>' +
          '<span class="nm">' + t('loanRow', { v: fmt(l.amount) }) + ' <span class="muted">' + t('installments', { n: l.remaining, p: fmt(l.payment) }) + '</span></span>' +
          (myTurn ? '<button class="mini sell" data-repay="' + l.uid + '" data-count="1" ' + (p.cash >= l.payment ? '' : 'disabled') + '>' + t('pay1') + '</button>' +
            (l.remaining > 1 ? '<button class="mini sell" data-repay="' + l.uid + '" data-count="' + l.remaining + '" ' + (p.cash >= l.remaining * l.payment ? '' : 'disabled') + '>' + t('payoff', { v: fmt(l.remaining * l.payment) }) + '</button>' : '') : '') +
          '</div>';
      });
      if (pct >= 100 && p.loans.length) {
        loanHtml += '<div class="notice" style="margin-top:6px;">' + t('quitBlocked') + '</div>';
      }
      // v1.2: όριο 3 δανείων ΣΥΝΟΛΙΚΑ στο παιχνίδι (προσωρινό)
      if ((p.loansTaken || 0) >= E.MAX_LOANS_TOTAL) {
        loanHtml += '<div class="muted" style="margin-top:6px;">' + t('loanCap', { n: E.MAX_LOANS_TOTAL }) + '</div>';
      } else {
        loanHtml += '<div class="row" style="margin-top:8px;"><input id="loanAmt" type="number" inputmode="numeric" step="100" min="100" placeholder="' + t('newLoanPh', { v: fmt(max) }) + '" ' + (myTurn && max > 0 ? '' : 'disabled') + '>' +
          '<button class="mini" id="btnLoan" style="flex:0 0 auto; padding:12px;" ' + (myTurn && max > 0 ? '' : 'disabled') + '>' + t('loanBtn') + '</button></div>' +
          '<div class="muted" style="margin-top:4px;">' + t('loanHint', { v: fmt(E.loanBase(p)) }) + '</div>';
      }
    }

    box.innerHTML = status +
      // v1.15: το #tourMeter είναι «αγκίστρι» για την Ξενάγηση (spotlight στο meter)
      '<div id="tourMeter"><div class="meter-top"><div><div class="muted">' + t('meterLbl') + '</div>' +
      '<div class="meter-pct">' + pct + '%</div></div>' +
      '<div style="text-align:right"><div class="muted">' + t('age') + '</div><div style="font-size:26px; font-weight:800">' + p.age + '</div></div></div>' +
      '<div class="bar"><div class="fill" style="width:' + Math.min(100, pct) + '%"></div></div></div>' +
      '<div class="statgrid">' +
      '<div class="stat">' + dpop(App.deltas.cash, 3800, false) + '<div class="k">' + t('cash') + '</div><div class="v"' + (p.cash < 0 ? ' style="color:var(--red)"' : '') + '>' + fmt(p.cash) + '</div></div>' +
      // v1.6: ΑΠΟΤΑΜΙΕΥΣΗ — δεξιά από τα ΜΕΤΡΗΤΑ, αριστερά από το ΠΑΘΗΤΙΚΟ (θέση Γιώργου)
      // v1.13: κουμπί ανάληψης όταν επιτρέπεται (60+ ή meter ≥100%), στη σειρά σου
      '<div class="stat">' + dpop(App.deltas.savings, 3800, false) + '<div class="k">' + t('savings') + '</div><div class="v" style="color:var(--yellow)">' + fmt(p.savings || 0) +
      ((myTurn && (p.savings || 0) > 0 && (p.age >= 60 || pct >= 100)) ? ' <button class="mini" data-savw title="' + t('savTakeTip') + '" style="padding:2px 6px; font-size:11px;">💶</button>' : '') + '</div></div>' +
      '<div class="stat"><div class="k">' + t('passive') + '</div><div class="v" style="color:var(--accent)">' + fmt(pas) + '</div></div>' +
      '<div class="stat"><div class="k">' + t('salary') + '</div><div class="v">' + fmt(p.salary) + '</div></div>' +
      '<div class="stat">' + dpop(App.deltas.total, 6000, true) + '<div class="k">' + t('expenses') + '</div><div class="v">' + fmt(exp) + '</div></div>' +
      '</div>' +
      '<div class="muted" style="margin:8px 0 2px;">' + t('netPer') + ' <b style="color:var(--txt)">' + fmt(net) + '</b> · 🃏 ' + t('wild') + ': ' + p.wilds + '</div>' +
      // v1.7: αν μόλις άλλαξε κατηγορία εξόδων, τα «Έξοδα ανά κατηγορία» ανοίγουν μόνα τους για να φανεί το +/−
      '<details class="exp" id="expDetails"' + ((App.expOpen || Object.values(App.deltas.exp).some(d => d && nowTs - d.ts < 6000)) ? ' open' : '') + '><summary>' + t('expByCat') + (g.inflMult > 1 ? ' <span style="color:var(--yellow)">' + t('inflatedTag', { m: g.inflMult.toFixed(2) }) + '</span>' : '') + '</summary>' +
      Object.keys(p.expenses).map(k => '<div class="exprow"><span>' + esc(I.expName(k)) + dinline(App.deltas.exp[k]) + '</span><b>' + fmt(p.expenses[k]) + '</b></div>').join('') +
      '<div class="exprow" style="border-top:1px solid var(--line); margin-top:4px;"><span><b>' + t('totalExp') + '</b></span><b style="color:var(--yellow)">' + fmt(exp) + '</b></div>' +
      '</details>' +
      // v1.15: #tourPortfolio — αγκίστρι Ξενάγησης (χαρτοφυλάκιο + δάνεια)
      '<div id="tourPortfolio">' +
      '<h3 style="font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.6px; margin:10px 0 4px;">' + t('portfolio') + '</h3>' +
      inv +
      (p.inv.length ? '<div class="exprow" style="border-top:1px solid var(--line); margin-top:4px;"><span><b>' + t('totalInvInc') + '</b></span><b style="color:var(--accent)">+' + fmt(pas + bondInc) + t('perCycle') + ' <span class="muted" style="font-weight:400;">(' + t('valueTag', { v: fmt(E.invTotalCost(p)) }) + ')</span></b></div>' : '') +
      loanHtml + '</div>';

    box.querySelectorAll('[data-redeem]').forEach(b => b.onclick = () => act({ a: 'redeem-bond', uid: b.dataset.redeem }));
    box.querySelectorAll('[data-sellf]').forEach(b => b.onclick = () => openFundingSale(b.dataset.sellf));
    box.querySelectorAll('[data-repay]').forEach(b => b.onclick = () => act({ a: 'repay', uid: b.dataset.repay, count: +b.dataset.count }));
    box.querySelectorAll('[data-savw]').forEach(b => b.onclick = () => act({ a: 'sav-withdraw' })); // v1.13
    const det = $('expDetails');
    if (det) det.ontoggle = () => { App.expOpen = det.open; }; // v0.6: μένει ανοιχτό μέχρι να το κλείσεις εσύ
    const bl = $('btnLoan');
    if (bl) bl.onclick = () => { const v = Math.floor(parseFloat($('loanAmt').value)); if (v > 0) openLoanConfirm(v); };
    bindTruncTips(box); // v1.28: μόνο τα ΟΝΤΩΣ κομμένα ονόματα γίνονται διαδραστικά
  }

  // ============================================================ ΚΟΜΜΕΝΑ ΟΝΟΜΑΤΑ (tooltip)
  // Ένα ΜΟΝΑΔΙΚΟ popover για όλη τη σελίδα (όχι ένα ανά κάρτα). Το desktop hover καλύπτεται
  // από το native title· εδώ καλύπτονται πληκτρολόγιο και αφή, όπου το title δεν δουλεύει.
  // Καθολικό: δένεται σε ΟΠΟΙΟΔΗΠΟΤΕ στοιχείο με data-full — κανένα special case ονόματος/ID.
  function tipEl() {
    let el = $('tipPop');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tipPop';
      el.className = 'hidden';
      // ΟΠΤΙΚΗ βοήθεια μόνο: το πλήρες όνομα είναι ήδη διαθέσιμο στους αναγνώστες οθόνης μέσω
      // του aria-label του ονόματος. Χωρίς aria-hidden θα ακουγόταν ΔΥΟ φορές το ίδιο κείμενο.
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    return el;
  }
  function hideTip() {
    const el = $('tipPop');
    if (el) el.className = 'hidden';
    if (App.tipFor) App.tipFor.setAttribute('aria-expanded', 'false');
    App.tipFor = null;
  }
  function showTip(target) {
    const el = tipEl();
    el.textContent = target.getAttribute('data-full') || target.textContent;
    el.className = '';
    const r = target.getBoundingClientRect(), b = el.getBoundingClientRect();
    // κάτω από το στοιχείο· αν δεν χωρά, από πάνω. Πάντα εντός viewport.
    let top = r.bottom + 6;
    if (top + b.height > innerHeight - 8) top = Math.max(8, r.top - b.height - 6);
    let left = Math.min(Math.max(8, r.left), innerWidth - b.width - 8);
    el.style.top = top + 'px';
    el.style.left = left + 'px';
    if (App.tipFor && App.tipFor !== target) App.tipFor.setAttribute('aria-expanded', 'false');
    target.setAttribute('aria-expanded', 'true');
    App.tipFor = target;
  }
  function toggleTip(target) { if (App.tipFor === target) hideTip(); else showTip(target); }

  function bindTruncTips(scope) {
    (scope || document).querySelectorAll('[data-full]').forEach(el => {
      // ΜΟΝΟ αν το κείμενο ΟΝΤΩΣ κόπηκε (clamp ή πλάτος). Αν χωράει, δεν γίνεται focusable.
      const cut = el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
      // Αν χωράει, καθαρίζουμε ΚΑΙ τα semantics: δεν είναι κουμπί, δεν «ανοίγει» τίποτα.
      if (!cut) {
        el.classList.remove('trunc');
        ['tabindex', 'role', 'aria-expanded'].forEach(a => el.removeAttribute(a));
        return;
      }
      if (el.classList.contains('trunc')) return; // ήδη δεμένο
      el.classList.add('trunc');
      el.setAttribute('tabindex', '0');
      // Semantics: το κομμένο όνομα λειτουργεί ως DISCLOSURE — πατιέται (click/Enter/Space) και
      // εναλλάσσει την εμφάνιση του πλήρους ονόματος. Άρα role="button" + aria-expanded, που
      // περιγράφουν ακριβώς αυτό. ΔΕΝ μπαίνει aria-controls: το popover είναι aria-hidden
      // (οπτικό διπλότυπο του aria-label), οπότε δεν υπάρχει προσβάσιμος στόχος να δείξει.
      el.setAttribute('role', 'button');
      el.setAttribute('aria-expanded', 'false');
      el.addEventListener('click', (e) => {
        // ΚΡΙΣΙΜΟ: να μην πυροδοτηθεί κουμπί/ενέργεια της γραμμής (π.χ. πώληση)
        e.preventDefault(); e.stopPropagation();
        toggleTip(el);
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); e.stopPropagation(); toggleTip(el); }
        else if (e.key === 'Escape') { e.stopPropagation(); hideTip(); el.blur(); }
      });
      el.addEventListener('focus', () => showTip(el));
      el.addEventListener('blur', () => { if (App.tipFor === el) hideTip(); });
    });
  }
  // tap/click εκτός, Escape, scroll ή resize → κλείσιμο
  document.addEventListener('click', (e) => { if (App.tipFor && !e.target.closest('[data-full]')) hideTip(); }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTip(); });
  addEventListener('scroll', () => { if (App.tipFor) hideTip(); }, { passive: true, capture: true });
  addEventListener('resize', () => { if (App.tipFor) hideTip(); });

  // v0.6: εκπαιδευτική επιβεβαίωση δανείου — βλέπεις ΤΙ θα πληρώσεις πριν δεσμευτείς
  function openLoanConfirm(amount) {
    const p = me();
    if (!p) return;
    if (amount % 100 !== 0) { toast(t('loanX100', { v: fmt(Math.ceil(amount / 100) * 100) })); return; }
    const n = Math.max(1, 20 - (p.loanBonusFewer || 0));
    const payment = amount * 0.1, total = n * payment, cost = total - amount;
    App.localModal = true;
    overlay('<div class="gamecard gc-inflation" style="border-color:var(--accent); background:#12233f;">' +
      '<div class="ttl" style="font-size:20px;">' + t('loanConfirmTitle') + '</div>' +
      '<div style="margin-top:12px; font-size:14px; line-height:1.7; text-align:left;">' +
      t('loanC1') + ' <b style="color:var(--green)">+' + fmt(amount) + '</b><br>' +
      t('loanC2') + ' <b>' + fmt(payment) + '</b> × <b>' + n + '</b><br>' +
      t('loanC3') + ' <b style="color:var(--red)">' + fmt(total) + '</b><br>' +
      t('loanC4') + ' <b style="color:var(--red)">' + fmt(cost) + '</b></div>' +
      '<div class="muted" style="margin-top:10px; text-align:left;">' + t('loanC5') + '</div></div>' +
      '<div class="acts"><button class="buy" id="loanYes">' + t('loanYes') + '</button>' +
      '<button class="ghost" id="loanNo">' + t('loanNo') + '</button></div>');
    $('loanYes').onclick = () => { closeOverlay(); act({ a: 'loan', amount }); };
    $('loanNo').onclick = closeOverlay;
  }

  function renderOthers(g, actorId) {
    $('others').innerHTML = g.players.filter(p => p.id !== App.myId).map(p => {
      const pct = E.quitPct(p);
      const flags = (p.retiredAge !== null ? '<span class="ret">' + t('iquitAt', { age: p.retiredAge }) + '</span>' :
        (p.bankrupt ? '<span class="off" style="color:var(--red)">💥 ' + t('bankruptTag') + '</span>' :
          (p.finished ? '<span class="muted" style="font-size:10px;">' + t('at65') + '</span>' :
            (!p.isBot && !p.connected ? '<span class="off">⚡ ' + t('offline') + '</span>' : ''))));
      return '<div class="op' + (p.id === actorId && g.phase === 'playing' ? ' turn' : '') + '">' +
        '<div class="top"><span class="opdot" style="background:' + p.color + '">' + (p.pawn || esc((p.name[0] || '?').toUpperCase())) + '</span>' +
        '<span class="nm">' + (p.isBot ? '🤖 ' : '') + esc(p.name) + '</span>' + flags + '</div>' +
        '<div class="st"><span>' + t('yearsOld', { n: p.age }) + '</span><span>' + fmt(p.cash) +
        ((p.savings || 0) > 0 ? ' <span style="color:var(--yellow)" title="' + t('savings') + '">🐖' + fmt(p.savings) + '</span>' : '') + '</span></div>' +
        '<div class="st"><span>' + t('passiveShort', { v: fmt(E.passive(p)) }) + '</span><span>' + pct + '%</span></div>' +
        '<div class="st" style="margin-top:2px;"><span>📍 ' + esc(CARDS.BOARD[p.pos].label) + '</span></div>' +
        '<div class="bar"><div class="fill" style="width:' + Math.min(100, pct) + '%"></div></div></div>';
    }).join('');
  }

  // v1.0 (#6): τα log entries είναι δομημένα {k, p} — μεταφράζονται εδώ, στη γλώσσα ΤΟΥ παίκτη
  function logText(e) {
    if (typeof e === 'string') return e; // συμβατότητα με παλιές παρτίδες
    const P = Object.assign({}, e.p);
    // v1.9: σωστό άρθρο ανά γένος — «Η Καλυψώ πέτυχε…» αντί «Ο Καλυψώ πέτυχε…»
    if (P.n != null) { const f = I.isFemale(P.n); P.o = f ? 'Η' : 'Ο'; P.ol = f ? 'η' : 'ο'; }
    if (P.n2 != null) { const f2 = I.isFemale(P.n2); P.o2 = f2 ? 'Η' : 'Ο'; P.ol2 = f2 ? 'η' : 'ο'; P.acc2 = f2 ? 'στην' : 'στον'; P.ton2 = f2 ? 'την' : 'τον'; }
    if (P.cid) { const c = E.card(P.cid); P.title = c ? I.cardTitle(c) : ''; }
    if (P.cids != null) P.list = String(P.cids).split(',').filter(Boolean).map(id => { const c = E.card(id); return c ? I.cardTitle(c) : id; }).join(' & ');
    if (P.colors) P.colors = String(P.colors).split(',').map(cc => t('color_' + cc)).join('/');
    if (P.catKey) P.cat = I.expName(P.catKey);
    return t(e.k, P);
  }

  function renderLog(g) {
    const el = $('log');
    if (!el) return;
    el.classList.toggle('hidden', !App.logOpen);
    const bt = $('btnLogToggle');
    if (bt) bt.textContent = App.logOpen ? '— ' + t('hideLog') : '+ ' + t('showLog');
    if (App.logOpen) el.innerHTML = g.log.slice().reverse().map(l => '<div>' + logText(l) + '</div>').join('');
  }

  function maybeToastNewLog() {
    const g = App.game;
    if (!g) return;
    if (App.anim || App.drawAnimBusy) return; // v1.0: κανένα spoiler όσο κινείται το πιόνι/η κάρτα
    if (g.pending && g.pending.type === 'reveal') return; // v1.7: ούτε όσο διαβάζεται μια κάρτα
    if (App.lastToastSeq === 0) { App.lastToastSeq = g.logSeq; return; }
    const fresh = g.logSeq - App.lastToastSeq;
    if (fresh > 0) {
      const important = /^(🎉|💥|📈|🧾|➡️|🤝|⏳|🏁|🔻|🏦)/;
      g.log.slice(-fresh).forEach(l => { const s = logText(l); if (important.test(s)) toast(s); });
      App.lastToastSeq = g.logSeq;
    }
  }

  // ============================================================ MODALS
  function overlay(html, wide) {
    const mb = $('modalBody');
    mb.classList.toggle('wide', !!wide);
    mb.innerHTML = html;
    $('overlay').classList.remove('hidden');
  }
  function closeOverlay() { $('overlay').classList.add('hidden'); App.localModal = null; }

  function inflationCardHtml(g) {
    const r = g ? parseFloat((E.inflRate(g) * 100).toFixed(2)) : 5;
    return '<div class="gamecard gc-inflation">' +
      '<div class="ttl" style="font-size:24px; letter-spacing:2px; font-weight:900;">' + t('inflTitle') + '</div>' +
      '<div style="margin-top:12px; font-size:14px; line-height:1.55;">' + t('inflBody', { r: r }) + '</div></div>';
  }

  // v1.19: παράθυρο φόρου — ανάλυση ανά Big Business + σύνολο, πληρωμή με κουμπί
  function taxCardHtml(g, p, pend) {
    const bbs = p.inv.filter(i => i.kind === 'bb');
    const rows = bbs.map(i =>
      '<div class="exprow"><span>' + esc(invTitle(i)) + '</span><b>−' + fmt(0.5 * i.income) + '</b></div>').join('');
    const savCovers = (p.savings || 0) >= pend.amount;
    return '<div class="gamecard gc-inflation" style="border-color:var(--red); background:#2a1114;">' +
      '<div class="cat" style="color:var(--red)">' + t('taxTitle') + '</div>' +
      '<div style="margin-top:8px; font-size:14px; line-height:1.55;">' + t('taxBody', { v: fmt(pend.amount) }) + '</div>' +
      '<div style="margin-top:10px; text-align:left;">' + rows +
      '<div class="exprow" style="border-top:1px solid var(--line); margin-top:4px;"><span><b>' + t('taxTotal') + '</b></span><b style="color:var(--red)">−' + fmt(pend.amount) + '</b></div></div>' +
      (savCovers ? '<div class="notice" style="margin-top:10px; text-align:left;">' + t('taxSavNote', { d: fmt(Math.round(pend.amount * 0.7)) }) + '</div>' : '') +
      '</div>';
  }

  // v1.8: κάρτα απώλειας επένδυσης (Crash / Funding Fails) — ο παίκτης βλέπει ΤΙ έχασε
  function lostCardHtml(pend) {
    const c = E.card(pend.lostId);
    return '<div class="gamecard gc-project" style="border-color:var(--red); background:#2a1114;">' +
      '<div class="cat" style="color:var(--red)">' + (pend.special === 'crash' ? '💥 CRASH' : '📉 FUNDING FAILS') + '</div>' +
      '<div class="ttl">' + esc(c ? I.cardTitle(c) : '') + '</div>' +
      '<div style="margin-top:10px; font-weight:800; font-size:17px; color:var(--red)">−' + fmt(pend.lostV) +
      (pend.lostInc ? ' · −' + fmt(pend.lostInc) + t('perCycle') : '') + '</div>' +
      '<div class="muted" style="margin-top:8px; font-size:12px; line-height:1.5;">' + t(pend.special === 'crash' ? 'crashLostBody' : 'ffailLostBody') + '</div></div>';
  }

  function cardHtml(c, deck, discount, curPrice) {
    const ttl = I.cardTitle(c);
    if (deck === 'lifestyle') {
      const d = (curPrice != null ? curPrice : c.delta);
      // v1.8 (αίτημα Γιώργου): καθαρή ένδειξη — μόνο «Κατηγορία +58€», χωρίς «/κύκλο (μόνιμα)(βασικό…)»
      return '<div class="gamecard gc-lifestyle"><div class="cat">LIFESTYLE</div><div class="ttl">' + esc(ttl) + '</div>' +
        '<div style="margin-top:10px; font-weight:800; font-size:17px; color:' + (d > 0 ? 'var(--red)' : 'var(--green)') + '">' +
        esc(I.expName(c.cat)) + ' ' + (d > 0 ? '+' : '') + d + '€' + (c.shared ? t('each') : '') + '</div></div>';
    }
    if (deck === 'moments') {
      const amt = (curPrice != null ? curPrice : c.amount);
      const eff = c.cancels
        ? '<div style="margin-top:10px; font-weight:700; color:var(--green)">' + t('cancelsLS') + '</div>'
        : '<div style="margin-top:10px; font-weight:800; font-size:19px; color:' + (amt >= 0 ? 'var(--green)' : 'var(--red)') + '">' + (amt > 0 ? '+' : '') + fmt(amt) + '</div>';
      return '<div class="gamecard gc-moments"><div class="cat">MOMENTS</div><div class="ttl">' + esc(ttl) + '</div>' + eff + '</div>';
    }
    const isBB = deck === 'bb';
    let cls = 'gc-project', cat = 'PROJECT', costLine = '';
    if (isBB) { cls = 'gc-bb'; cat = 'BIG BUSINESS'; }
    else if (c.kind === 'P') { cat = 'PROJECT — ' + t('color_' + c.color); }
    else if (c.kind === 'funding') { cls = 'gc-funding'; cat = t('cat_funding'); }
    else if (c.kind === 'bond') { cls = 'gc-bond'; cat = t('cat_bond'); }
    else { cat = t('cat_' + c.kind); }
    const base = (curPrice != null ? curPrice : c.cost);
    const price = Math.round(base * (1 - (discount || 0)));
    costLine = t('cost') + ' <b>' + fmt(price) + '</b>' + (discount ? ' <s class="muted">' + fmt(base) + '</s> (-10%)' : '');
    let effect = '';
    // v1.9 (αίτημα Γιώργου): «+50€ / Είσπραξη» — χωρίς το ποσοστό απόδοσης
    if (c.income) effect = '<div style="margin-top:6px; font-weight:800; color:var(--accent)">+' + fmt(c.income) + ' ' + t('perCycle') + '</div>';
    if (c.kind === 'bond') effect = '<div style="margin-top:6px; font-weight:800; color:var(--bond)">' + t('bondEffect', { v: fmt(c.cost * 0.04) }) + '</div>' +
      '<div style="margin-top:4px;" class="muted">' + t('bondNote', { v: fmt(c.cost) }) + '</div>';
    if (c.kind === 'masters') effect = '<div style="margin-top:6px; font-weight:800; color:var(--accent)">' + t('mastersEffect', { v: fmt(c.salaryUp) }) + '</div>';
    if (c.kind === 'taxprepay') effect = '<div style="margin-top:6px; font-weight:800; color:var(--accent)">' + t('taxprepayEffect', { v: fmt(c.taxDown) }) + '</div>';
    if (c.kind === 'betterloan') effect = '<div style="margin-top:6px; font-weight:800; color:var(--accent)">' + t('betterloanEffect', { n: c.fewerPayments }) + '</div>';
    return '<div class="gamecard ' + cls + '"><div class="cat">' + cat + '</div><div class="ttl">' + esc(ttl) + '</div>' +
      '<div class="cost">' + costLine + '</div>' + effect + '</div>';
  }

  // v0.7: η κάρτα "τραβιέται" οπτικά από τη σωστή στοίβα πριν ανοίξει το modal
  function startDrawAnim(deck) {
    const stack = document.getElementById('stack-' + deck);
    const fly = document.createElement('div');
    fly.className = 'flycard fly-' + deck;
    fly.innerHTML = '<img src="cardback.png" alt=""><span>' + STACK_LABEL[deck] + '</span>';
    if (stack) {
      const r = stack.getBoundingClientRect();
      fly.style.left = (r.left + r.width / 2) + 'px';
      fly.style.top = (r.top + r.height / 2) + 'px';
      const s = STACKS.find(x => x.deck === deck);
      fly.style.setProperty('--rot', (s ? s.rot : 45) + 'deg');
    } else { fly.style.left = '50vw'; fly.style.top = '40vh'; }
    document.body.appendChild(fly);
    if (!App.muted) { try { noiseBurst(.09, 1400, .05); } catch (e) {} } // "σβούρισμα" χαρτιού
    requestAnimationFrame(() => requestAnimationFrame(() => fly.classList.add('go')));
    App.drawAnimBusy = true;
    App.drawAnimStartedAt = Date.now(); // v1.7: watchdog
    setTimeout(() => { fly.remove(); App.drawAnimBusy = false; render(); }, 600);
  }

  function renderModal(g, actorId) {
    if (App.localModal) return; // ανοιχτό client-side modal
    if (App.anim) { if (!g.pending) closeOverlay(); return; } // περίμενε να φτάσει το πιόνι
    if (App.drawAnimBusy) return; // η κάρτα ακόμα "πετάει" από τη στοίβα
    if (g.phase === 'ended') { sound('win'); showEnd(); return; }
    const pend = g.pending;
    if (!pend) { closeOverlay(); App.lastDrawKey = null; return; }

    // Θα εμφανιστεί modal κάρτας; Αν ναι και είναι νέο τράβηγμα → πρώτα το draw animation
    const actorP0 = g.players.find(x => x.id === pend.playerId);
    const mine0 = pend.playerId === App.myId;
    const deckFor = pend.special ? null :
      (pend.type === 'card' && !pend.isDiscountOffer && !pend.viaWild ? pend.deck :
        (pend.type === 'reveal' || pend.type === 'lifestyle-partner') ? (pend.deck || 'lifestyle') : null);
    const willShow = mine0 || (actorP0 && !actorP0.isBot && ['card', 'reveal', 'lifestyle-partner'].includes(pend.type));
    const pendKey = pend.type + ':' + (pend.cardId || pend.special || '') + ':' + pend.playerId;
    // v1.3: δραματικός ήχος όταν εμφανίζεται η κάρτα ΠΛΗΘΩΡΙΣΜΟΣ (μία φορά ανά χτύπημα —
    // το inflMult αλλάζει σε κάθε πληθωρισμό, οπότε ξεχωρίζει διαδοχικά χτυπήματα)
    if (pend.special === 'inflation') {
      const ik = pendKey + ':' + g.inflMult;
      if (App.lastInflSnd !== ik) { App.lastInflSnd = ik; sound('inflation'); }
    }
    if (deckFor && willShow && App.lastDrawKey !== pendKey) {
      App.lastDrawKey = pendKey;
      closeOverlay();
      startDrawAnim(deckFor);
      return;
    }

    // v0.2: όταν ΑΝΘΡΩΠΟΣ τραβάει κάρτα, τη βλέπουν ΟΛΟΙ (οι άλλοι σε view-only)
    // v0.5: η κάρτα «Πληθωρισμός» εμφανίζεται σε όλους ακόμα κι όταν την πατά bot
    if (pend.playerId !== App.myId) {
      const actorP = g.players.find(x => x.id === pend.playerId);
      if (pend.special === 'inflation') {
        // v1.2: η κάρτα μένει μέχρι να την πατήσει κάποιος — κάθε άνθρωπος μπορεί να την κλείσει
        overlay('<div data-ch="ok" style="cursor:pointer">' + inflationCardHtml(g) + '</div>' +
          '<div class="acts"><button class="buy" data-ch="ok">' + t('okRead') + '</button></div>' +
          '<div class="muted" style="text-align:center;">' + t('landedBy', { name: esc(actorP.name) }) + '</div>');
        $('modalBody').querySelectorAll('[data-ch]').forEach(b => b.onclick = () => act({ a: 'resolve', choice: 'ok' }));
      } else if (pend.special === 'crash' || pend.special === 'ffail') {
        // v1.8: οι άλλοι βλέπουν την απώλεια του παίκτη (view-only)
        overlay(lostCardHtml(pend) +
          '<div class="muted" style="text-align:center;">' + t('cardOf', { name: esc(actorP.name) }) + '</div>');
      } else if (pend.type === 'tax-pay') {
        // v1.19: οι άλλοι βλέπουν το παράθυρο φόρου του παίκτη (view-only)
        overlay(taxCardHtml(g, actorP, pend) +
          '<div class="muted" style="text-align:center;">' + t('cardOf', { name: esc(actorP.name) }) + '</div>');
      } else if (actorP && !actorP.isBot && (pend.type === 'card' || pend.type === 'reveal' || pend.type === 'lifestyle-partner')) {
        const c = E.card(pend.cardId);
        const deck = pend.deck || 'lifestyle';
        const shown = deck === 'lifestyle' ? E.lifestyleDelta(g, c) : (deck === 'moments' ? E.momentAmount(g, c) : E.priceOf(g, c));
        overlay(cardHtml(c, deck, pend.discount, shown) +
          '<div class="muted" style="text-align:center;">' +
          (pend.type === 'reveal' ? t('cardOf', { name: esc(actorP.name) }) : t('decidesNow', { name: esc(actorP.name) })) +
          '</div>');
      } else closeOverlay();
      return;
    }
    const p = me();

    if (pend.type === 'reveal') {
      const rc = pend.special ? null : E.card(pend.cardId);
      const body = pend.special === 'inflation'
        ? inflationCardHtml(g)
        : (pend.special === 'crash' || pend.special === 'ffail')
          ? lostCardHtml(pend)
          : cardHtml(rc, pend.deck, 0, pend.deck === 'lifestyle' ? E.lifestyleDelta(g, rc) : (pend.deck === 'moments' ? E.momentAmount(g, rc) : null));
      overlay('<div data-ch="ok" style="cursor:pointer">' + body + '</div>' +
        '<div class="acts"><button class="buy" data-ch="ok">' + t('okRead') + '</button></div>'); // v1.18: χωρίς «όλοι βλέπουν την κάρτα»
      $('modalBody').querySelectorAll('[data-ch]').forEach(b => b.onclick = () => act({ a: 'resolve', choice: 'ok' }));
      return;
    }

    if (pend.type === 'card') {
      const c = E.card(pend.cardId);
      const curPrice = E.priceOf(g, c);
      const price = Math.round(curPrice * (1 - (pend.discount || 0)));
      const canBuy = p.cash >= price;
      const short = price - p.cash;
      const canLoan = !canBuy && E.maxLoan(p) >= short && short > 0;
      const myBonds = p.inv.filter(i => i.kind === 'bond');
      let html = (pend.isDiscountOffer ? '<div class="muted" style="margin-bottom:8px;">' + t('discountOffer') + '</div>' : '') +
        cardHtml(c, pend.deck, pend.discount, curPrice) +
        '<div class="muted" style="margin-bottom:10px;">' + t('yourCash', { v: fmt(p.cash) }) + '</div><div class="acts">';
      html += '<button class="buy" data-ch="buy" ' + (canBuy ? '' : 'disabled') + '>' + t('buy', { v: fmt(price) }) + '</button>';
      // v0.2 (#1): πώληση ομολόγου επί τόπου για να βγει η αγορά
      if (!canBuy && myBonds.length) {
        myBonds.forEach(b => {
          html += '<button class="wildbtn" style="border-color:var(--bond); color:#bfe3ef;" data-sellbond="' + b.uid + '">' + t('sellBondModal', { t: b.tokens, v: fmt(b.cost) }) + '</button>';
        });
      }
      // v1.0 (#8): επιλέγεις ΠΟΣΟ δάνειο — μεγαλύτερο από τη διαφορά για μαξιλάρι,
      // ή δάνειο ακόμα κι αν σου φτάνουν τα μετρητά (πάντα εντός ορίου)
      // v1.0.1 (#3): η επιλογή δανείου εμφανίζεται ΜΟΝΟ αν το μέγιστο δάνειο
      // πράγματι αρκεί για να ολοκληρωθεί η αγορά (μετρητά + δάνειο ≥ τιμή)
      const maxLn = E.maxLoan(p);
      if (maxLn >= 100 && p.cash + maxLn >= price && (p.loansTaken || 0) < E.MAX_LOANS_TOTAL) {
        const defLn = Math.min(maxLn, Math.max(100, Math.ceil(Math.max(short, 0) / 100) * 100));
        const lnN = Math.max(1, 20 - (p.loanBonusFewer || 0));
        html += '<div class="row" style="margin:2px 0;"><input id="blAmt" type="number" step="100" min="100" max="' + maxLn + '" value="' + defLn + '" inputmode="numeric" style="flex:1;">' +
          '<button class="wildbtn" id="blGo" style="flex:0 0 auto; padding:12px;">' + t('buyLoanBtn') + '</button></div>' +
          '<div class="muted" style="font-size:11px;">' + t('buyLoanFlex', { max: fmt(maxLn), n: lnN }) + '</div>';
      }
      if (pend.canWild) html += '<button class="wildbtn" data-ch="wild">' + t('wildBtn', { deck: pend.deck === 'project' ? 'Big Business' : 'Project', n: p.wilds }) + '</button>';
      html += '<button class="ghost" data-ch="decline">' + t('decline') + '</button></div>';
      overlay(html);
      $('modalBody').querySelectorAll('[data-sellbond]').forEach(b => b.onclick = () => act({ a: 'redeem-bond', uid: b.dataset.sellbond }));
      const blGo = $('blGo');
      if (blGo) blGo.onclick = () => { const v = Math.floor(parseFloat($('blAmt').value)); if (v >= 100) act({ a: 'resolve', choice: 'buy-loan', loanAmount: v }); };
    } else if (pend.type === 'lifestyle-partner') {
      const c = E.card(pend.cardId);
      const d = E.lifestyleDelta(g, c);
      let html = '<div class="gamecard gc-lifestyle"><div class="cat">' + t('lsPartnerCat') + '</div><div class="ttl">' + esc(I.cardTitle(c)) + '</div>' +
        '<div class="cost">' + t('lsPartnerBody', { cat: esc(I.expName(c.cat)), d: d }) + '</div></div>' +
        '<div class="choice-list">' +
        g.players.filter(x => x.id !== p.id && x.retiredAge === null && !x.finished)
          .map(x => '<button data-partner="' + x.id + '">' + (x.isBot ? '🤖 ' : '') + esc(x.name) + ' <span class="muted">(' + esc(I.expName(c.cat)) + ' ' + fmt(x.expenses[c.cat] || 0) + ')</span></button>').join('') +
        '</div>';
      overlay(html);
      $('modalBody').querySelectorAll('[data-partner]').forEach(b => b.onclick = () => act({ a: 'resolve', partnerId: b.dataset.partner }));
      return;
    } else if (pend.type === 'forced-sale') {
      // v1.14: στην αναγκαστική πώληση προσφέρονται ΜΟΝΟ Big Business (80%) & Ομόλογα (100%)
      let html = '<h3 style="margin-bottom:6px;">' + t('forcedTitle') + '</h3>' +
        '<div class="muted" style="margin-bottom:12px;">' + t('forcedBody', { v: fmt(p.cash) }) + '</div>' +
        '<div class="choice-list">' +
        p.inv.filter(i => i.kind === 'bb' || i.kind === 'bond').map(i => {
          const val = i.kind === 'bond' ? E.bondValue(i) : 0.8 * i.cost;
          return '<button data-fs="' + i.uid + '">' + esc(invTitle(i)) + ' <b style="float:right">+' + fmt(val) + '</b></button>';
        }).join('') + '</div>';
      overlay(html);
      $('modalBody').querySelectorAll('[data-fs]').forEach(b => b.onclick = () => act({ a: 'resolve', uid: b.dataset.fs }));
      return;
    } else if (pend.type === 'tax-pay') {
      // v1.19: ο φόρος πληρώνεται ΜΟΝΟ με το κουμπί — ξέρεις πάντα τι θα χάσεις
      overlay(taxCardHtml(g, p, pend) +
        '<div class="acts"><button class="buy" style="background:linear-gradient(90deg,#c0392b,#e25b54);" data-tx="pay">' + t('taxPayBtn') + '</button></div>');
      $('modalBody').querySelectorAll('[data-tx]').forEach(b => b.onclick = () => act({ a: 'resolve', choice: 'pay' }));
      return;
    } else if (pend.type === 'savings') {
      // v1.6: ΑΠΟΤΑΜΙΕΥΣΗ — προσφορά κατάθεσης ανά 5ετία (και ανάληψη στα 60)
      const maxDep = Math.floor(p.cash / 50) * 50;
      const defDep = Math.min(maxDep, Math.max(50, Math.floor(p.cash * 0.1 / 50) * 50));
      let html = '<div class="gamecard gc-inflation" style="border-color:var(--yellow); background:#211d0d;">' +
        '<div class="cat">' + t('savTitle') + '</div>' +
        '<div class="ttl" style="font-size:20px;">🐖 ' + t('savAsk', { age: p.age }) + '</div>' +
        '<div style="margin-top:10px; font-size:13px; line-height:1.6; text-align:left;">' + t('savExplain') + '</div>' +
        '<div class="muted" style="margin-top:8px;">' + t('savBalance', { v: fmt(p.savings || 0), c: fmt(p.cash) }) + '</div></div>' +
        '<div class="acts">';
      if (maxDep >= 50) {
        html += '<div class="row" style="margin:2px 0;"><input id="savAmt" type="number" step="50" min="50" max="' + maxDep + '" value="' + defDep + '" inputmode="numeric" style="flex:1;">' +
          '<button class="buy" id="savGo" style="flex:0 0 auto; padding:12px;">' + t('savDeposit') + '</button></div>';
      }
      // v1.13: ανάληψη και όταν το meter είναι ≥100% (όχι μόνο στα 60)
      if ((pend.canWithdraw || E.quitPct(p) >= 100) && (p.savings || 0) > 0) {
        html += '<button class="wildbtn" data-sv="withdraw">' + t('savWithdraw', { v: fmt(p.savings || 0) }) + '</button>';
      }
      html += '<button class="ghost" data-sv="skip">' + t('savSkip') + '</button></div>';
      overlay(html);
      const sg = $('savGo');
      if (sg) sg.onclick = () => { const v = Math.floor(parseFloat($('savAmt').value)); if (v >= 50) act({ a: 'resolve', choice: 'deposit', amount: v }); };
      $('modalBody').querySelectorAll('[data-sv]').forEach(b => b.onclick = () => act({ a: 'resolve', choice: b.dataset.sv }));
      return;
    } else if (pend.type === 'funding-offer') {
      const from = g.players.find(x => x.id === pend.fromId);
      let html = '<div class="gamecard gc-funding"><div class="cat">' + t('offerCat') + '</div><div class="ttl">' + esc(pend.title) + '</div>' +
        '<div class="cost">' + t('offerBody', { name: esc(from.name), v: fmt(pend.price) }) + '</div>' +
        '<div style="margin-top:6px; font-weight:800; color:var(--accent)">+' + fmt(pend.income) + ' ' + t('perCycle') + '</div></div>' +
        '<div class="acts"><button class="buy" data-ch="accept" ' + (p.cash >= pend.price ? '' : 'disabled') + '>' + t('buy', { v: '' }) + '</button>' +
        '<button class="ghost" data-ch="decline">' + t('decline') + '</button></div>';
      overlay(html);
    }
    $('modalBody').querySelectorAll('[data-ch]').forEach(b => b.onclick = () => act({ a: 'resolve', choice: b.dataset.ch }));
  }

  function openFundingSale(uid) {
    const g = App.game, p = me();
    const inv = p.inv.find(i => i.uid === uid);
    if (!inv) return;
    const targets = g.players.filter(x => x.id !== p.id && x.retiredAge === null && !x.finished);
    if (!targets.length) { toast(t('noTargets')); return; }
    App.localModal = true;
    overlay('<h3 style="margin-bottom:8px;">' + t('fundingSale') + '</h3>' +
      '<div class="muted" style="margin-bottom:10px;">' + t('fundingMin', { title: esc(invTitle(inv)), v: fmt(inv.cost) }) + '</div>' +
      '<input id="fsPrice" type="number" inputmode="numeric" value="' + inv.cost + '" style="margin-bottom:10px;">' +
      '<div class="choice-list">' +
      targets.map(x => '<button data-fst="' + x.id + '">' + (x.isBot ? '🤖 ' : '') + esc(x.name) + '</button>').join('') +
      '</div><button class="ghost" style="width:100%; padding:12px;" id="fsCancel">' + t('cancel') + '</button>');
    $('modalBody').querySelectorAll('[data-fst]').forEach(b => b.onclick = () => {
      const price = parseFloat($('fsPrice').value);
      closeOverlay();
      act({ a: 'offer-funding', uid, toId: b.dataset.fst, price });
    });
    $('fsCancel').onclick = closeOverlay;
  }

  // ============================================================ v1.15: ΞΕΝΑΓΗΣΗ (guided tour)
  // Demo παρτίδα στο ΠΡΑΓΜΑΤΙΚΟ interface, με ρόλο 'tour' — μηδέν δίκτυο/δωμάτιο/αποθήκευση.
  const TOUR_STEPS = [
    { sel: '#boardbox', k: 'board' },
    { sel: '#boardbox', k: 'stacks', glow: true },
    { sel: '#tourMeter', k: 'meter' },
    { sel: '#myDash .statgrid', k: 'stats' },
    { sel: '#tourPortfolio', k: 'portfolio' },
    { sel: '#logCard', k: 'log' },
    { sel: '#chatCard', k: 'chat' },
    { sel: '#boardCenter', k: 'roll' },
    { sel: null, k: 'done' },
  ];

  function makeTourGame() {
    const you = I.lang === 'en' ? 'You' : 'Εσύ';
    const g = E.newGame([
      { id: 'p0', name: you, pawn: '🐎' },
      { id: 'p1', name: 'Ελένη', pawn: '🚗' },
      { id: 'p2', name: 'Κροίσος', isBot: true, strategy: 'tycoon' },
    ], 12345);
    const p = g.players[0];
    p.age = 33; p.cash = 2650; p.savings = 400;
    p.inv.push({ uid: 'd1', cardId: 'PG4', kind: 'P', color: 'G', title: 'Αμοιβαίο Κεφάλαιο Δυτικής Ευρώπης', cost: 1000, income: 60 });
    p.inv.push({ uid: 'd2', cardId: 'PY1', kind: 'P', color: 'Y', title: 'REIT εστιατορίων', cost: 600, income: 80 });
    p.inv.push({ uid: 'd3', cardId: 'BB16', kind: 'bb', title: 'Καντίνα δίπλα σε παραλία.', cost: 5000, income: 275 });
    p.inv.push({ uid: 'd4', cardId: 'PB1', kind: 'bond', title: 'Κρατικό Ομόλογο', cost: 1000, income: 0, tokens: 4 });
    p.loans.push({ uid: 'dl', amount: 1000, payment: 100, remaining: 7 });
    p.loansTaken = 1;
    p.pos = 6;
    g.players[1].pos = 12; g.players[1].age = 32; g.players[1].cash = 3100;
    g.players[2].pos = 19; g.players[2].age = 34; g.players[2].cash = 1900;
    g.players[2].inv.push({ uid: 'd5', cardId: 'BB10', kind: 'bb', title: 'Δημιουργείς το επιτραπέζιο «I Quit».', cost: 4000, income: 280 });
    g.turn = 0; g.pending = null; g.lastRoll = null;
    g.log = [
      { k: 'lg_roll', p: { n: 'Ελένη', d1: 4, d2: 3, s: 7 } },
      { k: 'lg_buyP', p: { n: you, colors: 'G', cid: 'PG4', v: '1.000€', inc: '60€' } },
      { k: 'lg_inflation', p: { r: 4 } },
    ];
    g.logSeq = 3;
    return g;
  }

  function tourStart() {
    App.tourSaved = { role: App.role, myId: App.myId, game: App.game, chat: App.chat, logOpen: App.logOpen };
    App.role = 'tour'; App.myId = 'p0';
    App.game = makeTourGame();
    App.prevMe = null; App.deltas = { exp: {} }; // καθαροί δείκτες — όχι +/- «φαντάσματα»
    App.chat = [
      { from: 'p1', name: 'Ελένη', color: '#e25b54', text: t('tourChat1') },
      { from: 'p0', name: I.lang === 'en' ? 'You' : 'Εσύ', color: '#3b82f6', text: t('tourChat2') },
    ];
    App.logOpen = true;
    show('game');
    render();
    renderChat();
    tourGo(0);
  }

  function tourEnd() {
    clearTimeout(App.tourPosTimer);
    ['tourScrim', 'tourSpot', 'tourTip'].forEach(id => { const el = $(id); if (el) el.remove(); });
    document.querySelectorAll('.tour-glow').forEach(el => el.classList.remove('tour-glow'));
    const s = App.tourSaved || {};
    App.role = s.role || null; App.myId = s.myId || null;
    App.game = s.game || null; App.chat = s.chat || []; App.logOpen = s.logOpen;
    App.prevMe = null; App.deltas = { exp: {} };
    App.tourSaved = null; App.tourStep = null;
    window.scrollTo({ top: 0 });
    if (App.game) { show('game'); render(); }
    else show('home');
    renderChat();
  }

  function tourGo(i) {
    if (i < 0 || i >= TOUR_STEPS.length) return tourEnd();
    App.tourStep = i;
    const st = TOUR_STEPS[i];
    document.querySelectorAll('.stack').forEach(el => el.classList.toggle('tour-glow', !!st.glow));
    const el = st.sel ? document.querySelector(st.sel) : null;
    // mobile: κύλισε ομαλά στο στοιχείο ΠΡΙΝ μετρηθεί η θέση του (χωρίς zoom — μόνο scroll)
    if (el) { try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { el.scrollIntoView(); } }
    clearTimeout(App.tourPosTimer);
    App.tourPosTimer = setTimeout(() => positionTour(), el ? 420 : 0);
  }

  function positionTour() {
    if (App.tourStep == null) return;
    const st = TOUR_STEPS[App.tourStep];
    let scrim = $('tourScrim'), spot = $('tourSpot'), tip = $('tourTip');
    if (!scrim) { scrim = document.createElement('div'); scrim.id = 'tourScrim'; document.body.appendChild(scrim); }
    if (!spot) { spot = document.createElement('div'); spot.id = 'tourSpot'; document.body.appendChild(spot); }
    if (!tip) { tip = document.createElement('div'); tip.id = 'tourTip'; document.body.appendChild(tip); }
    const el = st.sel ? document.querySelector(st.sel) : null;
    const vw = window.innerWidth, vh = window.innerHeight;
    let r = null;
    if (el) {
      const b = el.getBoundingClientRect();
      r = { left: Math.max(2, b.left - 6), top: Math.max(2, b.top - 6), width: Math.min(vw - 4, b.width + 12), height: b.height + 12 };
      spot.style.cssText = 'display:block; left:' + r.left + 'px; top:' + r.top + 'px; width:' + r.width + 'px; height:' + r.height + 'px;';
    } else {
      spot.style.cssText = 'display:block; left:50vw; top:38vh; width:0; height:0; border:none;';
    }
    tip.innerHTML =
      '<div class="tt-t">' + t('tourT_' + st.k) + '</div>' +
      '<div class="tt-b">' + t('tourB_' + st.k) + '</div>' +
      '<div class="tt-row"><span class="tt-n">' + (App.tourStep + 1) + '/' + TOUR_STEPS.length + '</span>' +
      '<span style="flex:1"></span>' +
      (App.tourStep > 0 ? '<button class="ghost" id="tourBack">' + t('tourBack') + '</button>' : '') +
      '<button class="buy" id="tourNext">' + t(App.tourStep === TOUR_STEPS.length - 1 ? 'tourFinish' : 'tourNext') + '</button></div>' +
      '<button class="tt-skip" id="tourSkip">' + t('tourSkip') + '</button>';
    // Θέση tooltip: κάτω από το spotlight αν χωρά, αλλιώς από πάνω, αλλιώς κεντραρισμένο
    tip.style.visibility = 'hidden'; tip.style.display = 'block';
    const tw = Math.min(330, vw - 20), th = tip.offsetHeight || 170;
    tip.style.width = tw + 'px';
    let tl, tt;
    if (!r) { tl = (vw - tw) / 2; tt = Math.max(12, (vh - th) / 2); }
    else {
      tl = Math.min(Math.max(10, r.left), vw - tw - 10);
      if (r.top + r.height + th + 14 < vh) tt = r.top + r.height + 10;
      else if (r.top - th - 14 > 0) tt = r.top - th - 10;
      else { tt = Math.max(12, (vh - th) / 2); tl = Math.max(10, Math.min(vw - tw - 10, r.left + r.width + 12)); }
    }
    // v1.16: ουρά «συννεφιού» προς το στοιχείο (πάνω αν το tooltip είναι από κάτω, αλλιώς κάτω)
    tip.classList.remove('tail-up', 'tail-down');
    if (r) tip.classList.add(tt > r.top + r.height / 2 ? 'tail-up' : 'tail-down');
    tip.style.left = tl + 'px'; tip.style.top = tt + 'px'; tip.style.visibility = 'visible';
    $('tourNext').onclick = () => tourGo(App.tourStep + 1);
    const tb = $('tourBack'); if (tb) tb.onclick = () => tourGo(App.tourStep - 1);
    $('tourSkip').onclick = tourEnd;
  }

  // v1.5: κατηγορίες των player analytics (σειρά εμφάνισης)
  const STAT_CATS = ['G', 'Y', 'R', 'funding', 'bb', 'bond', 'masters', 'taxprepay', 'betterloan'];

  // v1.5: «Αναλυτικά» — τι αγόρασε και τι απέρριψε (ενώ μπορούσε) κάθε παίκτης
  function showStats() {
    const g = App.game;
    if (!g) return;
    const td = 'padding:5px 8px; border-bottom:1px solid var(--line); text-align:center;';
    let html = '<div class="rulesbox"><h2 style="margin:0 0 4px;">' + t('analyticsTitle') + '</h2>' +
      '<div class="muted" style="margin-bottom:10px; font-size:12px;">' + t('analyticsLegend') + '</div>' +
      '<table style="border-collapse:collapse; width:100%; font-size:13px;"><tr><th style="' + td + ' text-align:left;"></th>' +
      g.players.map(p => '<th style="' + td + '">' + (p.isBot ? '🤖 ' : '') + esc(p.name) + '</th>').join('') + '</tr>';
    STAT_CATS.forEach(cat => {
      html += '<tr><td style="' + td + ' text-align:left;">' + t('stat_' + cat) + '</td>' +
        g.players.map(p => {
          const st = p.stats || { buy: {}, skip: {} };
          const b = st.buy[cat] || 0, s = st.skip[cat] || 0;
          return '<td style="' + td + '">' + (b || s ? ('<b style="color:var(--green)">✔' + b + '</b> · <span style="color:var(--red)">✋' + s + '</span>') : '<span class="muted">—</span>') + '</td>';
        }).join('') + '</tr>';
    });
    html += '</table></div><div class="acts" style="margin-top:12px;"><button class="ghost" id="statsClose">✕ ' + t('cancel') + '</button></div>';
    overlay(html, true);
    $('statsClose').onclick = () => showEnd();
  }

  // v1.19: διάρκεια σε «Χ χρόνια και Υ μήνες» (κανόνες Γιώργου — όχι σκέτοι μήνες)
  function fmtDur(months) {
    const y = Math.floor(months / 12), m = months % 12;
    if (I.lang === 'en') {
      const ys = y > 0 ? y + (y === 1 ? ' year' : ' years') : '';
      const ms = m > 0 ? m + (m === 1 ? ' month' : ' months') : '';
      return ys && ms ? ys + ' and ' + ms : (ys || ms || '0 months');
    }
    const ys = y > 0 ? y + ' ' + (y === 1 ? 'χρόνο' : 'χρόνια') : '';
    const ms = m > 0 ? m + ' ' + (m === 1 ? 'μήνα' : 'μήνες') : '';
    return ys && ms ? ys + ' και ' + ms : (ys || ms || '0 μήνες');
  }

  // v1.19: πανηγυρισμός νίκης — εμφανίζεται ΜΙΑ φορά στον παίκτη που πετυχαίνει I QUIT
  function showCelebration(p) {
    App.localModal = true;
    sound('win');
    let conf = '';
    const EMO = ['🎉', '✨', '💛', '🏆', '💙', '🎊'];
    for (let i = 0; i < 18; i++) conf += '<span class="cf" style="left:' + (3 + i * 5.4) + '%; animation-delay:' + ((i % 6) * 0.35) + 's; animation-duration:' + (2.2 + (i % 4) * 0.4) + 's;">' + EMO[i % 6] + '</span>';
    overlay('<div class="celebrate">' + conf +
      '<div class="cel-cup">🏆</div>' +
      '<div class="cel-t">' + t('celTitle') + '</div>' +
      '<div class="cel-n">' + esc(p.name) + '</div>' +
      '<div class="cel-b">' + t('celBody', { age: p.retiredAge }) + '</div>' +
      '<button class="buy cel-btn" id="celOk">' + t('celBtn') + '</button></div>');
    $('celOk').onclick = () => { closeOverlay(); render(); };
  }

  function showEnd() {
    const g = App.game;
    if (!g || !g.rankings) return;
    const medals = ['🥇', '🥈', '🥉', '4.', '5.', '6.'];
    let html = '<div class="confetti">🎉🏆🎉</div><h2 style="text-align:center; margin-bottom:12px;">' + t('finalRank') + '</h2>' +
      g.rankings.map((r, i) => '<div class="rank"><span class="pos">' + medals[i] + '</span><div class="det"><b>' + esc(r.name) + '</b>' +
        '<div class="muted">' + (r.retiredAge !== null ? t('iquitFree', { age: r.retiredAge }) :
          (r.bankrupt ? '💥 ' + t('bankruptTag') :
            (r.months !== null ? t('survive', { poss: I.isFemale(r.name) ? 'της' : 'του', d: fmtDur(r.months) }) : t('reached65')))) + '</div></div></div>').join('');
    html += '<div class="acts" style="margin-top:14px;">' +
      '<button class="wildbtn" id="btnStats">' + t('analyticsBtn') + '</button>' +
      '<button class="wildbtn" id="btnFeedback">' + t('feedbackBtn') + '</button>' +
      (App.role === 'host' ? '<button class="buy" id="btnAgain">' + t('playAgain') + '</button>' : '') +
      '<button class="ghost" id="btnExit">' + t('exit') + '</button></div>';
    App.localModal = true;
    overlay(html);
    $('btnStats').onclick = () => showStats();
    $('btnFeedback').onclick = () => showFeedback();
    const ba = $('btnAgain');
    if (ba) ba.onclick = () => { App.localModal = null; hostStart(); closeOverlay(); };
    $('btnExit').onclick = () => { localStorage.removeItem(HOST_KEY); localStorage.removeItem(GUEST_KEY); location.reload(); };
  }

  // ============================================================ HOME WIRING
  // ===== v1.22: ΠΡΟΣΩΡΙΝΟ ΚΡΥΦΟ TURN SETUP PANEL (?turnsetup=1) =====
  // Για δοκιμές ExpressTURN σε πραγματικές συσκευές (iPhone: δεν υπάρχει console).
  // ΔΕΝ εμφανίζεται σε κανονικούς επισκέπτες, ΔΕΝ αγγίζει App/game/multiplayer flow,
  // ΔΕΝ περιέχει/στέλνει credentials πουθενά — γράφει ΜΟΝΟ στο localStorage['iquit_turn']
  // (το ίδιο κλειδί που διαβάζει ήδη το net.js customTurn()). Αφαιρείται όταν τελειώσουν οι δοκιμές.
  function initTurnSetupPanel() {
    if (!/[?&]turnsetup=1/.test(location.search)) return;
    const KEY = 'iquit_turn';
    const read = () => {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const a = JSON.parse(raw);
        return Array.isArray(a) ? a : [a];
      } catch (e) { return null; }
    };
    const mask = (s) => { s = String(s || ''); return s.length <= 4 ? '••••' : '••••' + s.slice(-4); };

    const wrap = document.createElement('div');
    wrap.id = 'turnSetup';
    wrap.style.cssText = 'position:fixed; left:50%; bottom:10px; transform:translateX(-50%); z-index:9000;' +
      'width:min(430px, calc(100vw - 16px)); max-height:74vh; overflow:auto; -webkit-overflow-scrolling:touch;' +
      'background:#101b30; border:1px solid #334a72; border-radius:14px; padding:14px 14px 16px;' +
      'box-shadow:0 14px 44px rgba(0,0,0,.65); color:#dfe8f6; font-size:14px; text-align:left;';
    const inp = 'width:100%; box-sizing:border-box; margin:4px 0 10px; padding:11px 12px; font-size:16px;' +
      'background:#0b1424; color:#eaf1fb; border:1px solid #31466e; border-radius:9px;';
    const btn = 'padding:11px 12px; font-size:14px; font-weight:700; border:0; border-radius:9px; cursor:pointer; width:100%; margin-top:8px;';
    wrap.innerHTML =
      '<div style="display:flex; align-items:center; margin-bottom:8px;">' +
        '<b style="font-size:15px;">🛠️ TURN Setup (προσωρινό)</b><span style="flex:1"></span>' +
        '<button id="tsClose" style="' + btn + ' width:auto; margin:0; padding:6px 12px; background:#243352; color:#cfe0f5;">✕</button></div>' +
      '<div id="tsStatus" style="background:#0b1424; border:1px solid #263a5e; border-radius:9px; padding:9px 11px; margin-bottom:10px; font-size:13px; line-height:1.5; word-break:break-all;"></div>' +
      '<label style="font-size:12px; color:#9fb4d4;">TURN server URL (turn:… ή turns:…)</label>' +
      '<input id="tsUrl" style="' + inp + '" placeholder="turn:free.expressturn.com:3478" autocomplete="off" autocapitalize="off" spellcheck="false">' +
      '<label style="font-size:12px; color:#9fb4d4;">Username</label>' +
      '<input id="tsUser" style="' + inp + '" autocomplete="off" autocapitalize="off" spellcheck="false">' +
      '<label style="font-size:12px; color:#9fb4d4;">Credential</label>' +
      '<input id="tsCred" type="password" style="' + inp + '" autocomplete="off">' +
      '<button id="tsSave" style="' + btn + ' background:#2f68d8; color:#fff;">💾 Αποθήκευση & έλεγχος</button>' +
      '<button id="tsDel" style="' + btn + ' background:#5c2733; color:#ffd9de;">🗑️ Διαγραφή credentials</button>' +
      '<button id="tsGo" style="' + btn + ' background:#1f7a4d; color:#eafff2;">🚀 Άνοιγμα Forced TURN Test (?turnonly=1)</button>' +
      '<button id="tsIce" style="' + btn + ' background:#243352; color:#cfe0f5;">📡 Εμφάνιση ICE log</button>' +
      '<pre id="tsIceOut" style="display:none; background:#0b1424; border:1px solid #263a5e; border-radius:9px; padding:9px; font-size:11px; line-height:1.45; white-space:pre-wrap; word-break:break-all; max-height:180px; overflow:auto; margin:8px 0 0;"></pre>' +
      '<div id="tsMsg" style="margin-top:9px; font-size:13px; min-height:18px;"></div>';
    document.body.appendChild(wrap);

    const el = (id) => document.getElementById(id);
    const msg = (txt, ok) => { const m = el('tsMsg'); m.textContent = txt; m.style.color = ok ? '#7fe3a8' : '#ff9aa5'; };
    const renderStatus = () => {
      const a = read(), st = el('tsStatus');
      if (!a || !a.length) { st.textContent = 'Κατάσταση: κανένα αποθηκευμένο TURN credential σε αυτή τη συσκευή.'; return; }
      const e0 = a[0];
      st.textContent = 'Κατάσταση: ' + a.length + ' αποθηκευμένο(α) ✓\nURL: ' + (e0.urls || '—') +
        '\nUsername: ' + (e0.username || '—') + '\nCredential: ' + mask(e0.credential);
    };
    // προσυμπλήρωση για εύκολη διόρθωση (μόνο τοπικά — τίποτα δεν φεύγει από τη συσκευή)
    const cur = read();
    if (cur && cur[0]) { el('tsUrl').value = cur[0].urls || ''; el('tsUser').value = cur[0].username || ''; el('tsCred').value = cur[0].credential || ''; }
    renderStatus();

    el('tsClose').onclick = () => wrap.remove();
    el('tsSave').onclick = () => {
      const u = el('tsUrl').value.trim(), n = el('tsUser').value.trim(), c = el('tsCred').value;
      if (!/^turns?:/.test(u)) { msg('❌ Το URL πρέπει να ξεκινά με turn: ή turns:', false); return; }
      if (!n || !c) { msg('❌ Συμπλήρωσε username και credential.', false); return; }
      try {
        localStorage.setItem(KEY, JSON.stringify([{ urls: u, username: n, credential: c }]));
        const back = read();
        const ok = back && back.length === 1 && back[0].urls === u && back[0].username === n && back[0].credential === c;
        if (ok) { msg('✅ Αποθηκεύτηκαν και επαληθεύτηκαν. Ισχύουν από την επόμενη σύνδεση/δωμάτιο.', true); }
        else msg('❌ Η επαλήθευση απέτυχε — δεν γράφτηκαν σωστά.', false);
      } catch (e) { msg('❌ Αποτυχία αποθήκευσης: ' + e.message, false); }
      renderStatus();
    };
    el('tsDel').onclick = () => {
      try { localStorage.removeItem(KEY); } catch (e) {}
      msg(read() ? '❌ Η διαγραφή απέτυχε.' : '✅ Διαγράφηκαν από αυτή τη συσκευή.', !read());
      renderStatus();
    };
    el('tsGo').onclick = () => {
      // κρατάμε και το turnsetup=1 ώστε το panel να είναι διαθέσιμο και στη δοκιμή
      location.href = location.pathname + '?turnonly=1&turnsetup=1&transport=peer';
    };
    el('tsIce').onclick = () => {
      const out = el('tsIceOut');
      const lines = (NET && NET.iceLog) ? NET.iceLog() : [];
      out.textContent = lines.length ? lines.join('\n') : '(κενό — δεν έχει γίνει ακόμα απόπειρα σύνδεσης)';
      out.style.display = 'block';
      out.scrollTop = out.scrollHeight;
    };
  }

  function init() {
    initTurnSetupPanel(); // v1.22: ενεργό ΜΟΝΟ με ?turnsetup=1 — αλλιώς no-op
    $('playerName').value = localStorage.getItem(NAME_KEY) || '';
    $('playerName').addEventListener('input', () => localStorage.setItem(NAME_KEY, $('playerName').value));
    $('joinCode').addEventListener('input', () => { $('joinCode').value = $('joinCode').value.toUpperCase().replace(/[^A-Z2-9]/g, ''); });

    // v1.7 MOBILE FIX: σε κινητά, όταν η καρτέλα πάει στο background τα timers
    // παγώνουν και τα animations μπορεί να μείνουν «κολλημένα» (App.anim/drawAnimBusy
    // αληθή για πάντα → δεν ανοίγει ποτέ το modal → «δεν με αφήνει να συνεχίσω»).
    // (α) watchdog: κάθε 4s ξεκολλάει animation που κρατά υπερβολικά πολύ
    setInterval(() => {
      const now = Date.now();
      let stuck = false;
      if (App.anim && now - (App.animStartedAt || 0) > 20000) { App.anim = null; stuck = true; }
      if (App.drawAnimBusy && now - (App.drawAnimStartedAt || 0) > 12000) { App.drawAnimBusy = false; stuck = true; }
      if (stuck && App.game) render();
    }, 4000);
    // (β) όταν η καρτέλα ξαναγίνει ορατή: ξεκόλλημα, φρέσκο render και επανεκκίνηση bot timer
    document.addEventListener('visibilitychange', () => {
      if (document.hidden || !App.game) return;
      const now = Date.now();
      if (App.anim && now - (App.animStartedAt || 0) > 8000) App.anim = null;
      if (App.drawAnimBusy && now - (App.drawAnimStartedAt || 0) > 8000) App.drawAnimBusy = false;
      render();
      scheduleAuto();
    });

    // v1.8 HOST MIGRATION: (α) ο host «χτυπά» heartbeat ώστε οι guests να ξέρουν ότι ζει
    setInterval(() => {
      if (App.role === 'host' && App.net && App.game) App.net.broadcast({ t: 'hb' });
    }, HB_MS);
    // (β) guest: παρατεταμένη σιωπή του host (πέρα από συνδέσεις που «έκλεισαν» καθαρά,
    // πιάνει και κινητά που απλώς εξαφανίζονται) → κινείται η διαδικασία επανασύνδεσης/διαδοχής
    setInterval(() => {
      if (App.role !== 'guest' || !App.game || App.migrating) return;
      if (App.lastHostMsg && Date.now() - App.lastHostMsg > HB_LOST_MS) {
        App.lastHostMsg = Date.now(); // μην πυροδοτείται σε κάθε tick
        onHostLost();
      }
    }, FAST ? 900 : 3000);

    // v1.5: κλικ στο λογότυπο (topbar) → επιβεβαίωση → αρχική σελίδα
    const bh = $('brandHome');
    if (bh) bh.onclick = () => {
      App.localModal = true;
      overlay('<h3 style="margin-bottom:6px;">' + t('leaveTitle') + '</h3>' +
        '<div class="muted" style="margin-bottom:12px;">' + t('leaveBody') + '</div>' +
        '<div class="acts"><button class="danger" id="leaveYes" style="padding:12px;">' + t('leaveYes') + '</button>' +
        '<button class="ghost" id="leaveNo">' + t('cancel') + '</button></div>');
      $('leaveYes').onclick = () => {
        localStorage.removeItem(HOST_KEY); localStorage.removeItem(GUEST_KEY);
        location.href = TPORT.cleanPath(location.pathname, location.search); // καθαρή αρχική, ίδιο transport
      };
      $('leaveNo').onclick = () => { closeOverlay(); if (App.game) render(); };
    };

    $('btnCreate').onclick = () => {
      if (!NET || (!FB_TRANSPORT && typeof Peer === 'undefined')) {
        homeErr(FB_TRANSPORT ? 'Δεν φορτώθηκε το Firebase transport — κάνε ανανέωση.' : 'Δεν φορτώθηκε το PeerJS — έλεγξε τη σύνδεσή σου και κάνε ανανέωση.');
        return;
      }
      localStorage.removeItem(HOST_KEY);
      $('btnCreate').disabled = true; $('btnCreate').textContent = t('creating');
      hostCreate(false);
    };
    // Premium (placeholder): μόνο ένα «Coming Soon» modal — καμία λογική/premium mode.
    $('btnPremium').onclick = () => {
      App.localModal = true;
      overlay('<div style="text-align:center; padding:6px 4px;">' +
        '<div style="font-size:22px; font-weight:900; letter-spacing:1px; color:#ece0ff; margin-bottom:6px;">🧠 ADVANCED MODE</div>' +
        '<div class="muted" style="font-size:15px; margin-bottom:16px;">Coming Soon</div>' +
        '<button class="primary" id="premOk" style="width:auto; padding:12px 30px;">OK</button></div>');
      $('premOk').onclick = closeOverlay;
    };
    $('btnJoin').onclick = () => {
      const code = $('joinCode').value.trim();
      if (code.length !== 4) { homeErr(t('codeLen')); return; }
      if (!NET || (!FB_TRANSPORT && typeof Peer === 'undefined')) {
        homeErr(FB_TRANSPORT ? 'Δεν φορτώθηκε το Firebase transport — κάνε ανανέωση.' : 'Δεν φορτώθηκε το PeerJS — έλεγξε τη σύνδεσή σου.');
        return;
      }
      localStorage.removeItem(GUEST_KEY);
      guestJoin(code, undefined);
    };
    $('btnShare').onclick = async () => {
      const code = App.lobby ? App.lobby.code : $('lobbyCode').textContent;
      // Link πρόσκλησης: ανοίγει το παιχνίδι με προσυμπληρωμένο δωμάτιο (?room=ΚΩΔΙΚΟΣ)
      // Default Firebase links μένουν καθαρά· ρητό peer/firebase διατηρείται για συμβατότητα.
      const url = TPORT.inviteUrl(location.origin, location.pathname, code, location.search);
      const text = t('shareText', { url });
      if (navigator.share) { try { await navigator.share({ text, url }); } catch (e) {} }
      else { try { await navigator.clipboard.writeText(text); toast(t('copied')); } catch (e) {} }
    };

    // v0.9: Κανόνες & γλώσσα — διαθέσιμα από αρχική, lobby και μέσα στο παιχνίδι
    ['btnRules', 'btnRulesHome', 'btnRulesLobby'].forEach(id => { const b = $(id); if (b) b.onclick = showRules; });
    // v1.15: Ξενάγηση + επανατοποθέτηση spotlight σε resize/scroll (mobile-safe)
    const btnTour = $('btnTour');
    if (btnTour) btnTour.onclick = tourStart;
    window.addEventListener('resize', () => { if (App.tourStep != null) positionTour(); });
    window.addEventListener('scroll', () => { if (App.tourStep != null) positionTour(); }, { passive: true });
    ['btnLang', 'btnLangHome'].forEach(id => { const b = $(id); if (b) b.onclick = toggleLang; });
    applyStatic();

    // Ιστορικό: απόκρυψη/εμφάνιση (v1.0 #6)
    const blt = $('btnLogToggle');
    if (blt) blt.onclick = () => { App.logOpen = !App.logOpen; localStorage.setItem('iquit_log', App.logOpen ? '1' : '0'); if (App.game) renderLog(App.game); };

    // Chat
    $('chatSend').onclick = sendChat;
    $('chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

    // Ήχος & 3D toggles
    const sb = $('btnSound'), b3 = $('btn3d');
    const syncToggles = () => {
      sb.textContent = App.muted ? '🔇' : '🔊';
      b3.classList.toggle('on', App.board3d);
    };
    sb.onclick = () => { App.muted = !App.muted; localStorage.setItem('iquit_mute', App.muted ? '1' : '0'); syncToggles(); if (!App.muted) sound('land'); };
    b3.onclick = () => { App.board3d = !App.board3d; localStorage.setItem('iquit_3d', App.board3d ? '1' : '0'); syncToggles(); if (App.game) render(); };
    syncToggles();
    $('btnStart').onclick = hostStart;
    $('btnLeaveLobby').onclick = () => {
      try { App.net && App.net.close(); } catch (e) {}
      localStorage.removeItem(HOST_KEY); localStorage.removeItem(GUEST_KEY);
      location.reload();
    };

    // Link πρόσκλησης: ?room=ΚΩΔΙΚΟΣ → προσυμπλήρωση / αυτόματη είσοδος
    const roomParam = (new URLSearchParams(location.search).get('room') || '').toUpperCase().replace(/[^A-Z2-9]/g, '');
    if (roomParam.length === 4) {
      $('joinCode').value = roomParam;
      // Καθάρισε το ?room αλλά κράτα τυχόν ρητό peer/firebase για refresh και resume.
      history.replaceState(null, '', TPORT.cleanPath(location.pathname, location.search));
      if (($('playerName').value || '').trim()) {
        guestJoin(roomParam, undefined);
        return;
      }
      homeErr(t('inviteMsg', { code: roomParam }));
      $('homeErr').style.background = '#1d2f1e'; $('homeErr').style.borderColor = '#2e5a33'; $('homeErr').style.color = '#a8f0b0';
      $('playerName').focus();
    }

    // Επαναφορά συνεδρίας
    const hostS = JSON.parse(localStorage.getItem(HOST_KEY) || 'null');
    const guestS = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null');
    const rb = $('resumeBox');
    let rhtml = '';
    if (hostS && hostS.game && hostS.game.phase === 'playing') rhtml += '<button class="primary" id="btnResumeHost" style="margin-bottom:6px;">' + t('resumeHost', { code: esc(hostS.lobby.code) }) + '</button>';
    if (guestS) rhtml += '<button class="primary" id="btnResumeGuest" style="margin-bottom:6px;">' + t('resumeGuest', { code: esc(guestS.code) }) + '</button>';
    rb.innerHTML = rhtml;
    if ($('btnResumeHost')) $('btnResumeHost').onclick = () => { $('btnResumeHost').disabled = true; hostCreate(true); };
    if ($('btnResumeGuest')) $('btnResumeGuest').onclick = () => { $('playerName').value = guestS.name; guestJoin(guestS.code, guestS.token); };
  }

  window.IQ_UI = { showEnd, showRules, showFeedback, toggleLang };
  /* e2e-only hook (ενεργό ΜΟΝΟ με ?e2e=1) — για screenshots/έλεγχο modals από τα test scripts */
  if (new URLSearchParams(location.search).get('e2e') === '1') window.IQ_TEST = { App, render, showCelebration };
  init();
})();
