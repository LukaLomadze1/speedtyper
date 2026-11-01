# SpeedTyper

A minimalist typing test for measuring words per minute and accuracy. It has no dependencies and no build step: open `index.html` in a browser.

## Features

- Characters turn green or red as you type, and corrected mistakes can be fixed with Backspace (Ctrl+Backspace clears a word).
- WPM and accuracy update live, and the timer starts on your first keystroke.
- Tests run for 15, 30 or 60 seconds.
- Your last 100 scores and your best for each test length are saved in `localStorage`.
- Follows the system light or dark theme and works with touch keyboards.

## Keys

| Key | Action |
| --- | --- |
| `Esc` | Restart at any time |
| `Tab`, then `Enter` | Restart using the Restart button |
| `Enter` | Start the next test from the results screen |
| `Ctrl`+`Backspace` | Delete a word |

## How scores are calculated

- **WPM:** correct characters in the text ÷ 5, per minute. Fixing a mistake gets that character back.
- **Raw WPM:** every keystroke ÷ 5, per minute, right or wrong.
- **Accuracy:** correct keystrokes ÷ all keystrokes. A corrected mistake still counts against you.

Held-down keys don't repeat, and pasted text is ignored.

## Code layout

| File | Purpose |
| --- | --- |
| `src/engine.js` | Test state and scoring, with no DOM access and an injected clock |
| `src/words.js` | Word list and text generator |
| `src/app.js` | Rendering, keyboard handling and storage |
| `test/engine.test.js` | Unit tests for the engine |

Run the tests with `npm test` (Node 18 or later).
