/* I QUIT! — Firebase Realtime Database transport (v1.23, ΠΕΙΡΑΜΑΤΙΚΟ).
   Ενεργοποιείται ΜΟΝΟ με ?transport=firebase — αλλιώς δεν φορτώνει τίποτα (ούτε το SDK).
   Υλοποιεί ΑΚΡΙΒΩΣ το ίδιο συμβόλαιο με το IQ_NET (net.js): createHost/createGuest/makeToken/makeCode,
   ώστε το ui.js να δουλεύει αναλλοίωτο. Ο engine/gameplay δεν αγγίζεται.

   Μοντέλο δεδομένων (rooms/<ΚΩΔΙΚΑΣ>):
     meta:            { hostUid, hostBeat, createdAt, hostSeq }   ← ιδιοκτησία δωματίου
     slots/s1..s5:    { uid, ts }                                 ← μέλη-guests (δομικό όριο 5 + host = 6 θέσεις παιχνιδιού)
     toHost/<id>:     { uid, m }                                  ← μηνύματα guest → host (m = JSON string)
     toGuest/<uid>/<id>: { m }                                    ← μηνύματα host → συγκεκριμένο guest
     bcast/<id>:      { m, ts }                                   ← broadcasts host → όλους
   Κάθε καταναλωτής σβήνει ό,τι επεξεργάστηκε· ο host κλαδεύει τα bcast μετά από 60s.
   Το Firebase web config παρακάτω είναι ΔΗΜΟΣΙΟ client configuration (όχι μυστικό) —
   η προστασία γίνεται από τα security rules (database.rules.json) + Anonymous Auth. */
(function (root) {
  'use strict';

  const FB_CONFIG = {
    apiKey: 'AIzaSyDe2rqOlWo_PG86poIAiBjWfJewOB-8DnE',
    authDomain: 'iquit-online-8d69b.firebaseapp.com',
    projectId: 'iquit-online-8d69b',
    storageBucket: 'iquit-online-8d69b.firebasestorage.app',
    messagingSenderId: '701017418584',
    appId: '1:701017418584:web:79b5ab48cb4b87816e932d',
    databaseURL: 'https://iquit-online-8d69b-default-rtdb.europe-west1.firebasedatabase.app',
  };
  // Pinned έκδοση SDK — ΟΧΙ latest (σταθερότητα + έλεγχος αλλαγών)
  const SDK_VERSION = '10.14.1';
  const SDK_BASE = 'https://www.gstatic.com/firebasejs/' + SDK_VERSION + '/';
  const SDK_FILES = ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-database-compat.js'];

  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  // v1.24: 4 θέσεις guests + 1 host = ΜΕΓΙΣΤΟ 5 ΑΤΟΜΑ ΣΥΝΟΛΙΚΑ (όπως το «1-5 παίκτες» του UI)
  const SLOTS = ['s1', 's2', 's3', 's4'];
  const FAST = typeof location !== 'undefined' && /[?&]fast=1/.test(location.search); // ΜΟΝΟ automated tests
  const BCAST_TTL = 60000;      // κλάδεμα broadcasts
  const STALE_TAKEOVER = FAST ? 3000 : 12000; // σιωπή host πριν επιτραπεί διαδοχή (12s και στα rules)
  const STALE_ROOM = 86400000;  // δωμάτιο 24h ανενεργό → μπορεί να διαγραφεί από οποιονδήποτε

  function makeCode() {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return c;
  }
  function makeToken() { return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10); }

  // -------- διαγνωστικά (αντίστοιχο του iceLog — ΠΟΤΕ credentials/περιεχόμενο μηνυμάτων) --------
  const _fbLog = [];
  function flog() {
    const msg = '[FB] ' + Array.prototype.join.call(arguments, ' ');
    _fbLog.push(msg); if (_fbLog.length > 200) _fbLog.shift();
    try { console.info(msg); } catch (e) {}
  }

  // -------- φόρτωση SDK ΜΟΝΟ όταν χρειαστεί + anonymous auth (μία φορά) --------
  let _ready = null;
  function fbReady() {
    if (_ready) return _ready;
    _ready = new Promise(function (resolve, reject) {
      function loadNext(i) {
        if (i >= SDK_FILES.length) return afterLoad();
        if (root.firebase && i === 0 && root.firebase.database) return afterLoad(); // ήδη φορτωμένο (tests/mock)
        const s = document.createElement('script');
        s.src = SDK_BASE + SDK_FILES[i];
        s.onload = function () { loadNext(i + 1); };
        s.onerror = function () { reject(new Error('Αποτυχία φόρτωσης Firebase SDK (' + SDK_FILES[i] + ')')); };
        document.head.appendChild(s);
      }
      function afterLoad() {
        try {
          const fb = root.firebase;
          if (!fb) return reject(new Error('Το Firebase SDK δεν φορτώθηκε.'));
          if (!fb.apps || !fb.apps.length) fb.initializeApp(FB_CONFIG);
          fb.auth().signInAnonymously().then(function (cred) {
            const uid = (cred && cred.user && cred.user.uid) || (fb.auth().currentUser && fb.auth().currentUser.uid);
            if (!uid) return reject(new Error('Ανώνυμη σύνδεση χωρίς uid.'));
            flog('auth ok · uid=' + uid.slice(0, 6) + '…');
            resolve({ fb: fb, db: fb.database(), uid: uid });
          }).catch(function (e) { reject(new Error('Ανώνυμη σύνδεση απέτυχε: ' + (e && e.code || e))); });
        } catch (e) { reject(e); }
      }
      loadNext(0);
    });
    return _ready;
  }
  function TS(fb) { return fb.database.ServerValue.TIMESTAMP; }
  function roomRef(db, code) { return db.ref('rooms/' + code.toUpperCase()); }
  function pack(msg) { return JSON.stringify(msg); }
  function unpack(s) { try { return JSON.parse(s); } catch (e) { return null; } }

  // push + αυτο-κλάδεμα (για ουρές που δεν σβήνει ο παραλήπτης)
  function pushPruned(ref, val, ttl) {
    const r = ref.push(val);
    if (ttl) setTimeout(function () { try { r.remove(); } catch (e) {} }, ttl);
    return r;
  }

  // ---------------- HOST ----------------
  function createHost(cb, desiredCode) {
    const state = { closed: false, listeners: [], code: null, ctx: null };
    const host = {
      code: null,
      sendTo: function (clientId, msg) {
        if (state.closed || !state.ctx) return;
        try { pushPruned(roomRef(state.ctx.db, state.code).child('toGuest/' + clientId), { m: pack(msg) }, BCAST_TTL); } catch (e) {}
      },
      broadcast: function (msg) {
        if (state.closed || !state.ctx) return;
        try {
          const rr = roomRef(state.ctx.db, state.code);
          pushPruned(rr.child('bcast'), { m: pack(msg), ts: TS(state.ctx.fb) }, BCAST_TTL);
          // το heartbeat του παιχνιδιού ενημερώνει και το hostBeat (φρεσκάδα ιδιοκτησίας για migration/GC)
          if (msg && msg.t === 'hb') rr.child('meta/hostBeat').set(TS(state.ctx.fb));
        } catch (e) {}
      },
      close: function () {
        state.closed = true;
        state.listeners.forEach(function (off) { try { off(); } catch (e) {} });
        state.listeners = [];
      },
    };

    fbReady().then(function (ctx) {
      if (state.closed) return;
      state.ctx = ctx;
      // Διεκδίκηση κωδικού με transaction (μοναδικότητα χωρίς race):
      // - κενό → δικό μας (νέο δωμάτιο, server timestamps)
      // - δικό μας uid → resume
      // - hostBeat μπαγιάτικο → διαδοχή ΜΟΝΟ αν είμαστε ήδη ΜΕΛΟΣ του δωματίου (v1.24 —
      //   τα rules το επιβάλλουν server-side· τυχαίος γνώστης του κωδικού ΔΕΝ γίνεται host)
      // - αλλιώς → 'unavailable-id' (αν ζητήθηκε συγκεκριμένος κωδικός) ή νέος τυχαίος
      let tries = 0;
      function claim(code) {
        tries++;
        const rr0 = roomRef(ctx.db, code);
        function doMeta(iAmMember, tempSlotRef) {
          const metaRef = rr0.child('meta');
          metaRef.transaction(function (cur) {
            if (cur === null) return { hostUid: ctx.uid, hostBeat: TS(ctx.fb), createdAt: TS(ctx.fb), hostSeq: 1 };
            if (cur.hostUid === ctx.uid) { cur.hostBeat = TS(ctx.fb); cur.hostSeq = (cur.hostSeq || 1) + 1; return cur; }
            if (iAmMember && (cur.hostBeat || 0) < Date.now() - STALE_TAKEOVER) {
              return { hostUid: ctx.uid, hostBeat: TS(ctx.fb), createdAt: cur.createdAt || TS(ctx.fb), hostSeq: (cur.hostSeq || 1) + 1 };
            }
            return; // abort — κατειλημμένο από ενεργό host (ή δεν είμαστε μέλος)
          }, function (err, committed) {
            if (state.closed) return;
            if (err) { flog('claim error', err.code || err.message); return cb.onError('Πρόβλημα σύνδεσης με τη βάση. Έλεγξε το internet σου.', 'network'); }
            if (!committed) {
              // μη αφήσεις πίσω «θέση-φάντασμα» αν πήραμε προσωρινό slot για τη διεκδίκηση
              if (tempSlotRef) { try { tempSlotRef.remove(); } catch (e) {} }
              if (desiredCode) { flog('claim aborted — ενεργός host στο', code); return cb.onError('Ο κωδικός χρησιμοποιείται ήδη — προσπάθησε ξανά.', 'unavailable-id'); }
              // νεκρό >24h δωμάτιο σε τυχαίο κωδικό: προσπάθησε GC (τα rules το επιτρέπουν) και συνέχισε αλλού
              try { rr0.remove(); } catch (e) {}
              if (tries < 8) return claim(makeCode());
              return cb.onError('Δεν βρέθηκε ελεύθερος κωδικός δωματίου — προσπάθησε ξανά.', 'unavailable-id');
            }
            afterClaim(code);
          });
        }
        rr0.child('slots').once('value').then(function (ss) {
          if (state.closed) return;
          const sl = ss.val() || {};
          const iAmMember = SLOTS.some(function (s) { return sl[s] && sl[s].uid === ctx.uid; });
          if (iAmMember || !desiredCode) return doMeta(iAmMember, null);
          // v1.24: Διαδοχή/resume ΧΩΡΙΣ θέση μέλους (το ui κλείνει τη σύνδεση guest πριν το takeover
          // και το close ελευθερώνει το slot): αν δεν είμαστε ο καταγεγραμμένος host, πρέπει πρώτα
          // να ΞΑΝΑΠΑΡΟΥΜΕ θέση μέλους — τα rules επιτρέπουν διαδοχή ΜΟΝΟ σε μέλη του δωματίου.
          rr0.child('meta').once('value').then(function (ms) {
            if (state.closed) return;
            const meta = ms.val();
            if (!meta || meta.hostUid === ctx.uid) return doMeta(false, null); // κενό δωμάτιο ή δικό μας resume
            (function claimTempSlot(i) {
              if (state.closed) return;
              if (i >= SLOTS.length) return cb.onError('Ο κωδικός χρησιμοποιείται ήδη — προσπάθησε ξανά.', 'unavailable-id');
              const sRef = rr0.child('slots/' + SLOTS[i]);
              sRef.transaction(function (cur) {
                if (cur === null || cur.uid === ctx.uid) return { uid: ctx.uid, ts: Date.now() };
                return;
              }, function (err, committed) {
                if (state.closed) return;
                if (err) return cb.onError('Πρόβλημα σύνδεσης με τη βάση. Έλεγξε το internet σου.', 'network');
                if (!committed) return claimTempSlot(i + 1);
                flog('takeover: προσωρινή θέση ' + SLOTS[i]);
                doMeta(true, sRef);
              });
            })(0);
          });
        });
      }
      function afterClaim(code) {
          state.code = code.toUpperCase(); host.code = state.code;
          flog('host claim ok · room=' + state.code + ' · tries=' + tries);
          const rr = roomRef(ctx.db, state.code);
          // καθαρή αρχή: μπαγιάτικες ουρές από προηγούμενη ζωή του δωματίου
          rr.child('toHost').remove(); rr.child('bcast').remove();
          // v1.24: ΠΡΟΑΓΩΓΗ guest→host: ελευθέρωσε τη θέση guest που τυχόν κατέχουμε —
          // το uid μας δεν επιτρέπεται να «μετράει» δύο φορές, ούτε να μειωθεί η χωρητικότητα
          rr.child('slots').once('value').then(function (ss2) {
            const sl2 = ss2.val() || {};
            SLOTS.forEach(function (s) { if (sl2[s] && sl2[s].uid === ctx.uid) rr.child('slots/' + s).remove(); });
          });
          // v1.24: αν άλλος διεκδικήσει νόμιμα το δωμάτιο (διαδοχή), σταματάμε ΑΜΕΣΩΣ να
          // εκπέμπουμε ως host — κανένας «δεύτερος host» δεν μολύνει τους guests
          const huRef = rr.child('meta/hostUid');
          const onHu = huRef.on('value', function (snap) {
            const v = snap && snap.val ? snap.val() : null;
            if (v && v !== ctx.uid && !state.closed) { flog('deposed — νέος host ανέλαβε το δωμάτιο'); host.close(); }
          });
          state.listeners.push(function () { huRef.off('value', onHu); });
          // εισερχόμενα από guests
          const inRef = rr.child('toHost');
          const lastHello = {}; // v1.24: τα retries του hello (βλ. guest) δεν δημιουργούν διπλό παίκτη
          const onMsg = inRef.on('child_added', function (snap) {
            const v = snap.val(); snap.ref.remove();
            if (!v || typeof v.m !== 'string') return;
            const msg = unpack(v.m); if (!msg || !v.uid) return;
            if (msg.t === 'hello') {
              const hk = v.uid + (msg.token ? ':t' : ':n');
              if (lastHello[hk] && Date.now() - lastHello[hk] < 6000) return; // duplicate retry
              lastHello[hk] = Date.now();
              return cb.onHello(v.uid, msg, function (m) { host.sendTo(v.uid, m); });
            }
            else if (msg.t === 'act') cb.onAction(v.uid, msg.action);
            else if (msg.t === 'chat') cb.onChat && cb.onChat(v.uid, msg.text);
            else if (msg.t === 'pawn') cb.onPawn && cb.onPawn(v.uid, msg.pawn);
            else if (msg.t === 'ping') host.sendTo(v.uid, { t: 'pong' });
          });
          state.listeners.push(function () { inRef.off('child_added', onMsg); });
          // παρουσία guests: αφαίρεση slot (αποσύνδεση/onDisconnect) → onLeave
          const slotsRef = rr.child('slots');
          const onGone = slotsRef.on('child_removed', function (snap) {
            const v = snap.val();
            if (v && v.uid) { flog('guest gone · ' + v.uid.slice(0, 6) + '…'); cb.onLeave(v.uid); }
          });
          state.listeners.push(function () { slotsRef.off('child_removed', onGone); });
          cb.onReady(state.code);
      }
      claim(desiredCode || makeCode());
    }).catch(function (e) {
      if (!state.closed) cb.onError('Firebase: ' + e.message, 'network');
    });
    return host;
  }

  // ---------------- GUEST ----------------
  function createGuest(code, hello, cb) {
    const state = { closed: false, listeners: [], ctx: null, slotRef: null, disco: null };
    const CODE = String(code || '').toUpperCase();
    const status = function (t) { if (cb.onStatus) cb.onStatus(t); };
    const guest = {
      send: function (msg) {
        if (state.closed || !state.ctx) return;
        try { roomRef(state.ctx.db, CODE).child('toHost').push({ uid: state.ctx.uid, m: pack(msg) }); } catch (e) {}
      },
      act: function (action) { guest.send({ t: 'act', action: action }); },
      close: function () {
        state.closed = true;
        state.listeners.forEach(function (off) { try { off(); } catch (e) {} });
        state.listeners = [];
        try { if (state.disco) state.disco.cancel(); } catch (e) {}
        try { if (state.slotRef) state.slotRef.remove(); } catch (e) {}
      },
    };

    status('Σύνδεση με τον διακομιστή…');
    fbReady().then(function (ctx) {
      if (state.closed) return;
      state.ctx = ctx;
      const rr = roomRef(ctx.db, CODE);
      status('Αναζήτηση δωματίου «' + CODE + '»…');
      rr.child('meta').once('value').then(function (snap) {
        if (state.closed) return;
        const meta = snap.val();
        if (!meta || !meta.hostUid) {
          flog('room not found · ' + CODE);
          return cb.onError('Δεν βρέθηκε το δωμάτιο «' + CODE + '». Έλεγξε τον κωδικό — και ότι ο host έχει ανοιχτό το παιχνίδι εκείνη τη στιγμή.');
        }
        status('Το δωμάτιο βρέθηκε — γίνεται σύνδεση…');
        // Θέση στο δωμάτιο: πρώτα η δική μας παλιά θέση (reconnect), αλλιώς πρώτη ελεύθερη (transaction ανά slot)
        rr.child('slots').once('value').then(function (ss) {
          if (state.closed) return;
          const slots = ss.val() || {};
          const mine = SLOTS.find(function (s) { return slots[s] && slots[s].uid === ctx.uid; });
          const order = mine ? [mine].concat(SLOTS.filter(function (s) { return s !== mine; })) : SLOTS.slice();
          function claimSlot(i) {
            if (state.closed) return;
            if (i >= order.length) return cb.onError('Το δωμάτιο «' + CODE + '» είναι γεμάτο.');
            const sRef = rr.child('slots/' + order[i]);
            sRef.transaction(function (cur) {
              if (cur === null || cur.uid === ctx.uid) return { uid: ctx.uid, ts: Date.now() };
              return; // πιασμένο
            }, function (err, committed) {
              if (state.closed) return;
              if (err) return cb.onError('Πρόβλημα σύνδεσης με τη βάση. Έλεγξε το internet σου.');
              if (!committed) return claimSlot(i + 1);
              state.slotRef = sRef;
              try { state.disco = sRef.onDisconnect(); state.disco.remove(); } catch (e) {}
              flog('slot ' + order[i] + ' ok · room=' + CODE);
              startListening();
            });
          }
          claimSlot(0);
        });
        function startListening() {
          const inbox = rr.child('toGuest/' + ctx.uid);
          // καθαρή αρχή: μπαγιάτικα μηνύματα από προηγούμενη σύνδεσή μας
          inbox.remove().then(attach).catch(attach);
          function attach() {
            if (state.closed) return;
            const onIn = inbox.on('child_added', function (snap) {
              const v = snap.val(); snap.ref.remove();
              if (!v || typeof v.m !== 'string') return;
              const msg = unpack(v.m);
              if (msg) { state.gotAny = true; cb.onMessage(msg); }
            });
            state.listeners.push(function () { inbox.off('child_added', onIn); });
            // broadcasts: αγνόησε ό,τι προϋπήρχε (θα πάρουμε φρέσκο state με το welcome)
            const bRef = rr.child('bcast');
            bRef.once('value').then(function (bs) {
              if (state.closed) return;
              const seen = {};
              (bs.val() ? Object.keys(bs.val()) : []).forEach(function (k) { seen[k] = true; });
              const onB = bRef.on('child_added', function (snap) {
                if (seen[snap.key]) return;
                const v = snap.val();
                if (!v || typeof v.m !== 'string') { flog('bcast: άκυρο payload ' + snap.key); return; }
                const msg = unpack(v.m);
                if (msg) cb.onMessage(msg);
              });
              flog('bcast listener on · preexisting=' + Object.keys(seen).length);
              state.listeners.push(function () { bRef.off('child_added', onB); });
              // σύνδεση έτοιμη → hello (όπως ο conn.on('open') του PeerJS)
              guest.send(Object.assign({ t: 'hello' }, hello));
              cb.onOpen();
              // v1.24: αυτο-ίαση — αν σε 2.5s δεν έχει έρθει ΤΙΠΟΤΑ (χαμένο hello/λούκι δικτύου),
              // ξαναστέλνουμε το hello (έως 4 φορές)· ο host κάνει dedupe ώστε να μη διπλοεγγραφούμε
              let retries = 0;
              const rt = setInterval(function () {
                if (state.closed || state.gotAny || retries >= 4) { clearInterval(rt); return; }
                retries++; flog('hello retry #' + retries);
                guest.send(Object.assign({ t: 'hello' }, hello));
              }, 2500);
              state.listeners.push(function () { clearInterval(rt); });
            });
          }
        }
      }).catch(function (e) {
        if (!state.closed) cb.onError('Πρόβλημα σύνδεσης με τη βάση: ' + (e.code || e.message));
      });
    }).catch(function (e) {
      if (!state.closed) cb.onError('Firebase: ' + e.message);
    });
    return guest;
  }

  root.IQ_NET_FB = {
    createHost: createHost,
    createGuest: createGuest,
    makeToken: makeToken,
    makeCode: makeCode,
    iceLog: function () { return _fbLog.slice(); }, // ίδιο όνομα με IQ_NET → το διαγνωστικό panel δουλεύει αυτούσιο
  };
})(typeof self !== 'undefined' ? self : this);
