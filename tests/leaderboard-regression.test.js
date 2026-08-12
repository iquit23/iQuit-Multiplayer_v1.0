/* I QUIT! — Seasonal Leaderboard regression A–O. */
'use strict';

const fs = require('fs');
const L = require('../js/leaderboard.js');
const I = require('../js/i18n.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function score(points, wins, sumWinningAge, extra) {
  return Object.assign({ points: points, wins: wins, gamesPlayed: wins, sumWinningAge: sumWinningAge }, extra || {});
}

async function run(options) {
  options = options || {};
  let passed = 0, failed = 0;
  const results = [];
  async function test(letter, name, fn) {
    try {
      await fn();
      passed++;
      results.push({ letter: letter, name: name, passed: true });
      if (!options.silent) console.log('  ✓ ' + letter + '. ' + name);
    } catch (e) {
      failed++;
      results.push({ letter: letter, name: name, passed: false, error: e.message });
      if (!options.silent) console.error('  ✗ ' + letter + '. ' + name + ' — ' + e.message);
    }
  }

  await test('A', 'current calendar quarter uses the canonical season ID and end date', function () {
    const meta = L.seasonMeta(new Date(Date.UTC(2026, 7, 12)));
    assert(meta.id === '2026-Q3' && meta.quarter === 3 && meta.year === 2026, 'wrong current season');
    assert(meta.endDay === '30' && meta.endMonth === '09', 'wrong Q3 end date');
  });

  await test('B', 'ranking sorts by total seasonal points first', function () {
    const rows = L.rankSeason({ a: score(100, 1, 50), b: score(300, 1, 60), c: score(200, 3, 150) }, {});
    assert(rows.map(function (r) { return r.uid; }).join(',') === 'b,c,a', 'points ordering failed');
  });

  await test('C', 'points tie sorts by more wins', function () {
    const rows = L.rankSeason({ a: score(300, 2, 110), b: score(300, 4, 220) }, {});
    assert(rows[0].uid === 'b', 'wins tie-break failed');
  });

  await test('D', 'second tie sorts by lower averageWinningAge', function () {
    const rows = L.rankSeason({ a: score(300, 3, 171), b: score(300, 3, 150) }, {});
    assert(rows[0].uid === 'b' && rows[0].averageWinningAge === 50, 'average age tie-break failed');
  });

  await test('E', 'Top 5 contains exactly at most five users', function () {
    const scores = {};
    for (let n = 1; n <= 9; n++) scores['u' + n] = score(1000 - n, 1, 50);
    assert(L.buildView(scores, {}, null).top.length === 5, 'Top 5 returned another size');
    assert(L.buildView({ one: score(10, 1, 60) }, {}, null).top.length === 1, 'small season was padded');
  });

  await test('F', 'verified user outside Top 5 gets the correct self rank', function () {
    const scores = {};
    for (let n = 1; n <= 7; n++) scores['u' + n] = score(800 - n * 50, 1, 55);
    const view = L.buildView(scores, {}, 'u7');
    assert(view.self && view.self.rank === 7 && !view.selfInTop, 'wrong self rank');
  });

  await test('G', 'verified user already in Top 5 is not repeated in a self row', function () {
    I.setLang('el');
    const view = L.buildView({ me: score(500, 4, 200), other: score(400, 3, 156) }, { me: 'Me', other: 'Other' }, 'me');
    const html = L.renderLeaderboard(view, L.seasonMeta(new Date(Date.UTC(2026, 7, 12))));
    assert(view.selfInTop && (html.match(/class="lb-self/g) || []).length === 0, 'duplicate self row rendered');
    assert((html.match(/>Me</g) || []).length === 1, 'self username rendered more than once');
  });

  await test('H', 'user with no points gets the explicit no-ranked-win state', function () {
    I.setLang('el');
    const view = L.buildView({ me: score(0, 0, 0), other: score(200, 2, 110) }, { me: 'Me', other: 'Other' }, 'me');
    const html = L.renderLeaderboard(view, L.seasonMeta(new Date(Date.UTC(2026, 7, 12))));
    assert(!view.self && html.indexOf('Δεν έχεις βαθμολογημένη νίκη ακόμη.') > -1, 'missing self empty state');
  });

  await test('I', 'completely empty season renders a natural empty leaderboard', function () {
    I.setLang('el');
    const html = L.renderLeaderboard(L.buildView({}, {}, null), L.seasonMeta(new Date(Date.UTC(2026, 9, 1))));
    assert(html.indexOf('Δεν υπάρχουν ακόμη βαθμολογημένες νίκες.') > -1 && html.indexOf('Γίνε ο πρώτος!') > -1, 'missing empty season copy');
    assert(html.indexOf('lb-row') === -1, 'empty rows rendered');
  });

  await test('J', 'Greek leaderboard copy is complete', function () {
    I.setLang('el');
    const html = L.renderLeaderboard(L.buildView({ me: score(312, 3, 174) }, { me: 'IQuit' }, 'me'), L.seasonMeta(new Date(Date.UTC(2026, 7, 12))));
    assert(html.indexOf('TOP ΠΑΙΚΤΕΣ') > -1 && html.indexOf('Ιούλιος–Σεπτέμβριος') > -1 && html.indexOf('Λήγει 30/09') > -1, 'incomplete EL copy');
  });

  await test('K', 'English leaderboard copy is complete', function () {
    I.setLang('en');
    const html = L.renderLeaderboard(L.buildView({ me: score(312, 3, 174) }, { me: 'IQuit' }, 'me'), L.seasonMeta(new Date(Date.UTC(2026, 7, 12))));
    assert(html.indexOf('TOP PLAYERS') > -1 && html.indexOf('July–September') > -1 && html.indexOf('Ends 30/09') > -1, 'incomplete EN copy');
  });

  await test('L', 'rendered public UI contains no email, UID, auth metadata or aggregate details', function () {
    I.setLang('en');
    const uid = 'firebase-secret-uid-123';
    const scores = {};
    scores[uid] = score(500, 4, 200, { email: 'secret@example.com', authMetadata: 'private' });
    const html = L.renderLeaderboard(L.buildView(scores, { [uid]: 'PublicName' }, uid), L.seasonMeta(new Date(Date.UTC(2026, 7, 12))));
    assert(html.indexOf('PublicName') > -1 && html.indexOf(uid) === -1 && html.indexOf('secret@example.com') === -1, 'identity leaked');
    assert(!/gamesPlayed|sumWinningAge|averageWinningAge|authMetadata/.test(html), 'internal aggregate leaked');
  });

  await test('M', 'season listener cleanup detaches the exact Firebase callback once', function () {
    let attached = null, detached = null, offCount = 0;
    const ref = {
      on: function (event, callback) { attached = { event: event, callback: callback }; },
      off: function (event, callback) { detached = { event: event, callback: callback }; offCount++; },
    };
    const ctx = { db: { ref: function (path) { assert(path === 'seasonScores/2026-Q3', 'wrong listener path'); return ref; } } };
    const off = L.watchSeason(ctx, '2026-Q3', function () {}, function () {});
    off(); off();
    assert(attached && detached && attached.event === 'value' && detached.event === 'value', 'listener was not detached');
    assert(attached.callback === detached.callback && offCount === 1, 'cleanup did not use exact callback once');
  });

  await test('M2', 'Auth observer cleanup unsubscribes once and exposes only verified self UID', async function () {
    let callback = null, unsubscribed = 0, seen = 'unset';
    const auth = {
      onIdTokenChanged: function (cb) { callback = cb; return function () { unsubscribed++; }; },
    };
    const off = L.observeVerifiedUid(auth, function (uid) { seen = uid; });
    callback({ uid: 'verified-self', isAnonymous: false, emailVerified: true,
      getIdTokenResult: function () { return Promise.resolve({ claims: { email_verified: true } }); } });
    await Promise.resolve(); await Promise.resolve();
    assert(seen === 'verified-self', 'verified self UID was not detected');
    off(); off();
    assert(unsubscribed === 1, 'Auth observer was not unsubscribed exactly once');
  });

  await test('N', 'desktop layout uses a bounded side panel without horizontal overflow primitives', function () {
    const css = fs.readFileSync(__dirname + '/../css/style.css', 'utf8');
    assert(/@media\(min-width:960px\)[\s\S]*grid-template-columns:minmax\(0,430px\) minmax\(260px,300px\)/.test(css), 'desktop columns missing');
    assert(/\.leaderboard-card\{min-width:0;/.test(css) && /\.lb-name\{min-width:0; overflow:hidden; text-overflow:ellipsis;/.test(css), 'overflow guards missing');
  });

  await test('O', 'narrow/mobile layout stays single-column and usable', function () {
    const css = fs.readFileSync(__dirname + '/../css/style.css', 'utf8');
    const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
    assert(/\.home-layout\{display:grid; grid-template-columns:minmax\(0,430px\);/.test(css), 'mobile is not single-column by default');
    assert(html.indexOf('id="leaderboardBox"') > html.indexOf('id="homeMain"'), 'leaderboard is not after main content');
  });

  I.setLang('el');
  if (!options.silent) console.log('\n' + (failed ? '❌' : '✅') + ' Leaderboard regression: ' + passed + ' passed, ' + failed + ' failed');
  return { passed: passed, failed: failed, results: results };
}

if (require.main === module) {
  run().then(function (result) { process.exit(result.failed ? 1 : 0); });
}

module.exports = { run: run };
