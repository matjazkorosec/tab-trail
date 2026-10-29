# window.__tabTrail

Generated from data/. Edit the files in data/, then run `npm run docs`.

### `await window.__tabTrail.play({ ignore, delay })`

Walks every stop, or until it is paused, then gives back the report. Call it again to go on. ignore is a list of CSS selectors to leave out, like a part broken on purpose. delay is the wait at each stop, 400 ms if you leave it out. An ignore entry that isn't valid CSS makes it fail with an error.

### `window.__tabTrail.problems()`

Every open problem as data, never cut short: id (the same on every run), check, wcag, selector, html, component, fix, verify.

### `window.__tabTrail.report()`

The Copy for AI text.

### `window.__tabTrail.log()`

Every Log line as data: time, result, check, wcag, text, fixed, selector, stop.

### `window.__tabTrail.state()`

{ walked, total, done, untested }. done is true once Play reached the end. untested names the checks that never ran, like Lost focus when no popup was opened, so a green test can tell a clean page from a check that was skipped.

### `window.__tabTrail.version`

"1.0.0"

### `window.__tabTrail.close()`

Closes it.
