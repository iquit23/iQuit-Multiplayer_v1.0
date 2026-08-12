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

  return {
    MIN_WINNING_AGE: MIN_WINNING_AGE,
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
