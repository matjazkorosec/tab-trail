# Changelog

## Unreleased

- Panel: the problem count and the problems come first, grouped by WCAG level AA then A. What was checked folds into a bar below them.

## 1.2.0 (2026-11-23)

Every red mark at once with play({ quiet: true }), and steadier No focus style results.

- Fix: No focus style skips stops while the browser window is in the background, instead of marking them red.
- Fix: No focus style ignores looping CSS animations, so repeated Play runs give the same count.
- New: play({ quiet: true }) walks every stop, then puts scroll and focus back, so every red mark is on screen at once. With Tab trail open, run window.__tabTrail.play({ quiet: true }) in the console.

## 1.1.0 (2026-11-23)

5 new checks and 2 new settings: focus you can see, skip links, popups with a way out, names, Tab cost, Region map.

- New check: No focus style (2.4.7 AA), a stop that shows nothing when Tab is on it.
- New check: Ghost stop (2.4.7 AA, 4.1.2 A), a stop that is off screen, invisible or inside aria-hidden.
- New check: Broken skip link (2.4.1 A), a skip link that goes nowhere, or many stops and no skip link.
- New check: No way out (2.1.2 A), a popup that Tab loops through with nothing that closes it.
- New check: Nameless stop (4.1.2 A), a stop with no name for screen readers. Hover a dot to see its name.
- New setting: Tab cost, the Tab presses to reach the main content and the page's goals, with Pick a goal.
- New setting: Region map, the stops per region as 1 bar.
- Copy for AI, problems() and window.__tabTrail gained the new checks, state().untested, cost() and regions().

## 1.0.0 (2026-10-29)

First public release: every Tab stop in order, 7 checks in red with their WCAG rule, Play, Copy for AI and window.__tabTrail for tests.
