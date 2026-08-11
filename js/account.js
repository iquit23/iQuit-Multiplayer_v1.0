/* I QUIT! — ΠΡΟΑΙΡΕΤΙΚΟΙ ΛΟΓΑΡΙΑΣΜΟΙ.
   Ενεργοί κανονικά, χωρίς να απαιτούνται για το παιχνίδι. Το ?accountbeta=0 λειτουργεί
   ως προσωρινός διακόπτης ασφαλείας: τότε δεν δημιουργείται DOM, δεν φορτώνεται SDK,
   δεν αγγίζεται το auth και το παιχνίδι λειτουργεί ως guest, χωρίς εγγραφή.

   ΣΧΕΔΙΑΣΗ
   • Ταυτότητα: το ΙΔΙΟ Firebase uid που ήδη χρησιμοποιεί το multiplayer (net-fb.js). Η εγγραφή
     γίνεται με linkWithCredential πάνω στον ΥΠΑΡΧΟΝΤΑ ανώνυμο χρήστη → το uid ΔΕΝ αλλάζει,
     δεν δημιουργείται δεύτερος λογαριασμός, δεν χάνονται δεδομένα.
   • Email: μένει ΜΟΝΟ στο Firebase Authentication. Δεν γράφεται ποτέ στη Realtime Database
     και δεν μεταδίδεται ποτέ στο δωμάτιο (το multiplayer στέλνει μόνο ονόματα παικτών).
   • emailVerified: ΔΕΝ αποθηκεύεται. Πηγή αλήθειας είναι το auth token (auth.token.email_verified),
     το οποίο ελέγχεται server-side από τα database rules.
   • Username: κατοχυρώνεται με ατομικό write στο usernames/<normalized> που τα rules επιτρέπουν
     ΜΟΝΟ αν το κλειδί δεν υπάρχει ήδη — δύο ταυτόχρονοι χρήστες δεν μπορούν να πάρουν το ίδιο. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.IQ_ACCOUNT = api;
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  root = root || (typeof globalThis !== 'undefined' ? globalThis : {});

  const MIN_LEN = 3, MAX_LEN = 20;

  /* ---------------- Username: κανόνες, normalization, έλεγχος (καθαρές συναρτήσεις, testable) ----------------
     Επιτρέπονται: ελληνικά & λατινικά γράμματα, αριθμοί, underscore. Χωρίς κενά/ειδικούς χαρακτήρες. */
  const ALLOWED = /^[A-Za-z0-9_ΆΈ-ΊΌΎ-ΡΣ-ώ]+$/;

  // Μοναδικότητα ΧΩΡΙΣ διάκριση πεζών/κεφαλαίων. Για τα ελληνικά αφαιρούνται και οι τόνοι και
  // ενοποιείται το τελικό «ς» → «σ», ώστε «Γιώργος», «ΓΙΩΡΓΟΣ» και «γιωργοσ» να είναι ΤΟ ΙΔΙΟ
  // username (το uppercase των ελληνικών χάνει τους τόνους — χωρίς αυτό θα δημιουργούνταν
  // σχεδόν πανομοιότυπα, παραπλανητικά ονόματα).
  function normalizeUsername(name) {
    let s = String(name == null ? '' : name).trim().toLowerCase();
    if (typeof s.normalize === 'function') {
      s = s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
    }
    return s.replace(/ς/g, 'σ'); // ς → σ
  }

  // Επιστρέφει { ok: true, username, normalized } ή { ok: false, error: '<i18n key>' }
  function validateUsername(name) {
    const raw = String(name == null ? '' : name).trim();
    if (!raw) return { ok: false, error: 'accErrUserEmpty' };
    if (/\s/.test(raw)) return { ok: false, error: 'accErrUserSpace' };
    if (raw.length < MIN_LEN || raw.length > MAX_LEN) return { ok: false, error: 'accErrUserLen' };
    if (!ALLOWED.test(raw)) return { ok: false, error: 'accErrUserChars' };
    const normalized = normalizeUsername(raw);
    if (normalized.length < MIN_LEN || normalized.length > MAX_LEN) return { ok: false, error: 'accErrUserLen' };
    return { ok: true, username: raw, normalized: normalized };
  }
  function sameUsername(a, b) { return normalizeUsername(a) === normalizeUsername(b); }

  function accountFailure(key, cause) {
    const e = new Error(key);
    e.accountErrorKey = key;
    if (cause) e.cause = cause;
    return e;
  }

  // Τα database errors δεν είναι auth errors: ειδικά το PERMISSION_DENIED δεν αποδεικνύει
  // ότι ένα username είναι πιασμένο. Η πραγματική διάκριση γίνεται με diagnostic read πιο κάτω.
  function serviceErrorKey(error) {
    if (error && error.accountErrorKey) return error.accountErrorKey;
    const code = String((error && (error.code || error.message)) || '').toUpperCase();
    if (/NETWORK|DISCONNECT|OFFLINE/.test(code)) return 'accErrNetwork';
    if (/TOKEN|REQUIRES_RECENT_LOGIN|USER_DISABLED/.test(code)) return 'accErrVerification';
    if (/PERMISSION|VALIDATION|RULES|CONFIG/.test(code)) return 'accErrPermission';
    if (/UNAVAILABLE|DATABASE|INTERNAL/.test(code)) return 'accErrDatabase';
    return 'accErrUnexpected';
  }

  function readAuthSnapshot(user) {
    if (!user) return Promise.resolve({ user: null, tokenEmailVerified: false });
    if (user.isAnonymous) return Promise.resolve({ user: user, tokenEmailVerified: false });
    if (typeof user.getIdTokenResult !== 'function') {
      return Promise.reject(accountFailure('accErrUnexpected'));
    }
    return user.getIdTokenResult(false).then(function (tokenResult) {
      return {
        user: user,
        tokenEmailVerified: !!(tokenResult && tokenResult.claims && tokenResult.claims.email_verified === true),
      };
    });
  }

  function authSnapshotSignature(snapshot) {
    const user = snapshot && snapshot.user;
    if (!user) return 'signed-out';
    return [user.uid || '', user.email || '', user.isAnonymous ? 'anon' : 'account',
      user.emailVerified ? 'user-verified' : 'user-unverified',
      snapshot.tokenEmailVerified ? 'token-verified' : 'token-unverified'].join('|');
  }

  function observeAuth(auth, onSnapshot, onError) {
    let active = true;
    let generation = 0;
    let lastSignature = null;
    const listen = auth && (auth.onIdTokenChanged || auth.onAuthStateChanged);
    if (typeof listen !== 'function') {
      onError(accountFailure('accErrUnexpected'));
      return function () { active = false; };
    }
    const unsubscribe = listen.call(auth, function (user) {
      const currentGeneration = ++generation;
      readAuthSnapshot(user).then(function (snapshot) {
        if (!active || currentGeneration !== generation) return;
        const signature = authSnapshotSignature(snapshot);
        if (signature === lastSignature) return;
        lastSignature = signature;
        onSnapshot(snapshot);
      }).catch(function (e) {
        if (active && currentGeneration === generation) onError(e);
      });
    }, function (e) { if (active) onError(e); });
    return function () {
      if (!active) return;
      active = false;
      generation++;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }

  // Κάθε claim ανανεώνει ΠΡΩΤΑ user + token και ελέγχει ξανά το emailVerified. Έτσι το UI
  // και τα RTDB rules βλέπουν την ίδια, φρέσκια κατάσταση email_verified.
  function refreshVerifiedUser(ctx) {
    const auth = ctx && ctx.fb && ctx.fb.auth && ctx.fb.auth();
    const before = auth && auth.currentUser;
    if (!before || before.isAnonymous) return Promise.reject(accountFailure('accErrVerification'));
    return Promise.resolve().then(function () {
      return before.reload();
    }).then(function () {
      const current = auth.currentUser;
      if (!current || current.isAnonymous) throw accountFailure('accErrVerification');
      return current.getIdToken(true);
    }).then(function () {
      const current = auth.currentUser;
      if (!current || current.isAnonymous) throw accountFailure('accErrVerification');
      return readAuthSnapshot(current);
    }).then(function (snapshot) {
      if (!snapshot.user.emailVerified || !snapshot.tokenEmailVerified) {
        const e = accountFailure('accErrVerification');
        e.authSnapshot = snapshot;
        throw e;
      }
      return snapshot;
    }).catch(function (e) {
      if (e && e.accountErrorKey) throw e;
      throw accountFailure(serviceErrorKey(e), e);
    });
  }

  function readProfile(ctx, user) {
    if (!user || user.isAnonymous || !user.emailVerified) {
      return Promise.resolve({ status: 'missing', profile: null });
    }
    return ctx.db.ref('users/' + user.uid).once('value').then(function (snap) {
      const profile = snap.val();
      if (profile === null || profile === undefined) return { status: 'missing', profile: null };
      if (profile && profile.username) return { status: 'ready', profile: profile };
      return { status: 'error', profile: undefined, errorKey: 'accErrDatabase' };
    }).catch(function (e) {
      return { status: 'error', profile: undefined, errorKey: serviceErrorKey(e) };
    });
  }

  function diagnoseFailedClaim(ctx, normalized, uid, claimError) {
    return ctx.db.ref('usernames/' + normalized).once('value').then(function (snap) {
      const owner = snap.val();
      if (owner && owner !== uid) return { status: 'taken', errorKey: 'accErrUserTaken' };
      // Μια αμφίσημη αποτυχία δικτύου μπορεί να ήρθε αφού ο server ολοκλήρωσε το atomic write.
      // Reservation στο ίδιο uid σημαίνει προηγούμενη επιτυχία / ασφαλές idempotent retry.
      if (owner === uid) return { status: 'owned' };
      return { status: 'error', errorKey: serviceErrorKey(claimError) };
    }).catch(function (diagnosticError) {
      const diagnosticKey = serviceErrorKey(diagnosticError);
      return {
        status: 'error',
        errorKey: diagnosticKey === 'accErrUnexpected' ? serviceErrorKey(claimError) : diagnosticKey,
      };
    });
  }

  function claimUsername(ctx, v) {
    return refreshVerifiedUser(ctx).then(function (authSnapshot) {
      const u = authSnapshot.user;
      const now = Date.now();
      return ctx.db.ref('users/' + u.uid).once('value').then(function (snap) {
        const prev = snap.val();
        const updates = {};
        updates['usernames/' + v.normalized] = u.uid;
        updates['users/' + u.uid] = {
          username: v.username,
          usernameNormalized: v.normalized,
          createdAt: (prev && prev.createdAt) || now,
          updatedAt: now,
        };
        // Το atomic update παραμένει ο μοναδικός authoritative μηχανισμός uniqueness.
        return ctx.db.ref().update(updates).then(function () {
          return { status: 'claimed', user: u, authSnapshot: authSnapshot };
        }).catch(function (claimError) {
          return diagnoseFailedClaim(ctx, v.normalized, u.uid, claimError).then(function (result) {
            result.user = u;
            result.authSnapshot = authSnapshot;
            return result;
          });
        });
      }).catch(function (e) {
        return { status: 'error', errorKey: serviceErrorKey(e) };
      });
    }).catch(function (e) {
      return { status: 'error', errorKey: serviceErrorKey(e) };
    });
  }

  // Χαρτογράφηση κωδικών σφάλματος Firebase → i18n κλειδιά (καθαρά μηνύματα, χωρίς τεχνικούς κωδικούς)
  function authErrorKey(code) {
    switch (String(code || '')) {
      case 'auth/email-already-in-use': return 'accErrEmailUsed';
      case 'auth/credential-already-in-use': return 'accErrEmailUsed';
      case 'auth/invalid-email': return 'accErrEmailBad';
      case 'auth/weak-password': return 'accErrWeakPass';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials': return 'accErrWrongPass';
      case 'auth/user-not-found': return 'accErrNoUser';
      case 'auth/too-many-requests': return 'accErrTooMany';
      case 'auth/network-request-failed': return 'accErrNetwork';
      case 'auth/expired-action-code':
      case 'auth/invalid-action-code': return 'accErrBadLink';
      case 'auth/provider-already-linked':
      case 'auth/operation-not-allowed': return 'accErrLinkFailed';
      default: return 'accErrGeneric';
    }
  }

  const api = {
    normalizeUsername: normalizeUsername,
    validateUsername: validateUsername,
    sameUsername: sameUsername,
    authErrorKey: authErrorKey,
    MIN_LEN: MIN_LEN, MAX_LEN: MAX_LEN,
    enabled: function (search) { return !/[?&]accountbeta=0(?:&|$)/.test(String(search || '')); },
    _internals: {
      serviceErrorKey: serviceErrorKey,
      refreshVerifiedUser: refreshVerifiedUser,
      diagnoseFailedClaim: diagnoseFailedClaim,
      claimUsername: claimUsername,
      readProfile: readProfile,
      readAuthSnapshot: readAuthSnapshot,
      authSnapshotSignature: authSnapshotSignature,
      observeAuth: observeAuth,
    },
  };

  // ================= UI (browser only, εκτός αν δοθεί ?accountbeta=0) =================
  if (typeof document === 'undefined' || typeof location === 'undefined') return api;
  if (!api.enabled(location.search)) return api;

  const I = root.IQ_I18N;
  const t = function (k, p) { return I ? I.t(k, p) : k; };
  const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  const $ = function (id) { return document.getElementById(id); };

  const st = {
    user: null, profile: undefined, profileStatus: 'idle', profileError: '',
    tokenEmailVerified: false, authSignature: '', authError: '',
    busy: false, mode: 'guest', msg: '', msgOk: false,
  };
  let authUnsubscribe = null;

  // Πού επιστρέφει ο χρήστης μετά το «Continue» στη σελίδα επιβεβαίωσης/επαναφοράς της Google.
  // ΠΑΡΑΓΩΓΗ: πάντα το canonical https://iquitgame.com/ (ΠΟΤΕ .gr — αυτό κάνει 301 — ούτε localhost).
  // Εκτός παραγωγής (τοπικές δοκιμές/e2e) χρησιμοποιείται το τρέχον origin ώστε να μη σπάει η ροή.
  const PROD_URL = 'https://iquitgame.com/';
  function actionSettings() {
    const host = (location.hostname || '').toLowerCase();
    const isProd = host === 'iquitgame.com' || host === 'www.iquitgame.com' || host === 'iquitgame.gr' || host === 'www.iquitgame.gr';
    return { url: isProd ? PROD_URL : (location.origin + location.pathname), handleCodeInApp: false };
  }

  function fb() { return root.firebase; }
  function ready() {
    // Χρησιμοποιεί ΤΟΝ ΙΔΙΟ μηχανισμό με το multiplayer (φόρτωση SDK + auth) ώστε να μην
    // δημιουργηθεί ποτέ δεύτερος χρήστης/δεύτερο uid.
    if (!root.IQ_NET_FB || !root.IQ_NET_FB.authReady) {
      return Promise.reject(new Error('accErrNetwork'));
    }
    return root.IQ_NET_FB.authReady();
  }

  function setMsg(key, ok, params) { st.msg = key ? t(key, params) : ''; st.msgOk = !!ok; render(); }

  function isVerifiedSnapshot(user, tokenEmailVerified) {
    return !!(user && !user.isAnonymous && user.emailVerified && tokenEmailVerified === true);
  }

  function applyAuthSnapshot(ctx, snapshot) {
    const signature = authSnapshotSignature(snapshot);
    const previousUid = st.user && st.user.uid;
    const previousVerified = isVerifiedSnapshot(st.user, st.tokenEmailVerified);
    const nextUser = snapshot.user;
    const nextUid = nextUser && nextUser.uid;
    const nextVerified = isVerifiedSnapshot(nextUser, snapshot.tokenEmailVerified);

    // Πάντα κρατάμε το πραγματικό Auth object, ακόμη κι αν τα ορατά πεδία δεν άλλαξαν.
    st.user = nextUser;
    st.tokenEmailVerified = snapshot.tokenEmailVerified === true;
    st.authError = '';
    if (signature === st.authSignature) return Promise.resolve(false);
    st.authSignature = signature;
    if (previousUid !== nextUid) st.msg = '';

    if (!nextVerified) {
      st.profile = null;
      st.profileStatus = 'missing';
      st.profileError = '';
      render();
      return Promise.resolve(true);
    }
    if (previousUid !== nextUid || previousVerified !== nextVerified || st.profileStatus === 'idle') {
      return loadProfile(ctx).then(function () { return true; });
    }
    render();
    return Promise.resolve(true);
  }

  function setAuthSyncError(error) {
    st.authError = serviceErrorKey(error);
    setMsg(st.authError, false);
  }

  function startAuthObserver(ctx) {
    if (authUnsubscribe) return authUnsubscribe;
    const auth = ctx.fb.auth();
    authUnsubscribe = observeAuth(auth, function (snapshot) {
      applyAuthSnapshot(ctx, snapshot).catch(setAuthSyncError);
    }, setAuthSyncError);
    return authUnsubscribe;
  }

  function stopAuthObserver() {
    if (!authUnsubscribe) return;
    const unsubscribe = authUnsubscribe;
    authUnsubscribe = null;
    unsubscribe();
  }

  function render() {
    const box = $('accBox');
    if (!box) return;
    const u = st.user;
    const verified = isVerifiedSnapshot(u, st.tokenEmailVerified);
    let body = '';

    if (!u || u.isAnonymous) {
      // Ανώνυμος/επισκέπτης — προαιρετική εγγραφή ή σύνδεση
      body =
        '<div class="acc-tabs">' +
          '<button class="acc-tab' + (st.mode !== 'login' ? ' on' : '') + '" data-acc="tab-signup">' + esc(t('accSignup')) + '</button>' +
          '<button class="acc-tab' + (st.mode === 'login' ? ' on' : '') + '" data-acc="tab-login">' + esc(t('accLogin')) + '</button>' +
        '</div>' +
        '<input id="accEmail" type="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="' + esc(t('accEmailPh')) + '">' +
        '<input id="accPass" type="password" autocomplete="' + (st.mode === 'login' ? 'current-password' : 'new-password') + '" placeholder="' + esc(t('accPassPh')) + '">' +
        '<button class="primary acc-main" data-acc="' + (st.mode === 'login' ? 'do-login' : 'do-signup') + '">' +
          esc(st.mode === 'login' ? t('accLoginBtn') : t('accSignupBtn')) + '</button>' +
        (st.mode === 'login' ? '<button class="ghost acc-mini" data-acc="reset">' + esc(t('accForgot')) + '</button>' : '') +
        '<div class="acc-note">' + esc(t('accGuestNote')) + '</div>';
    } else if (!verified) {
      // Συνδεδεμένος αλλά ΜΗ επιβεβαιωμένος — δεν επιτρέπεται δημόσιο username
      body =
        '<div class="acc-row"><span class="acc-badge warn">' + esc(t('accUnverified')) + '</span></div>' +
        '<div class="acc-note">' + esc(t('accVerifyBody', { email: u.email || '' })) + '</div>' +
        '<button class="primary acc-main" data-acc="resend">' + esc(t('accResend')) + '</button>' +
        '<button class="ghost acc-mini" data-acc="recheck">' + esc(t('accRecheck')) + '</button>' +
        '<button class="ghost acc-mini" data-acc="logout">' + esc(t('accLogout')) + '</button>';
    } else if (st.profileStatus === 'loading' || st.profileStatus === 'idle') {
      body =
        '<div class="acc-row"><span class="acc-badge ok">' + esc(t('accVerified')) + '</span></div>' +
        '<div class="acc-note">' + esc(t('accProfileLoading')) + '</div>';
    } else if (st.profileStatus === 'error') {
      // Read/service failure: δεν παρουσιάζεται ποτέ ως «δεν υπάρχει profile»/username form.
      body =
        '<div class="acc-row"><span class="acc-badge warn">' + esc(t('accProfileError')) + '</span></div>' +
        '<div class="acc-note">' + esc(t(st.profileError || 'accErrUnexpected')) + '</div>' +
        '<button class="primary acc-main" data-acc="retry-profile">' + esc(t('accRetry')) + '</button>' +
        '<button class="ghost acc-mini" data-acc="logout">' + esc(t('accLogout')) + '</button>';
    } else if (st.profile === null) {
      // Επιβεβαιωμένος — επιλογή μοναδικού username
      body =
        '<div class="acc-row"><span class="acc-badge ok">' + esc(t('accVerified')) + '</span></div>' +
        '<div class="acc-note">' + esc(t('accPickUserBody')) + '</div>' +
        '<input id="accUser" maxlength="' + MAX_LEN + '" autocapitalize="off" spellcheck="false" placeholder="' + esc(t('accUserPh')) + '">' +
        '<button class="primary acc-main" data-acc="claim">' + esc(t('accClaimBtn')) + '</button>' +
        '<button class="ghost acc-mini" data-acc="logout">' + esc(t('accLogout')) + '</button>';
    } else {
      // Πλήρης λογαριασμός — ΜΟΝΟ το username εμφανίζεται, ποτέ το email
      body =
        '<div class="acc-row"><span class="acc-badge ok">' + esc(t('accSignedIn')) + '</span></div>' +
        '<div class="acc-user" id="accUserShown">' + esc(st.profile.username) + '</div>' +
        '<div class="acc-note">' + esc(t('accUseNote')) + '</div>' +
        '<button class="ghost acc-mini" data-acc="logout">' + esc(t('accLogout')) + '</button>';
    }

    box.innerHTML =
      '<div class="acc-head"><b>' + esc(t('accTitle')) + '</b></div>' +
      body +
      (st.msg ? '<div class="acc-msg' + (st.msgOk ? ' ok' : '') + '" id="accMsg">' + esc(st.msg) + '</div>' : '');

    box.querySelectorAll('[data-acc]').forEach(function (b) {
      b.disabled = st.busy;
      b.onclick = function () { onAction(b.getAttribute('data-acc')); };
    });
  }

  function busy(on) { st.busy = on; render(); }

  function onAction(a) {
    if (st.busy && a.indexOf('tab-') !== 0) return;
    if (a === 'tab-signup') { st.mode = 'signup'; st.msg = ''; return render(); }
    if (a === 'tab-login') { st.mode = 'login'; st.msg = ''; return render(); }
    // Ασφάλεια: καμία αλλαγή ταυτότητας όσο υπάρχει ενεργό δωμάτιο/παρτίδα
    if (['do-signup', 'do-login', 'logout'].indexOf(a) > -1 && inRoom()) return setMsg('accErrInRoom', false);
    if (a === 'do-signup') return doSignup();
    if (a === 'do-login') return doLogin();
    if (a === 'reset') return doReset();
    if (a === 'resend') return doResend();
    if (a === 'recheck') return doRecheck();
    if (a === 'claim') return doClaim();
    if (a === 'retry-profile') return doRetryProfile();
    if (a === 'logout') return doLogout();
  }

  function inRoom() {
    const g = $('screen-game'), l = $('screen-lobby');
    return !!((g && !g.classList.contains('hidden')) || (l && !l.classList.contains('hidden')));
  }
  function creds() {
    return { email: (($('accEmail') || {}).value || '').trim(), pass: (($('accPass') || {}).value || '') };
  }

  function doSignup() {
    const c = creds();
    if (!c.email || c.pass.length < 6) return setMsg('accErrWeakPass', false);
    busy(true);
    ready().then(function (ctx) {
      const cur = ctx.fb.auth().currentUser;
      const cred = ctx.fb.auth.EmailAuthProvider.credential(c.email, c.pass);
      // ΣΥΝΔΕΣΗ (link) πάνω στον ΥΠΑΡΧΟΝΤΑ ανώνυμο → ΙΔΙΟ uid, κανένας δεύτερος λογαριασμός
      const p = (cur && cur.isAnonymous) ? cur.linkWithCredential(cred)
        : ctx.fb.auth().createUserWithEmailAndPassword(c.email, c.pass);
      return p.then(function (res) {
        const user = (res && res.user) || ctx.fb.auth().currentUser;
        return user.sendEmailVerification(actionSettings()).then(function () {
          st.user = ctx.fb.auth().currentUser;
          busy(false); setMsg('accVerifySent', true, { email: c.email });
        });
      });
    }).catch(function (e) {
      busy(false);
      setMsg(e && e.code ? authErrorKey(e.code) : 'accErrNetwork', false);
    });
  }

  function doLogin() {
    const c = creds();
    if (!c.email || !c.pass) return setMsg('accErrFields', false);
    busy(true);
    ready().then(function (ctx) {
      return ctx.fb.auth().signInWithEmailAndPassword(c.email, c.pass).then(function () {
        return afterAuthChange(ctx);
      });
    }).catch(function (e) {
      busy(false);
      setMsg(e && e.code ? authErrorKey(e.code) : 'accErrNetwork', false);
    });
  }

  function doReset() {
    const c = creds();
    if (!c.email) return setMsg('accErrEmailBad', false);
    busy(true);
    ready().then(function (ctx) { return ctx.fb.auth().sendPasswordResetEmail(c.email, actionSettings()); })
      .then(function () { busy(false); setMsg('accResetSent', true, { email: c.email }); })
      .catch(function (e) { busy(false); setMsg(e && e.code ? authErrorKey(e.code) : 'accErrNetwork', false); });
  }

  function doResend() {
    busy(true);
    ready().then(function (ctx) {
      const u = ctx.fb.auth().currentUser;
      if (!u) throw new Error('no-user');
      return u.sendEmailVerification(actionSettings());
    }).then(function () { busy(false); setMsg('accVerifySent', true, { email: (st.user && st.user.email) || '' }); })
      .catch(function (e) { busy(false); setMsg(e && e.code ? authErrorKey(e.code) : 'accErrNetwork', false); });
  }

  function doRecheck() {
    busy(true);
    return ready().then(function (ctx) {
      return refreshVerifiedUser(ctx).then(function (snapshot) {
        return applyAuthSnapshot(ctx, snapshot).then(function () {
          busy(false);
          setMsg('accVerifiedNow', true);
        });
      }).catch(function (e) {
        // Επιτυχές refresh με unverified user/token: ενημέρωσε με το έγκυρο snapshot.
        // Αποτυχία reload/token: κράτησε το τελευταίο γνωστό state και δείξε service error.
        if (e && e.authSnapshot) {
          return applyAuthSnapshot(ctx, e.authSnapshot).then(function () {
            busy(false);
            setMsg('accErrVerification', false);
          });
        }
        throw e;
      });
    }).catch(function (e) {
      busy(false);
      setAuthSyncError(e);
    });
  }

  function doClaim() {
    const v = validateUsername((($('accUser') || {}).value || ''));
    if (!v.ok) return setMsg(v.error, false);
    busy(true);
    return ready().then(function (ctx) {
      return claimUsername(ctx, v).then(function (result) {
        if (result.authSnapshot) {
          st.user = result.authSnapshot.user;
          st.tokenEmailVerified = result.authSnapshot.tokenEmailVerified === true;
          st.authSignature = authSnapshotSignature(result.authSnapshot);
        } else {
          st.user = ctx.fb.auth().currentUser;
        }
        if (result.status === 'claimed' || result.status === 'owned') {
          st.profile = { username: v.username, usernameNormalized: v.normalized };
          st.profileStatus = 'ready';
          st.profileError = '';
          applyUsernameToGame(v.username);
          busy(false); setMsg('accUserSet', true, { name: v.username });
          return;
        }
        busy(false);
        setMsg(result.errorKey || 'accErrUnexpected', false);
      });
    }).catch(function (e) {
      busy(false);
      setMsg(serviceErrorKey(e), false);
    });
  }

  function doLogout() {
    busy(true);
    ready().then(function (ctx) {
      return ctx.fb.auth().signOut().then(function () {
        st.user = null; st.profile = null; st.profileStatus = 'missing'; st.profileError = '';
        st.tokenEmailVerified = false; st.authSignature = 'signed-out'; st.mode = 'login';
        // Νέα ανώνυμη ταυτότητα ώστε το multiplayer να συνεχίσει κανονικά ως επισκέπτης
        return ctx.fb.auth().signInAnonymously().then(function () {
          st.user = ctx.fb.auth().currentUser;
          busy(false); setMsg('accLoggedOut', true);
        });
      });
    }).catch(function (e) { busy(false); setMsg(e && e.code ? authErrorKey(e.code) : 'accErrNetwork', false); });
  }

  function loadProfile(ctx) {
    const u = ctx.fb.auth().currentUser;
    if (!isVerifiedSnapshot(u, st.tokenEmailVerified)) {
      st.profile = null; st.profileStatus = 'missing'; st.profileError = ''; render();
      return Promise.resolve();
    }
    st.profile = undefined;
    st.profileStatus = 'loading';
    st.profileError = '';
    render();
    return readProfile(ctx, u).then(function (result) {
      st.profile = result.profile;
      st.profileStatus = result.status;
      st.profileError = result.errorKey || '';
      if (result.status === 'ready') applyUsernameToGame(result.profile.username);
      render();
    });
  }

  function doRetryProfile() {
    busy(true);
    return ready().then(function (ctx) {
      st.user = ctx.fb.auth().currentUser;
      return loadProfile(ctx);
    }).then(function () {
      busy(false);
    }).catch(function (e) {
      st.profile = undefined;
      st.profileStatus = 'error';
      st.profileError = serviceErrorKey(e);
      busy(false);
    });
  }

  function afterAuthChange(ctx) {
    return readAuthSnapshot(ctx.fb.auth().currentUser).then(function (snapshot) {
      return applyAuthSnapshot(ctx, snapshot);
    }).then(function () { busy(false); });
  }

  // Το username προσυμπληρώνει το πεδίο ονόματος του παιχνιδιού. ΔΕΝ αλλάζει καμία ροή:
  // το multiplayer συνεχίζει να στέλνει απλώς ένα όνομα παίκτη (ποτέ email).
  function applyUsernameToGame(name) {
    const el = $('playerName');
    if (!el) return;
    el.value = String(name).slice(0, 14);
    try { localStorage.setItem('iquit_name', el.value); } catch (e) {}
  }

  function mount() {
    if ($('accBox')) return;
    const home = $('screen-home'), foot = $('lblHomeFoot');
    if (!home) return;
    const box = document.createElement('div');
    box.id = 'accBox';
    box.className = 'accbox';
    if (foot && foot.parentNode === home) home.insertBefore(box, foot);
    else home.appendChild(box);
    // Αλλαγή γλώσσας: ξαναχτίζουμε το panel. addEventListener (ΟΧΙ onclick) ώστε να μην
    // αντικατασταθεί ο handler του ui.js — καμία παρέμβαση στην υπάρχουσα λογική.
    ['btnLang', 'btnLangHome'].forEach(function (id) {
      const b = $(id);
      if (b) b.addEventListener('click', function () { setTimeout(function () { st.msg = ''; render(); }, 0); });
    });
    render();
    ready().then(function (ctx) {
      st.mode = 'signup';
      startAuthObserver(ctx);
    }).catch(function (e) { setMsg(serviceErrorKey(e), false); });
  }

  function unmount() {
    stopAuthObserver();
    const box = $('accBox');
    if (box && box.parentNode) box.parentNode.removeChild(box);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  api._state = st;         // μόνο για e2e διαγνωστικά (δεν περιέχει ποτέ password)
  api._render = render;
  api._mount = mount;
  api._unmount = unmount;
  api._startAuthObserver = startAuthObserver;
  api._doRecheck = doRecheck;
  return api;
});
