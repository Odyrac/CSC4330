(function (global) {
    let db = null;
    let currentRoom = null;
    let currentRoomId = null;
    let currentRole = null;
    let roomListener = null;
    let signalsListener = null;
    let frozen = false;
    let lastTtlTouchAt = 0;
    const TTL_TOUCH_INTERVAL_MS = 30000;
    let lastRelevantRoomSnapshot = null;
    let lastUpdateAt = 0;
    const MIN_UPDATE_INTERVAL_MS = 800;
    let lastUpdateSignature = null;

    const ROOM_TTL_MS = 3 * 60 * 60 * 1000;

    /**
     * Computes the expiration timestamp for a room.
     * 
     * @returns {Date} The expiration timestamp.
     */
    function _computeExpireAt() {
        return new Date(Date.now() + ROOM_TTL_MS);
    }

    /**
     * Initializes the RoomManager with the given database instance.
     * 
     * @param {Object} database - The database instance (e.g., Firestore).
     */
    function init(database) {
        db = database;
    }

    /**
     * Generates a random 4-digit room PIN.
     * 
     * @returns {string} The generated room PIN.
     */
    function generateRoomPin() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }
    /**
     * Creates a new room and returns its PIN and role.
     * 
     * @returns {Object} An object containing success status, room PIN, and role.
     */
    async function createRoom() {
        if (frozen) {
            return { success: false, error: 'RoomManager frozen' };
        }
        try {
            const pin = generateRoomPin();
            const roomData = {
                pin: pin,
                hostId: null,
                guestId: null,
                status: 'waiting',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                expireAt: _computeExpireAt(),
                gameState: null
            };

            const roomRef = db.collection('rooms').doc(pin);

            const roomDoc = await roomRef.get();
            if (roomDoc.exists) {
                return await createRoom();
            }

            await roomRef.set(roomData);
            currentRoomId = pin;
            currentRole = 'host';

            listenToRoom(pin);
            return { success: true, pin: pin, role: 'host' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Joins an existing room with the given PIN.
     * 
     * @param {string} pin - The room PIN to join.
     * @param {boolean} asHost - Whether to join as host.
     * @returns {Object} An object containing success status, room PIN, role, reconnection status, and game state.
     */
    async function joinRoom(pin, asHost = false) {
        if (frozen) {
            return { success: false, error: 'RoomManager frozen' };
        }
        try {
            if (!pin || pin.length !== 4) {
                throw new Error('Invalid PIN format!');
            }

            const roomRef = db.collection('rooms').doc(pin);
            const roomDoc = await roomRef.get();

            if (!roomDoc.exists) {
                throw new Error('This room does not exist!');
            }

            const roomData = roomDoc.data();
            if (roomData.status === 'finished') {
                throw new Error('This game has already finished!');
            }
            let detectedRole = asHost ? 'host' : 'guest';
            let isReconnection = false;

            if (roomData.status === 'playing' || roomData.status === 'ready') {
                isReconnection = true;

                if (!asHost) {
                    if (!roomData.hostId && roomData.guestId) {
                        detectedRole = 'host';
                    } else if (roomData.hostId && !roomData.guestId) {
                        detectedRole = 'guest';
                    } else if (!roomData.hostId && !roomData.guestId) {
                        detectedRole = 'host';
                    }
                }
            }

            currentRoomId = pin;
            currentRole = detectedRole;

            try {
                await db.collection('rooms').doc(pin).set({
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                    expireAt: _computeExpireAt()
                }, { merge: true });
            } catch (e) { }

            listenToRoom(pin);
            return {
                success: true,
                pin: pin,
                role: currentRole,
                isReconnection: isReconnection,
                gameState: roomData.gameState
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Rejoins the room as host using the given PIN.
     * 
     * @param {string} pin - The room PIN to rejoin.
     * @returns {Object} An object containing success status, room PIN, role, reconnection status, and game state.
     */
    async function rejoinAsHost(pin) {
        return await joinRoom(pin, true);
    }

    /**
     * Listens to updates in the room with the given PIN.
     * 
     * @param {string} pin - The room PIN to listen to.
     * @returns {void} - No return value.
     */
    function listenToRoom(pin) {
        if (frozen) {
            return;
        }
        if (roomListener) {
            roomListener();
        }

        const roomRef = db.collection('rooms').doc(pin);
        roomListener = roomRef.onSnapshot((doc) => {
            if (frozen) { return; }
            if (doc.exists) {
                currentRoom = doc.data();
                try {
                    const relevant = {
                        hostId: currentRoom.hostId || null,
                        guestId: currentRoom.guestId || null,
                        status: currentRoom.status || null
                    };
                    const prev = lastRelevantRoomSnapshot;
                    const changed = !prev || prev.hostId !== relevant.hostId || prev.guestId !== relevant.guestId || prev.status !== relevant.status;
                    if (changed) {
                        lastRelevantRoomSnapshot = relevant;
                        if (global.RoomManager && global.RoomManager.onRoomUpdate) {
                            global.RoomManager.onRoomUpdate(currentRoom);
                        }
                    } else {
                    }
                } catch (_) {
                    if (global.RoomManager && global.RoomManager.onRoomUpdate) {
                        global.RoomManager.onRoomUpdate(currentRoom);
                    }
                }
            } else {
                if (global.RoomManager && global.RoomManager.onRoomClosed) {
                    global.RoomManager.onRoomClosed();
                }
            }
        }, (error) => {
        });
    }

    /**
     * Updates the current room with the given data.
     * 
     * @param {Object} data - The data to update in the room.
     * @returns {Object} An object containing success status and optional error message.
     */
    async function updateRoom(data) {
        if (frozen) {
            return { success: true };
        }
        try {
            if (!currentRoomId) {
                throw new Error('No active room');
            }

            const roomRef = db.collection('rooms').doc(currentRoomId);
            const now = Date.now();
            const criticalKeys = ['status', 'hostId', 'guestId', 'gameState'];
            try {
                if (currentRoom && data) {
                    const nextCrit = {
                        status: data.status !== undefined ? data.status : currentRoom.status,
                        hostId: data.hostId !== undefined ? data.hostId : currentRoom.hostId,
                        guestId: data.guestId !== undefined ? data.guestId : currentRoom.guestId,
                        winner: data.winner !== undefined ? data.winner : currentRoom.winner
                    };
                    const sig = JSON.stringify(nextCrit);
                    const unchanged = (
                        (data.status === undefined || data.status === currentRoom.status) &&
                        (data.hostId === undefined || data.hostId === currentRoom.hostId) &&
                        (data.guestId === undefined || data.guestId === currentRoom.guestId) &&
                        (data.winner === undefined || data.winner === currentRoom.winner)
                    );
                    if (unchanged && data && !('gameState' in data)) {
                        return { success: true, skipped: true };
                    }
                    if (lastUpdateSignature === sig && (now - lastUpdateAt) < MIN_UPDATE_INTERVAL_MS) {
                        return { success: true, skipped: true };
                    }
                    lastUpdateSignature = sig;
                }
            } catch (e) { }
            const hasCritical = Object.keys(data || {}).some(k => criticalKeys.includes(k));
            const canTouchTtl = hasCritical || (now - lastTtlTouchAt > TTL_TOUCH_INTERVAL_MS);
            const payload = Object.assign({}, data);
            if (canTouchTtl) {
                payload.lastActivity = firebase.firestore.FieldValue.serverTimestamp();
                payload.expireAt = _computeExpireAt();
                lastTtlTouchAt = now;
            }
            await roomRef.update(payload);
            lastUpdateAt = now;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Sets the current peer ID for the user in the room.
     * 
     * @param {string} peerId - The peer ID to set.
     * @returns {Object} An object containing success status and optional error message.
     */
    async function setMyPeerId(peerId) {
        if (frozen) {
            return { success: true };
        }
        try {
            if (!currentRoomId || !currentRole) {
                throw new Error('No active room');
            }

            const roomRef = db.collection('rooms').doc(currentRoomId);
            const roomDoc = await roomRef.get();
            const roomData = roomDoc.data();

            const updateData = {};
            if (currentRole === 'host') {
                updateData.hostId = peerId;
            } else {
                updateData.guestId = peerId;
            }

            if (roomData.status !== 'playing') {
                if (currentRole === 'guest') {
                    updateData.status = 'ready';
                }
            }

            const sameHost = updateData.hostId !== undefined && updateData.hostId === roomData.hostId;
            const sameGuest = updateData.guestId !== undefined && updateData.guestId === roomData.guestId;
            const sameStatus = updateData.status === undefined || updateData.status === roomData.status;
            if ((sameHost || updateData.hostId === undefined) && (sameGuest || updateData.guestId === undefined) && sameStatus) {
                return { success: true, skipped: true };
            }

            return await updateRoom(updateData);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Leaves the current room, optionally deleting it if the user is the host.
     * 
     * @param {boolean} deleteRoom - Whether to delete the room if the user is the host.
     * @returns {Object} An object containing success status and optional error message.
     */
    async function leaveRoom(deleteRoom = false) {
        if (frozen) {
            currentRoom = null;
            currentRoomId = null;
            currentRole = null;
            if (roomListener) { try { roomListener(); } catch (_) { } roomListener = null; }
            if (signalsListener) { try { signalsListener(); } catch (_) { } signalsListener = null; }
            return { success: true };
        }
        try {
            if (roomListener) {
                roomListener();
                roomListener = null;
            }

            if (currentRoomId) {
                const roomRef = db.collection('rooms').doc(currentRoomId);
                if (deleteRoom && currentRole === 'host') {
                    await roomRef.delete();
                } else {
                    const updateData = {};
                    if (currentRole === 'host') {
                        updateData.hostId = null;
                    } else {
                        updateData.guestId = null;
                    }
                    await roomRef.update(updateData);
                }
            }

            currentRoom = null;
            currentRoomId = null;
            currentRole = null;

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    /**
     * Sends a signaling message to the other peer in the current room.
     * 
     * @param {Object} signal - The signaling message to send.
     * @returns {Object} An object containing success status and optional error message.
     */
    async function sendSignal(signal) {
        if (frozen) {
            return { success: true };
        }
        try {
            if (!currentRoomId) {
                throw new Error('No active room');
            }

            const signalRef = db.collection('rooms').doc(currentRoomId)
                .collection('signals').doc();

            await signalRef.set({
                ...signal,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            try {
                const now = Date.now();
                if (now - lastTtlTouchAt > TTL_TOUCH_INTERVAL_MS) {
                    await db.collection('rooms').doc(currentRoomId).set({
                        lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                        expireAt: _computeExpireAt()
                    }, { merge: true });
                    lastTtlTouchAt = now;
                }
            } catch (e) { }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Listens to signaling messages directed to the current peer in the room.
     * 
     * @param {Function} callback - The callback function to handle incoming signals.
     * @returns {Function|null} A function to unsubscribe from the listener, or null if not listening.
     */
    function listenToSignals(callback) {
        if (frozen) {
            return null;
        }
        if (!currentRoomId) {
            return null;
        }

        const myId = currentRole === 'host' ? 'host' : 'guest';
        const signalsRef = db.collection('rooms').doc(currentRoomId)
            .collection('signals')
            .where('to', '==', myId);

        const unsub = signalsRef.onSnapshot((snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const signal = change.doc.data();
                    callback(signal);

                    try {
                        await change.doc.ref.delete();
                    } catch (e) {
                    }
                }
            });
        });
        signalsListener = () => { try { unsub(); } catch (_) { } };
        return unsub;
    }

    /***
     * Gets the current room data.
     * 
     * @returns {Object|null} The current room data, or null if not in a room.
     */
    function getCurrentRoom() {
        return currentRoom;
    }
    /***
     * Gets the current room ID.
     * 
     * @returns {string|null} The current room ID, or null if not in a room.
     */
    function getCurrentRoomId() {
        return currentRoomId;
    }
    /**
     * Gets the current role of the user in the room.
     * 
     * @returns {string|null} The current role ('host' or 'guest'), or null if not in a room.
     */
    function getCurrentRole() {
        return currentRole;
    }

    /**
     * Checks if the current user is the host.
     * 
     * @returns {boolean} True if the user is the host, false otherwise.
     */
    function isHost() {
        return currentRole === 'host';
    }

    /**
     * Checks if the current user is the guest.
     * 
     * @returns {boolean} True if the user is the guest, false otherwise.
     */
    function isGuest() {
        return currentRole === 'guest';
    }
    /**
     * Freezes the RoomManager after a successful connection.
     * This stops all listeners and updates.
     * 
     * @returns {void} - No return value.
     */
    function freezeAfterConnect() {
        try {
            frozen = true;
            if (roomListener) { try { roomListener(); } catch (_) { } roomListener = null; }
            if (signalsListener) { try { signalsListener(); } catch (_) { } signalsListener = null; }
        } catch (e) {
        }
    }

    /**
     * Unfreezes the RoomManager, resuming listeners and updates.
     * 
     * @param {string} reason - The reason for unfreezing (optional).
     * @returns {void} - No return value.
     */
    function unfreeze(reason = '') {
        try {
            if (!frozen) return;
            frozen = false;
            if (currentRoomId && !roomListener) {
                try { listenToRoom(currentRoomId); } catch (_) { }
            }
            if (db && currentRoomId) {
                try {
                    db.collection('rooms').doc(currentRoomId).set({
                        lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                        expireAt: _computeExpireAt()
                    }, { merge: true });
                } catch (_) { }
            }
        } catch (e) {
        }
    }

    /**
     * Makes all roomManager functions globally accessible.
     */
    global.RoomManager = {
        init,
        createRoom,
        joinRoom,
        rejoinAsHost,
        leaveRoom,
        updateRoom,
        setMyPeerId,
        sendSignal,
        listenToSignals,
        getCurrentRoom,
        getCurrentRoomId,
        getCurrentRole,
        isHost,
        isGuest,
        freezeAfterConnect,
        unfreeze,
        onRoomUpdate: null,
        onRoomClosed: null
    };
})(window);