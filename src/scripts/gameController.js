(function (global) {
    function setupGame() {
        const deck = Deck.buildDeck();
        const shuffled = Deck.shuffleDeck(deck);
        const { hand1, hand2, initialBoard } = Deck.dealDeck(shuffled);

        const playerFacedown = document.getElementById('playerFacedown');
        const playerCurrent = document.getElementById('playerCurrent');
        const playerDiscard = document.getElementById('playerDiscard');

        const opponentFacedown = document.getElementById('opponentFacedown');
        const opponentCurrent = document.getElementById('opponentCurrent');
        const opponentDiscard = document.getElementById('opponentDiscard');

        const player = { facedown: hand1.slice(), current: null, discard: [] };
        const opponent = { facedown: hand2.slice(), current: null, discard: [] };

        const gameState = {
            currentPlayerId: 'player',
            players: {
                player: player,
                opponent: opponent
            },
            board: [[], [], [], [], [], []],
            trumpPiles: [[], []],
            foundationPiles: [[], [], [], []]
        };

        try { window.GameState = gameState; } catch (e) { }

        function getCurrentTurn() { return gameState.currentPlayerId; }

        function setTurn(turn) {
            if (turn !== 'player' && turn !== 'opponent') return;
            gameState.currentPlayerId = turn;
            try { if (window.UI && window.UI.renderTurnIndicator) window.UI.renderTurnIndicator('turnIndicator', gameState.currentPlayerId); } catch (e) { }
        }

        UI.renderFacedown(playerFacedown, player.facedown);
        UI.renderFacedown(opponentFacedown, opponent.facedown);
        try { if (window.UI && window.UI.renderTurnIndicator) window.UI.renderTurnIndicator('turnIndicator', getCurrentTurn()); } catch (e) { }

        function moveToCurrent(side, facedownEl, currentEl, discardEl) {
            const owner = (side === player) ? 'player' : (side === opponent) ? 'opponent' : null;
            if (owner && getCurrentTurn() !== owner) {
                const msg = "It's not your turn to draw.";
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
                return;
            }
            if (side.current) return;

            if (side.facedown.length === 0) {
                Deck.replenishFromDiscard(side);
                UI.renderFacedown(facedownEl, side.facedown);
                UI.renderDiscard(discardEl, side.discard);
            }

            if (side.facedown.length === 0 && side.discard.length === 0 && !side.current) {
                const msg = 'This player has no more cards, he/she wins!';
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 4000);
                else alert(msg);
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

        const excusePileEl = document.getElementById('excusePile');

        trumpPileEls.forEach(el => el && el.classList && el.classList.add('no-drag'));
        foundationPileEls.forEach(el => el && el.classList && el.classList.add('no-drag'));
        const trumpPiles = gameState.trumpPiles;
        const foundationPiles = gameState.foundationPiles;

        trumpPileEls.forEach((el, idx) => {
            if (!el) return;
            el.__appendCardFor = function (owner, card) {
                trumpPiles[idx].push(card);
                UI.renderSmallPile(el, trumpPiles[idx]);
            };
            el.__cards = trumpPiles[idx];
            UI.renderSmallPile(el, trumpPiles[idx]);
        });

        foundationPileEls.forEach((el, idx) => {
            if (!el) return;
            el.__appendCardFor = function (owner, card) {
                foundationPiles[idx].push(card);
                UI.renderSmallPile(el, foundationPiles[idx]);
            };
            el.__cards = foundationPiles[idx];
            UI.renderSmallPile(el, foundationPiles[idx]);
        });

        DragDrop.init({ playerDiscardEl: playerDiscard, opponentDiscardEl: opponentDiscard, boardSlotEls: boardSlots, trumpPileEls, foundationPileEls, excusePileEl });

        const board = gameState.board;

        function appendCardToBoard(slotIndex, owner, card) {
            if (slotIndex == null || slotIndex < 0 || slotIndex >= board.length) return;
            board[slotIndex].push(card);
            const slotEl = boardSlots[slotIndex];
            if (slotEl) {
                UI.renderBoardSlot(slotEl, board[slotIndex]);
            }
        }

        initialBoard.forEach((card, idx) => {
            appendCardToBoard(idx, 'board', card);
        });

        boardSlots.forEach((slotEl, idx) => {
            if (!slotEl) return;
            slotEl.__appendCardFor = function (owner, card) { appendCardToBoard(idx, owner, card); };
            slotEl.__cards = board[idx];
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
            slotEl.addEventListener && slotEl.addEventListener('pointerdown', (e) => {
                const stack = board[idx];
                if (!stack || stack.length === 0) return;
                try {
                    const cards = slotEl.querySelectorAll && slotEl.querySelectorAll('.board-card');
                    if (cards && cards.length) {
                        const firstCard = cards[0];
                        const lastCard = cards[cards.length - 1];
                        const actual = document.elementFromPoint(e.clientX, e.clientY);
                        const clickedCard = actual && actual.closest && actual.closest('.board-card');
                        if (clickedCard && clickedCard === lastCard) {
                            const tempSide = { current: stack[stack.length - 1] };
                            DragDrop.onMouseDown(e, tempSide, lastCard, (fromSide) => {
                                if (!fromSide.current) {
                                    stack.pop();
                                }
                                UI.renderBoardSlot(slotEl, stack);
                            });
                            e.preventDefault && e.preventDefault();
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
                            e.preventDefault && e.preventDefault();
                            return;
                        }
                        e.preventDefault && e.preventDefault();
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
                e.preventDefault && e.preventDefault();
            });
            slotEl.addEventListener && slotEl.addEventListener('touchstart', (e) => {
                const t = (e.touches && e.touches[0]);
                if (!t) return;
                const stack = board[idx];
                if (!stack || stack.length === 0) return;
                try {
                    const cards = slotEl.querySelectorAll && slotEl.querySelectorAll('.board-card');
                    if (cards && cards.length) {
                        const firstCard = cards[0];
                        const lastCard = cards[cards.length - 1];
                        const actual = document.elementFromPoint(t.clientX, t.clientY);
                        const clickedCard = actual && actual.closest && actual.closest('.board-card');
                        if (clickedCard && clickedCard === lastCard) {
                            const tempSide = { current: stack[stack.length - 1] };
                            DragDrop.onMouseDown(e, tempSide, lastCard, (fromSide) => {
                                if (!fromSide.current) {
                                    stack.pop();
                                }
                                UI.renderBoardSlot(slotEl, stack);
                            });
                            e.preventDefault && e.preventDefault();
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
                            e.preventDefault && e.preventDefault();
                            return;
                        }
                        e.preventDefault && e.preventDefault();
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
                e.preventDefault && e.preventDefault();
            });
            UI.renderBoardSlot(slotEl, board[idx]);
        });

        function appendCardToPile(pileEl, owner, card) {
            if (owner === 'player') {
                player.discard.push(card);
                UI.renderDiscard(pileEl, player.discard);
                if (getCurrentTurn() === 'player') {
                    setTurn('opponent');
                }
            } else if (owner === 'opponent') {
                opponent.discard.push(card);
                UI.renderDiscard(pileEl, opponent.discard);
                if (getCurrentTurn() === 'opponent') {
                    setTurn('player');
                }
            }
        }

        playerDiscard.__appendCardFor = function (owner, card) { appendCardToPile(playerDiscard, owner, card); };
        opponentDiscard.__appendCardFor = function (owner, card) { appendCardToPile(opponentDiscard, owner, card); };

        playerDiscard.__cards = player.discard;
        opponentDiscard.__cards = opponent.discard;

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
        playerDiscard.addEventListener && playerDiscard.addEventListener('pointerdown', (e) => {
            if (player.discard.length === 0) return;
            const tempSide = { current: player.discard[player.discard.length - 1] };
            e.preventDefault && e.preventDefault();
            e.stopPropagation && e.stopPropagation();
            DragDrop.onMouseDown(e, tempSide, playerDiscard, (fromSide) => {
                if (!fromSide.current) {
                    player.discard.pop();
                }
                UI.renderDiscard(playerDiscard, player.discard);
            });
        });
        playerDiscard.addEventListener && playerDiscard.addEventListener('touchstart', (e) => {
            if (player.discard.length === 0) return;
            const tempSide = { current: player.discard[player.discard.length - 1] };
            e.preventDefault && e.preventDefault();
            e.stopPropagation && e.stopPropagation();
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
        opponentDiscard.addEventListener && opponentDiscard.addEventListener('pointerdown', (e) => {
            if (opponent.discard.length === 0) return;
            const tempSide = { current: opponent.discard[opponent.discard.length - 1] };
            e.preventDefault && e.preventDefault();
            e.stopPropagation && e.stopPropagation();
            DragDrop.onMouseDown(e, tempSide, opponentDiscard, (fromSide) => {
                if (!fromSide.current) {
                    opponent.discard.pop();
                }
                UI.renderDiscard(opponentDiscard, opponent.discard);
            });
        });
        opponentDiscard.addEventListener && opponentDiscard.addEventListener('touchstart', (e) => {
            if (opponent.discard.length === 0) return;
            const tempSide = { current: opponent.discard[opponent.discard.length - 1] };
            e.preventDefault && e.preventDefault();
            e.stopPropagation && e.stopPropagation();
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
        playerCurrent.addEventListener && playerCurrent.addEventListener('pointerdown', (e) => {
            e.preventDefault && e.preventDefault();
            e.stopPropagation && e.stopPropagation();
            DragDrop.onMouseDown(e, player, playerCurrent, (fromSide) => {
                UI.renderCurrent(playerCurrent, fromSide.current);
            });
        });
        playerCurrent.addEventListener && playerCurrent.addEventListener('touchstart', (e) => {
            e.preventDefault && e.preventDefault();
            e.stopPropagation && e.stopPropagation();
            DragDrop.onMouseDown(e, player, playerCurrent, (fromSide) => {
                UI.renderCurrent(playerCurrent, fromSide.current);
            });
        });

        opponentCurrent.addEventListener('mousedown', (e) => DragDrop.onMouseDown(e, opponent, opponentCurrent, (fromSide) => {
            UI.renderCurrent(opponentCurrent, fromSide.current);
        }));
        opponentCurrent.addEventListener && opponentCurrent.addEventListener('pointerdown', (e) => {
            e.preventDefault && e.preventDefault();
            e.stopPropagation && e.stopPropagation();
            DragDrop.onMouseDown(e, opponent, opponentCurrent, (fromSide) => {
                UI.renderCurrent(opponentCurrent, fromSide.current);
            });
        });
        opponentCurrent.addEventListener && opponentCurrent.addEventListener('touchstart', (e) => {
            e.preventDefault && e.preventDefault();
            e.stopPropagation && e.stopPropagation();
            DragDrop.onMouseDown(e, opponent, opponentCurrent, (fromSide) => {
                UI.renderCurrent(opponentCurrent, fromSide.current);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => setupGame());

    global.GameController = { setupGame };
})(window);