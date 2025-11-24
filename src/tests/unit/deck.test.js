const path = 'src/scripts/deck.js';

beforeEach(() => {
  // load deck script into jsdom global
  __loadScript(path);
});

test('buildDeck creates a full deck of 78 cards', () => {
  const deck = window.Deck.buildDeck();
  expect(deck.length).toBe(78);
});

test('buildDeck returns array containing excuse card and trumps', () => {
  const deck = window.Deck.buildDeck();
  expect(Array.isArray(deck)).toBe(true);
  const excuse = deck.find(c => c.id === 'excuse');
  expect(excuse).toBeDefined();
  const someTrump = deck.find(c => c.type === 'trump');
  expect(someTrump).toBeDefined();
});

test('dealDeck returns two hands and initialBoard of size 6', () => {
  const deck = window.Deck.buildDeck();
  const copy = deck.slice();
  const res = window.Deck.dealDeck(copy);
  expect(res).toHaveProperty('hand1');
  expect(res).toHaveProperty('hand2');
  expect(res).toHaveProperty('initialBoard');
  expect(Array.isArray(res.initialBoard)).toBe(true);
  expect(res.initialBoard.length).toBe(6);
});

test('replenishFromDiscard handles single discard correctly', () => {
  const side = { facedown: [], discard: [{ id: 'c1' }] };
  window.Deck.replenishFromDiscard(side);
  expect(side.facedown.length).toBe(1);
  expect(side.discard.length).toBe(0);
});
