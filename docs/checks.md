# Checks

Generated from data/. Edit the files in data/, then run `npm run docs`.

## What it lists in red

### 01 Missed spots

WCAG `2.1.1 A`

"2 look clickable, but Tab skips them." Red boxes mark them.

A red box marks something that looks clickable, like a box with a pointer cursor, a button role or a click handler in the HTML. The keyboard never gets there.

[See it](https://matjazkorosec.com/tools/tab-trail#show-missed-spots)

### 02 Hover menus

WCAG `2.1.1 A, 2.4.7 AA`

"1 menu or box opens only on mouse hover."

A menu that opens on mouse hover but never when Tab reaches it hides its links from keyboard users. Tab trail reads the page's CSS and marks each one with a red box.

[See it](https://matjazkorosec.com/tools/tab-trail#show-hover-menus)

### 03 Forced order

WCAG `2.4.3 A`

"1 stop has tabindex above 0, which pulls it ahead of the page."

An element with tabindex="5" gets Tab before the rest of the page, wherever it sits. When that changes the order, it is listed in red: set it to 0 and move the element in the HTML instead. If it was first anyway, the Log only notes it.

[See it](https://matjazkorosec.com/tools/tab-trail#show-forced-order)

### 04 Hidden focus

WCAG `2.4.11 AA`

"1 stop is hidden when Tab reaches it." Under a sticky bar.

When Tab lands on something a sticky header, a cookie bar or a chat button covers completely, the panel lists it in red. Click it to scroll it into view. Fix it and Tab there again: it leaves the list. This check is new in WCAG 2.2 AA.

[See it](https://matjazkorosec.com/tools/tab-trail#show-hidden-focus)

### 05 Keyboard trap

WCAG `2.1.2 A`

"1 stop where Tab gets stuck."

When Tab and Shift+Tab both leave focus on the same spot, a keyboard user can't get out. The panel lists that stop in red, once, like "2: Message". A spot that keeps Tab but says how to leave, like a code editor, is not red.

[See it](https://matjazkorosec.com/tools/tab-trail#show-keyboard-trap)

### 06 Lost focus

WCAG `2.4.3 A`

"1 popup loses focus when it closes."

When a popup or cookie bar closes, focus should go back to the button that opened it. If it drops to the top of the page instead, the panel lists it in red, like "2 → Start".

[See it](https://matjazkorosec.com/tools/tab-trail#show-lost-focus)

### 07 Out of order

WCAG `2.4.3 A`

"1 time Tab jumped out of order."

Each time Tab jumps out of order, the panel lists the jump in red. A popup that blocks the page must get Tab first, or it is flagged too.

[See it](https://matjazkorosec.com/tools/tab-trail#show-out-of-order)
