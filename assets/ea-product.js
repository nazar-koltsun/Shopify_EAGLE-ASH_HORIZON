// Eagle & Ash product page helpers.
// 1. Keeps Amazon links in step with the selected variant. The theme's variant picker only morphs
//    itself, then fires `variant:update` carrying the freshly rendered section HTML. Every element
//    marked data-ea-sync="<key>" is refreshed from its counterpart in that HTML.
// 2. Shows the phone-only bottom bar whenever the main Amazon button is not on screen.
// 3. Quote rows: shows the arrow buttons only when the quotes do not fit, and scrolls by one quote.
// 4. Story videos: play muted only while on screen, with a pause/play button. Visitors whose system
//    asks for reduced motion start paused.

if (!window.eaProductInit) {
  window.eaProductInit = true;

  document.addEventListener('variant:update', (event) => {
    const html = event.detail?.data?.html;
    if (!html) return;

    document.querySelectorAll('[data-ea-sync]').forEach((element) => {
      const key = element.getAttribute('data-ea-sync');
      const fresh = html.querySelector(`[data-ea-sync="${CSS.escape(key)}"]`);
      if (fresh) element.innerHTML = fresh.innerHTML;
    });

    const bar = document.querySelector('[data-ea-sticky]');
    if (bar) {
      const hasLink = Boolean(bar.querySelector('a[href]'));
      bar.dataset.eaHasLink = String(hasLink);
      if (!hasLink) bar.hidden = true;
    }
  });

  const initSticky = () => {
    const source = document.querySelector('[data-ea-sticky-source]');
    const bar = document.querySelector('[data-ea-sticky]');
    if (!source || !bar || !('IntersectionObserver' in window)) return;

    // On computers the product details column stays on screen while scrolling, which makes it its own layer:
    // a bar inside it is drawn under the later sections. Moved to the end of the page, it is drawn above them.
    document.querySelectorAll('body > [data-ea-sticky]').forEach((old) => {
      if (old !== bar) old.remove();
    });
    if (bar.parentElement !== document.body) document.body.appendChild(bar);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Shown whenever the main Amazon button is not on screen: before reaching it and after passing it.
        const offScreen = !entry.isIntersecting;
        const hasLink = bar.dataset.eaHasLink !== 'false';
        bar.hidden = !(offScreen && hasLink);
      },
      { threshold: 0 }
    );
    observer.observe(source);
  };

  const initQuoteArrows = () => {
    document.querySelectorAll('[data-ea-scroller]').forEach((list) => {
      const track = list.parentElement;
      const prev = track.querySelector('[data-ea-scroll="-1"]');
      const next = track.querySelector('[data-ea-scroll="1"]');
      if (!prev || !next) return;

      const update = () => {
        const overflow = list.scrollWidth - list.clientWidth > 4;
        prev.hidden = !overflow || list.scrollLeft <= 4;
        next.hidden = !overflow || list.scrollLeft >= list.scrollWidth - list.clientWidth - 4;
      };
      const step = (direction) => {
        const card = list.querySelector('li');
        list.scrollBy({ left: direction * (card ? card.getBoundingClientRect().width : list.clientWidth), behavior: 'smooth' });
      };

      prev.addEventListener('click', () => step(-1));
      next.addEventListener('click', () => step(1));
      list.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
    });
  };

  const initStoryVideos = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.querySelectorAll('[data-ea-video]').forEach((wrapper) => {
      const video = wrapper.querySelector('video');
      const toggle = wrapper.querySelector('[data-ea-video-toggle]');
      if (!video || !toggle) return;

      let pausedByVisitor = reduceMotion;
      const icon = toggle.querySelector('span');
      const show = (playing) => {
        toggle.setAttribute('aria-pressed', String(!playing));
        toggle.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
        icon.className = `ea-story__video-icon ea-story__video-icon--${playing ? 'pause' : 'play'}`;
      };
      show(false);

      video.addEventListener('play', () => show(true));
      video.addEventListener('pause', () => show(false));
      toggle.addEventListener('click', () => {
        pausedByVisitor = !video.paused;
        if (video.paused) video.play().catch(() => {});
        else video.pause();
      });

      if (!('IntersectionObserver' in window)) return;
      new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;
          if (entry.isIntersecting && !pausedByVisitor) video.play().catch(() => {});
          if (!entry.isIntersecting) video.pause();
        },
        { threshold: 0.4 }
      ).observe(wrapper);
    });
  };

  // 5. Review invitation: opens Judge.me's own "Write a review" form.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-ea-open-review]');
    if (!trigger) return;
    const section = trigger.closest('.shopify-section') || document;
    const judgeButton = section.querySelector('.jm-review-widget .jm-button--primary');
    // Judge.me opens its review form as a window on top of the page (with a photo upload step).
    if (judgeButton) judgeButton.click();
  });

  const init = () => {
    initSticky();
    initQuoteArrows();
    initStoryVideos();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
