# Features

Generated from data/. Edit the files in data/, then run `npm run docs`.

## Press Tab, or press Play

### 01 Play it

No Tab key? Press Play, it walks every stop.

Play moves focus through every stop for you and checks each one, then 1 line sums up all 7 checks. It only moves focus, it never clicks.

[See it](https://matjazkorosec.com/tools/tab-trail#show-play-it)

### 02 Log

See every check, the good ones too.

Every check as it runs: OK, PROBLEM, SKIPPED with why, or INFO. Filter it, tick Show WCAG to see each rule, click a stop number to jump there, copy it for a bug report, or keep it live in a new tab.

[See it](https://matjazkorosec.com/tools/tab-trail#show-log)

## Hand it to your AI

### 10 Copy for AI

Paste the problems into your AI. It gets the fix.

Copies only the problems, each with its WCAG rule, a CSS selector, the HTML, the component and a fix hint. Paste it into your coding AI and it knows where to look.

[See it](https://matjazkorosec.com/tools/tab-trail#show-copy-for-ai)

## How to read the trail

### 11 Tab order

Numbers show where Tab goes. The orange one is where you are.

Each dot is 1 press of the Tab key, in the order the keyboard visits, and the one you are on turns orange. A line that jumps all over the page will confuse people.

[See it](https://matjazkorosec.com/tools/tab-trail#show-tab-order)

### 12 Hidden links

Skip links show as dashed dots.

Some links stay hidden until Tab reaches them, like "Skip to content". They get a dashed dot in the top left corner.

[See it](https://matjazkorosec.com/tools/tab-trail#show-hidden-links)

### 13 Inside dialogs

A dialog opens? The trail goes in too.

When a page opens a modal dialog (the HTML <dialog> element), the trail goes in too and shows only the stops there. Close it and the page comes back.

[See it](https://matjazkorosec.com/tools/tab-trail#show-inside-dialogs)

### 14 Late arrivals

Scroll, and new buttons get counted.

It checks again as you scroll. Buttons that only appear later, like a back to top arrow, get counted too.

[See it](https://matjazkorosec.com/tools/tab-trail#show-late-arrivals)

### 15 Big pages

Over 50 stops? See 50 at a time.

Over 50 stops, it shows 50 at a time. Next and Previous page through them, and Tab turns the page for you. Untick Show 50 stops at a time to see them all.

[See it](https://matjazkorosec.com/tools/tab-trail#show-big-pages)

## How to work with it

### 16 Out of the way

Drag the panel anywhere, or send it to a corner.

Grab the panel and drag it anywhere, or press the corner button to move it to the next corner. It only moves by itself to stay on screen when it grows, and Compact view under Settings keeps it small.

[See it](https://matjazkorosec.com/tools/tab-trail#show-out-of-the-way)

### 17 The count

Fix it, run it again, compare.

The panel counts the stops and the spots Tab skips. Fix something, run it again and compare the numbers.

[See it](https://matjazkorosec.com/tools/tab-trail#show-the-count)

### 18 Find it

Click a red spot in the list to see it.

The panel lists every spot Tab never reaches, named by its label or text, 50 at a time. Click one and the page scrolls to it and outlines it.

[See it](https://matjazkorosec.com/tools/tab-trail#show-find-it)

### 19 Keyboard

No mouse? Ctrl+Shift+F jumps into the panel.

Press Ctrl+Shift+F, on a Mac and on Windows, and focus jumps to Play in the panel, where Tab reaches every button. Escape takes you back to the stop you were on.

[See it](https://matjazkorosec.com/tools/tab-trail#show-keyboard)

### 20 Jump there

Click a number and focus moves there.

Click any number and focus moves to that spot, as if you had tabbed there. The next Tab goes on from it, and it is not counted as a jump.

[See it](https://matjazkorosec.com/tools/tab-trail#show-jump-there)

## Settings

### 21 Spotlight

Dim the page, light up where Tab is.

Open Settings and tick Spotlight: the page goes dark except what Tab is on, so you follow it the way a keyboard user does. A missing focus ring is easy to spot, even for someone watching.

[See it](https://matjazkorosec.com/tools/tab-trail#show-spotlight)

### 22 Show lines

Just the numbers? Untick Show lines.

Open Settings and untick Show lines, and only the numbered dots stay. Long lines turns grey until you tick Show lines again.

[See it](https://matjazkorosec.com/tools/tab-trail#show-show-lines)

### 23 Long lines

Too many lines? Untick Long lines.

Open Settings, untick Long lines, and no line is over 100 px. A longer one becomes 2 arrows, 1 from each stop. A line off screen becomes 1 arrow pointing its way.

[See it](https://matjazkorosec.com/tools/tab-trail#show-long-lines)

### 24 Out of Tab

The panel stays out of the trail.

Leave this panel out of Tab is ticked at first, so Tab never runs into the panel. Untick it and Tab reaches the panel's buttons too. Ctrl+Shift+F gets you in either way.

[See it](https://matjazkorosec.com/tools/tab-trail#show-out-of-tab)
