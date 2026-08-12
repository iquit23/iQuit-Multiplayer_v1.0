/* I QUIT! — V1 scoring/gameId regression A–Z. */
'use strict';

const fs = require('fs');
const path = require('path');
const E = require('../js/engine.js');
const S = require('../js/scoring.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
}

function player(id, isBot) { return { id: id, name: id, isBot: !!isBot }; }

function proof(playerId, uid) {
  return { playerId: playerId, expectedUid: uid, verifiedUid: uid, verified: true };
}

function endedGame(players, roster, winnerId, age, extra) {
  return Object.assign({
    gameId: S.createGameId(), phase: 'ended', players: players,
    rankings: [{ id: winnerId, retiredAge: age }],
    scoreRoster: roster, scoreSetup: 'ready',
    completedAt: Date.UTC(2026, 7, 12), seasonId: '2026-Q3',
  }, extra || {});
}

function resultFor(id) {
  return {
    eligible: true, gameId: id, seasonId: '2026-Q3', winnerUid: 'uid-a',
    winnerPlayerId: 'p0', winningAge: 61, awardedPoints: 103,
    completedAt: Date.UTC(2026, 7, 12),
  };
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

  await test('A', 'new game creates a secure gameId', function () {
    assert(validId(E.newGame([player('p0')], 1).gameId), 'missing/invalid UUID');
  });

  await test('B', 'JSON state restore keeps the same gameId', function () {
    const g = E.newGame([player('p0')], 2);
    assert(JSON.parse(JSON.stringify(g)).gameId === g.gameId, 'gameId changed during restore');
  });

  await test('C', 'a new game gets a new gameId', function () {
    assert(E.newGame([player('p0')], 3).gameId !== E.newGame([player('p0')], 3).gameId, 'gameId reused');
  });

  await test('D', 'age 64 scores 100', function () { assert(S.calculateVictoryScore(64) === 100, 'wrong score'); });
  await test('E', 'age 63 scores 101', function () { assert(S.calculateVictoryScore(63) === 101, 'wrong score'); });
  await test('F', 'age 61 scores 103', function () { assert(S.calculateVictoryScore(61) === 103, 'wrong score'); });
  await test('G', 'age 25 scores 139', function () { assert(S.calculateVictoryScore(25) === 139, 'wrong score'); });

  await test('H', 'invalid/non-winning age creates no award', function () {
    [null, undefined, NaN, 24, 65, 61.5, '61'].forEach(function (age) {
      assert(S.calculateVictoryScore(age) === 0, 'invalid age scored: ' + age);
    });
    const g = endedGame([player('p0')], [proof('p0', 'uid-a')], 'p0', null);
    assert(!S.evaluateGameResult(g).eligible, 'loss was awarded');
  });

  const dates = [
    ['I', '31/03 maps to Q1', '2026-03-31T23:59:59Z', '2026-Q1'],
    ['J', '01/04 maps to Q2', '2026-04-01T00:00:00Z', '2026-Q2'],
    ['K', '30/06 maps to Q2', '2026-06-30T23:59:59Z', '2026-Q2'],
    ['L', '01/07 maps to Q3', '2026-07-01T00:00:00Z', '2026-Q3'],
    ['M', '30/09 maps to Q3', '2026-09-30T23:59:59Z', '2026-Q3'],
    ['N', '01/10 maps to Q4', '2026-10-01T00:00:00Z', '2026-Q4'],
  ];
  for (const d of dates) await test(d[0], d[1], function () {
    assert(S.seasonIdForDate(d[2]) === d[3], 'got ' + S.seasonIdForDate(d[2]));
  });

  await test('O', 'verified solo human winner is eligible', function () {
    assert(S.evaluateGameResult(endedGame([player('p0')], [proof('p0', 'uid-a')], 'p0', 61)).eligible, 'solo rejected');
  });

  await test('P', 'verified human plus bots is eligible', function () {
    const g = endedGame([player('p0'), player('p1', true), player('p2', true)], [proof('p0', 'uid-a')], 'p0', 61);
    assert(S.evaluateGameResult(g).eligible, 'human+bots rejected');
  });

  await test('Q', 'all-verified human multiplayer is eligible', function () {
    const g = endedGame([player('p0'), player('p1')], [proof('p0', 'uid-a'), proof('p1', 'uid-b')], 'p0', 61);
    assert(S.evaluateGameResult(g).eligible, 'verified multiplayer rejected');
  });

  await test('R', 'one unverified multiplayer human makes game ineligible', function () {
    const roster = [proof('p0', 'uid-a'), { playerId: 'p1', expectedUid: 'uid-b', verifiedUid: null, verified: false }];
    const g = endedGame([player('p0'), player('p1')], roster, 'p0', 61);
    assert(!S.evaluateGameResult(g).eligible, 'unverified multiplayer awarded');
  });

  await test('S', 'bot winner receives no account score', function () {
    const g = endedGame([player('p0'), player('p1', true)], [proof('p0', 'uid-a')], 'p1', 61);
    assert(S.evaluateGameResult(g).reason === 'bot-winner', 'bot winner not rejected');
  });

  await test('T', 'unverified solo human receives no seasonal award', function () {
    const roster = [{ playerId: 'p0', expectedUid: null, verifiedUid: null, verified: false }];
    assert(!S.evaluateGameResult(endedGame([player('p0')], roster, 'p0', 61)).eligible, 'unverified solo awarded');
  });

  await test('U', 'same gameId cannot mutate aggregate twice', function () {
    const r = resultFor(S.createGameId());
    const first = S.applyAwardTransaction(null, r, Date.now());
    const second = S.applyAwardTransaction(first.value, r, Date.now());
    assert(!first.duplicate && second.duplicate, 'duplicate was not detected');
    assert(second.value.points === 103 && second.value.wins === 1, 'aggregate increased twice');
  });

  await test('V', 'refresh/retry preserves points, wins and gamesPlayed', function () {
    const r = resultFor(S.createGameId());
    let row = S.applyAwardTransaction(null, r, 1).value;
    row = S.applyAwardTransaction(JSON.parse(JSON.stringify(row)), r, 2).value;
    assert(row.points === 103 && row.wins === 1 && row.gamesPlayed === 1 && row.sumWinningAge === 61,
      'retry changed aggregates');
  });

  await test('V2', 'eligible non-winner gets gamesPlayed without points or win', function () {
    const r = resultFor(S.createGameId());
    const row = S.applyGameTransaction(null, r, 'uid-b', false, 1).value;
    assert(row.points === 0 && row.wins === 0 && row.gamesPlayed === 1 && row.sumWinningAge === 0,
      'participant aggregate is incorrect');
  });

  await test('W', 'existing win condition remains unchanged', function () {
    const g = E.newGame([player('p0')], 9);
    const p = g.players[0];
    p.inv.push({ uid: 'win', kind: 'P', cost: 1, income: E.totalExp(p) });
    p.loans.push({ uid: 'loan', amount: 100, payment: 10, remaining: 2 });
    p.savings = 100;
    E.applyAction(g, 'p0', { a: 'sav-withdraw' });
    assert(p.retiredAge === null, 'won while a loan remained');
    p.loans = [];
    p.savings = 100;
    E.applyAction(g, 'p0', { a: 'sav-withdraw' });
    assert(p.retiredAge !== null, 'did not win after passive>=expenses and no loans');
    assert(g.phase === 'ended' && Number.isFinite(g.completedAt) && /^\d{4}-Q[1-4]$/.test(g.seasonId),
      'normal victory did not freeze completion time/season');
  });

  await test('X', 'multiplayer/reconnect code keeps gameId in saved and broadcast state', function () {
    const ui = fs.readFileSync(path.join(__dirname, '../js/ui.js'), 'utf8');
    const index = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const build = fs.readFileSync(path.join(__dirname, '../tools/build.js'), 'utf8');
    assert(/saveHostSession\(\)[\s\S]*game: App\.game/.test(ui), 'saved host state omits game');
    assert(/t: 'state', state: App\.game/.test(ui), 'broadcast omits authoritative game state');
    assert(/App\.game = saved\.game/.test(ui) && /App\.game = msg\.state/.test(ui), 'resume/reconnect does not restore state');
    assert(index.indexOf('js/scoring.js') > -1 && index.indexOf('js/scoring.js') < index.indexOf('js/engine.js'),
      'browser does not load canonical scoring before engine');
    assert(build.indexOf("'scoring.js'") > -1, 'build does not bundle canonical scoring');
  });

  await test('Y', 'account/auth regression module remains integrated', function () {
    const runner = fs.readFileSync(path.join(__dirname, 'run-tests.js'), 'utf8');
    assert(runner.indexOf("require('./account-regression.test.js')") > -1, 'account regressions removed');
  });

  await test('Z', 'EL/EN score copy is complete', function () {
    const I = require('../js/i18n.js');
    I.setLang('el');
    assert(I.t('scoreVictory', { points: 103 }) === '🏆 Νίκη! +103 πόντοι', 'wrong EL score headline');
    assert(I.t('scoreFreedom', { age: 61 }) === 'Απέκτησες οικονομική ελευθερία στα 61.', 'wrong EL age copy');
    I.setLang('en');
    assert(I.t('scoreVictory', { points: 103 }) === '🏆 Victory! +103 points', 'wrong EN score headline');
    assert(I.t('scoreFreedom', { age: 61 }) === 'You reached financial freedom at 61.', 'wrong EN age copy');
    I.setLang('el');
  });

  if (!options.silent) console.log('\n' + (failed ? '❌' : '✅') + ' Scoring regression: ' + passed + ' passed, ' + failed + ' failed');
  return { passed: passed, failed: failed, cases: results };
}

if (require.main === module) {
  run().then(function (result) { process.exit(result.failed ? 1 : 0); }).catch(function (e) {
    console.error(e.stack || e.message);
    process.exit(1);
  });
}

module.exports = { run: run };
