// src/tests/deck.test.js
require('../scripts/deck.js'); // attaches Deck to window

const { Deck } = window;

describe('Deck', () => {
  test('buildDeck creates a full deck of 78 cards', () => {
    const deck = Deck.buildDeck();
    expect(deck.length).toBe(78);
  });
});
