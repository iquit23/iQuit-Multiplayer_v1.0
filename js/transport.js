/* I QUIT! — επιλογή multiplayer transport και διατήρηση transport στα URLs.
   Firebase είναι το default. Το PeerJS ενεργοποιείται μόνο με ?transport=peer.
   Το ?transport=firebase παραμένει έγκυρο για συμβατότητα με παλιότερα links. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.IQ_TRANSPORT = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function select(search) {
    const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
    const raw = params.get('transport');
    const explicit = raw === 'peer' || raw === 'firebase' ? raw : '';
    return { mode: explicit === 'peer' ? 'peer' : 'firebase', explicit: explicit };
  }

  function query(search) {
    const explicit = select(search).explicit;
    return explicit ? 'transport=' + explicit : '';
  }

  function inviteUrl(origin, pathname, code, search) {
    const tq = query(search);
    return origin + pathname + '?room=' + encodeURIComponent(String(code || '')) + (tq ? '&' + tq : '');
  }

  function cleanPath(pathname, search) {
    const tq = query(search);
    return pathname + (tq ? '?' + tq : '');
  }

  return { select, query, inviteUrl, cleanPath };
});
