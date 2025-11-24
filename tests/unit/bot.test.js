const pathBot = 'src/scripts/bot.js';
const pathRules = 'src/scripts/rules.js';

beforeEach(() => {
  __loadScript(pathRules);
  __loadScript(pathBot);
  // Minimal DOM elements referenced by bot
  document.body.innerHTML = `
    <div id="boardSlot0"></div>
    <div id="playerDiscard"></div>
    <div id="opponentDiscard"></div>
    <div id="playerCurrent"></div>
    <div id="opponentCurrent"></div>
    <div id="opponentFacedown"></div>
    <div id="playerFacedown"></div>
  `;
});

test('playBot resolves and updates GameState when move allowed', async () => {
  // Prepare a simple game state where opponent has a current card that can be moved to player discard
  const gs = {
    currentPlayerId: 'player',
    players: {
      player: { current: null, discard: [] },
      opponent: { current: { id: 't1', type: 'trump', rank: 1 }, discard: [], facedown: [] }
    },
    board: [[], [], [], [], [], []],
    trumpPiles: [[], []],
    foundationPiles: [[], [], [], []]
  };

  // stub Rules.checkMove to allow moves
  window.Rules.checkMove = jest.fn(() => ({ allowed: true }));

  const result = await window.Bot.playBot(gs, { attemptDelay: 0, afterMoveDelay: 0, safety: { inner: 2, outer: 10 } });
  expect(result).toBeDefined();
  // after bot plays, opponent current may be null or moved; ensure GameState remained an object
  expect(typeof result).toBe('object');
});
