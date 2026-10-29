## What and why

Closes #

## How to see it

1.

## Checklist

- [ ] Linked to its issue (a new check, setting or panel change has the owner's yes there)
- [ ] 1 change only
- [ ] A page in `test/pages/` and a test that fails without this change
- [ ] A new feature has its `data/features.json` entry, and a new red check its WCAG number
- [ ] A line under "Unreleased" in `CHANGELOG.md` if people can see the change
- [ ] No version bump
- [ ] Ran `npm run build && npm run docs && npm test && npm run test:e2e && npm run check`
- [ ] Changes the Copy for AI text, the `problems()` shape or the `window.__tabTrail` API: **breaking** (leave unticked if not)
