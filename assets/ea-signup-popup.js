/**
 * Eagle & Ash sign-up pop-up (5 Nov 2026), markup in snippets/ea-signup-popup.liquid.
 *
 * Anu's rule (3 Nov 2026): at most one pop-up, never at once on arrival, easy to close, it must help.
 * When it shows: once per visit, after 30 seconds on the site (and at least 5 seconds on the current page), or after
 * the visitor has scrolled through half of a long page (and at least 10 seconds on it).
 * It waits while Shopify's cookie banner or its preferences window is open, while another dialog is open, and while
 * another sign-up form of ours is on screen.
 * Closed with the cross or Esc: hidden for 14 days (data-hide-days). Signed up (any of our forms, see
 * email-signup-klaviyo.js) or arrived from one of our emails: never again on this browser.
 * The browser keeps only these dates (localStorage / sessionStorage), no personal data. Without storage it never shows,
 * because then it could not keep the "hidden for 14 days" promise.
 */
(() => {
  const pop = document.getElementById('ea-signup-pop');
  if (!pop || (window.Shopify && window.Shopify.designMode)) return;

  const DAY = 24 * 60 * 60 * 1000;
  const KEY_CLOSED = 'ea-pop-closed';
  const KEY_DONE = 'ea-signed-up';
  const KEY_START = 'ea-visit-start';
  const KEY_SHOWN = 'ea-pop-shown';

  const store = (name) => {
    try {
      const s = window[name];
      const probe = '__ea_probe';
      s.setItem(probe, '1');
      s.removeItem(probe);
      return s;
    } catch {
      return null;
    }
  };
  const local = store('localStorage');
  const session = store('sessionStorage');
  if (!local || !session) return;

  const read = (s, key) => {
    try {
      return s.getItem(key);
    } catch {
      return null;
    }
  };
  const write = (s, key, value) => {
    try {
      s.setItem(key, value);
    } catch {
      // storage full or blocked: nothing to do
    }
  };

  // A visitor who came from one of our emails is already on the list.
  const params = new URLSearchParams(window.location.search);
  if (params.get('utm_medium') === 'email' || params.has('_kx')) write(local, KEY_DONE, String(Date.now()));

  if (read(local, KEY_DONE)) return;
  const closedAt = Number(read(local, KEY_CLOSED) || 0);
  if (closedAt && Date.now() - closedAt < Number(pop.dataset.hideDays || 14) * DAY) return;
  if (read(session, KEY_SHOWN)) return;

  if (!read(session, KEY_START)) write(session, KEY_START, String(Date.now()));
  const visitStart = Number(read(session, KEY_START)) || Date.now();
  const pageStart = Date.now();

  // The 20% texts only while the promotion runs.
  const offerEnd = Date.parse(pop.dataset.offerEnd || '');
  const offer = !Number.isNaN(offerEnd) && Date.now() < offerEnd;
  pop.querySelectorAll('[data-offer]').forEach((el) => (el.hidden = !offer));
  pop.querySelectorAll('[data-no-offer]').forEach((el) => (el.hidden = offer));
  const successText = pop.querySelector('[data-signup-success] .email-signup-klaviyo__message-text');
  if (successText) successText.textContent = (offer ? pop.dataset.successOffer : pop.dataset.successPlain) || '';

  const phone = window.matchMedia('(max-width: 749px)');
  const openButton = pop.querySelector('[data-ea-pop-open]');

  const cookieBannerOpen = () =>
    [...document.querySelectorAll('[id^="shopify-pc__"][class*="__dialog"], #shopify-pc__banner, #shopify-pc__prefs')].some(
      (el) => el.getBoundingClientRect().height > 0
    );

  const otherDialogOpen = () => Boolean(document.querySelector('dialog[open]'));

  const otherFormOnScreen = () =>
    [...document.querySelectorAll('email-signup-klaviyo')].some((form) => {
      if (pop.contains(form)) return false;
      const r = form.getBoundingClientRect();
      return r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
    });

  const timeOrScrollReached = () => {
    const now = Date.now();
    if (now - visitStart >= 30000 && now - pageStart >= 5000) return true;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    return scrollable > 400 && window.scrollY / scrollable >= 0.5 && now - pageStart >= 10000;
  };

  // Keep the pop-up above the "Shop on Amazon" bar of product pages whenever that bar is visible.
  const updateOffset = () => {
    const bar = document.querySelector('[data-ea-sticky]');
    let h = 0;
    if (bar && !bar.hidden && getComputedStyle(bar).display !== 'none') h = bar.getBoundingClientRect().height;
    pop.style.setProperty('--ea-pop-offset', `${Math.round(h)}px`);
  };
  const barWatcher = new MutationObserver(updateOffset);

  let timer = 0;
  const check = () => {
    if (!timeOrScrollReached() || cookieBannerOpen() || otherDialogOpen() || otherFormOnScreen()) return;
    show();
  };

  function show() {
    window.clearInterval(timer);
    window.removeEventListener('scroll', onScroll);
    write(session, KEY_SHOWN, '1');
    pop.classList.toggle('is-collapsed', phone.matches);
    if (openButton) openButton.setAttribute('aria-expanded', String(!phone.matches));
    updateOffset();
    barWatcher.observe(document.body, { attributes: true, attributeFilter: ['hidden'], subtree: true });
    window.addEventListener('resize', updateOffset);
    pop.hidden = false;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => pop.classList.add('is-visible')));
  }

  function hide() {
    const hadFocus = pop.contains(document.activeElement);
    pop.classList.remove('is-visible');
    pop.hidden = true;
    barWatcher.disconnect();
    window.removeEventListener('resize', updateOffset);
    document.removeEventListener('keydown', onKey);
    if (hadFocus) {
      const main = document.getElementById('MainContent');
      if (main) {
        if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
      }
    }
  }

  function close() {
    write(local, KEY_CLOSED, String(Date.now()));
    hide();
  }

  function onKey(event) {
    if (event.key !== 'Escape' || pop.hidden || event.defaultPrevented || otherDialogOpen()) return;
    close();
  }

  let scrollQueued = false;
  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    window.setTimeout(() => {
      scrollQueued = false;
      check();
    }, 250);
  }

  pop.querySelector('[data-ea-pop-close]')?.addEventListener('click', close);

  openButton?.addEventListener('click', () => {
    pop.classList.remove('is-collapsed');
    openButton.setAttribute('aria-expanded', 'true');
    pop.querySelector('input[type="email"]')?.focus();
  });

  pop.addEventListener('email-signup:success', () => {
    write(local, KEY_DONE, String(Date.now()));
    pop.classList.add('is-done');
    // the thank-you line stays for 10 seconds (longer while the mouse is on the box)
    const later = () => (pop.matches(':hover') ? window.setTimeout(later, 3000) : hide());
    window.setTimeout(later, 10000);
  });

  document.addEventListener('keydown', onKey);
  window.addEventListener('scroll', onScroll, { passive: true });
  timer = window.setInterval(check, 1000);
})();
