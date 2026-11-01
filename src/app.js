const DURATIONS = [15, 30, 60];
const DEFAULT_DURATION = 30;
// More text than anyone can type: 35 characters a second is about 420 WPM.
const MAX_CHARS_PER_SECOND = 35;
const TICK_MS = 100;
const HISTORY_KEY = "speedtyper.history.v1";
const DURATION_KEY = "speedtyper.duration";
const HISTORY_LIMIT = 100;
// The input always holds one character so that Backspace on a touch keyboard
// has something to delete. Without it, no input event fires.
const INPUT_SENTINEL = " ";

const byId = (id) => document.getElementById(id);

const els = {
  durationButtons: [...document.querySelectorAll(".duration")],
  testView: byId("test-view"),
  resultView: byId("result-view"),
  time: byId("stat-time"),
  wpm: byId("stat-wpm"),
  accuracy: byId("stat-accuracy"),
  track: byId("text-track"),
  input: byId("typing-input"),
  capsNotice: byId("caps-notice"),
  restart: byId("restart"),
  nextTest: byId("next-test"),
  resultTitle: byId("result-title"),
  resultWpm: byId("result-wpm"),
  resultBest: byId("result-best"),
  resultAccuracy: byId("result-accuracy"),
  resultRaw: byId("result-raw"),
  resultErrors: byId("result-errors"),
  resultLength: byId("result-length"),
  historyBest: byId("history-best"),
  historyEmpty: byId("history-empty"),
  historyScroll: byId("history-scroll"),
  historyRows: byId("history-rows"),
  clearHistory: byId("clear-history"),
  storageWarning: byId("storage-warning"),
};

let duration = loadDuration();
let history = loadHistory();
let test = null;
let timerId = null;
let charEls = [];
let caretEl = null;
let paintedCursor = 0;
let inputValue = INPUT_SENTINEL;
let isComposing = false;

/* Storage: the page keeps working when localStorage is blocked or corrupted. */

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function loadDuration() {
  const saved = Number(readStorage(DURATION_KEY));
  return DURATIONS.includes(saved) ? saved : DEFAULT_DURATION;
}

function isValidEntry(entry) {
  return (
    entry &&
    DURATIONS.includes(entry.seconds) &&
    [entry.at, entry.wpm, entry.accuracy].every(Number.isFinite)
  );
}

function loadHistory() {
  try {
    const parsed = JSON.parse(readStorage(HISTORY_KEY));
    return Array.isArray(parsed) ? parsed.filter(isValidEntry) : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  const value = history.length > 0 ? JSON.stringify(history) : null;
  els.storageWarning.hidden = writeStorage(HISTORY_KEY, value);
}

function bestWpm(seconds) {
  const scores = history
    .filter((entry) => entry.seconds === seconds)
    .map((entry) => entry.wpm);
  return scores.length > 0 ? Math.max(...scores) : null;
}

/* Rendering */

function setPhase(phase) {
  document.body.dataset.phase = phase;
}

function renderDurationButtons() {
  els.durationButtons.forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(Number(button.dataset.seconds) === duration),
    );
  });
}

function renderText() {
  const fragment = document.createDocumentFragment();
  charEls = [];
  let wordEl = null;
  for (const char of test.text) {
    if (!wordEl) {
      wordEl = document.createElement("span");
      wordEl.className = "word";
      fragment.append(wordEl);
    }
    const charEl = document.createElement("span");
    charEl.className = "char";
    charEl.textContent = char;
    wordEl.append(charEl);
    charEls.push(charEl);
    // A word keeps its trailing space, so lines only break between words.
    if (char === " ") wordEl = null;
  }
  caretEl = document.createElement("span");
  caretEl.className = "caret";
  fragment.append(caretEl);
  els.track.replaceChildren(fragment);
  paintedCursor = 0;
  positionCaret();
}

function paintChars() {
  const { cursor } = test;
  const start = Math.min(cursor, paintedCursor);
  const end = Math.max(cursor, paintedCursor);
  for (let i = start; i < end; i += 1) {
    let state = "";
    if (i < cursor) state = test.isCorrect(i) ? " correct" : " wrong";
    charEls[i].className = `char${state}`;
  }
  paintedCursor = cursor;
  positionCaret();
}

function positionCaret() {
  const charEl = charEls[Math.min(test.cursor, charEls.length - 1)];
  if (!charEl) return;
  caretEl.style.height = `${charEl.offsetHeight}px`;
  caretEl.style.transform = `translate(${charEl.offsetLeft}px, ${charEl.offsetTop}px)`;
  // Scrolling by the line's own position avoids adding up rounding errors.
  const wordEl = charEl.parentElement;
  const scrollY = Math.max(0, wordEl.offsetTop - wordEl.offsetHeight);
  els.track.style.transform = `translateY(${-scrollY}px)`;
}

function renderStats() {
  const stats = test.stats(performance.now());
  els.time.textContent = Math.ceil(stats.remainingMs / 1000);
  els.wpm.textContent = stats.wpm === null ? "–" : Math.round(stats.wpm);
  els.accuracy.textContent =
    stats.accuracy === null ? "–" : `${stats.accuracy.toFixed(1)}%`;
}

function renderHistory() {
  const rows = history.map((entry) => {
    const row = document.createElement("tr");
    const cells = [
      [formatDate(entry.at), ""],
      [`${entry.seconds}s`, "num"],
      [entry.wpm, "num wpm"],
      [`${entry.accuracy.toFixed(1)}%`, "num"],
    ];
    cells.forEach(([text, className]) => {
      const cell = document.createElement("td");
      cell.className = className;
      cell.textContent = text;
      row.append(cell);
    });
    return row;
  });
  els.historyRows.replaceChildren(...rows);

  const hasHistory = history.length > 0;
  els.historyEmpty.hidden = hasHistory;
  els.historyScroll.hidden = !hasHistory;
  els.clearHistory.hidden = !hasHistory;
  els.historyBest.textContent = hasHistory
    ? `Best: ${DURATIONS.map((seconds) => `${seconds}s ${bestWpm(seconds) ?? "–"}`).join(" · ")}`
    : "";
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatDate(timestamp) {
  return dateFormat.format(timestamp);
}

function renderResult(stats, previousBest) {
  const wpm = Math.round(stats.wpm);
  els.resultWpm.textContent = wpm;
  els.resultAccuracy.textContent =
    stats.accuracy === null ? "–" : `${stats.accuracy.toFixed(1)}%`;
  els.resultRaw.textContent = Math.round(stats.rawWpm);
  els.resultErrors.textContent = stats.errors;
  els.resultLength.textContent = `${duration}s`;

  const isNewBest = previousBest !== null && wpm > previousBest;
  els.resultBest.classList.toggle("is-new", isNewBest);
  if (isNewBest)
    els.resultBest.textContent = `New best for ${duration}s, up from ${previousBest} WPM`;
  else if (previousBest === null)
    els.resultBest.textContent = `Your first ${duration}s score`;
  else
    els.resultBest.textContent = `Your best for ${duration}s is ${previousBest} WPM`;
}

/* Test lifecycle */

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function resetInput() {
  inputValue = INPUT_SENTINEL;
  els.input.value = INPUT_SENTINEL;
}

function focusInput() {
  els.input.focus({ preventScroll: true });
}

function startNewTest() {
  stopTimer();
  test = createTypingTest({
    text: generateText(duration * MAX_CHARS_PER_SECOND),
    durationMs: duration * 1000,
  });
  setPhase("ready");
  els.resultView.hidden = true;
  els.testView.hidden = false;
  renderText();
  renderStats();
  resetInput();
  focusInput();
}

function finishTest() {
  stopTimer();
  const stats = test.stats(performance.now());
  const previousBest = bestWpm(duration);
  // A test that never got a correct character isn't a score worth keeping.
  if (stats.correctChars > 0) {
    history.unshift({
      at: Date.now(),
      seconds: duration,
      wpm: Math.round(stats.wpm),
      accuracy: stats.accuracy,
    });
    history = history.slice(0, HISTORY_LIMIT);
    saveHistory();
    renderHistory();
  }
  renderResult(stats, previousBest);
  setPhase("finished");
  els.testView.hidden = true;
  els.resultView.hidden = false;
  // Focusing a heading rather than the button means typing that carries on
  // past the deadline can't hit Space and skip the results.
  els.resultTitle.focus({ preventScroll: true });
}

function afterInput() {
  if (test.phase === "finished") {
    finishTest();
    return;
  }
  if (test.phase === "running" && timerId === null) {
    setPhase("running");
    timerId = setInterval(handleTick, TICK_MS);
  }
  paintChars();
  renderStats();
}

function handleTick() {
  test.tick(performance.now());
  if (test.phase === "finished") finishTest();
  else renderStats();
}

function setDuration(seconds) {
  duration = seconds;
  writeStorage(DURATION_KEY, String(seconds));
  renderDurationButtons();
  startNewTest();
}

/* Keyboard input */

const isPrintable = (key) => [...key].length === 1;
const isControl = (target) =>
  target instanceof Element && target.closest("button, a") !== null;

function handleKeydown(event) {
  els.capsNotice.hidden = !event.getModifierState("CapsLock");

  if (event.key === "Escape") {
    event.preventDefault();
    startNewTest();
    return;
  }

  // Space and Enter belong to a focused button; other keys go back to the test.
  const onControl = isControl(event.target);
  if (onControl && (event.key === " " || event.key === "Enter")) return;

  if (test.phase === "finished") {
    if (event.key === "Enter") {
      event.preventDefault();
      startNewTest();
    }
    return;
  }

  // Windows reports AltGr as Ctrl+Alt, and AltGr is how many layouts type characters.
  const isShortcut =
    (event.ctrlKey || event.metaKey || event.altKey) &&
    !event.getModifierState("AltGraph");

  if (event.key === "Backspace") {
    event.preventDefault();
    const now = performance.now();
    if (isShortcut) test.deleteWord(now);
    else test.backspace(now);
  } else if (isShortcut || !isPrintable(event.key)) {
    return;
  } else {
    // Held keys must be cancelled too, or they'd reach the input and count there.
    event.preventDefault();
    if (event.repeat) return;
    test.type(event.key, performance.now());
  }

  if (onControl) focusInput();
  afterInput();
}

// Touch keyboards and dead keys don't report usable keydown events, so they
// arrive here instead. Comparing values rather than reading event.data also
// copes with Android keyboards, which resend the whole word while composing.
function handleInput(event) {
  const { value } = els.input;
  if (
    event.inputType === "insertFromPaste" ||
    event.inputType === "insertFromDrop" ||
    test.phase === "finished"
  ) {
    resetInput();
    return;
  }

  let shared = 0;
  while (shared < value.length && value[shared] === inputValue[shared])
    shared += 1;
  const now = performance.now();
  for (let i = inputValue.length; i > shared; i -= 1) test.backspace(now);
  for (const char of value.slice(shared)) test.type(char, now);

  inputValue = value;
  if (!isComposing) resetInput();
  afterInput();
}

/* Wiring */

document.addEventListener("keydown", handleKeydown);
els.input.addEventListener("input", handleInput);
els.input.addEventListener("compositionstart", () => {
  isComposing = true;
});
els.input.addEventListener("compositionend", () => {
  isComposing = false;
  resetInput();
});

els.durationButtons.forEach((button) => {
  button.addEventListener("click", () =>
    setDuration(Number(button.dataset.seconds)),
  );
});
els.restart.addEventListener("click", startNewTest);
els.nextTest.addEventListener("click", startNewTest);

els.clearHistory.addEventListener("click", () => {
  if (!window.confirm("Delete all saved scores? This can't be undone.")) return;
  history = [];
  saveHistory();
  renderHistory();
});

// Line breaks change with the window width, and another tab may have saved a score.
new ResizeObserver(() => {
  if (test) positionCaret();
}).observe(els.track);
window.addEventListener("storage", (event) => {
  if (event.key !== HISTORY_KEY) return;
  history = loadHistory();
  renderHistory();
});

renderDurationButtons();
renderHistory();
startNewTest();
