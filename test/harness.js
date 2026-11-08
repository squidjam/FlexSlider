/**
 * A dependency-free browser test harness for <flex-slider> and the suite itself.
 *
 * Everything here runs against the real DOM with real layout, which is the only
 * environment where a web component can be verified: geometry, computed styles,
 * transitions and events all behave as they do in production.
 */

export const results = { passed: 0, failed: 0, cases: [], done: false };
const fixtureTemplates = new Map(
  [...document.querySelectorAll('#fixtures flex-slider')].map((slider) => [slider.id, slider.cloneNode(true)])
);

/* ------------------------------------------------------------------ reporting */

function paint() {
  const root = document.getElementById('results');
  const summary = document.getElementById('summary');
  if (!root || !summary) return;
  root.innerHTML = '';

  let current = null;
  for (const item of results.cases) {
    if (item.group !== current) {
      current = item.group;
      const heading = document.createElement('div');
      heading.className = 'group';
      heading.textContent = current;
      root.appendChild(heading);
    }
    const row = document.createElement('div');
    row.className = 'case ' + (item.ok ? 'pass' : 'fail');
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = (item.ok ? '\u2713 ' : '\u2717 ') + item.name;
    row.appendChild(name);
    if (!item.ok) {
      const why = document.createElement('span');
      why.className = 'why';
      why.textContent = item.message;
      row.appendChild(why);
    }
    root.appendChild(row);
  }

  summary.className = results.failed === 0 ? 'pass' : 'fail';
  summary.textContent = results.failed === 0
    ? `${results.passed} passed, 0 failed`
    : `${results.passed} passed, ${results.failed} failed`;
}

/* ------------------------------------------------------------------ assertions */

class AssertionError extends Error {}

const show = (value) => {
  try { return typeof value === 'string' ? JSON.stringify(value) : String(value); }
  catch { return Object.prototype.toString.call(value); }
};

export const assert = {
  ok(value, message = 'expected a truthy value') {
    if (!value) throw new AssertionError(`${message} (got ${show(value)})`);
  },
  equal(actual, expected, message = 'values differ') {
    if (actual !== expected) throw new AssertionError(`${message} (expected ${show(expected)}, got ${show(actual)})`);
  },
  notEqual(actual, expected, message = 'values should differ') {
    if (actual === expected) throw new AssertionError(`${message} (both ${show(actual)})`);
  },
  deepEqual(actual, expected, message = 'structures differ') {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b) throw new AssertionError(`${message} (expected ${b}, got ${a})`);
  },
  match(actual, re, message = 'value does not match') {
    if (!re.test(String(actual))) throw new AssertionError(`${message} (${show(actual)} vs ${re})`);
  },
  almost(actual, expected, tolerance = 1, message = 'value out of tolerance') {
    if (Math.abs(actual - expected) > tolerance) {
      throw new AssertionError(`${message} (expected ${show(expected)} \u00b1${tolerance}, got ${show(actual)})`);
    }
  }
};

/* ---------------------------------------------------------------- test runner */

let currentGroup = 'General';

export function group(name) { currentGroup = name; }

export async function test(name, fn) {
  const entry = { group: currentGroup, name, ok: true, message: '' };
  try {
    await fn();
    results.passed++;
  } catch (error) {
    results.failed++;
    entry.ok = false;
    entry.message = error instanceof AssertionError
      ? error.message
      : `${error.name}: ${error.message}`;
  }
  results.cases.push(entry);
  paint();
}

/* -------------------------------------------------------------------- helpers */

export const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits for a transition to settle, then a frame so styles are flushed. */
export async function settle(ms = 60) {
  await tick(ms);
  await new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function shadow(slider) { return slider.shadowRoot; }

export function activeSlide(slider) {
  return shadow(slider).querySelector('.slide.is-active');
}

export function transformX(slider) {
  const value = getComputedStyle(shadow(slider).querySelector('.track')).transform;
  if (!value || value === 'none') return 0;
  return new DOMMatrixReadOnly(value).m41;
}

export function transformY(slider) {
  const value = getComputedStyle(shadow(slider).querySelector('.track')).transform;
  if (!value || value === 'none') return 0;
  return new DOMMatrixReadOnly(value).m42;
}

/** Dispatches a pointer gesture the way a browser would. */
export function swipe(element, from, to, { steps = 4 } = {}) {
  const options = { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', isPrimary: true };
  element.dispatchEvent(new PointerEvent('pointerdown', { ...options, clientX: from.x, clientY: from.y, button: 0, buttons: 1 }));
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    element.dispatchEvent(new PointerEvent('pointermove', { ...options, clientX: x, clientY: y, buttons: 1 }));
  }
  element.dispatchEvent(new PointerEvent('pointerup', { ...options, clientX: to.x, clientY: to.y, button: 0, buttons: 0 }));
}

export function press(element, key) {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

export function click(element) {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

/** Freshly rebuilds a fixture so tests never inherit each other's state. */
export function reset(id) {
  const current = document.getElementById(id);
  const template = fixtureTemplates.get(id);
  if (!current || !template) throw new Error(`Unknown slider fixture: ${id}`);
  const clone = template.cloneNode(true);
  current.replaceWith(clone);
  return clone;
}

/* ------------------------------------------------------------- suite loading */

export async function run() {
  await import('./suite.js');
  results.done = true;
}
