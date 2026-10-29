# Security

## Supported versions

Only the latest release gets fixes. Old bookmarks keep the version they were made from, so the fix is to drag the button again or update the package.

## Report a problem

Please don't open a public issue.

1. Report it through [GitHub private vulnerability reporting](https://github.com/matjazkorosec/tab-trail/security/advisories/new).
2. If that doesn't work for you, email [hello@matjazkorosec.com](mailto:hello@matjazkorosec.com).

Say what you found, how to see it, and which version (the panel shows it, so does `window.__tabTrail.version`). I'll answer and tell you when a fix is out.

## Scope

Tab trail runs on pages that are not mine: any site you open it on. So these count:

- Anything that lets a page, or a script on it, use Tab trail to run code, read data or change the page in a way the user didn't ask for.
- Anything that makes Tab trail send or load something. It should make no network requests and use no cookies or storage.
- Copy for AI, Copy log, `report()`, `problems()` and `log()` leaking private data. The masking in `scrub()` should hide secret keys, tokens, long numbers, emails and the value after words like password or token. A shape it misses is a security bug.
- The `javascript:` bookmark or `dist/tab-trail.js` being different from what `npm run build` makes from `src/`.

Accessibility mistakes, like a missed problem or a false red, are normal bugs. Please report those as an issue.
