/* I QUIT! — Networking layer (PeerJS / WebRTC P2P).
   Ο host τρέχει το authoritative engine· οι guests στέλνουν actions και λαμβάνουν state snapshots.
   Δεν απαιτείται κανένας δικός μας server — μόνο ο δωρεάν δημόσιος PeerJS broker για το αρχικό "γνώρισμα". */
(function (root) {
  'use strict';

  const PREFIX = 'iquit-v1-';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // χωρίς I/O/0/1
  // v1.8: fast mode (?fast=1) — μικρότερα timeouts, ΜΟΝΟ για automated tests
  const FAST = typeof location !== 'undefined' && /[?&]fast=1/.test(location.search);
  const FAIL_MS = FAST ? 4000 : 25000;
  // v1.14: ?turnonly=1 → ΜΟΝΟ relay διαδρομές. Αποδεικνύει ότι το TURN όντως δουλεύει:
  // αν συνδεθείτε με αυτό ενεργό, το relay είναι εντάξει. ΜΟΝΟ για δοκιμές.
  const TURNONLY = typeof location !== 'undefined' && /[?&]turnonly=1/.test(location.search);

  function makeCode() {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return c;
  }
  function makeToken() { return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10); }

  // v1.13: ΡΥΘΜΙΖΟΜΕΝΟΣ TURN relay. Χωρίς αξιόπιστο TURN, παίκτες σε ΔΙΑΦΟΡΕΤΙΚΑ δίκτυα
  // (π.χ. WiFi ↔ κινητά δεδομένα, πίσω από CGNAT) συχνά ΔΕΝ μπορούν να συνδεθούν — γι' αυτό
  // «μόνο στο ίδιο WiFi». Οι δωρεάν TURN του Open Relay Project έχουν πρακτικά πεθάνει.
  // ΛΥΣΗ: δικά σου TURN credentials (π.χ. δωρεάν expressturn.com) — ΜΟΝΟ τοπικά, στο
  // localStorage κλειδί 'iquit_turn' ως JSON array:
  //   [{"urls":"turn:free.expressturn.com:3478","username":"...","credential":"..."}]
  // v1.14: ΚΑΝΕΝΑ hardcoded TURN credential στο repo. Τα παλιά Open Relay entries ήταν
  // ΚΑΙ νεκρά ΚΑΙ δημόσια — αφαιρέθηκαν (καθυστερούσαν το ICE gathering χωρίς όφελος).
  // Τα TURN δίνονται ΜΟΝΟ τοπικά, μέσω localStorage['iquit_turn'] (βλ. customTurn()),
  // ώστε να μη διαρρέουν credentials σε στατικό αρχείο ή σε commit.
  const TURN_SERVERS = [];
  function customTurn() {
    try {
      const raw = localStorage.getItem('iquit_turn');
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [arr];
    } catch (e) { return []; }
  }

  // ---------------- v1.14: ICE ΔΙΑΓΝΩΣΤΙΚΑ ----------------
  // Καθαρά παρατηρητικά (listeners) — δεν αλλάζουν καμία ροή σύνδεσης.
  const _iceLog = [];
  function ilog() {
    const msg = '[ICE] ' + Array.prototype.join.call(arguments, ' ');
    _iceLog.push(msg); if (_iceLog.length > 200) _iceLog.shift();
    try { console.info(msg); } catch (e) {}
  }
  // 'host' = ίδιο δίκτυο, 'srflx' = μέσω STUN (δημόσια IP), 'relay' = μέσω TURN
  function candType(c) {
    if (!c) return '?';
    if (c.type) return c.type;
    const m = /(?:^| )typ ([a-z]+)/.exec(c.candidate || '');
    return m ? m[1] : '?';
  }
  function logPair(pc, label) {
    if (!pc.getStats) return;
    pc.getStats(null).then(function (stats) {
      const byId = {}; let pair = null;
      stats.forEach(function (r) { byId[r.id] = r; });
      stats.forEach(function (r) {
        if (r.type === 'candidate-pair' && (r.selected || r.nominated || r.state === 'succeeded')) pair = pair || r;
      });
      if (!pair) return;
      const L = byId[pair.localCandidateId], R = byId[pair.remoteCandidateId];
      ilog(label, 'SELECTED PAIR → local=' + (L ? L.candidateType : '?') +
        ' remote=' + (R ? R.candidateType : '?') +
        (L && L.relayProtocol ? ' relayProto=' + L.relayProtocol : ''));
    }).catch(function () {});
  }
  function attachIceLogs(conn, label) {
    let tries = 0;
    const timer = setInterval(function () {
      const pc = conn && conn.peerConnection;
      if (!pc) { if (++tries > 40) clearInterval(timer); return; }
      clearInterval(timer);
      ilog(label, 'peerConnection ready · turnonly=' + TURNONLY);
      pc.addEventListener('iceconnectionstatechange', function () {
        ilog(label, 'iceConnectionState =', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') logPair(pc, label);
      });
      pc.addEventListener('icegatheringstatechange', function () {
        ilog(label, 'iceGatheringState =', pc.iceGatheringState);
      });
      pc.addEventListener('icecandidate', function (e) {
        if (!e.candidate) { ilog(label, 'candidate gathering finished'); return; }
        ilog(label, 'candidate', candType(e.candidate), (e.candidate.protocol || ''), (e.candidate.address || ''));
      });
      pc.addEventListener('icecandidateerror', function (e) {
        ilog(label, 'CANDIDATE ERROR code=' + e.errorCode, 'text=' + (e.errorText || ''), 'url=' + (e.url || ''));
      });
    }, 250);
  }

  function newPeer(id) {
    const cfg = {
      // v1.13: περισσότερα STUN (η ανακάλυψη δημόσιας IP πετυχαίνει συχνότερα σε
      // «μέτρια» NAT) + TURN ως δίχτυ ασφαλείας για τα αυστηρά (CGNAT κινητής)
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        { urls: 'stun:stun.relay.metered.ca:80' },
      ].concat(customTurn()).concat(TURN_SERVERS),
      iceCandidatePoolSize: 6,
    };
    if (TURNONLY) cfg.iceTransportPolicy = 'relay';
    ilog('config · turnonly=' + TURNONLY + ' · turnEntries=' + (customTurn().length + TURN_SERVERS.length));
    return new Peer(id || undefined, { debug: 1, config: cfg });
  }

  // ---------------- HOST ----------------
  function createHost(cb, desiredCode) {
    // cb: { onReady(code), onError(msg), onHello(clientId, name, token, send), onAction(clientId, action), onLeave(clientId) }
    const code = desiredCode || makeCode();
    const peer = newPeer(PREFIX + code.toLowerCase());
    const conns = new Map(); // clientId -> conn
    let seq = 0;

    const host = {
      code, peer,
      sendTo(clientId, msg) {
        const c = conns.get(clientId);
        if (c && c.open) { try { c.send(msg); } catch (e) {} }
      },
      broadcast(msg) {
        conns.forEach(c => { if (c.open) { try { c.send(msg); } catch (e) {} } });
      },
      close() { try { peer.destroy(); } catch (e) {} },
    };

    peer.on('open', () => cb.onReady(code));
    // v0.8: αν πέσει η σύνδεση με τον broker, νέοι παίκτες δεν βρίσκουν το δωμάτιο — αυτόματο reconnect
    peer.on('disconnected', () => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) {} });
    peer.on('error', (e) => {
      // v1.8: περνάμε και το e.type ώστε το UI να χειρίζεται ειδικά το unavailable-id (host migration)
      if (e.type === 'unavailable-id') cb.onError('Ο κωδικός χρησιμοποιείται ήδη — προσπάθησε ξανά.', e.type);
      else if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') cb.onError('Δεν υπάρχει σύνδεση με τον διακομιστή γνωριμίας. Έλεγξε το internet σου.', e.type);
      else if (e.type === 'peer-unavailable') { /* κάποιος guest εξαφανίστηκε — όχι μοιραίο για τον host */ }
      else cb.onError('Σφάλμα δικτύου: ' + e.type, e.type);
    });
    peer.on('connection', (conn) => {
      const clientId = 'c' + (++seq) + '-' + makeToken().slice(0, 4);
      attachIceLogs(conn, 'host'); // v1.14: διαγνωστικά μόνο
      conn.on('open', () => { conns.set(clientId, conn); });
      conn.on('data', (msg) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.t === 'hello') cb.onHello(clientId, msg, (m) => host.sendTo(clientId, m));
        else if (msg.t === 'act') cb.onAction(clientId, msg.action);
        else if (msg.t === 'chat') cb.onChat && cb.onChat(clientId, msg.text);
        else if (msg.t === 'pawn') cb.onPawn && cb.onPawn(clientId, msg.pawn);
        else if (msg.t === 'ping') host.sendTo(clientId, { t: 'pong' });
      });
      conn.on('close', () => { conns.delete(clientId); cb.onLeave(clientId); });
      conn.on('error', () => { conns.delete(clientId); cb.onLeave(clientId); });
    });
    return host;
  }

  // ---------------- GUEST ----------------
  function createGuest(code, hello, cb) {
    // hello: {name, token?} — cb: { onOpen(), onMessage(msg), onClosed(), onError(msg), onStatus(text)? }
    const peer = newPeer();
    let conn = null, closedByUs = false, opened = false, foundPeer = false;
    const status = (t) => { if (cb.onStatus) cb.onStatus(t); };

    const guest = {
      send(msg) { if (conn && conn.open) { try { conn.send(msg); } catch (e) {} } },
      act(action) { guest.send({ t: 'act', action }); },
      close() { closedByUs = true; try { peer.destroy(); } catch (e) {} },
    };

    status('Σύνδεση με τον διακομιστή…');
    peer.on('open', () => {
      status('Αναζήτηση δωματίου «' + code + '»…');
      conn = peer.connect(PREFIX + code.toLowerCase(), { reliable: true });
      attachIceLogs(conn, 'guest'); // v1.14: διαγνωστικά μόνο
      // v0.8: παρακολούθηση ICE για διαγνωστικά — να ξέρουμε ΑΝ βρέθηκε το δωμάτιο
      conn.on('iceStateChanged', (st) => {
        if (st === 'checking') { foundPeer = true; status('Το δωμάτιο βρέθηκε — γίνεται σύζευξη των συσκευών…'); }
        if (st === 'failed') status('Η απευθείας σύζευξη δυσκολεύεται — δοκιμάζεται εναλλακτική διαδρομή…');
      });
      const failTimer = setTimeout(() => {
        if (!opened) {
          // v0.8: διαφορετικό μήνυμα ανάλογα με το ΠΟΥ κόλλησε
          cb.onError(foundPeer
            ? 'Το δωμάτιο «' + code + '» βρέθηκε, αλλά η σύνδεση των συσκευών δεν ολοκληρώθηκε — συνήθως επειδή είστε σε διαφορετικά δίκτυα με αυστηρό NAT (π.χ. κινητά δεδομένα). Δοκιμάστε: (1) ανανέωση και ξανά, (2) να συνδεθείτε στο ΙΔΙΟ Wi-Fi ή ένας να ανοίξει hotspot για τον άλλον, (3) απενεργοποίηση VPN.'
            : 'Δεν βρέθηκε το δωμάτιο «' + code + '». Έλεγξε τον κωδικό και ότι ο host έχει ανοιχτή τη σελίδα του παιχνιδιού.');
        }
      }, FAIL_MS);
      conn.on('open', () => {
        opened = true; clearTimeout(failTimer);
        guest.send(Object.assign({ t: 'hello' }, hello));
        cb.onOpen();
      });
      conn.on('data', (msg) => cb.onMessage(msg));
      conn.on('close', () => { if (!closedByUs) cb.onClosed(); });
      conn.on('error', () => { if (!closedByUs) cb.onClosed(); });
    });
    peer.on('disconnected', () => { try { if (!peer.destroyed && !closedByUs) peer.reconnect(); } catch (e) {} });
    peer.on('error', (e) => {
      if (e.type === 'peer-unavailable') cb.onError('Δεν βρέθηκε το δωμάτιο «' + code + '». Έλεγξε τον κωδικό — και ότι ο host έχει ανοιχτό το παιχνίδι εκείνη τη στιγμή.');
      else if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') cb.onError('Πρόβλημα σύνδεσης με τον διακομιστή. Έλεγξε το internet σου και δοκίμασε ξανά.');
      else if (e.type === 'webrtc') cb.onError('Πρόβλημα WebRTC — δοκίμασε ανανέωση ή άλλο δίκτυο.');
      else cb.onError('Σφάλμα δικτύου: ' + e.type);
    });
    return guest;
  }

  // v1.14: iceLog() → επιστρέφει το ιστορικό ICE για εύκολη ανάγνωση/αντιγραφή στο console
  root.IQ_NET = { createHost, createGuest, makeToken, makeCode, iceLog: function () { return _iceLog.slice(); } };
})(typeof self !== 'undefined' ? self : this);
