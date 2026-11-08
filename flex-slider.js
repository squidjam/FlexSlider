/**
 * <flex-slider> - a self-contained image slider web component.
 *
 * A dependency-free rewrite of FlexSlider 2's image slider as a custom element.
 * Derived from FlexSlider 2, Copyright (c) 2012 WooThemes, contributing author
 * Tyler Smith, which is licensed under the GPL-2.0-or-later; this file is
 * distributed under the same licence. See LICENSE.
 *
 * Drop plain <img> tags inside the element; the component builds the slider
 * around them. No dependencies, no global CSS, no build step.
 *
 *   <flex-slider animation="slide" autoplay interval="5000" nav pager>
 *     <img src="a.jpg" alt="A">
 *     <img src="b.jpg" alt="B">
 *   </flex-slider>
 *
 * Attributes (all optional):
 *   animation       "slide" | "fade"                (default "slide")
 *   duration        transition duration in ms       (default 700)
 *   easing          any CSS timing function         (default "ease")
 *   autoplay        present = start a slideshow     (default off)
 *   interval        ms between slides               (default 5000)
 *   pause-on-hover  pause slideshow on hover        (default off)
 *   nav             show previous/next arrows       (default off)
 *   pager           show dot/thumbnail pager        (default off)
 *   thumbs          pager uses thumbnails           (default off)
 *   slide-show-at   index to start on, 0-based      (default 0)
 *   direction       "horizontal" | "vertical"       (default "horizontal")
 *   reverse         reverse the animation direction (default off)
 *   rtl             right-to-left layout            (default off)
 *   swipe           drag/swipe to change slides     (default on)
 *   keyboard        arrow-key control when focused  (default on)
 *   smooth-height   animate container height        (default off)
 *   height          fixed track height, e.g. "420px"(default aspect-driven)
 *   theme           "light" | "dark"                (default "light")
 *   loop            wrap past the last slide        (default off)
 *   label           accessible name for the region
 *   prev-label      accessible name for the prev arrow
 *   next-label      accessible name for the next arrow
 *
 * Methods: next(), prev(), goTo(i), play(), pause(), refresh(), reset()
 * Events:  "slide-start" and "slide-end", both with detail { index, slide, count }
 * Properties: currentIndex (read/write), slides (read-only)
 */

const TEMPLATE = /* html */ `
<style>
  :host {
    --fs-accent: #1f1f1f;
    --fs-arrow-bg: rgba(255, 255, 255, 0.82);
    --fs-arrow-fg: #1f1f1f;
    --fs-dot: rgba(255, 255, 255, 0.55);
    --fs-dot-active: #ffffff;
    --fs-radius: 6px;
    --fs-shadow: 0 1px 6px rgba(0, 0, 0, 0.18);
    display: block;
    position: relative;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    line-height: 0;
    -webkit-tap-highlight-color: transparent;
    touch-action: pan-y;
  }
  :host([hidden]) { display: none; }
  :host([theme="dark"]) {
    --fs-arrow-bg: rgba(20, 20, 20, 0.8);
    --fs-arrow-fg: #ffffff;
    --fs-accent: #ffffff;
    --fs-dot: rgba(255, 255, 255, 0.45);
    --fs-dot-active: rgba(255, 255, 255, 0.95);
  }

  .frame {
    position: relative;
    overflow: hidden;
    border-radius: var(--fs-radius);
    background: transparent;
    user-select: none;
  }
  :host([height]) .frame { height: 100%; }

  /* The track is exactly the width of the frame and never grows with its
     children. Slides size against the frame, not against the track, which is
     what makes the slider responsive at any container width. */
  .track {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 0;
    transition-property: transform;
    transition-timing-function: ease;
    transition-duration: 700ms;
    will-change: transform;
  }
  :host([direction="vertical"]) .track {
    flex-direction: column;
    flex-wrap: nowrap;
  }
  .track.instant { transition: none; }

  /* One slide fills the frame. flex-basis resolves against the track, which is
     now a fixed 100% of the frame, so every slide is frame-wide and the track
     is exactly as wide as the sum of them. */
  .slide {
    flex: 0 0 100%;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  :host([direction="vertical"]) .slide { min-height: 100%; }
  :host([height]) .slide { height: 100%; }

  ::slotted(img) {
    display: block;
    width: 100%;
    height: auto;
    user-select: none;
    -webkit-user-drag: none;
  }

  /* Built slide images: the visible copies. */
  .slide > img {
    display: block;
    width: 100%;
    height: auto;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
  }

  /* Fixed-height mode: crop instead of squashing. */
  :host([height]) ::slotted(img),
  :host([height]) .slide > img { height: 100%; object-fit: cover; }

  /* Fade animation stacks the slides. */
  :host([animation="fade"]) .track {
    display: block;
    position: relative;
    transform: none !important;
  }
  :host([animation="fade"]) .slide {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition-property: opacity;
    transition-timing-function: ease;
  }
  :host([animation="fade"]) .slide.is-active { opacity: 1; }
  :host([animation="fade"]) .slide:first-child { position: relative; }

  .arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--fs-arrow-bg);
    color: var(--fs-arrow-fg);
    box-shadow: var(--fs-shadow);
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.25s ease-in-out;
  }
  .frame:hover .arrow,
  .frame:focus-within .arrow { opacity: 0.9; }
  .arrow:hover { opacity: 1; }
  .arrow:focus-visible { outline: 2px solid var(--fs-accent); outline-offset: 2px; }
  .arrow.prev { left: 9px; }
  .arrow.next { right: 9px; }
  .arrow[disabled] { opacity: 0; pointer-events: none; }
  .arrow svg { width: 17px; height: 17px; fill: currentColor; }
  :host([rtl]) .arrow svg { transform: scaleX(-1); }

  @media (max-width: 860px), (hover: none) {
    .arrow { opacity: 0.9; }
  }

  .pager {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
    line-height: 0;
  }
  .pager button {
    display: block;
    width: 10px;
    height: 10px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--fs-accent);
    opacity: 0.35;
    cursor: pointer;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  .pager button:hover { transform: scale(1.15); }
  .pager button[aria-current="true"] { opacity: 1; cursor: default; }

  /* Thumbnail pager. */
  .pager[data-thumbs] { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 2px; }
  .pager[data-thumbs] button {
    width: 64px;
    height: 44px;
    border: 2px solid transparent;
    border-radius: 4px;
    overflow: hidden;
    background: #ddd;
    opacity: 0.65;
    transition: opacity 0.2s ease, border-color 0.2s ease;
  }
  .pager[data-thumbs] button img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .pager[data-thumbs] button:hover { opacity: 1; }
  .pager[data-thumbs] button[aria-current="true"] {
    opacity: 1;
    border-color: var(--fs-accent);
    cursor: default;
  }

  .frame:focus-visible { outline: 2px solid var(--fs-accent); outline-offset: 2px; }
</style>

<div class="frame" part="frame">
  <div class="track" part="track">
    <slot></slot>
  </div>
  <button class="arrow prev" part="arrow-prev" type="button" hidden>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 4.6 8 12l7.4 7.4 1.4-1.4L10.8 12l6-6z"/></svg>
  </button>
  <button class="arrow next" part="arrow-next" type="button" hidden>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.6 4.6 16 12l-7.4 7.4-1.4-1.4L13.2 12l-6-6z"/></svg>
  </button>
</div>
<ol class="pager" part="pager" hidden></ol>
`;

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

class FlexSlider extends HTMLElement {
  static get observedAttributes() {
    return [
      'animation', 'duration', 'easing', 'autoplay', 'interval', 'pause-on-hover',
      'nav', 'pager', 'thumbs', 'slide-show-at', 'direction', 'reverse', 'rtl',
      'swipe', 'keyboard', 'smooth-height', 'height', 'theme', 'loop', 'label',
      'prev-label', 'next-label'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const template = document.createElement('template');
    template.innerHTML = TEMPLATE;
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this._frame = this.shadowRoot.querySelector('.frame');
    this._track = this.shadowRoot.querySelector('.track');
    this._slot = this.shadowRoot.querySelector('slot');
    this._pager = this.shadowRoot.querySelector('.pager');
    this._prevBtn = this.shadowRoot.querySelector('.arrow.prev');
    this._nextBtn = this.shadowRoot.querySelector('.arrow.next');

    this._index = 0;
    this._pages = [];          // passive copies that compose the visible track
    this._dots = [];           // pager buttons
    this._timer = null;
    this._playing = false;
    this._wasPlaying = false;
    this._pointerId = null;
    this._startPoint = 0;
    this._dragDelta = 0;
    this._connected = false;
    this._resizeObserver = null;
    this._hostObserver = null;
  }

  /* ---------------------------------------------------------------- lifecycle */

  connectedCallback() {
    if (this._connected) return;
    this._connected = true;

    this._slot.addEventListener('slotchange', () => this.refresh());

    this._track.addEventListener('pointerdown', this._onPointerDown);
    this._frame.addEventListener('pointermove', this._onPointerMove);
    this._frame.addEventListener('pointerup', this._onPointerUp);
    this._frame.addEventListener('pointercancel', this._onPointerUp);
    this.addEventListener('dragstart', (e) => e.preventDefault());

    this._frame.tabIndex = 0;
    if (!this._frame.hasAttribute('role')) this._frame.setAttribute('role', 'region');
    this._frame.setAttribute('aria-roledescription', 'carousel');

    if (window.matchMedia('(hover: hover)').matches) {
      this._frame.addEventListener('mouseenter', () => {
        if (this.hasAttribute('pause-on-hover')) this.pause();
      });
      this._frame.addEventListener('mouseleave', () => {
        if (this.hasAttribute('pause-on-hover') && this._wasPlaying) this.play();
      });
    }

    this._frame.addEventListener('keydown', (e) => this._onKeydown(e));

    this._prevBtn.addEventListener('click', () => this.prev());
    this._nextBtn.addEventListener('click', () => this.next());
    this._pager.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button || button.disabled) return;
      this.goTo(Number(button.dataset.index));
    });

    this.refresh();

    // The host can change width after a late webfont, a scrollbar or a lazy
    // image, so watch it rather than assuming the first measurement holds.
    if (typeof ResizeObserver !== 'undefined' && ResizeObserver) {
      this._hostObserver = new ResizeObserver(() => this._syncPosition());
      this._hostObserver.observe(this);
    }
  }

  disconnectedCallback() {
    this.pause();
    if (this._resizeObserver) this._resizeObserver.disconnect();
    this._resizeObserver = null;
    if (this._hostObserver) this._hostObserver.disconnect();
    this._hostObserver = null;
  }

  attributeChangedCallback(name) {
    if (!this._connected) return;
    switch (name) {
      case 'animation':
      case 'direction':
        this._applyLayout();
        requestAnimationFrame(() => this.goTo(this._index, { instant: true }));
        break;
      case 'height':
        this._applyLayout();
        this.goTo(this._index, { instant: true });
        break;
      case 'autoplay':
        if (this.hasAttribute('autoplay')) this.play();
        else this.pause();
        break;
      case 'nav':
        this._renderArrows();
        break;
      case 'thumbs':
        this._buildPager();
        this._move(true);
        break;
      case 'smooth-height':
      case 'smoothHeight':
      case 'duration':
      case 'easing':
        this._applyLayout();
        break;
      case 'label':
        this._applyLabel();
        break;
      default:
        break;
    }
  }

  /* --------------------------------------------------------------- public API */

  /** The original <img> elements the element was given. */
  get slides() {
    return Array.from(this.querySelectorAll('img'));
  }

  get currentIndex() {
    return this._index;
  }

  set currentIndex(value) {
    this.goTo(value);
  }

  next() { this.goTo(this._index + 1); }
  prev() { this.goTo(this._index - 1); }

  goTo(index, { instant = false } = {}) {
    const count = this._pages.length;
    if (count === 0) return;

    let target = Number.isFinite(Number(index)) ? Math.trunc(Number(index)) : this._index;
    if (target < 0) target = this.hasAttribute('loop') ? count - 1 : 0;
    if (target > count - 1) target = this.hasAttribute('loop') ? 0 : count - 1;
    target = clamp(target, 0, count - 1);

    if (!instant && target === this._index) return;

    const previous = this._index;
    this._index = target;

    if (previous !== target) this._emit('slide-start', target, count);

    this._move(instant);

    if (previous !== target) this._emit('slide-end', target, count);
  }

  play() {
    if (this._pages.length < 2) return;
    this.clearDelay();
    this._playing = true;
    this._wasPlaying = true;
    const interval = Math.max(1000, Number(this.getAttribute('interval')) || 5000);
    this._timer = setInterval(() => {
      if (this.hasAttribute('loop') || this._index < this._pages.length - 1) this.next();
      else this.pause();
    }, interval);
  }

  pause() {
    this._wasPlaying = this._playing;
    this._playing = false;
    this.clearDelay();
  }

  clearDelay() {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /** Re-read the slotted images and rebuild the track from scratch. */
  refresh() {
    const originals = this.slides;
    const sources = originals.map((img) => img.currentSrc || img.getAttribute('src') || '');
    const alts = originals.map((img) => img.getAttribute('alt') || '');

    // Tear down the previous render.
    this._pages.forEach((page) => page.remove());
    this._pages = [];
    this._dots = [];
    this._track.replaceChildren(this._slot);

    // The originals are the markup, not the UI: keep them in the light DOM but
    // out of the way of the accessibility tree, clicks and the tab order.
    originals.forEach((img) => {
      img.setAttribute('inert', '');
      img.setAttribute('aria-hidden', 'true');
      img.tabIndex = -1;
    });

    if (sources.length === 0) {
      this._renderArrows();
      this._buildPager();
      return;
    }

    sources.forEach((src, i) => {
      const slide = document.createElement('li');
      slide.className = 'slide';
      slide.dataset.index = String(i);
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `${i + 1} of ${sources.length}`);

      const img = document.createElement('img');
      img.src = src;
      img.alt = alts[i];
      img.decoding = 'async';
      if (i > 1) img.loading = 'lazy';
      img.setAttribute('aria-hidden', 'false');

      slide.appendChild(img);
      this._track.appendChild(slide);
      this._pages.push(slide);
    });

    this._applyLayout();
    this._buildPager();
    this._renderArrows();

    const startAt = clamp(parseInt(this.getAttribute('slide-show-at'), 10) || 0, 0, sources.length - 1);
    this._index = startAt;
    this._move(true);

    this._observeSize();
    this._syncPosition();
    if (this.hasAttribute('autoplay')) this.play();
  }

  /** Return to the first slide and stop the slideshow. */
  reset() {
    this.pause();
    this.goTo(0, { instant: true });
  }

  /* ----------------------------------------------------------------- internals */

  _emit(type, index, count) {
    this.dispatchEvent(new CustomEvent(type, {
      detail: { index, slide: this.slides[index] || null, count },
      bubbles: true,
      composed: true
    }));
  }

  _applyLayout() {
    const duration = Number(this.getAttribute('duration')) || 700;
    this._track.style.transitionDuration = `${duration}ms`;
    this._track.style.transitionTimingFunction = this.getAttribute('easing') || 'ease';
    this._track.setAttribute('aria-live', this._playing ? 'off' : 'polite');
    this._applyHeight();
    this._applyLabel();
  }

  _applyHeight() {
    const fixed = this.getAttribute('height');
    if (fixed) {
      this._frame.style.height = fixed;
      this._frame.style.transition = 'none';
      return;
    }
    if (this.hasAttribute('smooth-height')) {
      this._frame.style.transition = 'height 0.45s ease';
    } else {
      this._frame.style.height = '';
      this._frame.style.transition = 'none';
    }
  }

  _applyLabel() {
    const label = this.getAttribute('label');
    if (label) this._frame.setAttribute('aria-label', label);
    else this._frame.removeAttribute('aria-label');
  }

  _observeSize() {
    if (this._resizeObserver || typeof ResizeObserver === 'undefined' || !ResizeObserver) return;
    this._resizeObserver = new ResizeObserver(() => {
      this._applyHeight();
      this._move(true);
    });
    this._resizeObserver.observe(this._frame);
  }

  /**
   * Re-aligns the track to the current slide from live measurements. Called on
   * resize and after every rebuild, so a changed container width can never
   * leave the track parked at a stale offset.
   */
  _syncPosition() {
    if (this._pages.length === 0) return;
    this._move(true);
  }

  _axis() {
    return this.getAttribute('direction') === 'vertical' ? 'Y' : 'X';
  }

  _offsetOf(element) {
    if (this._axis() === 'Y') return element.offsetTop || 0;
    const left = element.offsetLeft || 0;
    return this.getAttribute('rtl') === null ? left : -left;
  }

  _move(instant = false) {
    const active = this._pages[this._index];
    if (!active) return;

    const flip = this.hasAttribute('reverse') && this._axis() === 'X' ? -1 : 1;
    const distance = this._offsetOf(active) * flip;

    if (instant) {
      this._track.classList.add('instant');
    } else {
      this._track.classList.remove('instant');
    }

    this._track.style.transform = this._axis() === 'Y'
      ? `translate3d(0, ${-distance}px, 0)`
      : `translate3d(${-distance}px, 0, 0)`;

    this._pages.forEach((page, i) => page.classList.toggle('is-active', i === this._index));
    this._dots.forEach((dot, i) => {
      dot.setAttribute('aria-current', i === this._index ? 'true' : 'false');
    });

    this._applyHeight();
    this._renderArrows();
  }

  _renderArrows() {
    const show = this.hasAttribute('nav') && this._pages.length > 1;
    const loop = this.hasAttribute('loop');
    this._prevBtn.hidden = !show;
    this._nextBtn.hidden = !show;
    this._prevBtn.disabled = !loop && this._index === 0;
    this._nextBtn.disabled = !loop && this._index === this._pages.length - 1;
    this._prevBtn.setAttribute('aria-label', this.getAttribute('prev-label') || 'Previous slide');
    this._nextBtn.setAttribute('aria-label', this.getAttribute('next-label') || 'Next slide');
  }

  _buildPager() {
    const useThumbs = this.hasAttribute('thumbs');
    const show = this.hasAttribute('pager') && this._pages.length > 1;

    this._dots = [];
    this._pager.replaceChildren();
    this._pager.hidden = !show;
    if (!show) {
      delete this._pager.dataset.thumbs;
      return;
    }

    if (useThumbs) this._pager.dataset.thumbs = '';
    else delete this._pager.dataset.thumbs;

    this._pages.forEach((page, i) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.index = String(i);
      button.setAttribute('aria-label', `Go to slide ${i + 1} of ${this._pages.length}`);
      button.setAttribute('aria-current', i === this._index ? 'true' : 'false');

      if (useThumbs) {
        button.className = 'thumb';
        const source = page.querySelector('img');
        const thumb = document.createElement('img');
        thumb.src = source ? source.getAttribute('src') : '';
        thumb.alt = '';
        thumb.setAttribute('aria-hidden', 'true');
        button.appendChild(thumb);
      }

      item.appendChild(button);
      this._pager.appendChild(item);
      this._dots.push(button);
    });
  }

  /* -------------------------------------------------------------------- input */

  _onKeydown(event) {
    if (this.getAttribute('keyboard') === 'off') return;
    const flip = this.getAttribute('rtl') !== null ? -1 : 1;
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        if (flip > 0) this.next(); else this.prev();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (flip > 0) this.prev(); else this.next();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.next();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.prev();
        break;
      case 'Home':
        event.preventDefault();
        this.goTo(0);
        break;
      case 'End':
        event.preventDefault();
        this.goTo(this._pages.length - 1);
        break;
      default:
        break;
    }
  }

  _onPointerDown(event) {
    if (this.getAttribute('swipe') === 'off') return;
    if (event.button !== undefined && event.button !== 0) return;
    if (this._pages.length < 2) return;
    this._pointerId = event.pointerId;
    this._startPoint = this._axis() === 'Y' ? event.clientY : event.clientX;
    this._dragDelta = 0;
    this._track.classList.add('instant');
    this._track.style.transition = 'none';
  }

  _onPointerMove(event) {
    if (this._pointerId === null || event.pointerId !== this._pointerId) return;
    const point = this._axis() === 'Y' ? event.clientY : event.clientX;
    this._dragDelta = point - this._startPoint;
    if (Math.abs(this._dragDelta) < 4) return;

    const active = this._pages[this._index];
    if (!active) return;
    if (event.cancelable) event.preventDefault();

    this._track.style.transform = this._axis() === 'Y'
      ? `translate3d(0, ${-this._offsetOf(active) + this._dragDelta}px, 0)`
      : `translate3d(${-this._offsetOf(active) + this._dragDelta}px, 0, 0)`;
  }

  _onPointerUp(event) {
    if (this._pointerId === null || event.pointerId !== this._pointerId) return;
    this._pointerId = null;
    this._track.style.transition = '';

    const size = this._axis() === 'Y' ? this._frame.offsetHeight : this._frame.offsetWidth;
    const threshold = Math.max(40, (size || 0) * 0.15);

    if (this._dragDelta < -threshold && this._index < this._pages.length - 1) {
      this.next();
    } else if (this._dragDelta > threshold && this._index > 0) {
      this.prev();
    } else {
      this._move(false);
    }
    this._dragDelta = 0;
  }
}

if (!customElements.get('flex-slider')) {
  customElements.define('flex-slider', FlexSlider);
}

export { FlexSlider };
export default FlexSlider;
