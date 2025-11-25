beforeEach(() => {
  // create minimal DOM matching game.html elements used by GameController
  document.body.innerHTML = `
    <div id="playerPiles"><div id="playerFacedown"></div><div id="playerDiscard"></div><div id="playerCurrent"></div></div>
    <div id="opponentPiles"><div id="opponentFacedown"></div><div id="opponentDiscard"></div><div id="opponentCurrent"></div></div>
    <div class="board-row">
      <div class="board-slot" id="boardSlot0"></div>
      <div class="board-slot" id="boardSlot1"></div>
      <div class="board-slot" id="boardSlot2"></div>
      <div class="board-slot" id="boardSlot3"></div>
      <div class="board-slot" id="boardSlot4"></div>
      <div class="board-slot" id="boardSlot5"></div>
    </div>
    <div id="leftPiles"><div id="trumpPile0"></div><div id="trumpPile1"></div><div id="excusePile"></div></div>
    <div id="rightPiles"><div id="foundationPile0"></div><div id="foundationPile1"></div><div id="foundationPile2"></div><div id="foundationPile3"></div></div>
    <div id="turnIndicator"></div>
    <div id="clocks" style="display:none;"><div id="opponentClock" class="clock opponent"></div><div id="playerClock" class="clock player"></div></div>
  `;

  // Provide minimal UI stubs
  window.UI = {
    renderFacedown: (el, arr) => { if (el) el.textContent = String((arr && arr.length) || 0); },
    renderCurrent: (el, card) => { if (el) el.textContent = card ? card.id : ''; },
    renderDiscard: (el, arr) => { if (el) el.textContent = String((arr && arr.length) || 0); },
    renderTurnIndicator: (id, turn) => { const el = document.getElementById(id); if (el) el.textContent = turn; },
    renderBoardSlot: (el, arr) => { if (el) el.textContent = String((arr && arr.length) || 0); },
    renderSmallPile: (el, arr) => { if (el) el.textContent = String((arr && arr.length) || 0); }
  };

  // Provide minimal DragDrop and Animations stubs
  window.DragDrop = {
    init: () => { },
    onMouseDown: (e, side, el, cb) => { // simulate immediate application
      try {
        if (cb) cb(side);
      } catch (e) { }
    }
  };

  window.Animations = {
    animateCardDraw: (fromEl, toEl, card, cb) => { try { if (cb) cb(); } catch (e) { } return null; },
    animateBoardReveal: (slots, cards) => Promise.resolve(),
    animateShuffleReplenish: (discardEl, facedownEl, cb) => { try { if (cb) cb(); } catch (e) { } },
    animateVictory: () => { }
  };
});

test('setupGame with initialGameState renders piles and turn', async () => {
  __loadScript('src/scripts/deck.js');
  __loadScript('src/scripts/rules.js');
  __loadScript('src/scripts/bot.js');
  __loadScript('src/scripts/gameController.js');

  const initialGameState = {
    currentPlayerId: 'opponent',
    players: {
      player: { facedown: [{id:'p1'}], current: null, discard: [] },
      opponent: { facedown: [{id:'o1'}], current: null, discard: [] }
    },
    board: [[],[],[],[],[],[]],
    trumpPiles: [[],[]],
    foundationPiles: [[],[],[],[]],
    timeRemaining: { player: 240, opponent: 240 }
  };

  // call setupGame and assert DOM updates
  window.GameController.setupGame(initialGameState);

  expect(document.getElementById('playerFacedown').textContent).toBe('1');
  expect(document.getElementById('opponentFacedown').textContent).toBe('1');
  expect(document.getElementById('turnIndicator').textContent).toBe('player');
});

test('clicking facedown moves a card to current', async () => {
  __loadScript('src/scripts/deck.js');
  __loadScript('src/scripts/rules.js');
  __loadScript('src/scripts/bot.js');
  __loadScript('src/scripts/gameController.js');

  const initialGameState = {
    currentPlayerId: 'player',
    players: {
      player: { facedown: [{id:'p1'}], current: null, discard: [] },
      opponent: { facedown: [{id:'o1'}], current: null, discard: [] }
    },
    board: [[],[],[],[],[],[]],
    trumpPiles: [[],[]],
    foundationPiles: [[],[],[],[]],
    timeRemaining: { player: 240, opponent: 240 }
  };

  window.GameController.setupGame(initialGameState);

  const playerFacedown = document.getElementById('playerFacedown');
  playerFacedown.click();

  // after click, current should be set
  const currentText = document.getElementById('playerCurrent').textContent;
  expect(currentText).toBe('p1');
});
