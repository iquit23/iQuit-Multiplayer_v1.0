/* I QUIT! Online — UI controller.
   Host: τρέχει engine + bots, κάνει broadcast state. Guest: στέλνει actions, κάνει render το snapshot. */
(function () {
  'use strict';
  const E = window.IQ_ENGINE, BOTS = window.IQ_BOTS, NET = window.IQ_NET, CARDS = window.IQ_CARDS, I = window.IQ_I18N;
  const $ = (id) => document.getElementById(id);
  const fmt = E.fmt;
  const t = I.t;
  // Τίτλος κάρτας/επένδυσης στη γλώσσα του παίκτη (τα inv κρατούν το ελληνικό snapshot — κοιτάμε την κάρτα)
  function invTitle(i) { const c = i.cardId && E.card(i.cardId); return c ? I.cardTitle(c) : i.title; }

  // v0.5: επώνυμα bots με στρατηγική — αυτά επιλέγει ο host στο lobby
  const BOT_ROSTER = [
    { name: 'Ίκαρος', strategy: 'aggressive' },
    { name: 'Ηλέκτρα', strategy: 'aggressive' },
    { name: 'Φοίβος', strategy: 'balanced' },
    { name: 'Καλυψώ', strategy: 'balanced' },
    { name: 'Δανάη', strategy: 'defensive' },
    { name: 'Ορφέας', strategy: 'defensive' },
  ];
  const BOT_DELAY = 5200, DISCO_DELAY = 25000; // αρκετό ώστε να ολοκληρώνεται το πιο αργό βήμα-βήμα animation
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
  function sound(kind, pawn) {
    if (App.muted) return;
    try {
      if (kind === 'dice') { [0, .09, .19, .3, .42].forEach((t) => noiseBurst(.05, 700 + Math.random() * 900, .07, t)); }
      else if (kind === 'step') { pawnStepSound(pawn); }
      else if (kind === 'land') { beep(500, .1, 'triangle', .07); beep(750, .12, 'triangle', .06, .08); }
      else if (kind === 'win') { [523, 659, 784, 1047].forEach((f, i) => beep(f, .18, 'triangle', .08, i * .13)); }
      else if (kind === 'chat') { beep(1200, .05, 'sine', .04); }
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
    if (App.role === 'guest') { App.net.act(action); return; }
    applyAs(App.myId, action);
  }

  function applyAs(playerId, action) {
    if (!App.game || !action) return;
    const r = E.applyAction(App.game, playerId, action);
    if (r && r.error) {
      if (playerId === App.myId) toast('⚠️ ' + esc(r.error));
      else if (App.role === 'host') sendToPlayer(playerId, { t: 'err', msg: r.error });
      return;
    }
    afterChange();
  }

  function afterChange() {
    saveHostSession();
    broadcastState();
    render();
    maybeToastNewLog();
    scheduleAuto();
  }

  // ============================================================ HOST
  function hostCreate(resume) {
    const saved = resume ? JSON.parse(localStorage.getItem(HOST_KEY) || 'null') : null;
    App.role = 'host'; App.myId = 'p0';
    const cbs = {
      onReady(code) {
        if (saved) {
          App.lobby = saved.lobby;
          App.game = saved.game;
          App.chat = saved.chat || [];
          App.lobby.players.forEach(p => { if (!p.isBot && p.id !== 'p0') p.connected = false; });
        } else {
          App.lobby = { code, players: [{ id: 'p0', name: myName(), isBot: false, connected: true, clientId: null, token: NET.makeToken() }] };
        }
        saveHostSession();
        if (App.game) { show('game'); render(); scheduleAuto(); }
        else { show('lobby'); renderLobby(); }
      },
      onError(msg) { show('home'); homeErr(msg); },
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
    App.net.broadcast({ t: 'state', state: App.game });
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
    if (App.role === 'guest') return;
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
        if (msg.t === 'welcome') {
          App.myId = msg.playerId;
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
        toast('🔌 Χάθηκε η σύνδεση με τον host — προσπαθώ να επανασυνδεθώ…');
        retryGuest();
      },
      onError(msg) {
        if (App.game) retryGuest();
        else { show('home'); homeErr(msg); }
      },
    });
  }

  function retryGuest() {
    clearTimeout(App.guestRetry);
    const s = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null');
    if (!s) return;
    App.guestRetry = setTimeout(() => {
      try { App.net.close(); } catch (e) {}
      guestJoin(s.code, s.token);
      if (App.game) { show('game'); render(); }
    }, 4000);
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
        if (App.lobby.players.some(x => x.pawn === pw && x.id !== 'p0')) return;
        App.lobby.players.find(x => x.id === 'p0').pawn = pw;
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
    set('btnCreate', 'createRoom'); set('btnJoin', 'joinBtn'); set('btnRulesHome', 'rulesBtn');
    $('playerName').placeholder = t('namePh'); $('joinCode').placeholder = t('codePh');
    set('lblRoom', 'room'); set('btnShare', 'shareBtn'); set('lblPlayers', 'players');
    set('lblPickPawn', 'pickPawn'); set('lblAddBot', 'addBot'); set('btnStart', 'startBtn');
    set('guestWait', 'guestWait'); set('btnRulesLobby', 'rulesBtn'); set('btnLeaveLobby', 'leave');
    set('lblChat', 'chat'); set('lblLog', 'log');
    const ci = $('chatInput'); if (ci) ci.placeholder = t('chatPh');
    const flag = I.lang === 'el' ? '🇬🇧' : '🇬🇷';
    if ($('btnLang')) $('btnLang').textContent = flag;
    if ($('btnLangHome')) $('btnLangHome').textContent = flag + (I.lang === 'el' ? ' EN' : ' ΕΛ');
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
    $('lobbyCount').textContent = '(' + App.lobby.players.length + '/6)';
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
    $('lobbyCount').textContent = '(' + msg.players.length + '/6)';
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
    checkAnim(g);
    $('boardbox').classList.toggle('tilt', App.board3d);
    // v1.0 (#6): όσο το πιόνι περπατάει, ΔΕΝ αποκαλύπτουμε ιστορικό/ταμεία/κάρτες — μόνο ταμπλό & ζάρια
    if (App.anim && g.phase === 'playing') {
      renderBoard(g);
      renderCenter(g, g.pending ? g.pending.playerId : g.players[g.turn].id);
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
    renderMyDash(g);
    renderOthers(g, actorId);
    renderLog(g);
    renderModal(g, actorId);
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

    let status = '';
    if (p.retiredAge !== null) status = '<div class="notice" style="margin-bottom:10px;">' + t('retired', { age: p.retiredAge }) + '</div>';
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
      return '<div class="inv"><span class="dot" style="background:' + color + '"></span>' +
        '<span class="nm" title="' + esc(ttl) + '">' + esc(ttl) + ' <span class="muted">' + fmt(i.cost) + '</span></span>' + btns + right + '</div>';
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
      '<div class="meter-top"><div><div class="muted">' + t('meterLbl') + '</div>' +
      '<div class="meter-pct">' + pct + '%</div></div>' +
      '<div style="text-align:right"><div class="muted">' + t('age') + '</div><div style="font-size:26px; font-weight:800">' + p.age + '</div></div></div>' +
      '<div class="bar"><div class="fill" style="width:' + Math.min(100, pct) + '%"></div></div>' +
      '<div class="statgrid">' +
      '<div class="stat"><div class="k">' + t('cash') + '</div><div class="v"' + (p.cash < 0 ? ' style="color:var(--red)"' : '') + '>' + fmt(p.cash) + '</div></div>' +
      '<div class="stat"><div class="k">' + t('passive') + '</div><div class="v" style="color:var(--accent)">' + fmt(pas) + '</div></div>' +
      '<div class="stat"><div class="k">' + t('salary') + '</div><div class="v">' + fmt(p.salary) + '</div></div>' +
      '<div class="stat"><div class="k">' + t('expenses') + '</div><div class="v">' + fmt(exp) + '</div></div>' +
      '</div>' +
      '<div class="muted" style="margin:8px 0 2px;">' + t('netPer') + ' <b style="color:var(--txt)">' + fmt(net) + '</b> · 🃏 ' + t('wild') + ': ' + p.wilds + '</div>' +
      '<details class="exp" id="expDetails"' + (App.expOpen ? ' open' : '') + '><summary>' + t('expByCat') + (g.inflMult > 1 ? ' <span style="color:var(--yellow)">' + t('inflatedTag', { m: g.inflMult.toFixed(2) }) + '</span>' : '') + '</summary>' +
      Object.keys(p.expenses).map(k => '<div class="exprow"><span>' + esc(I.expName(k)) + '</span><b>' + fmt(p.expenses[k]) + '</b></div>').join('') +
      '<div class="exprow" style="border-top:1px solid var(--line); margin-top:4px;"><span><b>' + t('totalExp') + '</b></span><b style="color:var(--yellow)">' + fmt(exp) + '</b></div>' +
      '</details>' +
      '<h3 style="font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.6px; margin:10px 0 4px;">' + t('portfolio') + '</h3>' +
      inv +
      (p.inv.length ? '<div class="exprow" style="border-top:1px solid var(--line); margin-top:4px;"><span><b>' + t('totalInvInc') + '</b></span><b style="color:var(--accent)">+' + fmt(pas + bondInc) + t('perCycle') + ' <span class="muted" style="font-weight:400;">(' + t('valueTag', { v: fmt(E.invTotalCost(p)) }) + ')</span></b></div>' : '') +
      loanHtml;

    box.querySelectorAll('[data-redeem]').forEach(b => b.onclick = () => act({ a: 'redeem-bond', uid: b.dataset.redeem }));
    box.querySelectorAll('[data-sellf]').forEach(b => b.onclick = () => openFundingSale(b.dataset.sellf));
    box.querySelectorAll('[data-repay]').forEach(b => b.onclick = () => act({ a: 'repay', uid: b.dataset.repay, count: +b.dataset.count }));
    const det = $('expDetails');
    if (det) det.ontoggle = () => { App.expOpen = det.open; }; // v0.6: μένει ανοιχτό μέχρι να το κλείσεις εσύ
    const bl = $('btnLoan');
    if (bl) bl.onclick = () => { const v = Math.floor(parseFloat($('loanAmt').value)); if (v > 0) openLoanConfirm(v); };
  }

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
        (p.finished ? '<span class="muted" style="font-size:10px;">' + t('at65') + '</span>' :
          (!p.isBot && !p.connected ? '<span class="off">⚡ ' + t('offline') + '</span>' : '')));
      return '<div class="op' + (p.id === actorId && g.phase === 'playing' ? ' turn' : '') + '">' +
        '<div class="top"><span class="opdot" style="background:' + p.color + '">' + (p.pawn || esc((p.name[0] || '?').toUpperCase())) + '</span>' +
        '<span class="nm">' + (p.isBot ? '🤖 ' : '') + esc(p.name) + '</span>' + flags + '</div>' +
        '<div class="st"><span>' + t('yearsOld', { n: p.age }) + '</span><span>' + fmt(p.cash) + '</span></div>' +
        '<div class="st"><span>' + t('passiveShort', { v: fmt(E.passive(p)) }) + '</span><span>' + pct + '%</span></div>' +
        '<div class="st" style="margin-top:2px;"><span>📍 ' + esc(CARDS.BOARD[p.pos].label) + '</span></div>' +
        '<div class="bar"><div class="fill" style="width:' + Math.min(100, pct) + '%"></div></div></div>';
    }).join('');
  }

  // v1.0 (#6): τα log entries είναι δομημένα {k, p} — μεταφράζονται εδώ, στη γλώσσα ΤΟΥ παίκτη
  function logText(e) {
    if (typeof e === 'string') return e; // συμβατότητα με παλιές παρτίδες
    const P = Object.assign({}, e.p);
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

  function cardHtml(c, deck, discount, curPrice) {
    const ttl = I.cardTitle(c);
    if (deck === 'lifestyle') {
      const d = (curPrice != null ? curPrice : c.delta);
      return '<div class="gamecard gc-lifestyle"><div class="cat">LIFESTYLE</div><div class="ttl">' + esc(ttl) + '</div>' +
        '<div style="margin-top:10px; font-weight:800; font-size:17px; color:' + (d > 0 ? 'var(--red)' : 'var(--green)') + '">' +
        esc(I.expName(c.cat)) + ' ' + (d > 0 ? '+' : '') + d + '€ ' + t('permanent') + (c.shared ? t('each') : '') +
        (d !== c.delta ? ' <span class="muted" style="font-size:11px;">' + t('baseInfl', { v: c.delta + '€' }) + '</span>' : '') + '</div></div>';
    }
    if (deck === 'moments') {
      const amt = (curPrice != null ? curPrice : c.amount);
      const eff = c.cancels
        ? '<div style="margin-top:10px; font-weight:700; color:var(--green)">' + t('cancelsLS') + '</div>'
        : '<div style="margin-top:10px; font-weight:800; font-size:19px; color:' + (amt >= 0 ? 'var(--green)' : 'var(--red)') + '">' + (amt > 0 ? '+' : '') + fmt(amt) +
          (amt !== c.amount ? ' <span class="muted" style="font-size:11px; font-weight:400;">' + t('baseInfl', { v: fmt(c.amount) }) + '</span>' : '') + '</div>';
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
    if (c.income) effect = '<div style="margin-top:6px; font-weight:800; color:var(--accent)">+' + fmt(c.income) + ' ' + t('perCycle') + ' (' + (100 * c.income / base).toFixed(1) + '%)</div>';
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
        : cardHtml(rc, pend.deck, 0, pend.deck === 'lifestyle' ? E.lifestyleDelta(g, rc) : (pend.deck === 'moments' ? E.momentAmount(g, rc) : null));
      overlay('<div data-ch="ok" style="cursor:pointer">' + body + '</div>' +
        '<div class="acts"><button class="buy" data-ch="ok">' + t('okRead') + '</button></div>' +
        '<div class="muted" style="text-align:center; margin-top:8px;">' + t('everyoneSees') + '</div>');
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
      let html = '<h3 style="margin-bottom:6px;">' + t('forcedTitle') + '</h3>' +
        '<div class="muted" style="margin-bottom:12px;">' + t('forcedBody', { v: fmt(p.cash) }) + '</div>' +
        '<div class="choice-list">' +
        p.inv.map(i => {
          const val = i.kind === 'bond' ? E.bondValue(i) : 0.8 * i.cost;
          return '<button data-fs="' + i.uid + '">' + esc(invTitle(i)) + ' <b style="float:right">+' + fmt(val) + '</b></button>';
        }).join('') + '</div>';
      overlay(html);
      $('modalBody').querySelectorAll('[data-fs]').forEach(b => b.onclick = () => act({ a: 'resolve', uid: b.dataset.fs }));
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

  function showEnd() {
    const g = App.game;
    if (!g || !g.rankings) return;
    const medals = ['🥇', '🥈', '🥉', '4.', '5.', '6.'];
    let html = '<div class="confetti">🎉🏆🎉</div><h2 style="text-align:center; margin-bottom:12px;">' + t('finalRank') + '</h2>' +
      g.rankings.map((r, i) => '<div class="rank"><span class="pos">' + medals[i] + '</span><div class="det"><b>' + esc(r.name) + '</b>' +
        '<div class="muted">' + (r.retiredAge !== null ? t('iquitFree', { age: r.retiredAge }) :
          (r.months !== null ? t('survive', { n: r.months }) : t('reached65'))) + '</div></div></div>').join('');
    html += '<div class="acts" style="margin-top:14px;">' +
      '<button class="wildbtn" id="btnFeedback">' + t('feedbackBtn') + '</button>' +
      (App.role === 'host' ? '<button class="buy" id="btnAgain">' + t('playAgain') + '</button>' : '') +
      '<button class="ghost" id="btnExit">' + t('exit') + '</button></div>';
    App.localModal = true;
    overlay(html);
    $('btnFeedback').onclick = () => showFeedback();
    const ba = $('btnAgain');
    if (ba) ba.onclick = () => { App.localModal = null; hostStart(); closeOverlay(); };
    $('btnExit').onclick = () => { localStorage.removeItem(HOST_KEY); localStorage.removeItem(GUEST_KEY); location.reload(); };
  }

  // ============================================================ HOME WIRING
  function init() {
    $('playerName').value = localStorage.getItem(NAME_KEY) || '';
    $('playerName').addEventListener('input', () => localStorage.setItem(NAME_KEY, $('playerName').value));
    $('joinCode').addEventListener('input', () => { $('joinCode').value = $('joinCode').value.toUpperCase().replace(/[^A-Z2-9]/g, ''); });

    $('btnCreate').onclick = () => {
      if (typeof Peer === 'undefined') { homeErr('Δεν φορτώθηκε το PeerJS — έλεγξε τη σύνδεσή σου και κάνε ανανέωση.'); return; }
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
      if (typeof Peer === 'undefined') { homeErr('Δεν φορτώθηκε το PeerJS — έλεγξε τη σύνδεσή σου.'); return; }
      localStorage.removeItem(GUEST_KEY);
      guestJoin(code, undefined);
    };
    $('btnShare').onclick = async () => {
      const code = App.lobby ? App.lobby.code : $('lobbyCode').textContent;
      // Link πρόσκλησης: ανοίγει το παιχνίδι με προσυμπληρωμένο δωμάτιο (?room=ΚΩΔΙΚΟΣ)
      const url = location.origin + location.pathname + '?room=' + code;
      const text = t('shareText', { url });
      if (navigator.share) { try { await navigator.share({ text, url }); } catch (e) {} }
      else { try { await navigator.clipboard.writeText(text); toast(t('copied')); } catch (e) {} }
    };

    // v0.9: Κανόνες & γλώσσα — διαθέσιμα από αρχική, lobby και μέσα στο παιχνίδι
    ['btnRules', 'btnRulesHome', 'btnRulesLobby'].forEach(id => { const b = $(id); if (b) b.onclick = showRules; });
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
      history.replaceState(null, '', location.pathname); // καθάρισε το URL για να μην ξανα-μπει σε refresh
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
  init();
})();
