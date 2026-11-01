const test = require('node:test');
const assert = require('node:assert/strict');
const { LANGUAGES } = require('../src/languages.js');
const { generateText } = require('../src/words.js');

// A token is never split across lines, so it has to fit on a 320px-wide phone.
const MAX_TOKEN_LENGTH = 22;

test('languages have unique ids and names', () => {
  assert.equal(new Set(LANGUAGES.map((language) => language.id)).size, LANGUAGES.length);
  assert.equal(new Set(LANGUAGES.map((language) => language.name)).size, LANGUAGES.length);
});

LANGUAGES.forEach(({ name, words }) => {
  test(`${name} tokens can be typed and fit on one line`, () => {
    assert.ok(words.length >= 50);
    assert.equal(new Set(words).size, words.length);
    words.forEach((word) => {
      assert.match(word, /^[\x21-\x7e]+$/);
      assert.ok(word.length <= MAX_TOKEN_LENGTH, word);
    });
  });
});

test('generateText draws from the list it is given', () => {
  const words = ['fn', 'let', 'mut'];
  generateText(500, words).split(' ').forEach((word) => {
    assert.ok(words.includes(word));
  });
});
