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

  function makeCode() {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return c;
  }
  function makeToken() { return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10); }

  function newPeer(id) {
    return new Peer(id || undefined, {
      debug: 1,
      config: {
        // v0.8: Μόνο με STUN, η σύνδεση αποτυγχάνει πίσω από αυστηρά NAT (4G/CGNAT,
        // εταιρικά δίκτυα). Προσθέτουμε δωρεάν δημόσιους TURN relays (Open Relay Project)
        // ως δίχτυ ασφαλείας — αν το απευθείας P2P δεν περνά, η κίνηση δρομολογείται μέσω relay.
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun.relay.metered.ca:80' },
          { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
          { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
          { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
        ],
        iceCandidatePoolSize: 4,
      },
    });
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
      // v0.8: παρακολούθηση ICE για διαγνωστικά — να ξέρουμε ΑΝ βρέθηκε το δωμάτιο
      conn.on('iceStateChanged', (st) => {
        if (st === 'checking') { foundPeer = true; status('Το δωμάτιο βρέθηκε — γίνεται σύζευξη των συσκευών…'); }
        if (st === 'failed') status('Η απευθείας σύζευξη δυσκολεύεται — δοκιμάζεται εναλλακτική διαδρομή…');
      });
      const failTimer = setTimeout(() => {
        if (!opened) {
          // v0.8: διαφορετικό μήνυμα ανάλογα με το ΠΟΥ κόλλησε
          cb.onError(foundPeer
            ? 'Το δωμάτιο «' + code + '» βρέθηκε, αλλά η σύνδεση των συσκευών δεν ολοκληρώθηκε. Δοκιμάστε: (1) ανανέωση σελίδας και ξανά, (2) άλλο δίκτυο (π.χ. Wi-Fi αντί για δεδομένα), (3) απενεργοποίηση VPN.'
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

  root.IQ_NET = { createHost, createGuest, makeToken, makeCode };
})(typeof self !== 'undefined' ? self : this);
