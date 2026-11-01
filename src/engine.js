const CHARS_PER_WORD = 5;
// Below this, one keystroke would read as an absurd WPM, so live speed stays blank.
const MIN_ELAPSED_FOR_WPM_MS = 1000;

// Holds the state of one test and knows nothing about the DOM. Every method
// takes the current time, so it can be driven by a fake clock in tests.
function createTypingTest({ text, durationMs }) {
  const typed = [];
  let phase = 'ready';
  let startedAt = 0;
  let correctChars = 0;
  let keystrokes = 0;
  let correctKeystrokes = 0;

  function tick(now) {
    if (phase === 'running' && now - startedAt >= durationMs) phase = 'finished';
  }

  function type(char, now) {
    tick(now);
    if (phase === 'finished' || typed.length >= text.length) return;
    if (phase === 'ready') {
      phase = 'running';
      startedAt = now;
    }
    const isCorrect = char === text[typed.length];
    typed.push(char);
    keystrokes += 1;
    if (isCorrect) {
      correctChars += 1;
      correctKeystrokes += 1;
    }
  }

  function removeLast() {
    if (typed.pop() === text[typed.length]) correctChars -= 1;
  }

  function backspace(now) {
    tick(now);
    if (phase === 'running' && typed.length > 0) removeLast();
  }

  // Ctrl+Backspace: clears back to the start of the current word, or of the
  // previous word when the cursor is already at a word boundary.
  function deleteWord(now) {
    tick(now);
    if (phase !== 'running') return;
    let target = typed.length;
    if (target > 0 && text[target - 1] === ' ') target -= 1;
    while (target > 0 && text[target - 1] !== ' ') target -= 1;
    while (typed.length > target) removeLast();
  }

  function stats(now) {
    const elapsedMs = phase === 'ready' ? 0
      : phase === 'finished' ? durationMs
      : Math.min(now - startedAt, durationMs);
    const toWpm = (chars) => (elapsedMs < MIN_ELAPSED_FOR_WPM_MS
      ? null
      : (chars / CHARS_PER_WORD) / (elapsedMs / 60000));

    return {
      remainingMs: durationMs - elapsedMs,
      wpm: toWpm(correctChars),
      rawWpm: toWpm(keystrokes),
      accuracy: keystrokes === 0 ? null : (correctKeystrokes / keystrokes) * 100,
      errors: keystrokes - correctKeystrokes,
      correctChars,
      keystrokes,
    };
  }

  return {
    text,
    durationMs,
    type,
    backspace,
    deleteWord,
    tick,
    stats,
    isCorrect: (index) => typed[index] === text[index],
    get phase() { return phase; },
    get cursor() { return typed.length; },
  };
}

if (typeof module !== 'undefined') module.exports = { createTypingTest };
