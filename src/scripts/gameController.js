(function (global) {
    function setupGame(initialGameState = null) {
        try {
            const qs = (function () { try { return window.location && window.location.search ? window.location.search : ''; } catch (e) { return ''; } })();
            const params = new URLSearchParams(qs);
            let botEnabled = false;
            let multiplayerEnabled = false;
            let blitzEnabled = false;
            if (params.has('bot')) botEnabled = true;
            if (params.has('multiplayer')) multiplayerEnabled = true;
            if (params.has('blitz')) blitzEnabled = true;
            window._botEnabled = botEnabled;
            window._multiplayerEnabled = multiplayerEnabled;
            window._blitzEnabled = blitzEnabled;
        } catch (e) {
            window._botEnabled = false;
            window._multiplayerEnabled = false;
            window._blitzEnabled = false;
        }

        let iAmGuest = false;
        try {
            if (window.RoomManager && typeof RoomManager.isGuest === 'function') {
                iAmGuest = !!RoomManager.isGuest();
            } else if (window.MultiplayerModal && typeof window.MultiplayerModal._reconnectionRole === 'function') {
                iAmGuest = (window.MultiplayerModal._reconnectionRole() === 'guest');
            }
        } catch (_) { iAmGuest = false; }

        let deck, shuffled, hand1, hand2, initialBoard;
        let receivedBoard = null;
        let receivedTrumpPiles = null;
        let receivedFoundationPiles = null;

        if (initialGameState) {
            hand1 = initialGameState.players.opponent.facedown.slice();
            hand2 = initialGameState.players.player.facedown.slice();
            receivedBoard = initialGameState.board.map(slot => slot.slice());
            receivedTrumpPiles = initialGameState.trumpPiles.map(pile => pile.slice());
            receivedFoundationPiles = initialGameState.foundationPiles.map(pile => pile.slice());
            initialBoard = [];
        } else {
            deck = Deck.buildDeck();
            shuffled = Deck.shuffleDeck(deck);
            const dealResult = Deck.dealDeck(shuffled);
            hand1 = dealResult.hand1;
            hand2 = dealResult.hand2;
            initialBoard = dealResult.initialBoard;
        }

        const playerFacedown = document.getElementById('playerFacedown');
        const playerCurrent = document.getElementById('playerCurrent');
        const playerDiscard = document.getElementById('playerDiscard');

        const opponentFacedown = document.getElementById('opponentFacedown');
        const opponentCurrent = document.getElementById('opponentCurrent');
        const opponentDiscard = document.getElementById('opponentDiscard');

        const playerClockEl = document.getElementById('playerClock');
        const opponentClockEl = document.getElementById('opponentClock');
        const clocksContainer = document.getElementById('clocks');

        let srcMe = null, srcOpp = null;
        if (initialGameState) {
            srcMe = initialGameState.players.opponent;
            srcOpp = initialGameState.players.player;
        }

        const player = {
            facedown: hand1.slice(),
            current: srcMe ? srcMe.current : null,
            discard: srcMe ? (srcMe.discard ? srcMe.discard.slice() : []) : []
        };
        const opponent = {
            facedown: hand2.slice(),
            current: srcOpp ? srcOpp.current : null,
            discard: srcOpp ? (srcOpp.discard ? srcOpp.discard.slice() : []) : []
        };

        let initialTurn = 'player';
        if (initialGameState && initialGameState.currentPlayerId) {
            initialTurn = initialGameState.currentPlayerId === 'player' ? 'opponent' : 'player';
        }

        const BLITZ_DEFAULT_SECONDS = 3 * 60;
        let initialTimeRemaining;
        if (initialGameState && initialGameState.timeRemaining) {
            try {
                initialTimeRemaining = {
                    player: initialGameState.timeRemaining.opponent,
                    opponent: initialGameState.timeRemaining.player
                };
            } catch (e) {
                initialTimeRemaining = { player: BLITZ_DEFAULT_SECONDS, opponent: BLITZ_DEFAULT_SECONDS };
            }
        } else {
            initialTimeRemaining = { player: BLITZ_DEFAULT_SECONDS, opponent: BLITZ_DEFAULT_SECONDS };
        }

        const gameState = {
            currentPlayerId: initialTurn,
            players: {
                player: player,
                opponent: opponent
            },
            board: receivedBoard || [[], [], [], [], [], []],
            trumpPiles: receivedTrumpPiles || [[], []],
            foundationPiles: receivedFoundationPiles || [[], [], [], []],
            timeRemaining: initialTimeRemaining
        };

        try { window.GameState = gameState; } catch (e) { }

        try {
            playerDiscard.__cards = player.discard;
            opponentDiscard.__cards = opponent.discard;

            UI.renderFacedown(playerFacedown, player.facedown);
            UI.renderFacedown(opponentFacedown, opponent.facedown);
            UI.renderCurrent(playerCurrent, player.current);
            UI.renderCurrent(opponentCurrent, opponent.current);
            UI.renderDiscard(playerDiscard, player.discard);
            UI.renderDiscard(opponentDiscard, opponent.discard);
            UI.renderTurnIndicator('turnIndicator', gameState.currentPlayerId);
        } catch (e) { }

        function getCurrentTurn() { return gameState.currentPlayerId; }

        function checkVictory() {
            try { if (window._gameOverDisplayed) return true; } catch (e) { }
            if (player.facedown.length === 0 && player.discard.length === 0 && !player.current) {
                setTimeout(() => {
                    if (window.Animations && window.Animations.animateVictory) {
                        window.Animations.animateVictory('player');
                    }
                    try { window._gameOverDisplayed = true; } catch (e) { }
                    try { if (window._blitzEnabled && global._gameControllerBlitzHelpers) global._gameControllerBlitzHelpers.stopTimer(); } catch (e) { }
                }, 300);
                try {
                    if (window.MultiplayerSync && window.MultiplayerSync.isEnabled && window.MultiplayerSync.isEnabled()) {
                        window.MultiplayerSync.sendGameAction && window.MultiplayerSync.sendGameAction({ type: 'gameOver', winner: 'player' });
                    }
                } catch (e) { }
                try { if (window.RoomManager && window.RoomManager.updateRoom) window.RoomManager.updateRoom({ status: 'finished', winner: 'player' }); } catch (e) { }
                return true;
            }
            if (opponent.facedown.length === 0 && opponent.discard.length === 0 && !opponent.current) {
                setTimeout(() => {
                    if (window.Animations && window.Animations.animateVictory) {
                        window.Animations.animateVictory('opponent');
                    }
                    try { window._gameOverDisplayed = true; } catch (e) { }
                    try { if (window._blitzEnabled && global._gameControllerBlitzHelpers) global._gameControllerBlitzHelpers.stopTimer(); } catch (e) { }
                }, 300);
                try {
                    if (window.MultiplayerSync && window.MultiplayerSync.isEnabled && window.MultiplayerSync.isEnabled()) {
                        window.MultiplayerSync.sendGameAction && window.MultiplayerSync.sendGameAction({ type: 'gameOver', winner: 'opponent' });
                    }
                } catch (e) { }
                try { if (window.RoomManager && window.RoomManager.updateRoom) window.RoomManager.updateRoom({ status: 'finished', winner: 'opponent' }); } catch (e) { }
                return true;
            }
            return false;
        }

        function setTurn(turn) {
            if (turn !== 'player' && turn !== 'opponent') return;

            const previousTurn = gameState.currentPlayerId;
            gameState.currentPlayerId = turn;

            try { if (window.UI && window.UI.renderTurnIndicator) window.UI.renderTurnIndicator('turnIndicator', gameState.currentPlayerId); } catch (e) { }

            try {
                if (window.MultiplayerSync && window.MultiplayerSync.isEnabled && window.MultiplayerSync.isEnabled()) {
                    if (previousTurn === 'player' && turn === 'opponent') {
                        setTimeout(() => {
                            if (window.MultiplayerSync.sendGameStateUpdate) {
                                window.MultiplayerSync.sendGameStateUpdate();
                            }
                        }, 100);
                    } else {
                        if (window.MultiplayerSync.updateTurnBlocker) {
                            window.MultiplayerSync.updateTurnBlocker();
                        }
                    }
                }
            } catch (e) { }

            setTimeout(() => checkVictory(), 100);

            try {
                if (window.Bot && window.Bot.playBot && window._botEnabled) {
                    maybeRunBot();
                }
            } catch (e) { }
        }

        function maybeRunBot() {
            try {
                if (gameState.currentPlayerId !== 'opponent') return;
                setTimeout(async () => {
                    try {
                        const res = window.Bot.playBot(gameState);
                        if (res && typeof res.then === 'function') {
                            await res;
                        }
                        try { UI.renderTurnIndicator('turnIndicator', gameState.currentPlayerId); } catch (e) { }
                        try { UI.renderFacedown(playerFacedown, player.facedown); } catch (e) { }
                        try { UI.renderFacedown(opponentFacedown, opponent.facedown); } catch (e) { }
                        try {
                            UI.renderDiscard(playerDiscard, player.discard);
                            playerDiscard.__cards = player.discard;
                        } catch (e) { }
                        try {
                            UI.renderDiscard(opponentDiscard, opponent.discard);
                            opponentDiscard.__cards = opponent.discard;
                        } catch (e) { }
                        try { UI.renderCurrent(playerCurrent, player.current); } catch (e) { }
                        try { UI.renderCurrent(opponentCurrent, opponent.current); } catch (e) { }
                        if (boardSlots && boardSlots.length) boardSlots.forEach((slotEl, idx) => {
                            UI.renderBoardSlot(slotEl, gameState.board[idx]);
                            slotEl.__cards = gameState.board[idx];
                        });
                        if (trumpPileEls && trumpPileEls.length) trumpPileEls.forEach((el, idx) => {
                            UI.renderSmallPile(el, gameState.trumpPiles[idx]);
                            el.__cards = gameState.trumpPiles[idx];
                        });
                        if (foundationPileEls && foundationPileEls.length) foundationPileEls.forEach((el, idx) => {
                            UI.renderSmallPile(el, gameState.foundationPiles[idx]);
                            el.__cards = gameState.foundationPiles[idx];
                        });
                    } catch (e) { }
                }, 250);
            } catch (e) { }
        }

        UI.renderFacedown(playerFacedown, player.facedown);
        UI.renderFacedown(opponentFacedown, opponent.facedown);
        try { if (window.UI && window.UI.renderTurnIndicator) window.UI.renderTurnIndicator('turnIndicator', getCurrentTurn()); } catch (e) { }

        let _blitzTimerId = null;

        function _isTimerAuthoritative() {
            try {
                return !window._multiplayerEnabled || !iAmGuest;
            } catch (e) {
                return true;
            }
        }

        function _formatTime(seconds) {
            if (seconds < 0) seconds = 0;
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return `${m}:${s.toString().padStart(2, '0')}`;
        }

        function _renderClocks() {
            if (!clocksContainer || !playerClockEl || !opponentClockEl) return;
            const pr = gameState.timeRemaining.player;
            const or = gameState.timeRemaining.opponent;
            playerClockEl.textContent = _formatTime(pr);
            opponentClockEl.textContent = _formatTime(or);
            if (pr <= 10) playerClockEl.classList.add('low'); else playerClockEl.classList.remove('low');
            if (or <= 10) opponentClockEl.classList.add('low'); else opponentClockEl.classList.remove('low');
        }

        function _handleTimeout(loserId) {
            try { if (window._gameOverDisplayed) return; } catch (_) { }
            const winner = loserId === 'player' ? 'opponent' : 'player';
            _stopBlitzTimer();
            setTimeout(() => {
                try { window._gameOverDisplayed = true; } catch (e) { }
                try { if (window.Animations && window.Animations.animateVictory) window.Animations.animateVictory(winner); } catch (e) { }
            }, 200);
            try {
                if (window.MultiplayerSync && window.MultiplayerSync.isEnabled && window.MultiplayerSync.isEnabled()) {
                    window.MultiplayerSync.sendGameAction && window.MultiplayerSync.sendGameAction({ type: 'timeout', loser: loserId, winner });
                }
            } catch (e) { }
            try { if (window.RoomManager && window.RoomManager.updateRoom) window.RoomManager.updateRoom({ status: 'finished', winner }); } catch (e) { }
        }

        function _tickBlitz() {
            if (!_isTimerAuthoritative()) return;
            if (!window._blitzEnabled) return;
            try { if (window._gameOverDisplayed) return; } catch (_) { }

            const current = gameState.currentPlayerId;
            if (current === 'player' || current === 'opponent') {
                gameState.timeRemaining[current]--;
                if (gameState.timeRemaining[current] <= 0) {
                    gameState.timeRemaining[current] = 0;
                    _renderClocks();
                    _handleTimeout(current);
                    return;
                }
            }
            _renderClocks();
        }

        function _startBlitzTimer() {
            if (!window._blitzEnabled) return;
            if (!clocksContainer || !playerClockEl || !opponentClockEl) return;
            try { clocksContainer.style.display = 'flex'; } catch (_) { }
            _renderClocks();
            if (_blitzTimerId != null) return;
            _blitzTimerId = setInterval(_tickBlitz, 1000);
        }

        function _stopBlitzTimer() {
            if (_blitzTimerId != null) {
                clearInterval(_blitzTimerId);
                _blitzTimerId = null;
            }
        }

        if (window._blitzEnabled) {
            _startBlitzTimer();
        }

        global._gameControllerBlitzHelpers = {
            setBlitzFromHost: function (enabled) {
                try {
                    window._blitzEnabled = !!enabled;
                    if (!!enabled) {
                        _startBlitzTimer();
                    } else {
                        _stopBlitzTimer();
                        if (clocksContainer) clocksContainer.style.display = 'none';
                    }
                } catch (_) { }
            },
            renderClocksFromSync: function (payload) {
                try {
                    if (!payload) return;
                    const blitz = !!payload.blitz;
                    global._gameControllerBlitzHelpers.setBlitzFromHost(blitz);
                    if (payload.timeRemaining && window.GameState) {
                        window.GameState.timeRemaining = {
                            player: payload.timeRemaining.opponent,
                            opponent: payload.timeRemaining.player
                        };
                    }
                    _renderClocks();
                } catch (_) { }
            },
            stopTimer: _stopBlitzTimer
        };

        async function moveToCurrent(side, facedownEl, currentEl, discardEl) {
            try { if (window.Bot && window.Bot.isPlaying && !(window.Bot._internalAction === true)) return; } catch (e) { }

            try {
                if (window.MultiplayerSync && window.MultiplayerSync.isEnabled && window.MultiplayerSync.isEnabled()) {
                    if (window.MultiplayerSync.isMyTurn && !window.MultiplayerSync.isMyTurn()) {
                        if (window.Toast && window.Toast.show) {
                            window.Toast.show('Wait for your turn!', 2000);
                        }
                        return;
                    }
                }
            } catch (e) { }

            const owner = (side === player) ? 'player' : (side === opponent) ? 'opponent' : null;
            if (owner && getCurrentTurn() !== owner) {
                const msg = "It's not your turn to draw.";
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
                return;
            }
            if (side.current) return;

            if (side.facedown.length === 0) {
                if (side.discard.length === 0) {
                    if (checkVictory()) {
                        return;
                    }
                    return;
                }

                try {
                    if (window.MultiplayerSync && window.MultiplayerSync.isEnabled && window.MultiplayerSync.isEnabled() &&
                        window.MultiplayerSync.isMyTurn && window.MultiplayerSync.isMyTurn()) {
                        const owner = (side === player) ? 'player' : 'opponent';
                        if (window.MultiplayerSync.sendGameAction) {
                            window.MultiplayerSync.sendGameAction({ type: 'shuffle_replenish', actor: owner });
                        }
                    }
                } catch (e) { }

                if (window.Animations && window.Animations.animateShuffleReplenish) {
                    await new Promise(resolve => {
                        window.Animations.animateShuffleReplenish(discardEl, facedownEl, () => {
                            Deck.replenishFromDiscard(side);
                            discardEl.__cards = side.discard;
                            UI.renderFacedown(facedownEl, side.facedown);
                            UI.renderDiscard(discardEl, side.discard);
                            try {
                                if (window.MultiplayerSync && window.MultiplayerSync.isEnabled && window.MultiplayerSync.isEnabled()) {
                                    window.MultiplayerSync.sendGameStateUpdate && window.MultiplayerSync.sendGameStateUpdate({ midTurn: true });
                                }
                            } catch (e) { }
                            resolve();
                        });
                    });
                } else {
                    Deck.replenishFromDiscard(side);
                    discardEl.__cards = side.discard;
                    UI.renderFacedown(facedownEl, side.facedown);
                    UI.renderDiscard(discardEl, side.discard);
                    try {
                        if (window.MultiplayerSync && window.MultiplayerSync.isEnabled && window.MultiplayerSync.isEnabled()) {
                            window.MultiplayerSync.sendGameStateUpdate && window.MultiplayerSync.sendGameStateUpdate({ midTurn: true });
                        }
                    } catch (e) { }
                }
            }

            if (checkVictory()) {
                return;
            }

            const card = side.facedown.shift();
            side.current = card;

            UI.renderFacedown(facedownEl, side.facedown);

            side._cancelDrawAnimation = Animations.animateCardDraw(facedownEl, currentEl, card, () => {
                side._cancelDrawAnimation = null;
                UI.renderCurrent(currentEl, card);
                UI.renderDiscard(discardEl, side.discard);
                try {
                    if (window.MultiplayerSync && window.MultiplayerSync.isEnabled && window.MultiplayerSync.isEnabled()) {
                        window.MultiplayerSync.sendGameStateUpdate && window.MultiplayerSync.sendGameStateUpdate({ midTurn: true });
                    }
                } catch (e) { }
            });

            try {
                if (window.MultiplayerSync && window.MultiplayerSync.isEnabled && window.MultiplayerSync.isEnabled() &&
                    window.MultiplayerSync.isMyTurn && window.MultiplayerSync.isMyTurn()) {
                    const owner = (side === player) ? 'player' : 'opponent';
                    if (window.MultiplayerSync.sendGameAction) {
                        window.MultiplayerSync.sendGameAction({ type: 'draw', actor: owner, cardId: card && card.id });
                    }
                }
            } catch (e) { }
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

        trumpPileEls.forEach((el, idx) => {
            if (!el) return;
            el.__appendCardFor = function (owner, card) {
                const gs = window.GameState || gameState;
                gs.trumpPiles[idx].push(card);
                el.__cards = gs.trumpPiles[idx];
                UI.renderSmallPile(el, gs.trumpPiles[idx]);
            };
            {
                const gs = window.GameState || gameState;
                el.__cards = gs.trumpPiles[idx];
                UI.renderSmallPile(el, gs.trumpPiles[idx]);
            }
        });

        foundationPileEls.forEach((el, idx) => {
            if (!el) return;
            el.__appendCardFor = function (owner, card) {
                const gs = window.GameState || gameState;
                gs.foundationPiles[idx].push(card);
                el.__cards = gs.foundationPiles[idx];
                UI.renderSmallPile(el, gs.foundationPiles[idx]);
            };
            {
                const gs = window.GameState || gameState;
                el.__cards = gs.foundationPiles[idx];
                UI.renderSmallPile(el, gs.foundationPiles[idx]);
            }
        });

        DragDrop.init({ playerDiscardEl: playerDiscard, opponentDiscardEl: opponentDiscard, boardSlotEls: boardSlots, trumpPileEls, foundationPileEls, excusePileEl });

        function appendCardToBoard(slotIndex, owner, card) {
            const gs = window.GameState || gameState;
            if (slotIndex == null || slotIndex < 0 || slotIndex >= gs.board.length) return;
            gs.board[slotIndex].push(card);
            const slotEl = boardSlots[slotIndex];
            if (slotEl) {
                slotEl.__cards = gs.board[slotIndex];
                UI.renderBoardSlot(slotEl, gs.board[slotIndex]);
            }
        }

        if (!initialGameState) {
            const gs = window.GameState || gameState;
            initialBoard.forEach((card, idx) => {
                if (idx >= 0 && idx < gs.board.length) {
                    gs.board[idx].push(card);
                }
            });
        }

        const canAnimateReveal = (window.Animations && window.Animations.animateBoardReveal);
        if (canAnimateReveal) {
            const gsForReveal = window.GameState || gameState;
            const boardCardsForReveal = (!initialGameState)
                ? initialBoard
                : gsForReveal.board.map(slot => (slot && slot.length ? slot[0] : null));

            Animations.animateBoardReveal(boardSlots, boardCardsForReveal).then(() => {
                if (window._multiplayerEnabled && window.MultiplayerSync && window.MultiplayerSync.updateTurnBlocker) {
                    window.MultiplayerSync.updateTurnBlocker();
                }
            });
        } else {
            boardSlots.forEach((slotEl, idx) => {
                if (slotEl) {
                    const gs = window.GameState || gameState;
                    UI.renderBoardSlot(slotEl, gs.board[idx]);
                }
            });
            if (window._multiplayerEnabled && window.MultiplayerSync && window.MultiplayerSync.updateTurnBlocker) {
                window.MultiplayerSync.updateTurnBlocker();
            }
        }

        boardSlots.forEach((slotEl, idx) => {
            if (!slotEl) return;
            slotEl.__appendCardFor = function (owner, card) { appendCardToBoard(idx, owner, card); };
            slotEl.__cards = (window.GameState || gameState).board[idx];
            slotEl.addEventListener('mousedown', (e) => {
                const stack = (window.GameState || gameState).board[idx];
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
                                    slotEl.__cards = stack;
                                }
                                UI.renderBoardSlot(slotEl, stack);
                            }, idx);
                            return;
                        }
                        if (clickedCard && clickedCard === firstCard) {
                            const tempSide = { stack: stack.slice() };
                            DragDrop.onMouseDown(e, tempSide, firstCard, (fromSide) => {
                                const moved = fromSide.movedCount || 0;
                                for (let i = 0; i < moved; i++) {
                                    stack.pop();
                                }
                                slotEl.__cards = stack;
                                UI.renderBoardSlot(slotEl, stack);
                            }, idx);
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
                        slotEl.__cards = stack;
                    }
                    UI.renderBoardSlot(slotEl, stack);
                }, idx);
            });
            slotEl.addEventListener && slotEl.addEventListener('pointerdown', (e) => {
                const stack = (window.GameState || gameState).board[idx];
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
                                    slotEl.__cards = stack;
                                }
                                UI.renderBoardSlot(slotEl, stack);
                            }, idx);
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
                                slotEl.__cards = stack;
                                UI.renderBoardSlot(slotEl, stack);
                            }, idx);
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
                        slotEl.__cards = stack;
                    }
                    UI.renderBoardSlot(slotEl, stack);
                }, idx);
                e.preventDefault && e.preventDefault();
            });
            slotEl.addEventListener && slotEl.addEventListener('touchstart', (e) => {
                const t = (e.touches && e.touches[0]);
                if (!t) return;
                const stack = (window.GameState || gameState).board[idx];
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
                                    slotEl.__cards = stack;
                                }
                                UI.renderBoardSlot(slotEl, stack);
                            }, idx);
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
                                slotEl.__cards = stack;
                                UI.renderBoardSlot(slotEl, stack);
                            }, idx);
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
                        slotEl.__cards = stack;
                    }
                    UI.renderBoardSlot(slotEl, stack);
                }, idx);
                e.preventDefault && e.preventDefault();
            });
            UI.renderBoardSlot(slotEl, (window.GameState || gameState).board[idx]);
        });

        function appendCardToPile(pileEl, owner, card) {
            if (owner === 'player') {
                player.discard.push(card);
                pileEl.__cards = player.discard;
                UI.renderDiscard(pileEl, player.discard);
                if (getCurrentTurn() === 'player') {
                    setTurn('opponent');
                }
            } else if (owner === 'opponent') {
                opponent.discard.push(card);
                pileEl.__cards = opponent.discard;
                UI.renderDiscard(pileEl, opponent.discard);
                if (getCurrentTurn() === 'opponent') {
                    setTurn('player');
                }
            }
            checkVictory();
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
                    playerDiscard.__cards = player.discard;
                }
                UI.renderDiscard(playerDiscard, player.discard);
                setTimeout(() => checkVictory(), 100);
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
                    playerDiscard.__cards = player.discard;
                }
                UI.renderDiscard(playerDiscard, player.discard);
                setTimeout(() => checkVictory(), 100);
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
                    playerDiscard.__cards = player.discard;
                }
                UI.renderDiscard(playerDiscard, player.discard);
                setTimeout(() => checkVictory(), 100);
            });
        });

        opponentDiscard.addEventListener('mousedown', (e) => {
            if (opponent.discard.length === 0) return;
            const tempSide = { current: opponent.discard[opponent.discard.length - 1] };
            DragDrop.onMouseDown(e, tempSide, opponentDiscard, (fromSide) => {
                if (!fromSide.current) {
                    opponent.discard.pop();
                    opponentDiscard.__cards = opponent.discard;
                }
                UI.renderDiscard(opponentDiscard, opponent.discard);
                setTimeout(() => checkVictory(), 100);
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
                    opponentDiscard.__cards = opponent.discard;
                }
                UI.renderDiscard(opponentDiscard, opponent.discard);
                setTimeout(() => checkVictory(), 100);
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
                    opponentDiscard.__cards = opponent.discard;
                }
                UI.renderDiscard(opponentDiscard, opponent.discard);
                setTimeout(() => checkVictory(), 100);
            });
        });

        playerCurrent.addEventListener('mousedown', (e) => {
            DragDrop.onMouseDown(e, player, playerCurrent, (fromSide) => {
                if (!fromSide.current && player._cancelDrawAnimation) {
                    player._cancelDrawAnimation();
                    player._cancelDrawAnimation = null;
                }
                UI.renderCurrent(playerCurrent, fromSide.current);
                setTimeout(() => checkVictory(), 100);
            });
        });
        playerCurrent.addEventListener && playerCurrent.addEventListener('pointerdown', (e) => {
            e.preventDefault && e.preventDefault();
            e.stopPropagation && e.stopPropagation();
            DragDrop.onMouseDown(e, player, playerCurrent, (fromSide) => {
                if (!fromSide.current && player._cancelDrawAnimation) {
                    player._cancelDrawAnimation();
                    player._cancelDrawAnimation = null;
                }
                UI.renderCurrent(playerCurrent, fromSide.current);
                setTimeout(() => checkVictory(), 100);
            });
        });
        playerCurrent.addEventListener && playerCurrent.addEventListener('touchstart', (e) => {
            e.preventDefault && e.preventDefault();
            e.stopPropagation && e.stopPropagation();
            DragDrop.onMouseDown(e, player, playerCurrent, (fromSide) => {
                if (!fromSide.current && player._cancelDrawAnimation) {
                    player._cancelDrawAnimation();
                    player._cancelDrawAnimation = null;
                }
                UI.renderCurrent(playerCurrent, fromSide.current);
                setTimeout(() => checkVictory(), 100);
            });
        });

        opponentCurrent.addEventListener('mousedown', (e) => {
            DragDrop.onMouseDown(e, opponent, opponentCurrent, (fromSide) => {
                if (!fromSide.current && opponent._cancelDrawAnimation) {
                    opponent._cancelDrawAnimation();
                    opponent._cancelDrawAnimation = null;
                }
                UI.renderCurrent(opponentCurrent, fromSide.current);
                setTimeout(() => checkVictory(), 100);
            });
        });
        opponentCurrent.addEventListener && opponentCurrent.addEventListener('pointerdown', (e) => {
            e.preventDefault && e.preventDefault();
            e.stopPropagation && e.stopPropagation();
            DragDrop.onMouseDown(e, opponent, opponentCurrent, (fromSide) => {
                if (!fromSide.current && opponent._cancelDrawAnimation) {
                    opponent._cancelDrawAnimation();
                    opponent._cancelDrawAnimation = null;
                }
                UI.renderCurrent(opponentCurrent, fromSide.current);
                setTimeout(() => checkVictory(), 100);
            });
        });
        opponentCurrent.addEventListener && opponentCurrent.addEventListener('touchstart', (e) => {
            e.preventDefault && e.preventDefault();
            e.stopPropagation && e.stopPropagation();
            DragDrop.onMouseDown(e, opponent, opponentCurrent, (fromSide) => {
                if (!fromSide.current && opponent._cancelDrawAnimation) {
                    opponent._cancelDrawAnimation();
                    opponent._cancelDrawAnimation = null;
                }
                UI.renderCurrent(opponentCurrent, fromSide.current);
                setTimeout(() => checkVictory(), 100);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const isMultiplayer = urlParams.has('multiplayer');

        if (isMultiplayer) {
            window._waitingForMultiplayerInit = true;
        } else {
            setupGame();
            window._gameInitialized = true;
        }
    });

    global.GameController = { setupGame };
})(window);