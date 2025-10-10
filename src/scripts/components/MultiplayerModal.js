(function (global) {
    let overlay = null;
    let modal = null;
    let isOpen = false;
    let currentRoomPin = null;
    let lastKnownGuestId = null;
    let lastKnownHostId = null;
    let guestRtcRecovering = false;
    let hostEscalationTimer = null;
    let hostEscalationDone = false;
    let hostOfferInFlight = false;
    let lastRequestOfferAt = 0;
    const MIN_REQUEST_OFFER_INTERVAL_MS = 3000;

    let _isReconnection = false;
    let _reconnectionRole = null;

    function createModal() {
        if (modal) return modal;

        overlay = document.createElement('div');
        overlay.className = 'multiplayer-overlay';
        overlay.id = 'multiplayerOverlay';

        modal = document.createElement('div');
        modal.className = 'multiplayer-modal';
        modal.id = 'multiplayerModal';

        const modalHTML = `
            <div class="multiplayer-text">
                <h1>Multiplayer</h1>
                <p>Create a room or join a friend:</p>
            </div>

            <div class="multiplayer-section" id="createRoomSection">
                <h3>Create a room</h3>
                <button class="multiplayer-button multiplayer-button-primary" id="createRoomBtn">
                    Create new room
                </button>
                
                <div id="roomPinContainer" class="room-pin-container">
                    <p class="pin-label">Share this PIN code with your friend:</p>
                    <div class="room-pin-display" id="roomPinDisplay"></div>
                    <div class="multiplayer-status multiplayer-status-waiting" id="waitingStatus">
                        <div class="loading-spinner"></div>
                        <span>Waiting for opponent...</span>
                    </div>
                </div>
            </div>

            <div class="divider"></div>

            <div class="multiplayer-section" id="joinRoomSection">
                <h3>Join a room</h3>
                <div class="pin-input-container" id="pinInputContainer">
                    <input type="text" class="pin-digit-input" id="pinDigit1" maxlength="1" pattern="[0-9]" autocomplete="off" inputmode="numeric" />
                    <input type="text" class="pin-digit-input" id="pinDigit2" maxlength="1" pattern="[0-9]" autocomplete="off" inputmode="numeric" />
                    <input type="text" class="pin-digit-input" id="pinDigit3" maxlength="1" pattern="[0-9]" autocomplete="off" inputmode="numeric" />
                    <input type="text" class="pin-digit-input" id="pinDigit4" maxlength="1" pattern="[0-9]" autocomplete="off" inputmode="numeric" />
                </div>
                <button class="multiplayer-button multiplayer-button-primary" id="joinRoomBtn">
                    Join room
                </button>
            </div>

            <div id="connectionStatus" class="connection-status"></div>
        `;

        modal.innerHTML = modalHTML;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        setupEventListeners();
        return modal;
    }

    function setupEventListeners() {
        const createRoomBtn = document.getElementById('createRoomBtn');
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        const pinDigit1 = document.getElementById('pinDigit1');
        const pinDigit2 = document.getElementById('pinDigit2');
        const pinDigit3 = document.getElementById('pinDigit3');
        const pinDigit4 = document.getElementById('pinDigit4');
        const pinInputs = [pinDigit1, pinDigit2, pinDigit3, pinDigit4];

        createRoomBtn.addEventListener('click', async () => {
            try {
                showStatus('Creating room...', 'waiting');
                createRoomBtn.disabled = true;
                joinRoomBtn.disabled = true;
                pinInputs.forEach(input => input.disabled = true);

                const result = await RoomManager.createRoom();

                if (result.success) {
                    currentRoomPin = result.pin;
                    try { localStorage.setItem('roomRole:' + currentRoomPin, 'host'); } catch (_) { }
                    displayRoomPin(result.pin);

                    hideStatus();

                    const webrtcResult = await WebRTCConnection.init('host');
                    if (webrtcResult.success) {
                    }
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                showStatus(error.message, 'error');
                createRoomBtn.disabled = false;
                joinRoomBtn.disabled = false;
                pinInputs.forEach(input => input.disabled = false);
            }
        });

        joinRoomBtn.addEventListener('click', async () => {
            try {
                const pin = pinInputs.map(input => input.value).join('');

                showStatus('Connecting to room...', 'connecting');
                createRoomBtn.disabled = true;
                joinRoomBtn.disabled = true;
                pinInputs.forEach(input => input.disabled = true);

                try { if (window.RoomManager && RoomManager.unfreeze) RoomManager.unfreeze('modal-join'); } catch (_) { }

                let preferHost = false;
                try { preferHost = (localStorage.getItem('roomRole:' + pin) === 'host'); } catch (_) { }
                const result = preferHost ? await RoomManager.rejoinAsHost(pin) : await RoomManager.joinRoom(pin);

                if (result.success) {
                    currentRoomPin = pin;
                    try { localStorage.setItem('roomRole:' + currentRoomPin, result.role); } catch (_) { }
                    _isReconnection = !!result.isReconnection;
                    _reconnectionRole = result.role;

                    if (result.isReconnection) {
                        showStatus(`Reconnecting as ${result.role.toUpperCase()}...`, 'ready');

                        if (result.gameState && window.MultiplayerModal) {
                            window.MultiplayerModal._reconnectionGameState = result.gameState;
                        }
                    } else {
                        showStatus('Room joined! Connecting...', 'ready');
                    }

                    const webrtcResult = await WebRTCConnection.init(result.role);
                    if (webrtcResult.success) {
                        if (result.role === 'guest') {
                            const room = RoomManager.getCurrentRoom && RoomManager.getCurrentRoom();
                            if (room && room.hostId) {
                                try {
                                    const now = Date.now();
                                    if (now - lastRequestOfferAt > MIN_REQUEST_OFFER_INTERVAL_MS) {
                                        lastRequestOfferAt = now;
                                        await RoomManager.sendSignal({ type: 'request-offer', from: 'guest', to: 'host' });
                                    } else {
                                    }
                                } catch (_) { }
                            }
                        }

                        if (result.isReconnection && result.role === 'host') {
                            const room = RoomManager.getCurrentRoom();
                            if (room && room.guestId) {
                                setTimeout(() => {
                                    WebRTCConnection.createOffer();
                                }, 2000);
                            }
                        }
                    }
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                showStatus(error.message, 'error');
                createRoomBtn.disabled = false;
                joinRoomBtn.disabled = false;
                pinInputs.forEach(input => input.disabled = false);
            }
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                if (currentRoomPin) {
                    if (confirm('Are you sure you want to leave? The connection will be lost.')) {
                        MultiplayerSync.cleanup();
                        close();
                        window.location.href = 'index.html';
                    }
                } else {
                    close();
                    window.location.href = 'index.html';
                }
            }
        });

        pinInputs.forEach((input, index) => {
            input.addEventListener('focus', (e) => {
                if (e.target.value) {
                    e.target.select();
                }
            });

            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');

                if (e.target.value) {
                    if (index < pinInputs.length - 1) {
                        pinInputs[index + 1].focus();
                    } else {
                        const allFilled = pinInputs.every(input => input.value.length === 1);
                        if (allFilled) {
                            joinRoomBtn.click();
                        }
                    }
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    pinInputs[index - 1].focus();
                }

                if (e.key === 'Enter') {
                    joinRoomBtn.click();
                }
            });

            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
                const digits = pastedData.split('').slice(0, 4);
                digits.forEach((digit, i) => {
                    if (pinInputs[i]) {
                        pinInputs[i].value = digit;
                    }
                });
                if (digits.length === 4) {
                    joinRoomBtn.click();
                } else if (digits.length > 0) {
                    pinInputs[Math.min(digits.length, 3)].focus();
                }
            });
        });

        setTimeout(() => {
            if (pinDigit1) {
                pinDigit1.focus();
            }
        }, 200);
    }

    function displayRoomPin(pin) {
        const roomPinContainer = document.getElementById('roomPinContainer');
        const roomPinDisplay = document.getElementById('roomPinDisplay');

        roomPinDisplay.innerHTML = '';
        const digits = pin.split('');
        digits.forEach((digit, index) => {
            const span = document.createElement('span');
            span.className = 'pin-digit';
            span.textContent = digit;
            span.style.animationDelay = `${index * 0.1}s`;
            roomPinDisplay.appendChild(span);
        });

        setTimeout(() => {
            roomPinContainer.classList.add('show');
        }, 100);
    }

    function showStatus(message, type) {
        let statusDiv = document.getElementById('connectionStatus');

        if (!statusDiv) {
            return;
        }

        statusDiv.textContent = message;
        statusDiv.className = 'connection-status connection-status-' + type;
        statusDiv.style.display = 'block';

        requestAnimationFrame(() => {
            statusDiv.classList.add('show');
        });
    }

    function hideStatus() {
        let statusDiv = document.getElementById('connectionStatus');
        if (statusDiv) {
            statusDiv.classList.remove('show');
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 300);
        }
    }

    function open() {
        if (!modal) {
            createModal();
        }

        overlay.classList.add('show');
        setTimeout(() => {
            modal.classList.add('show');
        }, 50);

        isOpen = true;

        setupMultiplayerCallbacks();
    }

    function close() {
        if (modal && overlay) {
            modal.classList.remove('show');
            overlay.classList.remove('show');

            isOpen = false;

            setTimeout(() => {
                if (modal && modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
                if (overlay && overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }

                modal = null;
                overlay = null;
                currentRoomPin = null;
            }, 600);
        }
    }

    function setupMultiplayerCallbacks() {
        RoomManager.onRoomUpdate = (room) => {
            if (RoomManager.isHost() && room.guestId && (room.status === 'ready' || room.status === 'playing')) {
                const isNewGuest = lastKnownGuestId !== null && lastKnownGuestId !== room.guestId;

                if (isNewGuest) {
                    WebRTCConnection.close().then(() => {
                        WebRTCConnection.init('host', true).then(async () => {
                            setTimeout(async () => {
                                try {
                                    if (hostOfferInFlight) return;
                                    hostOfferInFlight = true;
                                    const res = await WebRTCConnection.createOffer();
                                    if (!res || !res.success) { hostOfferInFlight = false; return; }
                                    setTimeout(() => { hostOfferInFlight = false; }, 1000);
                                } catch (_) { hostOfferInFlight = false; }
                            }, 1000);
                        });
                    });
                } else {
                    const waitingStatus = document.getElementById('waitingStatus');
                    if (waitingStatus) {
                        waitingStatus.className = 'multiplayer-status multiplayer-status-ready';
                        waitingStatus.innerHTML = 'Opponent connected! Establishing connection...';
                    }

                    setTimeout(async () => {
                        try {
                            if (hostOfferInFlight) return;
                            hostOfferInFlight = true;
                            const res = await WebRTCConnection.createOffer();
                            if (!res || !res.success) { hostOfferInFlight = false; return; }
                            setTimeout(() => { hostOfferInFlight = false; }, 1000);
                        } catch (_) { hostOfferInFlight = false; }
                    }, 1000);
                }

                lastKnownGuestId = room.guestId;
            }

            if (RoomManager.isGuest() && room.hostId && (room.status === 'playing' || room.status === 'ready')) {
                const isNewHost = lastKnownHostId !== null && lastKnownHostId !== room.hostId;

                if (isNewHost) {
                    if (window.Toast && window.Toast.show) {
                        window.Toast.show('Host reconnected, resyncing...', 2500);
                    }
                    WebRTCConnection.close().then(() => {
                        WebRTCConnection.init('guest').then(() => {
                        });
                    });
                } else {
                    try {
                        const connected = (window.WebRTCConnection && WebRTCConnection.isConnected) ? WebRTCConnection.isConnected() : false;
                        const state = (window.WebRTCConnection && WebRTCConnection.getConnectionState) ? WebRTCConnection.getConnectionState() : 'closed';
                        if (!connected && !guestRtcRecovering && (state === 'failed' || state === 'disconnected' || state === 'closed')) {
                            guestRtcRecovering = true;
                            WebRTCConnection.close().then(() => {
                                WebRTCConnection.init('guest').then(() => {
                                    if (window.RoomManager && RoomManager.sendSignal) {
                                        const now = Date.now();
                                        if (now - lastRequestOfferAt > MIN_REQUEST_OFFER_INTERVAL_MS) {
                                            lastRequestOfferAt = now;
                                            RoomManager.sendSignal({ type: 'request-offer', from: 'guest', to: 'host' }).catch(() => { });
                                        }
                                    }
                                    setTimeout(() => { guestRtcRecovering = false; }, 1500);
                                });
                            });
                        }
                    } catch (_) { }

                    if (!hostEscalationDone && !hostEscalationTimer) {
                        const nowRoom = RoomManager.getCurrentRoom && RoomManager.getCurrentRoom();
                        if (nowRoom && !nowRoom.hostId) {
                            hostEscalationTimer = setTimeout(async () => {
                                hostEscalationTimer = null;
                                try {
                                    const connectedNow = (window.WebRTCConnection && WebRTCConnection.isConnected) ? WebRTCConnection.isConnected() : false;
                                    if (connectedNow) return;
                                    const checkRoom = RoomManager.getCurrentRoom && RoomManager.getCurrentRoom();
                                    if (!checkRoom || checkRoom.hostId) return;
                                    hostEscalationDone = true;
                                    const pin = currentRoomPin || (window.RoomManager && RoomManager.getCurrentRoomId && RoomManager.getCurrentRoomId());
                                    if (!pin) return;
                                    try { localStorage.setItem('roomRole:' + pin, 'host'); } catch (_) { }
                                    await WebRTCConnection.close();
                                    const res = await RoomManager.rejoinAsHost(pin);
                                    if (res && res.success) {
                                        await WebRTCConnection.init('host');
                                        setTimeout(() => {
                                            try { WebRTCConnection.createOffer(); } catch (_) { }
                                        }, 500);
                                    }
                                } catch (e) {
                                }
                            }, 8000);
                        }
                    }
                }

                lastKnownHostId = room.hostId;
            }
        };

        WebRTCConnection.onConnected = () => {
            const isHost = !!(window.RoomManager && RoomManager.isHost && RoomManager.isHost());

            if (_isReconnection && _reconnectionRole === 'host') {
                setTimeout(() => { close(); }, 900);
                return;
            }

            if (!isHost) {
                showStatus('Connected! Waiting for game state...', 'ready');
                setTimeout(() => { close(); }, 900);
                return;
            }

            const waitingStatus = document.getElementById('waitingStatus');
            if (waitingStatus) {
                waitingStatus.className = 'multiplayer-status multiplayer-status-ready';
                waitingStatus.innerHTML = 'Connected! Starting game...';
            }

            setTimeout(() => {
                close();
                if (global.MultiplayerModal && global.MultiplayerModal.onGameReady) {
                    const reconnectionState = window.MultiplayerModal._reconnectionGameState;
                    global.MultiplayerModal.onGameReady(reconnectionState);
                    delete window.MultiplayerModal._reconnectionGameState;
                }
            }, 1200);
        };

        WebRTCConnection.onDisconnected = () => {
            showStatus('Connection lost!', 'error');

            if (window.Toast && window.Toast.show) {
                window.Toast.show('Connection lost!', 3000);
            }
        };

        RoomManager.onRoomClosed = () => {
            showStatus('Room has been closed!', 'error');

            if (window.Toast && window.Toast.show) {
                window.Toast.show('Room has been closed!', 3000);
            }
        };
    }

    global.MultiplayerModal = {
        open,
        close,
        isOpen: () => isOpen,
        getCurrentRoomPin: () => currentRoomPin,
        onGameReady: null,
        _reconnectionGameState: null,
        _isReconnection: () => _isReconnection,
        _reconnectionRole: () => _reconnectionRole
    };
})(window);