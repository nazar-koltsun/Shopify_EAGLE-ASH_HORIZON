/**
 * Plays the section video while it is in view and pauses it when it leaves.
 */
class CraftsmanshipVideo extends HTMLElement {
  /** @type {HTMLVideoElement | null} */
  #video = null;

  /** @type {IntersectionObserver | null} */
  #observer = null;

  connectedCallback() {
    this.#video = this.querySelector('video');
    if (!this.#video) return;

    this.#video.muted = true;
    this.#video.defaultMuted = true;
    this.#video.playsInline = true;
    this.#video.setAttribute('playsinline', '');
    this.#video.loop = true;
    this.#video.controls = false;

    this.#observer = new IntersectionObserver(
      ([entry]) => {
        if (!this.#video) return;

        if (entry?.intersectionRatio && entry.intersectionRatio >= 0.9) {
          this.#video.play().catch(() => {});
        } else {
          this.#video.pause();
        }
      },
      { threshold: [0, 0.8, 1] }
    );

    this.#observer.observe(this);
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#video?.pause();
  }
}

if (!customElements.get('craftsmanship-video')) {
  customElements.define('craftsmanship-video', CraftsmanshipVideo);
}
