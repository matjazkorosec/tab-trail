# AGENTS.md

Instructions for coding agents working in this repo. Follow them exactly.

## What this is

Tab trail is a bookmarklet that draws every Tab stop on a page and marks in red what fails WCAG 2.2 AA. The source is `src/tab-trail.js`. Everything in `dist/`, `docs/` and the marked blocks of `README.md` is generated.

## Scope

- Make 1 change per pull request, linked to its issue.
- For a new check, a new setting or a panel change, an issue with the owner's yes must exist. If it doesn't, stop and say so.
- Never bump `version` or `updated` in `package.json`.
- Never edit `dist/`, `docs/` or the blocks between `<!-- name:start -->` and `<!-- name:end -->` in `README.md` by hand. Edit `src/` or `data/`, then run the generators.

## Code rules

- Plain JavaScript. Add no runtime dependencies.
- No template literals (backticks) in `src/`. The bookmark is a `javascript:` URL.
- Keep everything the tool draws inside its shadow root.
- Only move focus. Never call `click()` on the host page.
- No network requests, no cookies, no `localStorage` or `sessionStorage`.
- Write no code comments.
- No em dashes or en dashes anywhere. Use a period, comma, colon or "to".

## Proof

- Add a page to `test/pages/` that shows the bug or feature.
- Add a test that fails without your change and passes with it.
- A new red check names its WCAG criterion and level in `data/features.json`.

## Docs

- A new feature gets an entry in `data/features.json`.
- A user-visible change gets 1 short line under "Unreleased" in `CHANGELOG.md`.

## Contract

The Copy for AI text, the `problems()` shape and the `window.__tabTrail` API are a contract. If you change any of them, say so in the pull request description and mark it as breaking.

## Before you open a pull request

Run these and make sure every one passes:

```sh
npm ci
npm run build
npm run docs
npm test
npm run test:e2e
npm run check
```

Commit the changes `npm run build` and `npm run docs` make. Fill in every line of the pull request checklist.
