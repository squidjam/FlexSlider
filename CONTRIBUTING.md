# Contributing

Thanks for wanting to help. `<flex-slider>` is intentionally small: one file, no
dependencies, no build step. Keep it that way and changes are easy to review.

## Ground rules

- **No dependencies.** No jQuery, no polyfills, no bundler, no npm packages in the
  shipped component. `flex-slider.js` must stay a single ES module that a browser
  can load directly.
- **No build step.** Whatever is committed is what runs. Nothing may need
  compiling, transpiling or minifying before it works.
- **Keep the public surface stable.** Attributes, methods, properties and events
  documented in the README are the contract. Adding to them is welcome; renaming
  or removing them is a breaking change and needs a good reason.
- **Match the existing style.** Two-space indent, single quotes, semicolons,
  arrow functions where they help, private members prefixed with `_`. Comment the
  why, not the what.

## Getting set up

There is nothing to install.

```sh
git clone https://github.com/squidjam/FlexSlider.git
cd FlexSlider
python3 -m http.server 8080
```

Then open `http://localhost:8080/demo/flex-slider.html` to see the component and
`http://localhost:8080/test/index.html` to run the suite. The demo and the tests
both load the module directly, so editing `flex-slider.js` and reloading is the
whole feedback loop.

## Making a change

1. Open an issue first if the change is more than trivial, so we can agree on the
   approach before you spend time on it.
2. Keep the change focused. One concern per pull request.
3. Add or update a test in `test/suite.js` for anything behavioural. If you fix a
   bug, add the case that would have caught it.
4. Update the README's attribute table, API section or migration table when your
   change alters them.
5. Check the demo still demonstrates everything the README claims.

## What the tests cover

The suite runs against real DOM, real layout and real events — that is the only
place a web component can genuinely be verified, so there is no Node-only runner
and no DOM shim to maintain. If your change touches geometry, animation or input,
note in the pull request what you saw in the browser.

Please run the suite before opening a pull request and make sure it reports no
failures. If a case fails and you believe the test is wrong rather than the
component, say so in the pull request rather than deleting the case.

## Reporting a bug

Include the browser and version, a minimal snippet of markup that reproduces it,
what you expected and what happened instead. `demo/flex-slider.html` is a good
place to paste a reduced case — it already loads the component and the theming.

## Scope

Deliberately out of scope, so please don't open pull requests for them without
discussing first:

- **Carousel mode** — multiple visible slides with fluid resizing
  (`itemWidth`, `itemMargin`, `minItems`, `maxItems`, `move`).
- **Video slides** — Vimeo, Wistia or `<video>` content inside the track.
- **Syncing sliders** — the old `sync` and `asNavFor` behaviour between two
  instances.

These were part of FlexSlider 2 and are documented as absent in the README. They
may land later as separate optional elements rather than as flags on this one.

## Licence of contributions

By contributing you agree that your work is distributed under the project's
licence, GPL-2.0-or-later. See [LICENSE.md](LICENSE.md).
