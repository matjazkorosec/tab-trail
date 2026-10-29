# Keys

Generated from data/. Edit the files in data/, then run `npm run docs`.

## Keys

- Tab, Shift+Tab: Move along the trail.
- Click a number: Focus jumps there. Click empty space and no stop is lit, so the next Tab is not judged.
- Space, Tab, Escape: Pause Play. A click on the page pauses it too.
- Ctrl+Shift+F: Jumps into the panel, on a Mac and on Windows. Escape takes you back to the stop you were on.
- Escape: Closes it once you click empty space on the page, so the page's own menus keep Escape. The close button or the bookmark again close it too.

## How to read it

- A green 0 means that check found nothing. A red number means it found something, and the chips under it take you there.
- In the Log, OK passed, PROBLEM needs a fix, SKIPPED was not judged and says why, and INFO is a note.
- Out of order is judged only for the Tab presses you make. Press Tab to the end, then Shift+Tab back.
- Hidden focus is judged once the page stops scrolling. Press Play to test every stop.
- Lost focus is judged only for the popups you open and close.
- Everything is tested at your window size. Try a narrow window too.

## When it stays quiet on purpose

- Tab reaches 1 item of a tab list, menu, list box, radio group, grid, tree or toolbar: the arrow keys do the rest, so the other items are not red.
- A stop only partly under a sticky bar passes AA 2.4.11. The Log adds that AAA 2.4.12 wants it fully visible.
- Jumps into or inside a popup are fine, and small bars that leave the page usable are never flagged.
- A popup closed by a click outside it is not judged for Lost focus.
- On a Mac, a Tab press that skips only links (Firefox) or only links and buttons (Safari) is SKIPPED, not a jump, until you turn on Tab for them.
- Tab moving inside a date field, a video or a frame is SKIPPED: those have parts of their own.
- After a skip link moves focus to the main content, the next Tab is judged from there, not from the top.
