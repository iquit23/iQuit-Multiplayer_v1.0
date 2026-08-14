(function (root, factory) {
  const api = factory(root && root.IQ_I18N);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.IQ_INTRO = api;
})(typeof window !== 'undefined' ? window : globalThis, function (I18N) {
  'use strict';

  function createController(onChange) {
    let open = true;

    function notify() {
      if (typeof onChange === 'function') onChange(open);
    }

    return {
      get open() { return open; },
      dismiss() {
        if (!open) return false;
        open = false;
        notify();
        return true;
      },
      refresh() {
        notify();
      }
    };
  }

  function introHtml(t) {
    const translate = typeof t === 'function'
      ? t
      : (key) => (I18N && typeof I18N.t === 'function' ? I18N.t(key) : key);

    return `
      <div class="intro-kicker">I QUIT!</div>
      <h1 id="introTitle">${translate('introTitle')}</h1>
      <div id="introBody" class="intro-copy">
        <p>${translate('introBody1')}</p>
        <p>${translate('introBody2')}</p>
        <p class="intro-question">${translate('introQuestion')}</p>
      </div>
      <div class="intro-continue" aria-hidden="true">
        <span>${translate('introContinue')}</span>
        <span class="intro-continue-arrow">→</span>
      </div>`;
  }

  function keyDismisses(key) {
    return key === 'Enter' || key === ' ' || key === 'Spacebar' || key === 'Escape';
  }

  let mounted = false;
  let overlay = null;
  let banner = null;
  let controller = null;
  let languageButtons = [];

  function render() {
    if (!overlay || !banner || !controller) return;

    if (!controller.open) {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
      return;
    }

    banner.innerHTML = introHtml();
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function focusHome() {
    const next = document.getElementById('btnCreate') || document.getElementById('btnJoin');
    if (next && typeof next.focus === 'function') next.focus({ preventScroll: true });
  }

  function dismiss() {
    if (controller && controller.dismiss()) focusHome();
  }

  function onBannerClick() {
    dismiss();
  }

  function onBannerKeydown(event) {
    if (!keyDismisses(event.key)) return;
    event.preventDefault();
    dismiss();
  }

  function onDocumentKeydown(event) {
    if (event.key !== 'Escape' || !controller || !controller.open) return;
    event.preventDefault();
    dismiss();
  }

  function onLanguageChange() {
    setTimeout(function () {
      if (controller) controller.refresh();
    }, 0);
  }

  function mount(doc) {
    if (mounted || !doc) return false;
    overlay = doc.getElementById('introOverlay');
    banner = doc.getElementById('introBanner');
    if (!overlay || !banner) return false;

    mounted = true;
    controller = createController(render);
    languageButtons = [doc.getElementById('btnLangHome'), doc.getElementById('btnLang')].filter(Boolean);

    banner.addEventListener('click', onBannerClick);
    banner.addEventListener('keydown', onBannerKeydown);
    doc.addEventListener('keydown', onDocumentKeydown);
    languageButtons.forEach((button) => button.addEventListener('click', onLanguageChange));
    render();

    setTimeout(function () {
      if (controller && controller.open && banner && typeof banner.focus === 'function') {
        banner.focus({ preventScroll: true });
      }
    }, 0);
    return true;
  }

  function unmount(doc) {
    if (!mounted) return;
    const currentDoc = doc || document;
    banner.removeEventListener('click', onBannerClick);
    banner.removeEventListener('keydown', onBannerKeydown);
    currentDoc.removeEventListener('keydown', onDocumentKeydown);
    languageButtons.forEach((button) => button.removeEventListener('click', onLanguageChange));
    mounted = false;
    overlay = null;
    banner = null;
    controller = null;
    languageButtons = [];
  }

  if (typeof document !== 'undefined') mount(document);

  return {
    createController,
    introHtml,
    keyDismisses,
    mount,
    unmount,
    dismiss,
    render,
    get controller() { return controller; }
  };
});
