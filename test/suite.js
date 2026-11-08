/**
 * The <flex-slider> suite. Runs against real DOM, real layout and real events.
 */

import {
  assert, test, group, tick, settle, shadow, activeSlide, results,
  transformX, transformY, swipe, press, click, reset
} from './harness.js';

const IMGS = (id) => document.getElementById(id).querySelectorAll('img');

/* ------------------------------------------------------------------ structure */

group('Construction');

await test('builds one slide per image', async () => {
  const slider = reset('fx-plain');
  assert.equal(IMGS('fx-plain').length, 3, 'the fixture has three images');
  assert.equal(shadow(slider).querySelectorAll('.slide').length, 3, 'slide count');
});

await test('copies src and alt onto the built slides', async () => {
  const slider = reset('fx-plain');
  const built = [...shadow(slider).querySelectorAll('.slide img')];
  const source = [...IMGS('fx-plain')];
  assert.equal(built.length, 3, 'built image count');
  built.forEach((img, i) => {
    assert.equal(img.getAttribute('src'), source[i].getAttribute('src'), `src ${i}`);
    assert.equal(img.getAttribute('alt'), source[i].getAttribute('alt'), `alt ${i}`);
  });
});

await test('hides the original images from the accessibility tree', async () => {
  const slider = reset('fx-plain');
  for (const img of IMGS('fx-plain')) {
    assert.equal(img.getAttribute('aria-hidden'), 'true', 'original is hidden');
    assert.ok(img.hasAttribute('inert'), 'original is inert');
  }
});

await test('keeps the shadow markup out of the light DOM', async () => {
  const slider = reset('fx-plain');
  assert.equal(slider.querySelectorAll('.slide').length, 0, 'no built slides in the light DOM');
  assert.ok(shadow(slider).querySelector('.track'), 'the track lives in the shadow root');
});

await test('starts on the first slide', async () => {
  const slider = reset('fx-plain');
  assert.equal(slider.currentIndex, 0, 'index');
  assert.ok(activeSlide(slider), 'a slide is active');
  assert.equal(activeSlide(slider).dataset.index, '0', 'the first slide is active');
});

await test('honours slide-show-at', async () => {
  const slider = reset('fx-fade');
  assert.equal(slider.currentIndex, 2, 'starts on the third slide');
  assert.equal(activeSlide(slider).dataset.index, '2', 'third slide is active');
});

/* ------------------------------------------------------------------- geometry */

group('Layout');

await test('the active slide is actually in view', async () => {
  const slider = reset('fx-plain');
  await settle();
  assert.equal(getComputedStyle(shadow(slider).querySelector('slot')).display, 'none',
    'source images do not participate in the rendered track');
  const frame = shadow(slider).querySelector('.frame');
  const active = activeSlide(slider);
  const frameBox = frame.getBoundingClientRect();
  const slideBox = active.getBoundingClientRect();
  assert.almost(slideBox.left, frameBox.left, 2, 'the active slide aligns with the frame');
  assert.ok(slideBox.width > 100, `the slide has real width (${slideBox.width})`);
});

await test('the track translates by exactly one slide width', async () => {
  const slider = reset('fx-plain');
  await settle();
  const slides = [...shadow(slider).querySelectorAll('.slide')];
  const width = slides[0].getBoundingClientRect().width;
  assert.ok(width > 100, `slide width is real (${width})`);

  slider.goTo(1);
  await settle(700);
  assert.almost(transformX(slider), -width, 2, 'track moved one slide left');

  slider.goTo(2);
  await settle(700);
  assert.almost(transformX(slider), -width * 2, 2, 'track moved two slides left');
});

await test('every slide has equal width', async () => {
  const slider = reset('fx-plain');
  await settle();
  const widths = [...shadow(slider).querySelectorAll('.slide')].map((s) => s.getBoundingClientRect().width);
  widths.forEach((w, i) => assert.almost(w, widths[0], 1, `slide ${i} width`));
});

await test('RTL layout aligns the active slide and moves in reverse', async () => {
  const slider = reset('fx-plain');
  slider.setAttribute('rtl', '');
  await settle();
  slider.goTo(1);
  await settle(700);
  const frame = shadow(slider).querySelector('.frame').getBoundingClientRect();
  const active = activeSlide(slider).getBoundingClientRect();
  assert.almost(active.left, frame.left, 2, 'active slide aligns with the frame');
  assert.ok(transformX(slider) > 0, 'RTL advances toward the right');
});

await test('reverse layout aligns the active slide and moves in reverse', async () => {
  const slider = reset('fx-plain');
  slider.setAttribute('reverse', '');
  await settle();
  slider.goTo(1);
  await settle(700);
  const frame = shadow(slider).querySelector('.frame').getBoundingClientRect();
  const active = activeSlide(slider).getBoundingClientRect();
  assert.almost(active.left, frame.left, 2, 'active slide aligns with the frame');
  assert.ok(transformX(slider) > 0, 'reverse advances toward the right');
});

await test('a fixed height crops rather than squashing', async () => {
  const slider = reset('fx-thumbs');
  await settle();
  const frame = shadow(slider).querySelector('.frame');
  assert.almost(frame.getBoundingClientRect().height, 320, 2, 'frame height comes from the attribute');
  const img = shadow(slider).querySelector('.slide img');
  assert.match(getComputedStyle(img).objectFit, /cover/, 'images are object-fit: cover');
});

await test('vertical mode stacks slides down the frame', async () => {
  const slider = reset('fx-vertical');
  await settle();
  const slides = [...shadow(slider).querySelectorAll('.slide')];
  assert.ok(slides[1].getBoundingClientRect().top > slides[0].getBoundingClientRect().top,
    'the second slide sits below the first');

  slider.goTo(1);
  await settle(700);
  const height = slides[0].getBoundingClientRect().height;
  assert.almost(transformY(slider), -height, 2, 'track moved up one slide height');
});

/* ----------------------------------------------------------------- navigation */

group('Navigation');

await test('next() and prev() move one slide', async () => {
  const slider = reset('fx-plain');
  slider.next();
  assert.equal(slider.currentIndex, 1, 'after next');
  slider.next();
  assert.equal(slider.currentIndex, 2, 'after next again');
  slider.prev();
  assert.equal(slider.currentIndex, 1, 'after prev');
});

await test('navigation stops at the ends', async () => {
  const slider = reset('fx-plain');
  slider.setAttribute('loop', 'off');
  slider.prev();
  assert.equal(slider.currentIndex, 0, 'prev at the start is a no-op');
  for (let i = 0; i < 6; i++) slider.next();
  assert.equal(slider.currentIndex, 2, 'next at the end is a no-op');
});

await test('loop wraps by default in both directions', async () => {
  const slider = reset('fx-plain');
  assert.equal(slider.hasAttribute('loop'), false, 'the fixture has no loop attribute');
  slider.prev();
  assert.equal(slider.currentIndex, 2, 'prev wraps to the last slide');
  slider.next();
  assert.equal(slider.currentIndex, 0, 'next wraps to the first slide');
});

await test('loop="off" disables wrapping', async () => {
  const slider = reset('fx-loop');
  slider.setAttribute('loop', 'off');
  slider.prev();
  assert.equal(slider.currentIndex, 0, 'prev stops at the first slide');
  slider.goTo(1);
  slider.next();
  assert.equal(slider.currentIndex, 1, 'next stops at the last slide');
});

await test('goTo clamps out-of-range indexes', async () => {
  const slider = reset('fx-plain');
  slider.setAttribute('loop', 'off');
  slider.goTo(2);
  assert.equal(slider.currentIndex, 2, 'valid index');
  slider.goTo(-4);
  assert.equal(slider.currentIndex, 0, 'clamped low');
  slider.goTo(99);
  assert.equal(slider.currentIndex, 2, 'clamped high');
});

await test('currentIndex is settable', async () => {
  const slider = reset('fx-plain');
  slider.currentIndex = 2;
  assert.equal(slider.currentIndex, 2, 'setter works');
});

await test('arrows step through slides when clicked', async () => {
  const slider = reset('fx-plain');
  slider.setAttribute('nav', '');
  await settle();
  const next = shadow(slider).querySelector('.arrow.next');
  const prev = shadow(slider).querySelector('.arrow.prev');
  assert.equal(next.hidden, false, 'arrows are shown with nav');
  click(next);
  assert.equal(slider.currentIndex, 1, 'next arrow');
  click(prev);
  assert.equal(slider.currentIndex, 0, 'prev arrow');
  slider.goTo(2);
  click(next);
  assert.equal(slider.currentIndex, 0, 'next arrow wraps by default');
});

await test('arrows disable at the ends without loop', async () => {
  const slider = reset('fx-options');
  slider.setAttribute('loop', 'off');
  await settle();
  const prev = shadow(slider).querySelector('.arrow.prev');
  const next = shadow(slider).querySelector('.arrow.next');
  assert.equal(prev.disabled, true, 'prev disabled on the first slide');
  assert.equal(next.disabled, false, 'next enabled');
  slider.goTo(2);
  assert.equal(next.disabled, true, 'next disabled on the last slide');
});

await test('keyboard arrows navigate when focused', async () => {
  const slider = reset('fx-plain');
  const frame = shadow(slider).querySelector('.frame');
  press(frame, 'ArrowRight');
  assert.equal(slider.currentIndex, 1, 'ArrowRight');
  press(frame, 'End');
  assert.equal(slider.currentIndex, 2, 'End');
  press(frame, 'ArrowLeft');
  assert.equal(slider.currentIndex, 1, 'ArrowLeft');
  press(frame, 'Home');
  assert.equal(slider.currentIndex, 0, 'Home');
});

await test('keyboard can be switched off', async () => {
  const slider = reset('fx-noswipe');
  slider.setAttribute('keyboard', 'off');
  const frame = shadow(slider).querySelector('.frame');
  press(frame, 'ArrowRight');
  assert.equal(slider.currentIndex, 0, 'keyboard is ignored');
  slider.removeAttribute('keyboard');
});

await test('the pager jumps to the clicked slide', async () => {
  const slider = reset('fx-options');
  await settle();
  const dots = [...shadow(slider).querySelectorAll('.pager button')];
  assert.equal(dots.length, 3, 'one button per slide');
  click(dots[2]);
  assert.equal(slider.currentIndex, 2, 'clicked the third button');
  assert.equal(dots[2].getAttribute('aria-current'), 'true', 'and it is marked current');
});

/* -------------------------------------------------------------------- gesture */

group('Pointer input');

await test('a long swipe advances one slide', async () => {
  const slider = reset('fx-plain');
  await settle();
  const frame = shadow(slider).querySelector('.frame');
  const box = frame.getBoundingClientRect();
  const y = box.top + box.height / 2;
  swipe(frame, { x: box.left + box.width * 0.8, y }, { x: box.left + box.width * 0.1, y });
  assert.equal(slider.currentIndex, 1, 'swiped forward');
});

await test('a short drag snaps back', async () => {
  const slider = reset('fx-plain');
  await settle();
  const frame = shadow(slider).querySelector('.frame');
  const box = frame.getBoundingClientRect();
  const y = box.top + box.height / 2;
  swipe(frame, { x: box.left + box.width * 0.5, y }, { x: box.left + box.width * 0.45, y }, { steps: 2 });
  assert.equal(slider.currentIndex, 0, 'index is unchanged');
  await settle(700);
  assert.almost(transformX(slider), 0, 2, 'and the track is back in place');
});

await test('swipe can be switched off', async () => {
  const slider = reset('fx-noswipe');
  await settle();
  const frame = shadow(slider).querySelector('.frame');
  const box = frame.getBoundingClientRect();
  const y = box.top + box.height / 2;
  swipe(frame, { x: box.left + box.width * 0.8, y }, { x: box.left + box.width * 0.1, y });
  assert.equal(slider.currentIndex, 0, 'swipe is ignored');
});

/* ------------------------------------------------------------------ animation */

group('Animation');

await test('fade stacks slides and shows one at a time', async () => {
  const slider = reset('fx-fade');
  await settle();
  const slides = [...shadow(slider).querySelectorAll('.slide')];
  const visible = slides.filter((s) => Number(getComputedStyle(s).opacity) > 0.9);
  assert.equal(visible.length, 1, 'exactly one slide is fully opaque');
  assert.equal(visible[0].dataset.index, '2', 'and it is the starting slide');
  assert.match(getComputedStyle(slides[0]).transitionProperty, /opacity/, 'fade transitions opacity');
});

await test('fade does not translate the track', async () => {
  const slider = reset('fx-fade');
  await settle();
  slider.goTo(0);
  await settle(800);
  assert.almost(transformX(slider), 0, 1, 'the track stays put in fade mode');
});

await test('slide mode transitions the transform', async () => {
  const slider = reset('fx-plain');
  await settle();
  const track = shadow(slider).querySelector('.track');
  assert.match(getComputedStyle(track).transitionProperty, /transform/, 'transitions transform');
  assert.match(getComputedStyle(track).transitionDuration, /^0\.7s|700ms/, 'default duration is 700ms');
});

await test('the duration attribute is applied', async () => {
  const slider = reset('fx-plain');
  slider.setAttribute('duration', '250');
  await tick(30);
  const track = shadow(slider).querySelector('.track');
  assert.match(getComputedStyle(track).transitionDuration, /0\.25s|250ms/, 'duration follows the attribute');
});

/* ------------------------------------------------------------------- autoplay */

group('Slideshow');

await test('autoplay advances on the interval', async () => {
  const slider = reset('fx-options');
  assert.equal(slider.currentIndex, 0, 'starts at the beginning');
  await tick(1200);
  assert.ok(slider.currentIndex >= 1, `advanced on its own (index ${slider.currentIndex})`);
  slider.pause();
});

await test('pause stops the slideshow', async () => {
  const slider = reset('fx-options');
  await tick(50);
  slider.pause();
  const at = slider.currentIndex;
  await tick(1300);
  assert.equal(slider.currentIndex, at, 'no movement after pause');
});

await test('hover pauses and leaving resumes', async () => {
  if (!window.matchMedia('(hover: hover)').matches) return;
  const slider = reset('fx-options');
  await tick(50);
  const frame = shadow(slider).querySelector('.frame');
  frame.dispatchEvent(new MouseEvent('mouseenter'));
  const at = slider.currentIndex;
  await tick(1300);
  assert.equal(slider.currentIndex, at, 'paused while hovered');
  frame.dispatchEvent(new MouseEvent('mouseleave'));
  await tick(1300);
  assert.ok(slider.currentIndex !== at, 'resumed after the pointer left');
  slider.pause();
});

await test('a single slide never starts a slideshow', async () => {
  const slider = reset('fx-single');
  await tick(50);
  const at = slider.currentIndex;
  await tick(600);
  assert.equal(slider.currentIndex, at, 'nothing to advance to');
});

/* --------------------------------------------------------------------- events */

group('Events');

await test('slide-start and slide-end carry index, slide and count', async () => {
  const slider = reset('fx-plain');
  const seen = [];
  slider.addEventListener('slide-start', (e) => seen.push(['start', e.detail.index, e.detail.count, e.detail.slide?.tagName]));
  slider.addEventListener('slide-end', (e) => seen.push(['end', e.detail.index, e.detail.count, e.detail.slide?.tagName]));
  slider.next();
  assert.deepEqual(seen, [['start', 1, 3, 'IMG'], ['end', 1, 3, 'IMG']], 'both events fired with detail');
});

await test('events bubble and cross the shadow boundary', async () => {
  const slider = reset('fx-plain');
  let heard = null;
  document.body.addEventListener('slide-start', (e) => { heard = e.composedPath()[0]; }, { once: true });
  slider.next();
  assert.equal(heard, slider, 'the event reached the page from the host');
});

await test('no event fires when the slide does not change', async () => {
  const slider = reset('fx-plain');
  let fired = 0;
  const onStart = () => fired++;
  slider.addEventListener('slide-start', onStart);
  slider.goTo(0);
  slider.goTo(0);
  assert.equal(fired, 0, 'nothing fired for a no-op');
  slider.removeEventListener('slide-start', onStart);
});

/* --------------------------------------------------------------- accessibility */

group('Accessibility');

await test('exposes a labelled region with a roledescription', async () => {
  const slider = reset('fx-options');
  const frame = shadow(slider).querySelector('.frame');
  assert.equal(frame.getAttribute('role'), 'region', 'role');
  assert.equal(frame.getAttribute('aria-roledescription'), 'carousel', 'roledescription');
  assert.equal(frame.getAttribute('aria-label'), 'Options slider', 'label from the attribute');
});

await test('each slide is a named group', async () => {
  const slider = reset('fx-plain');
  const slides = [...shadow(slider).querySelectorAll('.slide')];
  slides.forEach((slide, i) => {
    assert.equal(slide.getAttribute('role'), 'group', `slide ${i} role`);
    assert.equal(slide.getAttribute('aria-roledescription'), 'slide', `slide ${i} roledescription`);
    assert.equal(slide.getAttribute('aria-label'), `${i + 1} of 3`, `slide ${i} position`);
  });
});

await test('pager buttons are individually named', async () => {
  const slider = reset('fx-options');
  await settle();
  const dots = [...shadow(slider).querySelectorAll('.pager button')];
  assert.equal(dots[1].getAttribute('aria-label'), 'Go to slide 2 of 3', 'button label');
});

await test('arrows have accessible names', async () => {
  const slider = reset('fx-options');
  await settle();
  assert.equal(shadow(slider).querySelector('.arrow.prev').getAttribute('aria-label'), 'Previous slide', 'prev');
  assert.equal(shadow(slider).querySelector('.arrow.next').getAttribute('aria-label'), 'Next slide', 'next');
});

await test('the frame is focusable so keyboard users can reach it', async () => {
  const slider = reset('fx-plain');
  const frame = shadow(slider).querySelector('.frame');
  assert.ok(frame.tabIndex >= 0, `frame tabIndex is ${frame.tabIndex}`);
});

await test('thumbnails carry no duplicate alt text', async () => {
  const slider = reset('fx-thumbs');
  await settle();
  const thumbs = [...shadow(slider).querySelectorAll('.pager img')];
  assert.equal(thumbs.length, 3, 'three thumbnails');
  thumbs.forEach((img, i) => assert.equal(img.getAttribute('aria-hidden'), 'true', `thumb ${i} is decorative`));
});

/* ------------------------------------------------------------------- theming */

group('Theming');

await test('custom properties reach the shadow styles', async () => {
  const slider = reset('fx-plain');
  await settle();
  slider.style.setProperty('--fs-radius', '18px');
  await tick(30);
  const frame = shadow(slider).querySelector('.frame');
  assert.match(getComputedStyle(frame).borderRadius, /18px/, 'radius follows the custom property');
});

await test('the dark theme repaints the arrows', async () => {
  const slider = reset('fx-thumbs');
  await settle();
  const arrow = shadow(slider).querySelector('.arrow.next');
  const dark = getComputedStyle(arrow).backgroundColor;
  slider.removeAttribute('theme');
  await tick(50);
  const light = getComputedStyle(shadow(slider).querySelector('.arrow.next')).backgroundColor;
  assert.notEqual(dark, light, 'the two themes differ');
});

await test('shadow parts are exposed for deeper styling', async () => {
  const slider = reset('fx-plain');
  const parts = [];
  for (const el of shadow(slider).querySelectorAll('[part]')) parts.push(el.getAttribute('part'));
  for (const expected of ['frame', 'track', 'pager', 'arrow-prev', 'arrow-next']) {
    assert.ok(parts.includes(expected), `part "${expected}" is exposed`);
  }
});

/* --------------------------------------------------------------------- edits */

group('Live updates');

await test('adding an image rebuilds the track', async () => {
  const slider = reset('fx-plain');
  slider.currentIndex = 2;
  const extra = document.createElement('img');
  extra.setAttribute('src', IMGS('fx-plain')[0].getAttribute('src'));
  extra.setAttribute('alt', 'Slide D');
  slider.appendChild(extra);
  await tick(60);
  assert.equal(shadow(slider).querySelectorAll('.slide').length, 4, 'the new slide is built');
  assert.equal(slider.currentIndex, 2, 'refresh preserves the current slide');
});

await test('refresh does not retrigger slotchange', async () => {
  const slider = reset('fx-plain');
  await settle();
  const slideCount = slider.slides.length;
  const slot = shadow(slider).querySelector('slot');
  let slotChanges = 0;
  slot.addEventListener('slotchange', () => slotChanges++);

  slider.refresh();
  await tick(50);

  assert.equal(slotChanges, 0, 'refresh keeps source images assigned to the existing slot');
  assert.equal(shadow(slider).querySelectorAll('.slide').length, slideCount, 'slides are still rebuilt');
});

await test('documented attributes update after connection', async () => {
  const slider = reset('fx-plain');
  const pager = shadow(slider).querySelector('.pager');
  slider.setAttribute('pager', '');
  assert.equal(pager.hidden, false, 'adding pager shows it');
  slider.removeAttribute('pager');
  assert.equal(pager.hidden, true, 'removing pager hides it');

  slider.setAttribute('prev-label', 'Back');
  assert.equal(shadow(slider).querySelector('.arrow.prev').getAttribute('aria-label'), 'Back',
    'changing the previous label updates its button');
  slider.setAttribute('slide-show-at', '2');
  assert.equal(slider.currentIndex, 2, 'changing the start index moves to that slide');
});

await test('refresh uses an image source changed in place', async () => {
  const slider = reset('fx-plain');
  const source = IMGS('fx-plain')[0];
  const updatedSrc = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  source.setAttribute('src', updatedSrc);
  slider.refresh();
  assert.equal(shadow(slider).querySelector('.slide img').getAttribute('src'), updatedSrc,
    'the rebuilt slide uses the current src attribute');
});

await test('removing every image tears the slider down cleanly', async () => {
  const slider = reset('fx-options');
  await settle();
  slider.innerHTML = '';
  await tick(60);
  assert.equal(shadow(slider).querySelectorAll('.slide').length, 0, 'no slides remain');
  assert.equal(shadow(slider).querySelector('.pager').hidden, true, 'the pager hides');
  assert.equal(shadow(slider).querySelector('.arrow.next').hidden, true, 'the arrows hide');
});

await test('a single image hides the pager but keeps the slider usable', async () => {
  const slider = reset('fx-single');
  await settle();
  assert.equal(shadow(slider).querySelector('.pager').hidden, true, 'pager hidden');
  assert.ok(activeSlide(slider), 'the one slide is still shown');
});

/* ------------------------------------------------------------------- verdict */

const total = results.passed + results.failed;
const summary = document.getElementById('summary');
summary.className = results.failed === 0 ? 'pass' : 'fail';
summary.textContent = results.failed === 0
  ? `${results.passed} passed, 0 failed`
  : `${results.passed} passed, ${results.failed} failed`;

// Expose a machine-readable verdict for anyone running this in CI.
window.__flexSliderTests = { passed: results.passed, failed: results.failed, total, cases: results.cases };
console[results.failed === 0 ? 'log' : 'error'](
  results.failed === 0
    ? `flex-slider: ${results.passed}/${total} tests passed`
    : `flex-slider: ${results.failed} of ${total} tests FAILED`
);
