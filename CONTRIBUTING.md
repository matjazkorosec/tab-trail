# Contributing

Thanks for helping. Tab trail is 1 file of plain JavaScript, so most changes are small. These rules keep it that way.

## Before you start

1. Bug fix or doc fix? Go straight to a pull request.
2. Big change, like a new check, a new setting or a change to the panel? Open an issue first and wait for my yes before you write the code.
3. Keep it to 1 change per pull request, linked to its issue, with steps to see it.

## Dev loop

You need Node 22 (see `.nvmrc`).

```sh
npm ci
npx playwright install
npm run build
npm test
npm run test:e2e
npm run check
```

- `npm run build` makes `dist/` from `src/tab-trail.js`, `data/` and `CHANGELOG.md`. Commit `dist/` with your change.
- `npm run docs` makes `docs/` and the marked blocks in `README.md` from `data/`. Never edit those by hand.
- `npm test` runs the unit tests. `npm run test:e2e` runs the browser tests in Chromium, Firefox and WebKit, on the pages in `test/pages/`.
- `npm run check` runs the same repo checks as CI.

To try a page by hand, run `node test/serve.mjs` and open `http://127.0.0.1:4310/broken.html`, then paste `dist/tab-trail.js` in the console.

## Code rules

These are already true of the code. Keep them true:

- Plain JavaScript, no runtime dependencies.
- No template literals in `src/`. The bookmark is a `javascript:` URL.
- Everything it draws stays inside its shadow root.
- It only moves focus. It never calls `click()` on the page.
- No network requests, no cookies, no storage.
- No code comments.

## Proof

1. Add a page to `test/pages/` that shows the bug or the feature.
2. Add a test that fails before your change and passes after it.
3. A new red check names its WCAG criterion and level.

## Docs in the same pull request

1. A new feature adds its entry to `data/features.json`.
2. A change people can see adds a line under "Unreleased" in `CHANGELOG.md`. Plain and short, no em or en dashes.
3. Run `npm run docs` and commit what it changes.

Never bump the version. I do that when I release.

## The contract

The Copy for AI text, the shape of `problems()` and the `window.__tabTrail` API are a contract: tests and AI agents read them. If your change touches any of them, say so in the pull request and mark it as breaking.

## Adding a check

1. Open an issue first and wait for my yes.
2. Add a page in `test/pages/` that triggers only the new check.
3. Add a spec in `test/e2e/checks.spec.ts` that opens that page and expects exactly that check in `problems()`.
4. Add the check to `data/features.json` with `"group": "red"` and its `"wcag"` number.
5. Add a line under "Unreleased" in `CHANGELOG.md`.
6. Run `npm run build && npm run docs && npm test && npm run test:e2e && npm run check`.

The "See it" scene on [the live page](https://matjazkorosec.com/tools/tab-trail) is my job after the merge. You don't need to make one.

## What CI checks

- The tests pass in Chromium, Firefox and WebKit.
- `dist/` and `docs/` match a fresh build, and `README.md` blocks match a fresh `npm run docs`.
- The bookmark stays under `sizeBudget` in `package.json` (240,000 characters today).
- "Unreleased" in `CHANGELOG.md` changed when `src/` changed. I can skip this with the `no-changelog` label.
- Every feature in `data/features.json` has a section in `docs/`.
- No em dashes or en dashes in `src/`, `data/`, `docs/`, the root Markdown files or `.github/`.
- No template literals in `src/`.

## Behavior

Be kind. This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). Security problems go to [SECURITY.md](SECURITY.md), not to an issue.
