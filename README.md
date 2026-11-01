# SpeedTyper

A minimalist typing test for measuring words per minute and accuracy. It has no dependencies and no build step: open `index.html` in a browser.

## Features

- Characters turn green or red as you type, and corrected mistakes can be fixed with Backspace (Ctrl+Backspace clears a word).
- WPM and accuracy update live, and the timer starts on your first keystroke.
- Tests run for 15, 30 or 60 seconds.
- Developer mode swaps English for the keywords, built-ins and operators of a programming language: JavaScript, TypeScript, Python, Java, C, C++, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, SQL or Bash.
- Your last 100 scores and your best for each test length are saved in `localStorage`. English and each programming language keep separate bests.
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
| `src/words.js` | English word list and text generator |
| `src/languages.js` | Word lists for developer mode |
| `src/app.js` | Rendering, keyboard handling and storage |
| `test/engine.test.js` | Unit tests for the engine |
| `test/languages.test.js` | Checks that every language's word list can be typed |

Run the tests with `npm test` (Node 18 or later).
