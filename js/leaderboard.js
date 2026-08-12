/* I QUIT! — Seasonal Leaderboard V1.
   Canonical client-side ranking πάνω στα υπάρχοντα seasonScores/{seasonId}/{uid}.
   Τα UID χρησιμοποιούνται μόνο εσωτερικά για deterministic ordering/self rank και δεν
   αποδίδονται ποτέ στο δημόσιο DOM. */
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports ? require('./scoring.js') : root.IQ_SCORING,
    typeof module === 'object' && module.exports ? require('./i18n.js') : root.IQ_I18N,
    root
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.IQ_LEADERBOARD = api;
})(typeof self !== 'undefined' ? self : this, function (SCORING, I, root) {
  'use strict';

  const TOP_LIMIT = 5;
  const MEDALS = ['🥇', '🥈', '🥉'];

  function num(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function averageWinningAge(row) {
    const wins = num(row && row.wins);
    const sum = num(row && row.sumWinningAge);
    return wins > 0 && sum > 0 ? sum / wins : Infinity;
  }

  function seasonMeta(value) {
    const date = value instanceof Date ? value : new Date(value == null ? Date.now() : value);
    const id = SCORING.seasonIdForDate(date);
    if (!id) return null;
    const match = /^(\d{4})-Q([1-4])$/.exec(id);
    const year = Number(match[1]), quarter = Number(match[2]);
    const end = new Date(Date.UTC(year, quarter * 3, 0));
    return {
      id: id,
      year: year,
      quarter: quarter,
      endDay: String(end.getUTCDate()).padStart(2, '0'),
      endMonth: String(end.getUTCMonth() + 1).padStart(2, '0'),
    };
  }

  function compareRows(a, b) {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.averageWinningAge !== b.averageWinningAge) return a.averageWinningAge - b.averageWinningAge;
    return String(a.uid).localeCompare(String(b.uid), 'en');
  }

  function rankSeason(scores, usernames) {
    scores = scores && typeof scores === 'object' ? scores : {};
    usernames = usernames && typeof usernames === 'object' ? usernames : {};
    return Object.keys(scores).map(function (uid) {
      const row = scores[uid] || {};
      return {
        uid: uid,
        username: typeof usernames[uid] === 'string' && usernames[uid].trim() ? usernames[uid].trim() : null,
        points: num(row.points),
        wins: num(row.wins),
        gamesPlayed: num(row.gamesPlayed),
        averageWinningAge: averageWinningAge(row),
      };
    }).filter(function (row) {
      // Ranked leaderboard = τουλάχιστον μία βαθμολογημένη νίκη/πόντοι.
      return row.points > 0;
    }).sort(compareRows).map(function (row, index) {
      row.rank = index + 1;
      return row;
    });
  }

  function buildView(scores, usernames, currentUid) {
    const ranked = rankSeason(scores, usernames);
    const self = currentUid ? ranked.find(function (row) { return row.uid === currentUid; }) || null : null;
    return {
      ranked: ranked,
      top: ranked.slice(0, TOP_LIMIT),
      currentUid: currentUid || null,
      self: self,
      selfInTop: !!(self && self.rank <= TOP_LIMIT),
      empty: ranked.length === 0,
    };
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function formatPoints(points) {
    const locale = I && I.lang === 'en' ? 'en-US' : 'el-GR';
    try { return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(points); }
    catch (e) { return String(Math.round(points)); }
  }

  function shell(meta, body) {
    return '<div class="lb-head">' +
      '<div class="lb-title">🏆 ' + esc(I.t('lbTitle')) + '</div>' +
      '<div class="lb-quarter">Q' + meta.quarter + ' ' + meta.year + '</div>' +
      '</div>' +
      '<div class="lb-season">' + esc(I.t('lbMonthsQ' + meta.quarter)) +
        '<span aria-hidden="true"> · </span>' + esc(I.t('lbEnds')) + ' ' + meta.endDay + '/' + meta.endMonth + '</div>' +
      body;
  }

  function rowHtml(row, currentUid) {
    const mark = row.rank <= 3 ? MEDALS[row.rank - 1] : row.rank + '.';
    const username = row.username || I.t('lbPlayer');
    const mine = currentUid && row.uid === currentUid;
    return '<div class="lb-row' + (mine ? ' me' : '') + '"' + (mine ? ' aria-current="true"' : '') + '>' +
      '<span class="lb-rank">' + mark + '</span>' +
      '<span class="lb-name">' + esc(username) + '</span>' +
      '<span class="lb-score">' + esc(formatPoints(row.points)) + ' ' + esc(I.t('lbPts')) + '</span>' +
      '</div>';
  }

  function renderLeaderboard(view, meta) {
    let body = '';
    if (view.empty) {
      body = '<div class="lb-empty"><b>' + esc(I.t('lbEmpty')) + '</b><span>' + esc(I.t('lbBeFirst')) + '</span></div>';
    } else {
      body = '<div class="lb-list">' + view.top.map(function (row) { return rowHtml(row, view.currentUid); }).join('') + '</div>';
    }
    if (view.currentUid && !view.empty && !view.self) {
      body += '<div class="lb-self lb-self-empty">' + esc(I.t('lbYouNoWin')) + '</div>';
    } else if (view.currentUid && view.self && !view.selfInTop) {
      body += '<div class="lb-self"><span>' + esc(I.t('lbYou')) + ': <b>#' + view.self.rank + '</b></span>' +
        '<span>' + esc(formatPoints(view.self.points)) + ' ' + esc(I.t('lbPoints')) + '</span></div>';
    } else if (!view.currentUid && !view.empty) {
      body += '<div class="lb-note">' + esc(I.t('lbAccountNote')) + '</div>';
    }
    return shell(meta, body);
  }

  function readUsernames(ctx, uids, cache) {
    cache = cache || {};
    return Promise.all(uids.map(function (uid) {
      if (Object.prototype.hasOwnProperty.call(cache, uid)) return null;
      return ctx.db.ref('users/' + uid + '/username').once('value').then(function (snap) {
        const username = snap && snap.val ? snap.val() : null;
        if (typeof username === 'string' && username.trim()) cache[uid] = username.trim();
      }).catch(function () {
        // Ένα profile που λείπει/δεν διαβάζεται δεν επιτρέπεται να διαρρεύσει ως UID.
        // Η row μένει στην κατάταξη με το ασφαλές generic display name.
      });
    })).then(function () { return cache; });
  }

  function watchSeason(ctx, seasonId, onData, onError) {
    const ref = ctx.db.ref('seasonScores/' + seasonId);
    const usernameCache = {};
    let active = true, generation = 0;
    const onValue = function (snap) {
      const currentGeneration = ++generation;
      const scores = (snap && snap.val && snap.val()) || {};
      const rankedUids = Object.keys(scores).filter(function (uid) { return num(scores[uid] && scores[uid].points) > 0; });
      readUsernames(ctx, rankedUids, usernameCache).then(function (usernames) {
        if (active && currentGeneration === generation) onData(scores, Object.assign({}, usernames));
      });
    };
    const onFailure = function (error) { if (active && typeof onError === 'function') onError(error); };
    ref.on('value', onValue, onFailure);
    return function () {
      if (!active) return;
      active = false;
      generation++;
      ref.off('value', onValue);
    };
  }

  function observeVerifiedUid(auth, onUid) {
    let active = true, generation = 0;
    const listen = auth && (auth.onIdTokenChanged || auth.onAuthStateChanged);
    if (typeof listen !== 'function') { onUid(null); return function () { active = false; }; }
    const unsubscribe = listen.call(auth, function (user) {
      const currentGeneration = ++generation;
      if (!user || user.isAnonymous || !user.emailVerified || typeof user.getIdTokenResult !== 'function') {
        if (active) onUid(null);
        return;
      }
      user.getIdTokenResult(false).then(function (token) {
        if (!active || currentGeneration !== generation) return;
        onUid(token && token.claims && token.claims.email_verified === true ? user.uid : null);
      }).catch(function () { if (active && currentGeneration === generation) onUid(null); });
    }, function () { if (active) onUid(null); });
    return function () {
      if (!active) return;
      active = false;
      generation++;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }

  function previewData(mode) {
    if (mode === 'empty') return { scores: {}, usernames: {}, uid: 'preview-self' };
    if (mode !== 'full') return null;
    return {
      uid: 'preview-self',
      scores: {
        'preview-1': { points: 1245, wins: 11, gamesPlayed: 18, sumWinningAge: 594 },
        'preview-2': { points: 1180, wins: 10, gamesPlayed: 16, sumWinningAge: 550 },
        'preview-3': { points: 987, wins: 9, gamesPlayed: 15, sumWinningAge: 504 },
        'preview-4': { points: 840, wins: 8, gamesPlayed: 13, sumWinningAge: 456 },
        'preview-5': { points: 721, wins: 7, gamesPlayed: 12, sumWinningAge: 406 },
        'preview-6': { points: 510, wins: 5, gamesPlayed: 9, sumWinningAge: 290 },
        'preview-self': { points: 312, wins: 3, gamesPlayed: 7, sumWinningAge: 174 },
      },
      usernames: {
        'preview-1': 'IQuitFounder', 'preview-2': 'Olga', 'preview-3': 'George95',
        'preview-4': 'Nikos', 'preview-5': 'Maria', 'preview-6': 'Alex', 'preview-self': 'IQuit',
      },
    };
  }

  const api = {
    TOP_LIMIT: TOP_LIMIT,
    seasonMeta: seasonMeta,
    averageWinningAge: averageWinningAge,
    compareRows: compareRows,
    rankSeason: rankSeason,
    buildView: buildView,
    renderLeaderboard: renderLeaderboard,
    readUsernames: readUsernames,
    watchSeason: watchSeason,
    observeVerifiedUid: observeVerifiedUid,
    previewData: previewData,
  };

  // ================= Browser component =================
  if (!root || typeof root.document === 'undefined' || typeof root.location === 'undefined') return api;

  const state = {
    mounted: false, loading: true, error: false, scores: {}, usernames: {}, currentUid: null,
    meta: seasonMeta(new Date()), seasonOff: null, authOff: null, langHandlers: [], ctx: null,
  };

  function box() { return root.document.getElementById('leaderboardBox'); }

  function render() {
    const el = box();
    if (!el || !state.meta) return;
    if (state.loading) {
      el.innerHTML = shell(state.meta, '<div class="lb-loading">' + esc(I.t('lbLoading')) + '</div>');
      return;
    }
    if (state.error) {
      el.innerHTML = shell(state.meta, '<div class="lb-error">' + esc(I.t('lbUnavailable')) +
        '<button class="ghost lb-retry" type="button">' + esc(I.t('lbRetry')) + '</button></div>');
      const retry = el.querySelector('.lb-retry');
      if (retry) retry.onclick = restartSeason;
      return;
    }
    el.innerHTML = renderLeaderboard(buildView(state.scores, state.usernames, state.currentUid), state.meta);
  }

  function startSeason() {
    if (!state.ctx || state.seasonOff) return;
    state.loading = true; state.error = false; render();
    state.seasonOff = watchSeason(state.ctx, state.meta.id, function (scores, usernames) {
      state.scores = scores; state.usernames = usernames; state.loading = false; state.error = false; render();
    }, function () { state.loading = false; state.error = true; render(); });
  }

  function restartSeason() {
    if (state.seasonOff) state.seasonOff();
    state.seasonOff = null;
    startSeason();
  }

  function localPreviewMode() {
    const host = String(root.location.hostname || '').toLowerCase();
    if (host !== 'localhost' && host !== '127.0.0.1') return '';
    return new URLSearchParams(root.location.search).get('leaderboardpreview') || '';
  }

  function mount() {
    if (state.mounted || !box()) return;
    state.mounted = true;
    ['btnLang', 'btnLangHome'].forEach(function (id) {
      const button = root.document.getElementById(id);
      if (!button) return;
      const handler = function () { setTimeout(render, 0); };
      button.addEventListener('click', handler);
      state.langHandlers.push(function () { button.removeEventListener('click', handler); });
    });
    const preview = previewData(localPreviewMode());
    if (preview) {
      state.scores = preview.scores; state.usernames = preview.usernames; state.currentUid = preview.uid;
      state.loading = false; render(); return;
    }
    render();
    if (!root.IQ_NET_FB || typeof root.IQ_NET_FB.authReady !== 'function') {
      state.loading = false; state.error = true; render(); return;
    }
    root.IQ_NET_FB.authReady().then(function (ctx) {
      if (!state.mounted) return;
      state.ctx = ctx;
      state.authOff = observeVerifiedUid(ctx.fb.auth(), function (uid) { state.currentUid = uid; render(); });
      startSeason();
    }).catch(function () { state.loading = false; state.error = true; render(); });
  }

  function unmount() {
    if (!state.mounted) return;
    state.mounted = false;
    if (state.seasonOff) state.seasonOff();
    if (state.authOff) state.authOff();
    state.seasonOff = null; state.authOff = null; state.ctx = null;
    state.langHandlers.splice(0).forEach(function (off) { off(); });
  }

  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', mount);
  else mount();
  api._state = state;
  api._mount = mount;
  api._unmount = unmount;
  return api;
});
