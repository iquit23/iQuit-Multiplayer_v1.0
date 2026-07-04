/* I QUIT! — Networking layer (PeerJS / WebRTC P2P).
   Ο host τρέχει το authoritative engine· οι guests στέλνουν actions και λαμβάνουν state snapshots.
   Δεν απαιτείται κανένας δικός μας server — μόνο ο δωρεάν δημόσιος PeerJS broker για το αρχικό "γνώρισμα". */
(function (root) {
  'use strict';

  const PREFIX = 'iquit-v1-';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // χωρίς I/O/0/1

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
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
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
    peer.on('error', (e) => {
      if (e.type === 'unavailable-id') cb.onError('Ο κωδικός χρησιμοποιείται ήδη — προσπάθησε ξανά.');
      else if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') cb.onError('Δεν υπάρχει σύνδεση με τον διακομιστή γνωριμίας. Έλεγξε το internet σου.');
      else cb.onError('Σφάλμα δικτύου: ' + e.type);
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
    // hello: {name, token?} — cb: { onOpen(), onMessage(msg), onClosed(), onError(msg) }
    const peer = newPeer();
    let conn = null, closedByUs = false, opened = false;

    const guest = {
      send(msg) { if (conn && conn.open) { try { conn.send(msg); } catch (e) {} } },
      act(action) { guest.send({ t: 'act', action }); },
      close() { closedByUs = true; try { peer.destroy(); } catch (e) {} },
    };

    peer.on('open', () => {
      conn = peer.connect(PREFIX + code.toLowerCase(), { reliable: true });
      const failTimer = setTimeout(() => {
        if (!opened) cb.onError('Δεν βρέθηκε το δωμάτιο «' + code + '». Έλεγξε τον κωδικό — και ότι ο host έχει ανοιχτό το παιχνίδι.');
      }, 12000);
      conn.on('open', () => {
        opened = true; clearTimeout(failTimer);
        guest.send(Object.assign({ t: 'hello' }, hello));
        cb.onOpen();
      });
      conn.on('data', (msg) => cb.onMessage(msg));
      conn.on('close', () => { if (!closedByUs) cb.onClosed(); });
      conn.on('error', () => { if (!closedByUs) cb.onClosed(); });
    });
    peer.on('error', (e) => {
      if (e.type === 'peer-unavailable') cb.onError('Δεν βρέθηκε το δωμάτιο «' + code + '». Έλεγξε τον κωδικό.');
      else if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') cb.onError('Πρόβλημα σύνδεσης. Έλεγξε το internet σου και δοκίμασε ξανά.');
      else cb.onError('Σφάλμα δικτύου: ' + e.type);
    });
    return guest;
  }

  root.IQ_NET = { createHost, createGuest, makeToken, makeCode };
})(typeof self !== 'undefined' ? self : this);
