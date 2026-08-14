#!/usr/bin/env node
/* I QUIT! — Αύγουστος 2.5: ανίχνευση & ασφαλής ανάκτηση ΧΑΜΕΝΩΝ seasonal awards.

   ΤΙ ΛΥΝΕΙ: πριν το fix, μια νίκη μπορούσε να γράψει `scoreGames/<id>/completion` αλλά να
   ΜΗΝ πιστωθεί στο `seasonScores/<season>/<uid>/awards/<id>`. Το completion είναι immutable
   και περιέχει ΟΛΑ όσα χρειάζονται (winnerUid, winningAge, awardedPoints, seasonId, eligible),
   άρα η ανάκτηση γίνεται ΧΩΡΙΣ καμία εικασία — μόνο από authoritative evidence.

   ΣΧΕΔΙΑΣΜΟΣ:
   • DRY RUN είναι το DEFAULT. Καμία εγγραφή χωρίς ρητό --apply.
   • Δεν υπάρχει χειροποίητη αριθμητική («points += N»). Η πίστωση γίνεται ΜΟΝΟ μέσω της
     ίδιας canonical logic (js/scoring.js → ensureResultPersisted / applyGameTransaction),
     άρα το award receipt παραμένει ο μοναδικός φύλακας κατά της διπλομέτρησης.
   • Ό,τι δεν είναι 100% αποδεδειγμένο πάει σε manual-review, ΠΟΤΕ σε automatic repair.

   ΧΡΗΣΗ (read-only):
     node tools/score-backfill.js --input export.json
     node tools/score-backfill.js --input export.json --season 2026-Q3 --json
     node tools/score-backfill.js --input export.json --user giorgos --ids   # μόνο gameIds
*/
'use strict';

const fs = require('fs');
const S = require('../js/scoring.js');


/* ---------- Canonical read-only detector ---------- */

// Η εγκυρότητα του completion κρίνεται ΑΠΟΚΛΕΙΣΤΙΚΑ από την canonical συνάρτηση του
// js/scoring.js — το ίδιο κριτήριο που χρησιμοποιεί και το in-app self-repair.
const inspectCompletion = S.inspectStoredCompletion;

// Το receipt πρέπει να συμφωνεί απόλυτα με το completion, αλλιώς δεν αγγίζουμε τίποτα.
function receiptConflicts(receipt, c, uid, won) {
  const diffs = [];
  if (receipt.gameId !== c.gameId) diffs.push('gameId');
  if (receipt.seasonId !== c.seasonId) diffs.push('seasonId');
  if (receipt.winnerUid !== c.winnerUid) diffs.push('winnerUid');
  if (receipt.winningAge !== c.winningAge) diffs.push('winningAge');
  if (receipt.awardedPoints !== c.awardedPoints) diffs.push('awardedPoints');
  if (receipt.creditedUid !== uid) diffs.push('creditedUid');
  if (receipt.won !== won) diffs.push('won');
  return diffs;
}

/* snapshot = { scoreGames: {...}, seasonScores: {...}, users: {...} } (Console export) */
function detectMissedAwards(snapshot, options) {
  options = options || {};
  const scoreGames = (snapshot && snapshot.scoreGames) || {};
  const seasonScores = (snapshot && snapshot.seasonScores) || {};
  const users = (snapshot && snapshot.users) || {};
  const out = { recoverable: [], alreadyCredited: [], manualReview: [], seasons: {}, totals: {} };

  Object.keys(scoreGames).forEach(function (gameId) {
    const game = scoreGames[gameId] || {};
    const check = inspectCompletion(gameId, game);
    if (check.status === 'no-completion') return; // ημιτελής παρτίδα — δεν είναι «χαμένη νίκη»
    const c = check.completion;
    const seasonId = c && c.seasonId;
    if (options.season && seasonId !== options.season) return;
    if (seasonId) {
      out.seasons[seasonId] = out.seasons[seasonId] || { completions: 0, credited: 0, missing: 0, invalid: 0 };
      out.seasons[seasonId].completions++;
    }
    if (check.status === 'invalid') {
      if (seasonId) out.seasons[seasonId].invalid++;
      out.manualReview.push({ gameId: gameId, seasonId: seasonId || null, reasons: check.problems });
      return;
    }
    const uid = c.winnerUid;
    const aggregate = (seasonScores[seasonId] || {})[uid] || null;
    const receipt = aggregate && aggregate.awards ? aggregate.awards[gameId] : null;
    const base = {
      gameId: gameId, seasonId: seasonId, uid: uid,
      username: (users[uid] && users[uid].username) || null,   // ΠΟΤΕ email ή άλλο προσωπικό δεδομένο
      winningAge: c.winningAge, points: c.awardedPoints,
      completedAt: c.completedAt || null,
    };
    if (receipt) {
      const diffs = receiptConflicts(receipt, c, uid, true);
      if (diffs.length) {
        out.seasons[seasonId].invalid++;
        out.manualReview.push(Object.assign({}, base, { reasons: ['υπάρχον receipt διαφέρει: ' + diffs.join(', ')] }));
      } else {
        out.seasons[seasonId].credited++;
        out.alreadyCredited.push(base);
      }
      return;
    }
    out.seasons[seasonId].missing++;
    out.recoverable.push(Object.assign({}, base, {
      missing: aggregate ? 'awards/' + gameId + ' (το aggregate υπάρχει)' : 'ολόκληρο το seasonScores/' + seasonId + '/' + uid,
      wouldWrite: {
        path: 'seasonScores/' + seasonId + '/' + uid,
        pointsDelta: c.awardedPoints, winsDelta: 1, gamesPlayedDelta: 1,
        sumWinningAgeDelta: c.winningAge, awardReceipt: gameId,
      },
      // Προεπισκόπηση του ΑΚΡΙΒΟΥΣ αποτελέσματος, μέσω της canonical συνάρτησης — όχι χειροκίνητα.
      resultingAggregate: S.applyGameTransaction(aggregate, {
        gameId: gameId, seasonId: seasonId, winnerUid: uid, winnerPlayerId: c.winnerPlayerId,
        winningAge: c.winningAge, awardedPoints: c.awardedPoints, completedAt: c.completedAt, eligible: true,
      }, uid, true, c.completedAt || 0).value,
    }));
  });

  const sum = function (list) { return list.reduce(function (a, x) { return a + (x.points || 0); }, 0); };
  out.totals = {
    completions: out.recoverable.length + out.alreadyCredited.length + out.manualReview.length,
    recoverable: out.recoverable.length,
    recoverablePoints: sum(out.recoverable),
    alreadyCredited: out.alreadyCredited.length,
    manualReview: out.manualReview.length,
  };
  return out;
}

/* Ανά χρήστη σύνοψη — «πόσοι πόντοι λείπουν από τον καθένα». */
function summariseByUser(report) {
  const byUid = {};
  report.recoverable.forEach(function (r) {
    const k = r.seasonId + '|' + r.uid;
    byUid[k] = byUid[k] || { seasonId: r.seasonId, uid: r.uid, username: r.username, games: [], points: 0, wins: 0 };
    byUid[k].games.push(r.gameId);
    byUid[k].points += r.points;
    byUid[k].wins += 1;
  });
  return Object.keys(byUid).map(function (k) { return byUid[k]; })
    .sort(function (a, b) { return b.points - a.points; });
}

/* ---------- CLI ---------- */

function parseArgs(argv) {
  const a = { apply: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') a.input = argv[++i];
    else if (argv[i] === '--season') a.season = argv[++i];
    else if (argv[i] === '--apply') a.apply = true;
    else if (argv[i] === '--credentials') a.credentials = argv[++i];
    else if (argv[i] === '--json') a.json = true;
    else if (argv[i] === '--ids') a.ids = true;
    else if (argv[i] === '--uid') a.uid = argv[++i];
    else if (argv[i] === '--user') a.user = argv[++i];
  }
  return a;
}

function printReport(report, args) {
  const line = '─'.repeat(74);
  console.log('\nI QUIT! — ανάκτηση χαμένων seasonal awards   [' + (args.apply ? 'APPLY' : 'DRY RUN — καμία εγγραφή') + ']');
  console.log(line);
  Object.keys(report.seasons).sort().forEach(function (s) {
    const v = report.seasons[s];
    console.log('Σεζόν ' + s + ': ' + v.completions + ' completed games · ' + v.credited +
      ' με award · ' + v.missing + ' ΧΩΡΙΣ award · ' + v.invalid + ' για έλεγχο');
  });
  console.log(line);
  if (!report.recoverable.length) {
    console.log('✓ Καμία ανακτήσιμη χαμένη νίκη.');
  } else {
    console.log('ΑΝΑΚΤΗΣΙΜΕΣ ΧΑΜΕΝΕΣ ΝΙΚΕΣ (' + report.recoverable.length + '):\n');
    report.recoverable.forEach(function (r) {
      console.log('  gameId   ' + r.gameId);
      console.log('  παίκτης  ' + (r.username || '(χωρίς username)') + '  ·  uid ' + r.uid);
      console.log('  σεζόν    ' + r.seasonId + '  ·  ηλικία νίκης ' + r.winningAge + '  ·  πόντοι ' + r.points);
      console.log('  λείπει   ' + r.missing);
      console.log('  θα γραφτεί → ' + r.wouldWrite.path);
      console.log('              points +' + r.wouldWrite.pointsDelta + ', wins +1, gamesPlayed +1, awards/' + r.gameId);
      console.log('              τελικό: points=' + r.resultingAggregate.points + ', wins=' + r.resultingAggregate.wins +
        ', gamesPlayed=' + r.resultingAggregate.gamesPlayed);
      console.log('');
    });
    console.log('ΑΝΑ ΠΑΙΚΤΗ:');
    summariseByUser(report).forEach(function (u) {
      console.log('  ' + (u.username || u.uid) + ' — ' + u.points + ' πόντοι από ' + u.wins +
        ' νίκη/ες (' + u.seasonId + ')');
    });
  }
  if (report.manualReview.length) {
    console.log('\n' + line + '\n⚠ MANUAL REVIEW (' + report.manualReview.length + ') — ΔΕΝ γίνεται αυτόματη επιδιόρθωση:');
    report.manualReview.forEach(function (m) {
      console.log('  ' + m.gameId + (m.username ? ' (' + m.username + ')' : '') + ' → ' + m.reasons.join(' · '));
    });
  }
  console.log('\n' + line);
  console.log('Σύνολο: ' + report.totals.recoverable + ' ανακτήσιμες (' + report.totals.recoverablePoints +
    ' πόντοι) · ' + report.totals.alreadyCredited + ' ήδη πιστωμένες · ' + report.totals.manualReview + ' για έλεγχο');
  if (!args.apply) console.log('DRY RUN: δεν έγινε καμία εγγραφή. Για εφαρμογή χρειάζεται ρητό --apply.');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) {
    console.error('Χρήση: node tools/score-backfill.js --input <export.json> [--season 2026-Q3] [--json|--ids] [--user <username>|--uid <uid>]');
    console.error('Το --input είναι export του Firebase Console (Realtime Database → ⋮ → Export JSON).');
    process.exit(2);
  }
  let snapshot;
  try { snapshot = JSON.parse(fs.readFileSync(args.input, 'utf8')); }
  catch (e) { console.error('Δεν διαβάστηκε το export: ' + e.message); process.exit(2); }
  const report = detectMissedAwards(snapshot, { season: args.season });
  if (args.ids) {
    // Machine-readable: ΜΟΝΟ τα gameIds, έτοιμα για επικόλληση στο in-app recovery panel.
    const rows = report.recoverable.filter(function (r) {
      if (args.uid && r.uid !== args.uid) return false;
      if (args.user && r.username !== args.user) return false;
      return true;
    });
    rows.forEach(function (r) { console.log(r.gameId); });
    if (!rows.length) console.error('(καμία ανακτήσιμη νίκη με αυτά τα φίλτρα)');
    return;
  }
  if (args.json) { console.log(JSON.stringify(report, null, 2)); return; }
  printReport(report, args);
  if (args.apply) {
    // Συνειδητά ΔΕΝ γράφουμε από εδώ: τα rules επιτρέπουν εγγραφή στο seasonScores/<uid>
    // ΜΟΝΟ στον ίδιο τον κάτοχο (auth.uid === $uid). Ένα εξωτερικό script θα απαιτούσε
    // Admin SDK service-account key — που δεν μπαίνει ΠΟΤΕ σε αυτό το repo.
    console.error('\n✗ Το --apply δεν εκτελείται από αυτό το εργαλείο.');
    console.error('  Τα Rules επιτρέπουν εγγραφή seasonScores/<uid> μόνο στον ΙΔΙΟ τον χρήστη.');
    console.error('  Δες το τμήμα «Πώς εφαρμόζεται» στο report για τις δύο ασφαλείς επιλογές.');
    process.exit(3);
  }
}

module.exports = { detectMissedAwards: detectMissedAwards, inspectCompletion: inspectCompletion, summariseByUser: summariseByUser };

if (require.main === module) main();
