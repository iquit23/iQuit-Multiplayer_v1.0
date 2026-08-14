/* I QUIT! — V1 seasonal scoring.
   Client-authoritative by design for V1: protects against accidental duplicate awards,
   but a trusted backend is still required for full anti-cheat. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('crypto'));
  } else {
    root.IQ_SCORING = factory(root.crypto);
  }
})(typeof self !== 'undefined' ? self : this, function (cryptoApi) {
  'use strict';

  const MIN_WINNING_AGE = 25;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const SEASON_RE = /^[0-9]{4}-Q[1-4]$/;
  const MAX_WINNING_AGE = 64;

  function bytesToUuid(bytes) {
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const h = Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' +
      h.slice(16, 20) + '-' + h.slice(20);
  }

  function createGameId() {
    if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
    if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
      return bytesToUuid(cryptoApi.getRandomValues(new Uint8Array(16)));
    }
    if (cryptoApi && typeof cryptoApi.randomBytes === 'function') return bytesToUuid(cryptoApi.randomBytes(16));
    throw new Error('Secure random UUID generation is unavailable.');
  }

  // Η μοναδική canonical V1 φόρμουλα του application code.
  function calculateVictoryScore(winningAge) {
    if (!Number.isInteger(winningAge) || winningAge < MIN_WINNING_AGE || winningAge > MAX_WINNING_AGE) return 0;
    return 164 - winningAge;
  }

  function seasonIdForDate(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(d.getTime())) return null;
    const q = Math.floor(d.getUTCMonth() / 3) + 1;
    return d.getUTCFullYear() + '-Q' + q;
  }

  function freezeHumanRoster(players, uidByPlayer) {
    uidByPlayer = uidByPlayer || {};
    return (players || []).filter(function (p) { return p && !p.isBot; }).map(function (p) {
      const knownUid = uidByPlayer[p.id] || p.accountUid || null;
      return {
        playerId: p.id,
        expectedUid: knownUid,
        verifiedUid: null,
        verified: false,
      };
    });
  }

  function allHumansVerified(roster) {
    return Array.isArray(roster) && roster.length > 0 && roster.every(function (p) {
      return !!(p && p.playerId && p.verified && p.verifiedUid &&
        (!p.expectedUid || p.expectedUid === p.verifiedUid));
    });
  }

  function mergeRosterProofs(roster, proofs) {
    let changed = false;
    (roster || []).forEach(function (entry) {
      const proof = proofs && proofs[entry.playerId];
      if (!proof || !proof.uid || (entry.expectedUid && entry.expectedUid !== proof.uid)) return;
      if (!entry.verified || entry.verifiedUid !== proof.uid) {
        entry.verified = true;
        entry.verifiedUid = proof.uid;
        changed = true;
      }
    });
    return changed;
  }

  function evaluateGameResult(game) {
    const no = function (reason) { return { eligible: false, reason: reason, awardedPoints: 0 }; };
    if (!game || game.phase !== 'ended' || !Array.isArray(game.rankings) || !game.rankings.length) return no('unfinished');
    const rankedWinner = game.rankings[0];
    const winner = (game.players || []).find(function (p) { return p.id === rankedWinner.id; });
    if (!winner || winner.isBot) return no('bot-winner');
    const winningAge = rankedWinner.retiredAge;
    const awardedPoints = calculateVictoryScore(winningAge);
    if (!awardedPoints) return no('no-valid-victory');
    if (game.scoreSetup !== 'ready') return no('score-setup');
    if (!allHumansVerified(game.scoreRoster)) return no('human-unverified');
    const winnerProof = game.scoreRoster.find(function (p) { return p.playerId === winner.id; });
    if (!winnerProof || !winnerProof.verifiedUid) return no('winner-unverified');
    const seasonId = game.seasonId || seasonIdForDate(game.completedAt);
    if (!seasonId || !game.gameId || !Number.isFinite(game.completedAt)) return no('invalid-result');
    return {
      eligible: true,
      gameId: game.gameId,
      seasonId: seasonId,
      winnerUid: winnerProof.verifiedUid,
      winnerPlayerId: winner.id,
      winningAge: winningAge,
      awardedPoints: awardedPoints,
      completedAt: game.completedAt,
    };
  }

  function awardRecord(result) {
    return {
      gameId: result.gameId,
      seasonId: result.seasonId,
      winnerUid: result.winnerUid,
      winnerPlayerId: result.winnerPlayerId,
      winningAge: result.winningAge,
      awardedPoints: result.awardedPoints,
      eligible: true,
      completedAt: result.completedAt,
    };
  }

  function gameReceipt(result, uid, won) {
    return Object.assign(awardRecord(result), {
      creditedUid: uid,
      won: won === true,
    });
  }

  // Pure transaction reducer: το award receipt και τα aggregates αλλάζουν μαζί ή καθόλου.
  function applyGameTransaction(current, result, uid, won, updatedAt) {
    const value = current && typeof current === 'object' ? JSON.parse(JSON.stringify(current)) : {
      points: 0, wins: 0, gamesPlayed: 0, sumWinningAge: 0, awards: {}, updatedAt: 0,
    };
    if (!value.awards || typeof value.awards !== 'object') value.awards = {};
    if (value.awards[result.gameId]) return { duplicate: true, value: value };
    value.points = Number(value.points) || 0;
    value.wins = Number(value.wins) || 0;
    value.gamesPlayed = Number(value.gamesPlayed) || 0;
    value.sumWinningAge = Number(value.sumWinningAge) || 0;
    if (won) {
      value.points += result.awardedPoints;
      value.wins += 1;
      value.sumWinningAge += result.winningAge;
    }
    value.gamesPlayed += 1;
    value.updatedAt = updatedAt;
    value.awards[result.gameId] = gameReceipt(result, uid, won);
    return { duplicate: false, value: value };
  }

  function applyAwardTransaction(current, result, updatedAt) {
    return applyGameTransaction(current, result, result.winnerUid, true, updatedAt);
  }

  function transactionCreate(ref, value) {
    return ref.transaction(function (current) {
      return current === null ? value : undefined;
    }).then(function (result) {
      return {
        created: !!result.committed,
        value: result.snapshot && result.snapshot.val ? result.snapshot.val() : value,
      };
    });
  }

  function createGameRecord(ctx, game, roomCode, transport) {
    const uid = ctx && ctx.uid;
    if (!ctx || !ctx.db || !uid || !game || !game.gameId) return Promise.reject(new Error('Invalid score game context.'));
    const base = ctx.db.ref('scoreGames/' + game.gameId);
    const meta = {
      gameId: game.gameId,
      hostUid: uid,
      roomCode: String(roomCode || '').toUpperCase().slice(0, 4),
      transport: transport === 'peer' ? 'peer' : 'firebase',
      humanCount: (game.scoreRoster || []).length,
      createdAt: Date.now(),
    };
    return transactionCreate(base.child('meta'), meta).then(function () {
      return Promise.all((game.scoreRoster || []).map(function (p) {
        const record = { human: true };
        if (p.expectedUid) record.expectedUid = p.expectedUid;
        return transactionCreate(base.child('roster/' + p.playerId), record);
      }));
    }).then(function () { return meta; });
  }

  function registerVerifiedProof(ctx, gameId, playerId, uid) {
    if (!ctx || !ctx.db || !gameId || !playerId || !uid) return Promise.reject(new Error('Invalid score proof.'));
    const proof = { uid: uid, verifiedAt: Date.now() };
    return transactionCreate(ctx.db.ref('scoreGames/' + gameId + '/proofs/' + playerId), proof)
      .then(function (result) {
        const stored = result.value || proof;
        if (stored.uid !== uid) throw new Error('Player slot already has another verified UID.');
        // Reverse self-proof index: επιτρέπει σε verified participant που έγινε host μετά από
        // migration να ολοκληρώσει το ίδιο result, χωρίς να εμπιστευόμαστε UID του payload.
        return transactionCreate(ctx.db.ref('scoreGames/' + gameId + '/participants/' + uid), { playerId: playerId })
          .then(function (participant) {
            if (!participant.value || participant.value.playerId !== playerId) {
              throw new Error('Verified UID is already bound to another player slot.');
            }
            return stored;
          });
      });
  }

  function watchProofs(ctx, gameId, onValue, onError) {
    const ref = ctx.db.ref('scoreGames/' + gameId + '/proofs');
    const listener = ref.on('value', function (snap) { onValue((snap && snap.val && snap.val()) || {}); }, onError);
    return function () { ref.off('value', listener); };
  }

  function persistCompletion(ctx, game) {
    const result = evaluateGameResult(game);
    if (!result.eligible) return Promise.reject(new Error('Ineligible game result: ' + result.reason));
    const record = awardRecord(result);
    return transactionCreate(ctx.db.ref('scoreGames/' + game.gameId + '/completion'), record).then(function (saved) {
      const stored = saved.value || record;
      if (stored.gameId !== record.gameId || stored.winnerUid !== record.winnerUid ||
          stored.winningAge !== record.winningAge || stored.awardedPoints !== record.awardedPoints) {
        throw new Error('Stored game result does not match this completion.');
      }
      return { duplicate: !saved.created, result: stored };
    });
  }

  function creditSeasonGame(ctx, result, uid) {
    if (!result || !result.eligible || !result.seasonId || !result.winnerUid || !uid) {
      return Promise.reject(new Error('Invalid seasonal game credit.'));
    }
    const won = uid === result.winnerUid;
    const ref = ctx.db.ref('seasonScores/' + result.seasonId + '/' + uid);
    let duplicate = false;
    return ref.transaction(function (current) {
      const next = applyGameTransaction(current, result, uid, won, Date.now());
      duplicate = next.duplicate;
      return next.duplicate ? undefined : next.value;
    }).then(function (tx) {
      return {
        awarded: !!tx.committed,
        duplicate: !tx.committed || duplicate,
        aggregate: tx.snapshot && tx.snapshot.val ? tx.snapshot.val() : null,
      };
    });
  }

  // Αύγουστος 2.5 — «ensure persisted» αντί για «all-or-nothing πρώτη προσπάθεια».
  // Κάθε σφάλμα φέρει .stage ώστε να ξέρουμε ΠΟΥ έσπασε (auth/completion/season-credit),
  // χωρίς να εμφανίζεται τεχνική λεπτομέρεια στον παίκτη.
  function stageError(stage, err) {
    const e = (err instanceof Error) ? err : new Error(String((err && err.message) || err || 'unknown'));
    e.stage = e.stage || stage;
    if (err && err.code && !e.code) e.code = err.code;
    if (/permission|denied/i.test(e.message || '') || e.code === 'PERMISSION_DENIED') e.permission = true;
    return e;
  }

  // Επαναλήψιμη, idempotent ολοκλήρωση:
  //  1) completion: δημιουργείται αν λείπει· αν ΥΠΑΡΧΕΙ και ταιριάζει, ΔΕΝ είναι αποτυχία.
  //  2) seasonal aggregate: γράφεται ακριβώς μία φορά ανά gameId (award receipt = ο φύλακας).
  // Έτσι το partial state «completion ✓ / aggregate ✗» επισκευάζεται σε κάθε επόμενη κλήση.
  function ensureResultPersisted(ctx, game, uid) {
    if (!ctx || !ctx.db) return Promise.reject(stageError('context', new Error('Missing score context.')));
    if (!uid) return Promise.reject(stageError('context', new Error('Missing credited uid.')));
    return Promise.resolve()
      .then(function () { return persistCompletion(ctx, game); })
      .catch(function (e) { throw stageError('completion', e); })
      .then(function (saved) {
        return creditSeasonGame(ctx, saved.result, uid)
          .catch(function (e) { throw stageError('season-credit', e); })
          .then(function (credit) {
            return {
              stage: 'done',
              completion: saved.result,
              completionExisted: saved.duplicate,
              awarded: credit.awarded,
              duplicate: credit.duplicate,
              aggregate: credit.aggregate,
            };
          });
      });
  }

  /* ---------- Αύγουστος 2.5: self-repair παλιών, μη πιστωμένων νικών ----------
     ΜΟΝΑΔΙΚΗ πηγή αλήθειας για το «τι είναι αξιόπιστο completion». Τη χρησιμοποιούν ΚΑΙ ο
     in-app recovery ΚΑΙ το offline tools/score-backfill.js — καμία δεύτερη υλοποίηση. */
  function inspectStoredCompletion(gameId, game) {
    const c = game && game.completion;
    const problems = [];
    if (!c) return { status: 'no-completion', problems: ['λείπει το completion'] };
    if (!UUID_RE.test(String(gameId))) problems.push('μη έγκυρο gameId');
    if (c.gameId !== gameId) problems.push('completion.gameId ≠ path gameId');
    if (c.eligible !== true) problems.push('eligible !== true');
    if (!SEASON_RE.test(String(c.seasonId || ''))) problems.push('μη έγκυρο seasonId');
    if (!c.winnerUid || typeof c.winnerUid !== 'string') problems.push('λείπει winnerUid');
    if (!c.winnerPlayerId) problems.push('λείπει winnerPlayerId');
    if (typeof c.winningAge !== 'number' || Math.floor(c.winningAge) !== c.winningAge) problems.push('winningAge δεν είναι ακέραιος');
    const expected = calculateVictoryScore(c.winningAge);
    if (!expected) problems.push('winningAge εκτός επιτρεπτού εύρους');
    else if (c.awardedPoints !== expected) problems.push('awardedPoints ' + c.awardedPoints + ' ≠ 164−' + c.winningAge + ' = ' + expected);
    const proof = game.proofs && game.proofs[c.winnerPlayerId];
    if (!proof || !proof.uid) problems.push('λείπει proof για ' + c.winnerPlayerId);
    else if (proof.uid !== c.winnerUid) problems.push('winnerUid ≠ proofs/' + c.winnerPlayerId + '.uid');
    const participant = game.participants && game.participants[c.winnerUid];
    if (!participant) problems.push('λείπει participants/<winnerUid>');
    else if (participant.playerId !== c.winnerPlayerId) problems.push('participants/<winnerUid>.playerId ≠ winnerPlayerId');
    return { status: problems.length ? 'invalid' : 'valid', problems: problems, completion: c };
  }

  function receiptMismatch(receipt, c, uid) {
    const diffs = [];
    if (receipt.gameId !== c.gameId) diffs.push('gameId');
    if (receipt.seasonId !== c.seasonId) diffs.push('seasonId');
    if (receipt.winnerUid !== c.winnerUid) diffs.push('winnerUid');
    if (receipt.winningAge !== c.winningAge) diffs.push('winningAge');
    if (receipt.awardedPoints !== c.awardedPoints) diffs.push('awardedPoints');
    if (receipt.creditedUid !== uid) diffs.push('creditedUid');
    return diffs;
  }

  // Ελάχιστο per-user index. Ο ΙΔΙΟΣ ο παίκτης το γράφει, και μόνο για παιχνίδι στο οποίο
  // έχει ήδη αποδεδειγμένη συμμετοχή (participants/<uid>) — δεν ανοίγει τίποτα σε τρίτους.
  function registerUserGame(ctx, uid, gameId, completedAt) {
    if (!ctx || !ctx.db || !uid || !gameId) return Promise.resolve(false);
    return transactionCreate(ctx.db.ref('userGames/' + uid + '/' + gameId), Number(completedAt) || Date.now())
      .then(function (r) { return !!r; }).catch(function () { return false; });
  }

  function readOnce(ctx, path) {
    const ref = ctx.db.ref(path);
    return ref.once('value').then(function (snap) { return (snap && snap.val) ? snap.val() : null; });
  }

  function listUserGameIds(ctx, uid, limit) {
    if (!ctx || !ctx.db || !uid) return Promise.resolve([]);
    return readOnce(ctx, 'userGames/' + uid).then(function (index) {
      if (!index || typeof index !== 'object') return [];
      // Bounded: τα πιο ΠΡΟΣΦΑΤΑ πρώτα, με σκληρό όριο — κανένα unbounded scan.
      return Object.keys(index)
        .filter(function (id) { return UUID_RE.test(id); })
        .sort(function (a, b) { return (Number(index[b]) || 0) - (Number(index[a]) || 0); })
        .slice(0, Math.max(1, Math.min(limit || 40, 100)));
    }).catch(function () { return []; });
  }

  // Self-repair: ΜΟΝΟ για τον ίδιο τον συνδεδεμένο χρήστη, ΜΟΝΟ με authoritative evidence,
  // και η πίστωση γίνεται από την ΙΔΙΑ creditSeasonGame που χρησιμοποιεί το live παιχνίδι.
  function recoverMissedAwards(ctx, uid, gameIds, options) {
    options = options || {};
    const seasons = options.seasons && options.seasons.length ? options.seasons : null;
    const out = { recovered: [], skipped: [], conflicts: [], points: 0, wins: 0, errors: 0 };
    if (!ctx || !ctx.db || !uid || !Array.isArray(gameIds) || !gameIds.length) return Promise.resolve(out);
    return gameIds.reduce(function (chain, gameId) {
      return chain.then(function () {
        return readOnce(ctx, 'scoreGames/' + gameId).then(function (game) {
          const check = inspectStoredCompletion(gameId, game);
          if (check.status !== 'valid') {
            out.skipped.push({ gameId: gameId, reason: check.problems[0] || check.status });
            return null;
          }
          const c = check.completion;
          // Ο χρήστης ΔΕΝ μπορεί να ανακτήσει ξένο σκορ: πρέπει να είναι ο ίδιος ο νικητής.
          if (c.winnerUid !== uid) { out.skipped.push({ gameId: gameId, reason: 'not-winner' }); return null; }
          if (seasons && seasons.indexOf(c.seasonId) === -1) { out.skipped.push({ gameId: gameId, reason: 'out-of-range-season' }); return null; }
          return readOnce(ctx, 'seasonScores/' + c.seasonId + '/' + uid).then(function (aggregate) {
            const receipt = aggregate && aggregate.awards ? aggregate.awards[gameId] : null;
            if (receipt) {
              const diffs = receiptMismatch(receipt, c, uid);
              if (diffs.length) out.conflicts.push({ gameId: gameId, reason: 'receipt-mismatch: ' + diffs.join(',') });
              else out.skipped.push({ gameId: gameId, reason: 'already-credited' });
              return null;
            }
            return creditSeasonGame(ctx, c, uid).then(function (saved) {
              if (saved.duplicate) { out.skipped.push({ gameId: gameId, reason: 'already-credited' }); return null; }
              out.recovered.push({ gameId: gameId, seasonId: c.seasonId, points: c.awardedPoints, winningAge: c.winningAge });
              out.points += c.awardedPoints;
              out.wins += 1;
              return null;
            });
          });
        }).catch(function (e) {
          out.errors++;
          out.skipped.push({ gameId: gameId, reason: 'error: ' + ((e && e.message) || 'unknown') });
          return null;
        });
      });
    }, Promise.resolve()).then(function () { return out; });
  }

  /* ---------- LEGACY SEEDING (μεταβατικό· αφαιρείται χωρίς συνέπειες) ----------
     Παλιές νίκες που έγιναν ΠΡΙΝ υπάρξει το userGames index δεν είναι discoverable. Εδώ ο
     ΙΔΙΟΣ ο verified νικητής συνδέει ένα legacy gameId στο ΔΙΚΟ του index και μετά αφήνει την
     canonical recoverMissedAwards να αποφασίσει αν υπάρχει πραγματικό recoverable award.
     ΚΑΜΙΑ χειροκίνητη αριθμητική πόντων — το seed δίνει ΜΟΝΟ «δικαίωμα ανακάλυψης». */

  // Read-only σχέδιο για ΕΝΑ gameId. Δεν γράφει ΤΙΠΟΤΑ — το χρησιμοποιεί και το dry-run.
  function planLegacySeed(ctx, uid, gameId) {
    const row = {
      gameId: gameId, uidMatch: false, eligible: false, winningAge: null, awardedPoints: null,
      seasonId: null, hasIndex: false, hasAward: false, action: 'SKIP', reason: null,
    };
    if (!UUID_RE.test(String(gameId || ''))) { row.reason = 'invalid-gameId'; return Promise.resolve(row); }
    if (!ctx || !ctx.db || !uid) { row.reason = 'no-context'; return Promise.resolve(row); }
    return readOnce(ctx, 'scoreGames/' + gameId).then(function (game) {
      const check = inspectStoredCompletion(gameId, game);
      if (check.status === 'no-completion') { row.reason = 'no-completion'; return row; }
      if (check.status === 'invalid') { row.action = 'CONFLICT'; row.reason = check.problems[0]; return row; }
      const c = check.completion;
      row.eligible = true;
      row.winningAge = c.winningAge;
      row.awardedPoints = c.awardedPoints;
      row.seasonId = c.seasonId;
      // Η ΜΟΝΗ απόδειξη ιδιοκτησίας: ο winnerUid του immutable completion, ήδη
      // διασταυρωμένος με proofs/<winnerPlayerId>.uid και participants/<winnerUid>.
      row.uidMatch = (c.winnerUid === uid);
      if (!row.uidMatch) { row.reason = 'not-winner'; return row; }
      return readOnce(ctx, 'userGames/' + uid + '/' + gameId).then(function (idx) {
        row.hasIndex = idx !== null && idx !== undefined;
        return readOnce(ctx, 'seasonScores/' + c.seasonId + '/' + uid).then(function (agg) {
          const receipt = agg && agg.awards ? agg.awards[gameId] : null;
          row.hasAward = !!receipt;
          if (receipt) {
            const diffs = receiptMismatch(receipt, c, uid);
            if (diffs.length) { row.action = 'CONFLICT'; row.reason = 'receipt-mismatch: ' + diffs.join(','); }
            else { row.action = 'ALREADY_CREDITED'; }
            return row;
          }
          row.action = row.hasIndex ? 'WOULD_RECOVER' : 'WOULD_SEED';
          return row;
        });
      });
    }).catch(function (e) {
      row.action = 'SKIP'; row.reason = 'error: ' + ((e && e.message) || 'unknown');
      return row;
    });
  }

  // Ένα gameId: σχέδιο → (αν όχι dry-run) index entry → ΚΑΝΟΝΙΚΟ recovery.
  function seedLegacyGameForCurrentUser(ctx, uid, gameId, options) {
    options = options || {};
    return planLegacySeed(ctx, uid, gameId).then(function (row) {
      if (options.dryRun) return row;
      if (row.action !== 'WOULD_SEED' && row.action !== 'WOULD_RECOVER') return row;
      return registerUserGame(ctx, uid, gameId, Date.now()).then(function () {
        row.seeded = !row.hasIndex;
        // Η πίστωση ΔΕΝ γίνεται εδώ: την αναλαμβάνει αυτούσια η canonical recovery.
        return recoverMissedAwards(ctx, uid, [gameId]).then(function (rec) {
          if (rec.recovered.length) {
            row.action = 'RECOVERED';
            row.recoveredPoints = rec.recovered[0].points;
          } else if (rec.conflicts.length) {
            row.action = 'CONFLICT'; row.reason = rec.conflicts[0].reason;
          } else {
            row.action = 'ALREADY_CREDITED';
            row.reason = (rec.skipped[0] && rec.skipped[0].reason) || 'already-credited';
          }
          return row;
        });
      });
    });
  }

  function seedLegacyGamesForCurrentUser(ctx, uid, gameIds, options) {
    options = options || {};
    const out = { dryRun: !!options.dryRun, rows: [], seeded: 0, alreadyIndexed: 0,
      alreadyCredited: 0, recovered: 0, points: 0, skipped: 0, conflicts: 0, errors: 0 };
    const ids = Array.isArray(gameIds) ? gameIds.slice(0, 100) : [];
    return ids.reduce(function (chain, gameId) {
      return chain.then(function () {
        return seedLegacyGameForCurrentUser(ctx, uid, gameId, options).then(function (row) {
          out.rows.push(row);
          if (row.hasIndex) out.alreadyIndexed++;
          if (row.seeded) out.seeded++;
          if (row.action === 'RECOVERED') { out.recovered++; out.points += row.recoveredPoints || 0; }
          else if (row.action === 'ALREADY_CREDITED') out.alreadyCredited++;
          else if (row.action === 'CONFLICT') out.conflicts++;
          else if (row.action === 'SKIP') { out.skipped++; if (/^error:/.test(row.reason || '')) out.errors++; }
          return null;
        });
      });
    }, Promise.resolve()).then(function () { return out; });
  }

  // Bounded παράθυρο σεζόν: τρέχουσα + τις προηγούμενες N (default 1 → ~6 μήνες).
  function recentSeasonIds(date, back) {
    const d = date instanceof Date ? date : new Date(date || Date.now());
    const list = [];
    let y = d.getUTCFullYear(), q = Math.floor(d.getUTCMonth() / 3) + 1;
    for (let i = 0; i <= (typeof back === 'number' ? back : 1); i++) {
      list.push(y + '-Q' + q);
      q -= 1; if (q < 1) { q = 4; y -= 1; }
    }
    return list;
  }

  return {
    MIN_WINNING_AGE: MIN_WINNING_AGE,
    stageError: stageError,
    ensureResultPersisted: ensureResultPersisted,
    inspectStoredCompletion: inspectStoredCompletion,
    registerUserGame: registerUserGame,
    listUserGameIds: listUserGameIds,
    recoverMissedAwards: recoverMissedAwards,
    recentSeasonIds: recentSeasonIds,
    planLegacySeed: planLegacySeed,
    seedLegacyGameForCurrentUser: seedLegacyGameForCurrentUser,
    seedLegacyGamesForCurrentUser: seedLegacyGamesForCurrentUser,
    MAX_WINNING_AGE: MAX_WINNING_AGE,
    createGameId: createGameId,
    calculateVictoryScore: calculateVictoryScore,
    seasonIdForDate: seasonIdForDate,
    freezeHumanRoster: freezeHumanRoster,
    allHumansVerified: allHumansVerified,
    mergeRosterProofs: mergeRosterProofs,
    evaluateGameResult: evaluateGameResult,
    applyGameTransaction: applyGameTransaction,
    applyAwardTransaction: applyAwardTransaction,
    createGameRecord: createGameRecord,
    registerVerifiedProof: registerVerifiedProof,
    watchProofs: watchProofs,
    persistCompletion: persistCompletion,
    creditSeasonGame: creditSeasonGame,
    awardSeason: function (ctx, result) { return creditSeasonGame(ctx, result, result && result.winnerUid); },
  };
});
