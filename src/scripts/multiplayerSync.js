(function (global) {
    let multiplayerEnabled = false;
    let syncInterval = null;
    let initialStateSent = false;
    let initialStateReceived = false;

    function init() {
        initialStateSent = false;
        initialStateReceived = false;

        const existingOnConnected = WebRTCConnection.onConnected;
        const existingOnDisconnected = WebRTCConnection.onDisconnected;
        const existingOnMessage = WebRTCConnection.onMessage;
        const existingOnRoomUpdate = RoomManager.onRoomUpdate;
        const existingOnRoomClosed = RoomManager.onRoomClosed;

        WebRTCConnection.onDataChannelOpen = () => {
            multiplayerEnabled = true;
            try { if (window.RoomManager && RoomManager.freezeAfterConnect) RoomManager.freezeAfterConnect(); } catch (_) { }

            const wasAlreadyConnected = initialStateSent || initialStateReceived;
            initialStateSent = false;
            initialStateReceived = false;

            if (!RoomManager.isHost()) {
                showTurnBlocker();
                const blockerInterval = setInterval(() => {
                    if (!initialStateReceived) {
                        showTurnBlocker();
                    } else {
                        clearInterval(blockerInterval);
                    }
                }, 100);
            }

            setTimeout(() => {
                const isHost = !!(RoomManager && RoomManager.isHost && RoomManager.isHost());
                const isHostReconnection = !!(window.MultiplayerModal && window.MultiplayerModal._isReconnection && window.MultiplayerModal._isReconnection() && window.MultiplayerModal._reconnectionRole && window.MultiplayerModal._reconnectionRole() === 'host');

                if (isHost) {
                    if (isHostReconnection) {
                        requestGameState();
                    } else {
                        sendInitialGameState();
                    }
                } else {
                    requestGameState();
                }
            }, 500);
        };

        WebRTCConnection.onConnected = () => {
            if (existingOnConnected) existingOnConnected();
        };

        WebRTCConnection.onDisconnected = () => {
            multiplayerEnabled = false;
            if (window.Toast && window.Toast.show) {
                window.Toast.show('Disconnected from the opponent!', 3000);
            }
            if (existingOnDisconnected) existingOnDisconnected();
        };

        WebRTCConnection.onMessage = (message) => {
            handleIncomingMessage(message);
            if (existingOnMessage) existingOnMessage(message);
        };

        RoomManager.onRoomUpdate = (room) => {
            if (RoomManager.isHost() && room.guestId && room.status === 'ready') {
                setTimeout(() => {
                    WebRTCConnection.createOffer();
                }, 1000);
            }
            if (existingOnRoomUpdate) existingOnRoomUpdate(room);
        };

        RoomManager.onRoomClosed = () => {
            cleanup();
            if (window.Toast && window.Toast.show) {
                window.Toast.show('The game has been closed!', 3000);
            }
            if (existingOnRoomClosed) existingOnRoomClosed();
        };
    }

    function sendGameAction(action) {
        if (!multiplayerEnabled || !WebRTCConnection.isConnected()) {
            return;
        }

        const message = {
            type: 'gameAction',
            action: action,
            timestamp: Date.now()
        };

        WebRTCConnection.sendMessage(message);
    }

    function sendGameStateUpdate(options) {
        const opts = options || {};
        if (!multiplayerEnabled || !WebRTCConnection.isConnected()) {
            return { success: false, error: 'Not connected' };
        }

        try {
            const gameState = window.GameState;
            if (!gameState) {
                return { success: false, error: 'No GameState' };
            }

            const stateData = {
                players: {
                    player: {
                        facedown: gameState.players.player.facedown.slice(),
                        current: gameState.players.player.current,
                        discard: gameState.players.player.discard.slice()
                    },
                    opponent: {
                        facedown: gameState.players.opponent.facedown.slice(),
                        current: gameState.players.opponent.current,
                        discard: gameState.players.opponent.discard.slice()
                    }
                },
                board: gameState.board.map(slot => Array.isArray(slot) ? slot.slice() : []),
                trumpPiles: gameState.trumpPiles.map(pile => Array.isArray(pile) ? pile.slice() : []),
                foundationPiles: gameState.foundationPiles.map(pile => Array.isArray(pile) ? pile.slice() : []),
                currentPlayerId: gameState.currentPlayerId
            };

            const stateUpdate = {
                type: 'gameStateUpdate',
                data: stateData,
                timestamp: Date.now()
            };

            const result = WebRTCConnection.sendMessage(stateUpdate);
            if (result.success) {
                if (!opts.midTurn) {
                    showTurnBlocker();
                }
            }
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    function sendInitialGameState(retryCount = 0) {
        if (initialStateSent) {
            return;
        }

        if (retryCount > 5) {
            if (window.Toast && window.Toast.show) {
                window.Toast.show('Synchronization failed!', 3000);
            }
            return;
        }

        if (!multiplayerEnabled || !WebRTCConnection.isConnected()) {
            setTimeout(() => {
                sendInitialGameState(retryCount + 1);
            }, 1000);
            return;
        }

        try {
            const gameState = window.GameState;
            if (!gameState) {
                setTimeout(() => {
                    sendInitialGameState(retryCount + 1);
                }, 500);
                return;
            }

            if (!gameState.players || !gameState.players.player || !gameState.players.opponent) {
                return;
            }

            const initialState = {
                type: 'initialGameState',
                data: {
                    players: {
                        player: {
                            facedown: gameState.players.player.facedown.slice(),
                            current: gameState.players.player.current,
                            discard: gameState.players.player.discard.slice()
                        },
                        opponent: {
                            facedown: gameState.players.opponent.facedown.slice(),
                            current: gameState.players.opponent.current,
                            discard: gameState.players.opponent.discard.slice()
                        }
                    },
                    board: gameState.board.map(slot => Array.isArray(slot) ? slot.slice() : []),
                    trumpPiles: gameState.trumpPiles.map(pile => Array.isArray(pile) ? pile.slice() : []),
                    foundationPiles: gameState.foundationPiles.map(pile => Array.isArray(pile) ? pile.slice() : []),
                    currentPlayerId: gameState.currentPlayerId
                },
                timestamp: Date.now()
            };

            const result = WebRTCConnection.sendMessage(initialState);
            if (result.success) {
                initialStateSent = true;
            } else {
                setTimeout(() => {
                    initialStateSent = false;
                    sendInitialGameState(retryCount + 1);
                }, 1000);
            }
        } catch (error) { }
    }

    function requestGameState() {
        if (!multiplayerEnabled || !WebRTCConnection.isConnected()) {
            return;
        }

        const request = {
            type: 'requestGameState',
            timestamp: Date.now()
        };

        WebRTCConnection.sendMessage(request);
    }

    function handleIncomingMessage(message) {
        try {
            switch (message.type) {
                case 'requestGameState':
                    if (window.GameState && window.GameState.players && window.GameState.board) {
                        initialStateSent = false;
                        sendInitialGameState();
                    }
                    break;

                case 'initialGameState':
                    applyInitialGameState(message.data);
                    break;

                case 'gameStateUpdate':
                    applyGameStateUpdate(message.data);
                    break;

                case 'gameState':
                    applyGameState(message.data);
                    break;

                case 'gameAction':
                    applyGameAction(message.action);
                    break;

                case 'chat':
                    if (window.Toast && window.Toast.show) {
                        window.Toast.show(`${message.text}`, 3000);
                    }
                    break;

                default:
                    break;
            }
        } catch (error) { }
    }

    function applyInitialGameState(data) {
        if (initialStateReceived) {
            return;
        }

        try {
            if (window.GameState) {
                delete window.GameState;
            }

            if (window.GameController && window.GameController.setupGame) {
                window.GameController.setupGame(data);
                window._gameInitialized = true;
                initialStateReceived = true;

                if (window.GameState) {
                    refreshGameUI();
                    setTimeout(() => {
                        updateTurnBlocker();
                        if (window.GameState.currentPlayerId !== 'player') {
                            showTurnBlocker();
                        }
                    }, 100);

                    if (window.Toast && window.Toast.show) {
                        if (window.GameState.currentPlayerId === 'player') {
                            window.Toast.show('Game synchronized! Your turn!', 3000);
                        } else {
                            window.Toast.show('Game synchronized! Opponent\'s turn!', 3000);
                        }
                    }
                }
            } else {
                setTimeout(() => {
                    initialStateReceived = false;
                    applyInitialGameState(data);
                }, 500);
            }
        } catch (error) { }
    }

    function applyGameStateUpdate(data) {
        try {
            const gameState = window.GameState;
            if (!gameState) {
                return;
            }

            gameState.players.player.facedown = data.players.opponent.facedown.slice();
            gameState.players.player.current = data.players.opponent.current;
            gameState.players.player.discard = data.players.opponent.discard.slice();

            gameState.players.opponent.facedown = data.players.player.facedown.slice();
            gameState.players.opponent.current = data.players.player.current;
            gameState.players.opponent.discard = data.players.player.discard.slice();

            gameState.board = data.board.map(slot => Array.isArray(slot) ? slot.slice() : []);
            gameState.trumpPiles = data.trumpPiles.map(pile => Array.isArray(pile) ? pile.slice() : []);
            gameState.foundationPiles = data.foundationPiles.map(pile => Array.isArray(pile) ? pile.slice() : []);

            gameState.currentPlayerId = data.currentPlayerId === 'player' ? 'opponent' : 'player';

            refreshGameUI();
            updateTurnBlocker();
        } catch (error) { }
    }

    function applyGameState(data) { }

    function _getEls() {
        return {
            player: {
                facedown: document.getElementById('playerFacedown'),
                current: document.getElementById('playerCurrent'),
                discard: document.getElementById('playerDiscard')
            },
            opponent: {
                facedown: document.getElementById('opponentFacedown'),
                current: document.getElementById('opponentCurrent'),
                discard: document.getElementById('opponentDiscard')
            },
            boardSlots: [0, 1, 2, 3, 4, 5].map(i => document.getElementById(`boardSlot${i}`)),
            trumpPiles: [0, 1].map(i => document.getElementById(`trumpPile${i}`)),
            foundationPiles: [0, 1, 2, 3].map(i => document.getElementById(`foundationPile${i}`)),
            excuse: document.getElementById('excusePile')
        };
    }

    async function applyGameAction(action) {
        try {
            const els = _getEls();
            const gs = window.GameState;
            if (!gs) return;

            const localActor = action.actor === 'player' ? 'opponent' : 'player';

            switch (action.type) {
                case 'draw': {
                    const fromEl = els[localActor].facedown;
                    const toEl = els[localActor].current;
                    const cardId = action.cardId;
                    if (fromEl && toEl && cardId && window.Animations && window.Animations.animateCardDraw) {
                        try {
                            const side = gs.players[localActor];
                            window.Animations.animateCardDraw(fromEl, toEl, { id: cardId }, () => {
                                side.current = { id: cardId };
                                if (window.UI) {
                                    window.UI.renderCurrent(toEl, side.current);
                                    window.UI.renderFacedown(fromEl, side.facedown);
                                }
                            });
                        } catch (e) { }
                    }
                    break;
                }
                case 'shuffle_replenish': {
                    const pileEls = els[localActor];
                    if (pileEls && window.Animations && window.Animations.animateShuffleReplenish) {
                        window.Animations.animateShuffleReplenish(pileEls.discard, pileEls.facedown, () => {
                            if (window.UI) {
                                window.UI.renderFacedown(pileEls.facedown, gs.players[localActor].facedown);
                                window.UI.renderDiscard(pileEls.discard, gs.players[localActor].discard);
                            }
                        });
                    }
                    break;
                }
                case 'move': {
                    const destType = action.dest;
                    const destIndex = action.destIndex;
                    const cards = (action.cards || []).map(id => ({ id }));

                    function resolveSourceEl() {
                        if (action.source && action.source.type === 'board') {
                            return { el: els.boardSlots[action.source.index], type: 'board' };
                        }
                        if (action.source && action.source.type === 'discard') {
                            const senderSide = action.source.side;
                            const localSide = (senderSide === 'player') ? 'opponent' : 'player';
                            return { el: els[localSide].discard, type: 'discard' };
                        }
                        return { el: els[localActor].current, type: 'current' };
                    }

                    function resolveDestEl() {
                        if (destType === 'board') return { el: els.boardSlots[destIndex], type: 'board' };
                        if (destType === 'player' || destType === 'opponent') {
                            const pileOwner = destType === 'player' ? 'player' : 'opponent';
                            const mapped = pileOwner === action.actor ? localActor : (localActor === 'player' ? 'opponent' : 'player');
                            return { el: els[mapped].discard, type: 'discard' };
                        }
                        if (destType === 'trump') return { el: els.trumpPiles[destIndex], type: 'trump' };
                        if (destType === 'foundation') return { el: els.foundationPiles[destIndex], type: 'foundation' };
                        return { el: null, type: destType };
                    }

                    const src = resolveSourceEl();
                    const dst = resolveDestEl();
                    if (src.el && dst.el && window.Animations && window.Animations.animateBotMove) {
                        window.Animations.animateBotMove(src.el, dst.el, cards, dst.type, src.type, { duration: 550, compensateBoardOverlap: true }).then(() => {
                        }).catch(() => { });
                    }
                    break;
                }
                case 'excuse_replace': {
                    try {
                        const cards = (action.cards || []).map(id => ({ id }));
                        let srcEl = null, srcType = 'current';
                        if (action.source) {
                            if (action.source.type === 'board') { srcEl = els.boardSlots[action.source.index]; srcType = 'board'; }
                            else if (action.source.type === 'trump') { srcEl = els.trumpPiles[action.source.index]; srcType = 'trump'; }
                            else if (action.source.type === 'foundation') { srcEl = els.foundationPiles[action.source.index]; srcType = 'foundation'; }
                            else if (action.source.type === 'current') {
                                const senderSide = action.source.side || action.actor;
                                const localSide = senderSide === 'player' ? 'opponent' : 'player';
                                srcEl = els[localSide].current; srcType = 'current';
                            }
                        }
                        let dstEl = null, dstType = action.dest && action.dest.type || 'board';
                        const idx = action.dest && typeof action.dest.index === 'number' ? action.dest.index : 0;
                        if (dstType === 'board') dstEl = els.boardSlots[idx];
                        else if (dstType === 'trump') dstEl = els.trumpPiles[idx];
                        else if (dstType === 'foundation') dstEl = els.foundationPiles[idx];

                        if (srcEl && dstEl && window.Animations && window.Animations.animateBotMove) {
                            await window.Animations.animateBotMove(srcEl, dstEl, cards, dstType, srcType, { duration: 550, compensateBoardOverlap: true });
                        }

                        try {
                            const gs = window.GameState;
                            if (gs && gs.currentPlayerId && gs.players && gs.players[gs.currentPlayerId]) {
                                gs.players[gs.currentPlayerId].current = { id: 'excuse' };
                                const elId = gs.currentPlayerId === 'player' ? 'playerCurrent' : 'opponentCurrent';
                                const el = document.getElementById(elId);
                                if (window.UI && el) window.UI.renderCurrent(el, gs.players[gs.currentPlayerId].current);
                            }
                        } catch (e) { }
                    } catch (e) { }
                    break;
                }
                case 'gameOver': {
                    try {
                        if (window._gameOverDisplayed) break;
                        const localWinner = action.winner === 'player' ? 'opponent' : 'player';
                        if (window.Animations && window.Animations.animateVictory) {
                            window.Animations.animateVictory(localWinner);
                            window._gameOverDisplayed = true;
                        }
                    } catch (e) { }
                    break;
                }
                default:
                    break;
            }
        } catch (e) { }
    }

    function showTurnBlocker() {
        try {
            let blocker = document.getElementById('turnBlocker');
            if (!blocker) {
                blocker = document.createElement('div');
                blocker.id = 'turnBlocker';
                blocker.style.position = 'fixed';
                blocker.style.left = '0';
                blocker.style.top = '0';
                blocker.style.width = '100%';
                blocker.style.height = '100%';
                blocker.style.zIndex = '9998';
                blocker.style.background = 'transparent';
                blocker.style.cursor = 'wait';
                blocker.style.pointerEvents = 'none';
                blocker.style.display = 'block';
                document.body.appendChild(blocker);
            } else {
                blocker.style.pointerEvents = 'none';
                blocker.style.display = 'block';
            }
        } catch (e) { }
    }

    function hideTurnBlocker() {
        try {
            const blocker = document.getElementById('turnBlocker');
            if (blocker) {
                blocker.style.display = 'none';
            }
        } catch (e) { }
    }

    function isMyTurn() {
        if (!multiplayerEnabled) return true;
        try {
            const gameState = window.GameState;
            if (!gameState) return true;
            return gameState.currentPlayerId === 'player';
        } catch (e) {
            return true;
        }
    }

    function refreshGameUI() {
        try {
            const gameState = window.GameState;
            if (!gameState) return;

            const playerFacedown = document.getElementById('playerFacedown');
            const playerCurrent = document.getElementById('playerCurrent');
            const playerDiscard = document.getElementById('playerDiscard');
            const opponentFacedown = document.getElementById('opponentFacedown');
            const opponentCurrent = document.getElementById('opponentCurrent');
            const opponentDiscard = document.getElementById('opponentDiscard');

            if (window.UI) {
                if (playerFacedown) window.UI.renderFacedown(playerFacedown, gameState.players.player.facedown);
                if (playerCurrent) window.UI.renderCurrent(playerCurrent, gameState.players.player.current);
                if (playerDiscard) {
                    window.UI.renderDiscard(playerDiscard, gameState.players.player.discard);
                    playerDiscard.__cards = gameState.players.player.discard;
                }
                if (opponentFacedown) window.UI.renderFacedown(opponentFacedown, gameState.players.opponent.facedown);
                if (opponentCurrent) window.UI.renderCurrent(opponentCurrent, gameState.players.opponent.current);
                if (opponentDiscard) {
                    window.UI.renderDiscard(opponentDiscard, gameState.players.opponent.discard);
                    opponentDiscard.__cards = gameState.players.opponent.discard;
                }

                for (let i = 0; i < 6; i++) {
                    const slotEl = document.getElementById(`boardSlot${i}`);
                    if (slotEl && gameState.board[i]) {
                        slotEl.__cards = gameState.board[i];
                        window.UI.renderBoardSlot(slotEl, gameState.board[i]);
                    }
                }

                for (let i = 0; i < 2; i++) {
                    const pileEl = document.getElementById(`trumpPile${i}`);
                    if (pileEl && gameState.trumpPiles[i]) {
                        window.UI.renderSmallPile(pileEl, gameState.trumpPiles[i]);
                        pileEl.__cards = gameState.trumpPiles[i];
                    }
                }

                for (let i = 0; i < 4; i++) {
                    const pileEl = document.getElementById(`foundationPile${i}`);
                    if (pileEl && gameState.foundationPiles[i]) {
                        window.UI.renderSmallPile(pileEl, gameState.foundationPiles[i]);
                        pileEl.__cards = gameState.foundationPiles[i];
                    }
                }

                if (window.UI.renderTurnIndicator) {
                    window.UI.renderTurnIndicator('turnIndicator', gameState.currentPlayerId);
                }
            }
        } catch (error) { }
    }

    function updateTurnBlocker() {
        if (!multiplayerEnabled) {
            hideTurnBlocker();
            return;
        }
        if (isMyTurn()) {
            hideTurnBlocker();
        } else {
            showTurnBlocker();
        }
    }

    async function cleanup() {
        multiplayerEnabled = false;
        hideTurnBlocker();

        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }

        await WebRTCConnection.close();
        try { if (window.RoomManager && RoomManager.leaveRoom) await RoomManager.leaveRoom(); } catch (_) { }
    }

    function sendChatMessage(text) {
        if (!multiplayerEnabled || !WebRTCConnection.isConnected()) {
            return;
        }

        const message = {
            type: 'chat',
            text: text,
            timestamp: Date.now()
        };

        WebRTCConnection.sendMessage(message);
    }

    global.MultiplayerSync = {
        init,
        sendGameAction,
        sendChatMessage,
        sendInitialGameState,
        sendGameStateUpdate,
        requestGameState,
        cleanup,
        isEnabled: () => multiplayerEnabled,
        isMyTurn,
        updateTurnBlocker,
        showTurnBlocker,
        hideTurnBlocker,
        refreshGameUI
    };
})(window);