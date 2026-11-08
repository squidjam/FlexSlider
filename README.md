# &lt;flex-slider&gt;

A self-contained image slider web component — a dependency-free rewrite of the
classic [FlexSlider 2](https://github.com/squidjam/FlexSlider) image slider as a
single custom element.

Drop plain `<img>` tags inside the element and it becomes a slider. No jQuery, no
stylesheet to load, no icon font, no build step.

```html
<script type="module" src="flex-slider.js"></script>

<flex-slider animation="slide" nav pager autoplay interval="4500" pause-on-hover>
  <img src="slide-1.jpg" alt="First slide">
  <img src="slide-2.jpg" alt="Second slide">
  <img src="slide-3.jpg" alt="Third slide">
</flex-slider>
```

Open [`demo/flex-slider.html`](demo/flex-slider.html) for a live showcase of every
option, or run the test suite by serving the repo and opening
[`test/index.html`](test/index.html).

## How it works

The element takes every `<img>` descendant, reads its `src` and `alt`, and builds
an inert shadow-DOM track beside the slotted images. The originals stay in the
light DOM as the source of truth but are marked `inert` and `aria-hidden`, so they
are never announced twice or reached by the tab key. Each visible slide is a
passive copy — nothing inside the track can steal a click.

All markup and CSS live in the shadow root, so the component cannot leak styles
into the page and page styles cannot reach in. Theming happens through CSS custom
properties and `::part()`, both of which cross the shadow boundary on purpose.

The track is measured with `offsetLeft` / `offsetTop` rather than assumed from
image widths, so arbitrary image sizes and any container width work without
extra configuration. Adding or removing an image rebuilds the slider
automatically; call `refresh()` if you change a `src` in place.

## Attributes

| Attribute | Values | Default | Notes |
| --- | --- | --- | --- |
| `animation` | `slide`, `fade` | `slide` | `fade` stacks slides and cross-fades |
| `duration` | ms | `700` | transition duration |
| `easing` | any CSS timing function | `ease` | |
| `autoplay` | present | off | starts a slideshow |
| `interval` | ms | `5000` | time between slides |
| `pause-on-hover` | present | off | pauses while the pointer is over it |
| `nav` | present | off | previous/next arrows |
| `pager` | present | off | dot or thumbnail pager |
| `thumbs` | present | off | pager renders image thumbnails |
| `slide-show-at` | index, 0-based | `0` | slide to start on |
| `direction` | `horizontal`, `vertical` | `horizontal` | axis the track moves along |
| `reverse` | present | off | animates the other way |
| `rtl` | present | off | mirrors arrows and layout |
| `swipe` | `on`, `off` | on | drag or swipe to change slides |
| `keyboard` | `on`, `off` | on | arrows, Home and End when focused |
| `smooth-height` | present | off | animates the container height |
| `height` | any CSS length | auto | fixed box; images crop with `object-fit: cover` |
| `theme` | `light`, `dark` | `light` | arrow and pager colours |
| `loop` | present | off | wraps past the last slide |
| `label` | string | none | accessible name for the region |
| `prev-label`, `next-label` | string | "Previous/Next slide" | arrow button labels |

Booleans are presence-based: `nav` turns arrows on, leaving it out turns them off.

## Methods, properties and events

```js
const slider = document.querySelector('flex-slider');

slider.next();          // advance one slide
slider.prev();          // go back one slide
slider.goTo(3);         // go to index 3
slider.play();          // start the slideshow
slider.pause();         // stop it
slider.refresh();       // re-read the slotted images
slider.reset();         // back to the first slide, slideshow stopped

slider.currentIndex;    // getter, and settable
slider.slides;          // the original <img> elements

slider.addEventListener('slide-start', (e) => {
  console.log(e.detail.index, e.detail.slide, e.detail.count);
});
slider.addEventListener('slide-end', (e) => { /* transition finished */ });
```

`slide-start` and `slide-end` both bubble and cross the shadow boundary, and both
carry `{ index, slide, count }`. They replace FlexSlider's `start`, `before` and
`after` callbacks.

## Theming

Override the custom properties on the host:

```css
flex-slider {
  --fs-accent: #c2410c;
  --fs-arrow-bg: rgba(255, 255, 255, .9);
  --fs-arrow-fg: #c2410c;
  --fs-dot: rgba(255, 255, 255, .5);
  --fs-dot-active: #fff;
  --fs-radius: 12px;
}
```

For anything deeper, the shadow parts are `frame`, `track`, `pager`, `arrow-prev`
and `arrow-next`:

```css
flex-slider::part(frame) { border-radius: 12px; }
flex-slider::part(arrow-next) { width: 48px; height: 48px; }
```

## Testing

The suite in [`test/`](test/) runs in a real browser, because that is the only
environment where a web component can genuinely be verified — real layout, real
transitions, real events.

```sh
python3 -m http.server 8080
# then open http://localhost:8080/test/index.html
```

It covers construction, layout geometry, navigation, pointer gestures, animation,
the slideshow, events, accessibility, theming and live updates, and prints a
pass/fail summary on the page. There are no dependencies and no test framework:
`index.html` loads the component and the fixtures, `harness.js` provides the
runner and assertions, and `suite.js` holds the cases. The verdict is also
published on `window.__flexSliderTests` for anyone wiring this into CI.

## Browser support

Custom elements v1, Shadow DOM v1, CSS transitions, `ResizeObserver` and Pointer
Events — current Chrome, Edge, Firefox and Safari, plus recent iOS and Android
browsers. If you must support older browsers, keep a legacy slider for those
clients behind a feature check.

## Migration from FlexSlider 2

| FlexSlider 2 | `<flex-slider>` |
| --- | --- |
| `$('.flexslider').flexslider({...})` | write `<flex-slider>` attributes |
| `animation: "slide"` | `animation="slide"` |
| `animationSpeed: 600` | `duration="600"` |
| `slideshow: true` | `autoplay` |
| `slideshowSpeed: 7000` | `interval="7000"` |
| `pauseOnHover: true` | `pause-on-hover` |
| `directionNav: true` | `nav` |
| `controlNav: true` | `pager` |
| `controlNav: "thumbnails"` | `pager thumbs` |
| `startAt: 2` | `slide-show-at="2"` |
| `direction: "vertical"` | `direction="vertical"` |
| `smoothHeight: true` | `smooth-height` |
| `touch: false` | `swipe="off"` |
| `keyboard: true` | `keyboard` (on by default) |
| `rtl: true` | `rtl` |
| `namespace`, `selector` | not needed — structure is fixed |
| `useCSS`, `easing`, `mousewheel`, `video` | dropped — native CSS transitions only |
| `start` / `before` / `after` callbacks | `slide-start` / `slide-end` events |
| `$el.data('flexslider')` | the element itself is the API |
| `initDelay`, `randomize` | dropped |

Carousel mode (`itemWidth`, `itemMargin`, `minItems`, `maxItems`, `move`) and the
Vimeo/Wistia video slides are intentionally out of scope: this rewrite covers the
image slider, which is what FlexSlider was overwhelmingly used for.

## Licence

GPL-2.0-or-later. This component is derived from FlexSlider 2,
© 2012 WooThemes, contributing author Tyler Smith, and is distributed under the
same licence. See [LICENSE.md](LICENSE.md).
