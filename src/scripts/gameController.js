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

            if (side.facedown.length === 0) {
                Deck.replenishFromDiscard(side);
                UI.renderFacedown(facedownEl, side.facedown);
                UI.renderDiscard(discardEl, side.discard);
            }

            if (side.facedown.length === 0 && side.discard.length === 0 && !side.current) {
                alert('This player has no more cards, he/she wins!');
                return;
            }

            const card = side.facedown.shift();
            side.current = card;
            UI.renderFacedown(facedownEl, side.facedown);
            UI.renderCurrent(currentEl, card);
            UI.renderDiscard(discardEl, side.discard);
        }

        playerFacedown.addEventListener('click', () => moveToCurrent(player, playerFacedown, playerCurrent, playerDiscard));
        opponentFacedown.addEventListener('click', () => moveToCurrent(opponent, opponentFacedown, opponentCurrent, opponentDiscard));

        const boardSlots = [];
        for (let i = 0; i < 6; i++) {
            const el = document.getElementById(`boardSlot${i}`);
            boardSlots.push(el);
        }

        const trumpPileEls = [
            document.getElementById('trumpPile0'),
            document.getElementById('trumpPile1')
        ];
        const foundationPileEls = [
            document.getElementById('foundationPile0'),
            document.getElementById('foundationPile1'),
            document.getElementById('foundationPile2'),
            document.getElementById('foundationPile3')
        ];

        trumpPileEls.forEach(el => el && el.classList && el.classList.add('no-drag'));
        foundationPileEls.forEach(el => el && el.classList && el.classList.add('no-drag'));
        const trumpPiles = [[], []];
        const foundationPiles = [[], [], [], []];

        trumpPileEls.forEach((el, idx) => {
            if (!el) return;
            el.__appendCardFor = function (owner, card) {
                trumpPiles[idx].push(card);
                UI.renderSmallPile(el, trumpPiles[idx]);
            };
            UI.renderSmallPile(el, trumpPiles[idx]);
        });

        foundationPileEls.forEach((el, idx) => {
            if (!el) return;
            el.__appendCardFor = function (owner, card) {
                foundationPiles[idx].push(card);
                UI.renderSmallPile(el, foundationPiles[idx]);
            };
            UI.renderSmallPile(el, foundationPiles[idx]);
        });

        DragDrop.init({ playerDiscardEl: playerDiscard, opponentDiscardEl: opponentDiscard, boardSlotEls: boardSlots, trumpPileEls, foundationPileEls });

        const board = [[], [], [], [], [], []];

        function appendCardToBoard(slotIndex, owner, card) {
            if (slotIndex == null || slotIndex < 0 || slotIndex >= board.length) return;
            board[slotIndex].push(card);
            UI.renderBoardSlot(boardSlots[slotIndex], board[slotIndex]);
        }

        boardSlots.forEach((slotEl, idx) => {
            if (!slotEl) return;
            slotEl.__appendCardFor = function (owner, card) { appendCardToBoard(idx, owner, card); };
            slotEl.addEventListener('mousedown', (e) => {
                const stack = board[idx];
                if (!stack || stack.length === 0) return;
                try {
                    const cards = slotEl.querySelectorAll && slotEl.querySelectorAll('.board-card');
                    if (cards && cards.length) {
                        const firstCard = cards[0];
                        const lastCard = cards[cards.length - 1];
                        const clickedCard = e.target.closest && e.target.closest('.board-card');
                        if (clickedCard && clickedCard === lastCard) {
                            const tempSide = { current: stack[stack.length - 1] };
                            DragDrop.onMouseDown(e, tempSide, lastCard, (fromSide) => {
                                if (!fromSide.current) {
                                    stack.pop();
                                }
                                UI.renderBoardSlot(slotEl, stack);
                            });
                            return;
                        }
                        if (clickedCard && clickedCard === firstCard) {
                            const tempSide = { stack: stack.slice() };
                            DragDrop.onMouseDown(e, tempSide, firstCard, (fromSide) => {
                                const moved = fromSide.movedCount || 0;
                                for (let i = 0; i < moved; i++) {
                                    stack.pop();
                                }
                                UI.renderBoardSlot(slotEl, stack);
                            });
                            return;
                        }
                        return;
                    }
                } catch (err) {
                }
                const tempSide = { current: stack[stack.length - 1] };
                DragDrop.onMouseDown(e, tempSide, slotEl, (fromSide) => {
                    if (!fromSide.current) {
                        stack.pop();
                    }
                    UI.renderBoardSlot(slotEl, stack);
                });
            });
            UI.renderBoardSlot(slotEl, []);
        });

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

        playerDiscard.addEventListener('mousedown', (e) => {
            if (player.discard.length === 0) return;
            const tempSide = { current: player.discard[player.discard.length - 1] };
            DragDrop.onMouseDown(e, tempSide, playerDiscard, (fromSide) => {
                if (!fromSide.current) {
                    player.discard.pop();
                }
                UI.renderDiscard(playerDiscard, player.discard);
            });
        });

        opponentDiscard.addEventListener('mousedown', (e) => {
            if (opponent.discard.length === 0) return;
            const tempSide = { current: opponent.discard[opponent.discard.length - 1] };
            DragDrop.onMouseDown(e, tempSide, opponentDiscard, (fromSide) => {
                if (!fromSide.current) {
                    opponent.discard.pop();
                }
                UI.renderDiscard(opponentDiscard, opponent.discard);
            });
        });

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