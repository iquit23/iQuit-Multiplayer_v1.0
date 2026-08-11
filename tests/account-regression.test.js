/* Focused regression tests for the verified-account username claim flow. */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ACCOUNT = require('../js/account.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function firebaseError(code) {
  const e = new Error(code);
  e.code = code;
  return e;
}

function copy(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function getAt(root, pathName) {
  return String(pathName || '').split('/').filter(Boolean).reduce(function (value, key) {
    return value && Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined;
  }, root);
}

function setAt(root, pathName, value) {
  const parts = String(pathName).split('/').filter(Boolean);
  let cursor = root;
  parts.slice(0, -1).forEach(function (key) {
    if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
    cursor = cursor[key];
  });
  cursor[parts[parts.length - 1]] = copy(value);
}

function createContext(options) {
  options = options || {};
  const data = copy(options.data || { usernames: {}, users: {} });
  if (!data.usernames) data.usernames = {};
  if (!data.users) data.users = {};
  const events = [];
  const state = { tokenFresh: false };
  const tokenListeners = [];
  const user = {
    uid: options.uid || 'uid-olga',
    email: options.email || 'olga@example.test',
    isAnonymous: false,
    emailVerified: options.emailVerified !== false,
    reload: function () {
      events.push('reload');
      if (options.reloadError) return Promise.reject(options.reloadError);
      if (Object.prototype.hasOwnProperty.call(options, 'verifiedAfterReload')) {
        user.emailVerified = options.verifiedAfterReload;
      }
      return Promise.resolve();
    },
    getIdToken: function (force) {
      events.push('token:' + force);
      if (options.tokenError) return Promise.reject(options.tokenError);
      state.tokenFresh = force === true;
      return Promise.resolve('fresh-token');
    },
    getIdTokenResult: function (force) {
      events.push('token-result:' + force);
      if (options.tokenResultError) return Promise.reject(options.tokenResultError);
      const verified = Object.prototype.hasOwnProperty.call(options, 'tokenClaimVerified')
        ? options.tokenClaimVerified : user.emailVerified;
      return Promise.resolve({ claims: { email_verified: verified } });
    },
  };
  const auth = {
    currentUser: user,
    onIdTokenChanged: function (callback) {
      events.push('observer:add');
      tokenListeners.push(callback);
      callback(auth.currentUser);
      return function () {
        events.push('observer:remove');
        const index = tokenListeners.indexOf(callback);
        if (index > -1) tokenListeners.splice(index, 1);
      };
    },
  };

  const db = {
    ref: function (pathName) {
      return {
        once: function () {
          events.push('read:' + pathName);
          const readError = options.readErrors && options.readErrors[pathName];
          if (readError) return Promise.reject(readError);
          const value = getAt(data, pathName);
          return Promise.resolve({ val: function () { return value === undefined ? null : copy(value); } });
        },
        update: function (updates) {
          events.push('update');
          if (options.updateErrorBefore) return Promise.reject(options.updateErrorBefore);
          if (options.requireFreshToken && !state.tokenFresh) {
            return Promise.reject(firebaseError('PERMISSION_DENIED'));
          }
          const reservationPath = Object.keys(updates).find(function (key) { return key.indexOf('usernames/') === 0; });
          const normalized = reservationPath && reservationPath.slice('usernames/'.length);
          const owner = normalized && data.usernames[normalized];
          if (owner && owner !== user.uid) return Promise.reject(firebaseError('PERMISSION_DENIED'));

          // Stage all paths and publish them together, mirroring RTDB multi-location update atomicity.
          const staged = copy(data);
          Object.keys(updates).forEach(function (key) { setAt(staged, key, updates[key]); });
          Object.keys(data).forEach(function (key) { delete data[key]; });
          Object.keys(staged).forEach(function (key) { data[key] = staged[key]; });
          if (options.rejectAfterWrite) return Promise.reject(options.rejectAfterWrite);
          return Promise.resolve();
        },
      };
    },
  };

  return {
    ctx: { fb: { auth: function () { return auth; } }, db: db },
    data: data,
    events: events,
    user: user,
    auth: auth,
    emitAuth: function (nextUser) {
      auth.currentUser = nextUser;
      tokenListeners.slice().forEach(function (listener) { listener(nextUser); });
    },
  };
}

async function settle() {
  await new Promise(function (resolve) { setImmediate(resolve); });
  await new Promise(function (resolve) { setImmediate(resolve); });
  await new Promise(function (resolve) { setImmediate(resolve); });
}

async function mountAccount(ctx, beforeMount) {
  const elements = {};
  let domReady;
  function element(id) {
    return {
      id: id || '', innerHTML: '', value: '', parentNode: null,
      classList: { contains: function () { return true; } },
      querySelectorAll: function () { return []; },
      addEventListener: function () {},
      appendChild: function (child) { child.parentNode = this; elements[child.id] = child; },
      insertBefore: function (child) { child.parentNode = this; elements[child.id] = child; },
      removeChild: function (child) { if (child) { delete elements[child.id]; child.parentNode = null; } },
    };
  }
  elements['screen-home'] = element('screen-home');
  const document = {
    readyState: 'loading',
    getElementById: function (id) { return elements[id] || null; },
    createElement: function () { return element(''); },
    addEventListener: function (name, fn) { if (name === 'DOMContentLoaded') domReady = fn; },
  };
  const self = {
    IQ_I18N: { t: function (key) { return key; } },
    IQ_NET_FB: { authReady: function () { return Promise.resolve(ctx); } },
  };
  const sandbox = {
    self: self,
    document: document,
    location: { search: '', hostname: 'localhost', origin: 'http://localhost', pathname: '/' },
    localStorage: { setItem: function () {} },
    Promise: Promise,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
  };
  const source = fs.readFileSync(path.join(__dirname, '../js/account.js'), 'utf8');
  vm.runInNewContext(source, sandbox, { filename: 'account.js' });
  if (beforeMount) beforeMount(self.IQ_ACCOUNT);
  domReady();
  await settle();
  return {
    api: self.IQ_ACCOUNT,
    elements: elements,
    get html() { return elements.accBox ? elements.accBox.innerHTML : ''; },
  };
}

async function run(options) {
  options = options || {};
  let passed = 0, failed = 0;
  const results = [];
  async function caseTest(letter, name, test) {
    try {
      await test();
      passed++;
      results.push({ letter: letter, name: name, passed: true });
      if (!options.silent) console.log('  ✓ ' + letter + '. ' + name);
    } catch (e) {
      failed++;
      results.push({ letter: letter, name: name, passed: false, error: e.message });
      if (!options.silent) console.error('  ✗ ' + letter + '. ' + name + ' — ' + e.message);
    }
  }

  const claim = ACCOUNT._internals.claimUsername;

  await caseTest('A', 'available Olga is accepted', async function () {
    const mock = createContext({ uid: 'olga-uid' });
    const result = await claim(mock.ctx, ACCOUNT.validateUsername('Olga'));
    assert(result.status === 'claimed', 'expected claimed, got ' + result.status);
    assert(mock.data.usernames.olga === 'olga-uid', 'reservation was not written');
    assert(mock.data.users['olga-uid'].username === 'Olga', 'profile was not written');
  });

  await caseTest('B', 'Olga8 is accepted under a different key', async function () {
    const mock = createContext({ uid: 'olga8-uid' });
    const validated = ACCOUNT.validateUsername('Olga8');
    const result = await claim(mock.ctx, validated);
    assert(result.status === 'claimed', 'Olga8 was rejected');
    assert(validated.normalized !== ACCOUNT.normalizeUsername('Olga'), 'Olga8 reused Olga key');
    assert(mock.data.usernames.olga8 === 'olga8-uid', 'Olga8 reservation missing');
  });

  await caseTest('C', 'Olga / olga / OLGA share one normalized key', async function () {
    const keys = ['Olga', 'olga', 'OLGA'].map(ACCOUNT.normalizeUsername);
    assert(keys.every(function (key) { return key === 'olga'; }), 'normalization keys differ');
  });

  await caseTest('D', 'foreign reservation is reported as username taken', async function () {
    const mock = createContext({ uid: 'new-uid', data: { usernames: { olga: 'foreign-uid' }, users: {} } });
    const result = await claim(mock.ctx, ACCOUNT.validateUsername('Olga'));
    assert(result.status === 'taken' && result.errorKey === 'accErrUserTaken', 'foreign duplicate was misclassified');
  });

  await caseTest('E', 'PERMISSION_DENIED without foreign reservation is not taken', async function () {
    const mock = createContext({ uid: 'olga-uid', updateErrorBefore: firebaseError('PERMISSION_DENIED') });
    const result = await claim(mock.ctx, ACCOUNT.validateUsername('Olga'));
    assert(result.status === 'error', 'permission failure was not an error');
    assert(result.errorKey === 'accErrPermission', 'expected permission error, got ' + result.errorKey);
    assert(result.errorKey !== 'accErrUserTaken', 'false-positive username taken returned');
  });

  await caseTest('F', 'stale verification token is refreshed before the claim', async function () {
    const mock = createContext({ uid: 'olga-uid', requireFreshToken: true });
    const result = await claim(mock.ctx, ACCOUNT.validateUsername('Olga'));
    assert(result.status === 'claimed', 'claim failed after token refresh');
    const reload = mock.events.indexOf('reload');
    const token = mock.events.indexOf('token:true');
    const update = mock.events.indexOf('update');
    assert(reload > -1 && token > reload && update > token, 'required reload → token(true) → update order missing');

    const unverified = createContext({ uid: 'stale-uid', emailVerified: true, verifiedAfterReload: false });
    const rejected = await claim(unverified.ctx, ACCOUNT.validateUsername('Olga8'));
    assert(rejected.errorKey === 'accErrVerification', 'unverified refreshed session got ' + rejected.errorKey);
    assert(unverified.events.indexOf('reload') > -1 && unverified.events.indexOf('token:true') > -1,
      'unverified session was not fully refreshed');
    assert(unverified.events.indexOf('update') === -1, 'write ran after refreshed emailVerified=false');

    const tokenMismatch = createContext({ uid: 'claim-mismatch', emailVerified: true, tokenClaimVerified: false });
    const mismatchResult = await claim(tokenMismatch.ctx, ACCOUNT.validateUsername('Olga9'));
    assert(mismatchResult.errorKey === 'accErrVerification', 'false email_verified claim was accepted');
    assert(tokenMismatch.events.indexOf('update') === -1, 'write ran with email_verified=false token claim');
  });

  await caseTest('G', 'network and database failures get distinct errors', async function () {
    const network = createContext({ uid: 'net-uid', updateErrorBefore: firebaseError('NETWORK_ERROR') });
    const database = createContext({ uid: 'db-uid', updateErrorBefore: firebaseError('UNAVAILABLE') });
    const networkResult = await claim(network.ctx, ACCOUNT.validateUsername('Olga'));
    const databaseResult = await claim(database.ctx, ACCOUNT.validateUsername('Olga8'));
    assert(networkResult.errorKey === 'accErrNetwork', 'network error misclassified as ' + networkResult.errorKey);
    assert(databaseResult.errorKey === 'accErrDatabase', 'database error misclassified as ' + databaseResult.errorKey);
  });

  await caseTest('H', 'failed claim leaves no orphan reservation or profile', async function () {
    const initial = { usernames: { olga: 'foreign-uid' }, users: {} };
    const mock = createContext({ uid: 'failed-uid', data: initial });
    const result = await claim(mock.ctx, ACCOUNT.validateUsername('Olga'));
    assert(result.status === 'taken', 'setup did not produce a failed duplicate claim');
    assert(mock.data.usernames.olga === 'foreign-uid', 'foreign reservation changed');
    assert(!mock.data.users['failed-uid'], 'orphan profile was created');
    assert(Object.keys(mock.data.usernames).length === 1, 'orphan reservation was created');
  });

  await caseTest('I', 'same-UID ambiguous retry is safe and idempotent', async function () {
    const mock = createContext({ uid: 'olga-uid', rejectAfterWrite: firebaseError('NETWORK_ERROR') });
    const result = await claim(mock.ctx, ACCOUNT.validateUsername('Olga'));
    assert(result.status === 'owned', 'same-UID reservation was not recognized');
    assert(mock.data.usernames.olga === 'olga-uid', 'own reservation missing');
    assert(mock.data.users['olga-uid'].username === 'Olga', 'atomic profile missing');
  });

  await caseTest('J', 'profile read failure renders an error state with retry, not the username form', async function () {
    const readError = firebaseError('UNAVAILABLE');
    const mock = createContext({ uid: 'olga-uid', readErrors: { 'users/olga-uid': readError } });
    const result = await ACCOUNT._internals.readProfile(mock.ctx, mock.user);
    assert(result.status === 'error' && result.profile === undefined, 'read failure became missing/null profile');
    assert(result.errorKey === 'accErrDatabase', 'read failure got wrong error key');
    const rendered = await mountAccount(mock.ctx);
    assert(rendered.api._state.profileStatus === 'error', 'UI state is not error');
    assert(rendered.api._state.profile === undefined, 'UI converted the failure to profile=null');
    assert(rendered.html.indexOf('data-acc="retry-profile"') > -1, 'retry action missing');
    assert(rendered.html.indexOf('data-acc="claim"') === -1, 'username form shown after read failure');
  });

  if (!options.silent) console.log('\n— Auth observer regression A–F');

  await caseTest('Auth A', 'observer replaces stale cached verification state', async function () {
    const mock = createContext({ uid: 'observer-a', emailVerified: true });
    const mounted = await mountAccount(mock.ctx, function (api) {
      api._state.user = {
        uid: 'observer-a', email: 'olga@example.test', isAnonymous: false, emailVerified: false,
      };
      api._state.tokenEmailVerified = false;
      api._state.authSignature = ACCOUNT._internals.authSnapshotSignature({
        user: api._state.user, tokenEmailVerified: false,
      });
    });
    assert(mounted.api._state.user === mock.auth.currentUser, 'st.user was not synchronized to auth.currentUser');
    assert(mounted.api._state.user.emailVerified === true, 'cached false value survived observer sync');
    assert(mounted.api._state.tokenEmailVerified === true, 'token claim was not synchronized');
    assert(mounted.html.indexOf('accVerified') > -1 && mounted.html.indexOf('accUnverified') === -1,
      'verified UI was not rendered');
  });

  await caseTest('Auth B', 'reload and token refresh move false verification to true', async function () {
    const mock = createContext({ uid: 'observer-b', emailVerified: false, verifiedAfterReload: true });
    const mounted = await mountAccount(mock.ctx);
    assert(mounted.api._state.user.emailVerified === false, 'initial state was not unverified');
    await mounted.api._doRecheck();
    await settle();
    assert(mounted.api._state.user.emailVerified === true && mounted.api._state.tokenEmailVerified === true,
      'refreshed verification was not applied');
    assert(mock.events.indexOf('reload') < mock.events.indexOf('token:true'), 'reload did not precede forced token refresh');
    assert(mounted.html.indexOf('accVerified') > -1 && mounted.html.indexOf('accUnverified') === -1,
      'UI did not switch to verified');
  });

  await caseTest('Auth C', 'UID change reloads the new user profile', async function () {
    const data = { usernames: {}, users: {
      'observer-old': { username: 'OldUser', usernameNormalized: 'olduser' },
      'observer-new': { username: 'NewUser', usernameNormalized: 'newuser' },
    } };
    const mock = createContext({ uid: 'observer-old', data: data });
    const mounted = await mountAccount(mock.ctx);
    const nextUser = {
      uid: 'observer-new', email: 'new@example.test', isAnonymous: false, emailVerified: true,
      getIdTokenResult: function () {
        mock.events.push('next:token-result');
        return Promise.resolve({ claims: { email_verified: true } });
      },
    };
    mock.emitAuth(nextUser);
    await settle();
    assert(mounted.api._state.user.uid === 'observer-new', 'new UID not applied');
    assert(mounted.api._state.profile && mounted.api._state.profile.username === 'NewUser', 'new profile not loaded');
    assert(mock.events.indexOf('read:users/observer-new') > -1, 'new UID profile path was not read');
  });

  await caseTest('Auth D', 'token refresh failure shows an error without inventing verification', async function () {
    const mock = createContext({
      uid: 'observer-d', emailVerified: false, tokenError: firebaseError('NETWORK_ERROR'),
    });
    const mounted = await mountAccount(mock.ctx);
    await mounted.api._doRecheck();
    await settle();
    assert(mounted.api._state.msg === 'accErrNetwork', 'token failure did not surface network error');
    assert(mounted.api._state.user.emailVerified === false && mounted.api._state.tokenEmailVerified === false,
      'failed refresh changed verification state');
    assert(mounted.html.indexOf('accUnverified') > -1, 'last known verification UI was not preserved');
  });

  await caseTest('Auth E', 'doRecheck delegates to the shared refresh function', async function () {
    const source = fs.readFileSync(path.join(__dirname, '../js/account.js'), 'utf8');
    const body = (source.match(/function doRecheck\(\) \{[\s\S]*?\n  function doClaim\(\)/) || [''])[0];
    assert(body.indexOf('refreshVerifiedUser(ctx)') > -1, 'doRecheck does not call refreshVerifiedUser');
    assert(body.indexOf('.reload()') === -1 && body.indexOf('.getIdToken(') === -1,
      'doRecheck still contains an independent refresh implementation');
  });

  await caseTest('Auth F', 'mounting cannot create duplicate observers and unmount unsubscribes', async function () {
    const mock = createContext({ uid: 'observer-f' });
    const mounted = await mountAccount(mock.ctx);
    mounted.api._mount();
    mounted.api._startAuthObserver(mock.ctx);
    mounted.api._startAuthObserver(mock.ctx);
    assert(mock.events.filter(function (event) { return event === 'observer:add'; }).length === 1,
      'duplicate Auth observer registered');
    mounted.api._unmount();
    assert(mock.events.filter(function (event) { return event === 'observer:remove'; }).length === 1,
      'observer was not unsubscribed on unmount');
  });

  if (!options.silent) {
    console.log('\n' + (failed ? '❌' : '✅') + ' Account regression: ' + passed + ' passed, ' + failed + ' failed');
  }
  return { passed: passed, failed: failed, cases: results };
}

if (require.main === module) {
  run().then(function (result) { process.exit(result.failed ? 1 : 0); }).catch(function (e) {
    console.error(e.stack || e.message);
    process.exit(1);
  });
}

module.exports = { run: run };
