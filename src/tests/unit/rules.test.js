const path = 'src/scripts/rules.js';

beforeEach(() => {
  __loadScript(path);
  // provide a minimal GameState used by checkMove
  window.GameState = {
    currentPlayerId: 'player',
    players: {
      player: { current: null, discard: [] },
      opponent: { current: null, discard: [] }
    },
    board: [],
    trumpPiles: [],
    foundationPiles: []
  };
});

test('is allowed to place Ace on empty foundation', () => {
  const cardFrom = { id: 'hA', suit: 'heart', rank: 'A', type: 'normal' };
  const res = window.Rules.checkMove({ cardFrom, cardTo: null, destinationType: 'foundation', moveType: 'unique' });
  expect(res.allowed).toBe(true);
});

test('disallow placing non-Ace on empty foundation', () => {
  const cardFrom = { id: 'h2', suit: 'heart', rank: '2', type: 'normal' };
  const res = window.Rules.checkMove({ cardFrom, cardTo: null, destinationType: 'foundation', moveType: 'unique' });
  expect(res.allowed).toBe(false);
});
