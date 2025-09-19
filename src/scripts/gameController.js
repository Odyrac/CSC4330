(function (global) {
    function setupGame() {
        const deck = Deck.buildDeck();
        const shuffled = Deck.shuffleDeck(deck);
        const { hand1, hand2 } = Deck.dealDeck(shuffled);

        const playerFacedown = document.getElementById('playerFacedown');
        const playerCurrent = document.getElementById('playerCurrent');
        const playerDiscard = document.getElementById('playerDiscard');

        const opponentFacedown = document.getElementById('opponentFacedown');
        const opponentCurrent = document.getElementById('opponentCurrent');
        const opponentDiscard = document.getElementById('opponentDiscard');

        const player = { facedown: hand1.slice(), current: null, discard: [] };
        const opponent = { facedown: hand2.slice(), current: null, discard: [] };

        UI.renderFacedown(playerFacedown, player.facedown);
        UI.renderFacedown(opponentFacedown, opponent.facedown);

        function moveToCurrent(side, facedownEl, currentEl, discardEl) {
            if (side.current) return;
            if (side.facedown.length === 0) return;
            const card = side.facedown.shift();
            side.current = card;
            UI.renderFacedown(facedownEl, side.facedown);
            UI.renderCurrent(currentEl, card);
            UI.renderDiscard(discardEl, side.discard);
        }

        playerFacedown.addEventListener('click', () => moveToCurrent(player, playerFacedown, playerCurrent, playerDiscard));
        opponentFacedown.addEventListener('click', () => moveToCurrent(opponent, opponentFacedown, opponentCurrent, opponentDiscard));

        DragDrop.init({ playerDiscardEl: playerDiscard, opponentDiscardEl: opponentDiscard });

        function appendCardToPile(pileEl, owner, card) {
            if (owner === 'player') {
                player.discard.push(card);
                UI.renderDiscard(pileEl, player.discard);
            } else if (owner === 'opponent') {
                opponent.discard.push(card);
                UI.renderDiscard(pileEl, opponent.discard);
            }
        }

        playerDiscard.__appendCardFor = function (owner, card) { appendCardToPile(playerDiscard, owner, card); };
        opponentDiscard.__appendCardFor = function (owner, card) { appendCardToPile(opponentDiscard, owner, card); };

        playerCurrent.addEventListener('mousedown', (e) => DragDrop.onMouseDown(e, player, playerCurrent, (fromSide) => {
            UI.renderCurrent(playerCurrent, fromSide.current);
        }));

        opponentCurrent.addEventListener('mousedown', (e) => DragDrop.onMouseDown(e, opponent, opponentCurrent, (fromSide) => {
            UI.renderCurrent(opponentCurrent, fromSide.current);
        }));
    }

    document.addEventListener('DOMContentLoaded', () => setupGame());

    global.GameController = { setupGame };
})(window);