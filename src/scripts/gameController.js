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

        // Foundation piles setup
        const leftFoundations = [];
        const rightFoundations = [];
        for (let i = 0; i < 2; i++) {
            const el = document.getElementById(`leftFoundation${i}`);
            leftFoundations.push(el);
        }
        for (let i = 0; i < 4; i++) {
            const el = document.getElementById(`rightFoundation${i}`);
            rightFoundations.push(el);
        }

        const foundationPiles = {
            left: [[], []], // 2 left foundation piles
            right: [[], [], [], []] // 4 right foundation piles
        };

        DragDrop.init({ 
            playerDiscardEl: playerDiscard, 
            opponentDiscardEl: opponentDiscard, 
            boardSlotEls: boardSlots,
            leftFoundationEls: leftFoundations,
            rightFoundationEls: rightFoundations
        });

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

        // Foundation pile handlers
        function appendCardToFoundation(side, index, owner, card, entireStack, sourceSlotIndex) {
            const piles = side === 'left' ? foundationPiles.left : foundationPiles.right;
            if (index < 0 || index >= piles.length) return;
            
            if (entireStack && Array.isArray(entireStack)) {
                piles[index].push(...entireStack);
            } else {
                piles[index].push(card);
            }
            
            const elements = side === 'left' ? leftFoundations : rightFoundations;
            UI.renderFoundation(elements[index], piles[index]);
            
            // Remove from source board slot if applicable
            if (sourceSlotIndex !== undefined && sourceSlotIndex !== null && sourceSlotIndex >= 0 && sourceSlotIndex < board.length) {
                if (entireStack && Array.isArray(entireStack)) {
                    board[sourceSlotIndex] = [];
                } else {
                    board[sourceSlotIndex].pop();
                }
                UI.renderBoardSlot(boardSlots[sourceSlotIndex], board[sourceSlotIndex]);
            }
        }

        // Setup left foundation piles
        leftFoundations.forEach((foundationEl, idx) => {
            if (!foundationEl) return;
            foundationEl.__appendCardFor = function (owner, card, entireStack, sourceSlotIndex) { 
                appendCardToFoundation('left', idx, owner, card, entireStack, sourceSlotIndex); 
            };
            foundationEl.addEventListener('mousedown', (e) => {
                const pile = foundationPiles.left[idx];
                if (!pile || pile.length === 0) return;
                const tempSide = { 
                    current: pile[pile.length - 1],
                    sourceFoundation: { side: 'left', index: idx }
                };
                DragDrop.onMouseDown(e, tempSide, foundationEl, (fromSide) => {
                    if (!fromSide.current && fromSide.sourceFoundation) {
                        const { side, index } = fromSide.sourceFoundation;
                        const piles = side === 'left' ? foundationPiles.left : foundationPiles.right;
                        piles[index].pop();
                        const elements = side === 'left' ? leftFoundations : rightFoundations;
                        UI.renderFoundation(elements[index], piles[index]);
                    }
                });
            });
            UI.renderFoundation(foundationEl, []);
        });

        // Setup right foundation piles
        rightFoundations.forEach((foundationEl, idx) => {
            if (!foundationEl) return;
            foundationEl.__appendCardFor = function (owner, card, entireStack, sourceSlotIndex) { 
                appendCardToFoundation('right', idx, owner, card, entireStack, sourceSlotIndex); 
            };
            foundationEl.addEventListener('mousedown', (e) => {
                const pile = foundationPiles.right[idx];
                if (!pile || pile.length === 0) return;
                const tempSide = { 
                    current: pile[pile.length - 1],
                    sourceFoundation: { side: 'right', index: idx }
                };
                DragDrop.onMouseDown(e, tempSide, foundationEl, (fromSide) => {
                    if (!fromSide.current && fromSide.sourceFoundation) {
                        const { side, index } = fromSide.sourceFoundation;
                        const piles = side === 'left' ? foundationPiles.left : foundationPiles.right;
                        piles[index].pop();
                        const elements = side === 'left' ? leftFoundations : rightFoundations;
                        UI.renderFoundation(elements[index], piles[index]);
                    }
                });
            });
            UI.renderFoundation(foundationEl, []);
        });
    }

    document.addEventListener('DOMContentLoaded', () => setupGame());

    global.GameController = { setupGame };
})(window);