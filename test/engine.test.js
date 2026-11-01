const test = require('node:test');
const assert = require('node:assert/strict');
const { createTypingTest } = require('../src/engine.js');
const { WORDS, generateText } = require('../src/words.js');

const TEXT = 'the quick brown fox';

function startTest(durationMs = 30000) {
  return createTypingTest({ text: TEXT, durationMs });
}

function typeAll(typing, chars, now = 0) {
  for (const char of chars) typing.type(char, now);
}

test('stays ready and keeps the full time until the first keystroke', () => {
  const typing = startTest();
  typing.tick(999999);
  assert.equal(typing.phase, 'ready');
  assert.equal(typing.stats(999999).remainingMs, 30000);

  typing.type('t', 1000);
  assert.equal(typing.phase, 'running');
  assert.equal(typing.stats(11000).remainingMs, 20000);
});

test('backspace before the first keystroke does not start the timer', () => {
  const typing = startTest();
  typing.backspace(0);
  typing.deleteWord(0);
  assert.equal(typing.phase, 'ready');
  assert.equal(typing.cursor, 0);
});

test('marks each position correct or wrong', () => {
  const typing = startTest();
  typeAll(typing, 'tha');
  assert.equal(typing.isCorrect(0), true);
  assert.equal(typing.isCorrect(1), true);
  assert.equal(typing.isCorrect(2), false);
  assert.equal(typing.cursor, 3);
});

test('WPM is correct characters over five, per minute', () => {
  const typing = createTypingTest({ text: 'a'.repeat(100), durationMs: 60000 });
  typeAll(typing, 'a'.repeat(50));
  typing.type('x', 0);
  const { wpm, rawWpm } = typing.stats(30000);
  assert.equal(wpm, 20);
  assert.equal(rawWpm, 20.4);
});

test('live WPM is blank for the first second', () => {
  const typing = startTest();
  typing.type('t', 0);
  assert.equal(typing.stats(999).wpm, null);
  assert.notEqual(typing.stats(1000).wpm, null);
});

test('a corrected mistake restores WPM but still costs accuracy', () => {
  const typing = startTest();
  typeAll(typing, 'tha');
  typing.backspace(0);
  typing.type('e', 0);

  const stats = typing.stats(60000 / 2);
  assert.equal(stats.correctChars, 3);
  assert.equal(stats.keystrokes, 4);
  assert.equal(stats.errors, 1);
  assert.equal(stats.accuracy, 75);
});

test('backspacing a correct character removes it from the correct count', () => {
  const typing = startTest();
  typeAll(typing, 'th');
  typing.backspace(0);
  assert.equal(typing.stats(5000).correctChars, 1);
  assert.equal(typing.stats(5000).keystrokes, 2);
});

test('accuracy is null until something is typed', () => {
  assert.equal(startTest().stats(0).accuracy, null);
});

test('finishes on tick at the deadline and measures over the full duration', () => {
  const typing = createTypingTest({ text: 'a'.repeat(100), durationMs: 30000 });
  typeAll(typing, 'a'.repeat(50));
  typing.tick(29999);
  assert.equal(typing.phase, 'running');
  typing.tick(30000);
  assert.equal(typing.phase, 'finished');
  assert.equal(typing.stats(95000).wpm, 20);
  assert.equal(typing.stats(95000).remainingMs, 0);
});

test('keystrokes after the deadline finish the test and are not counted', () => {
  const typing = startTest();
  typing.type('t', 0);
  typing.type('h', 30000);
  assert.equal(typing.phase, 'finished');
  assert.equal(typing.cursor, 1);

  typing.backspace(30001);
  assert.equal(typing.cursor, 1);
  typing.deleteWord(30001);
  assert.equal(typing.cursor, 1);
});

test('backspace stops at the start of the text', () => {
  const typing = startTest();
  typing.type('t', 0);
  typing.backspace(0);
  typing.backspace(0);
  assert.equal(typing.cursor, 0);
});

test('deleteWord clears the current word, then the previous one', () => {
  const typing = startTest();
  typeAll(typing, 'the qui');
  typing.deleteWord(0);
  assert.equal(typing.cursor, 4);
  typing.deleteWord(0);
  assert.equal(typing.cursor, 0);
  assert.equal(typing.stats(5000).correctChars, 0);
});

test('stops accepting characters at the end of the text', () => {
  const typing = createTypingTest({ text: 'ab', durationMs: 30000 });
  typeAll(typing, 'abc');
  assert.equal(typing.cursor, 2);
  assert.equal(typing.stats(5000).keystrokes, 2);
});

test('generateText reaches the requested length without repeating a word back to back', () => {
  const words = generateText(5000).split(' ');
  assert.ok(words.join(' ').length >= 5000 - 1);
  words.forEach((word, index) => {
    assert.ok(WORDS.includes(word));
    assert.notEqual(word, words[index - 1]);
  });
});

test('the word list holds only lowercase letters', () => {
  WORDS.forEach((word) => assert.match(word, /^[a-z]+$/));
});
