# Changelog

## Unreleased

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
