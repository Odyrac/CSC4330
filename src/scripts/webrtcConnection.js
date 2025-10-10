(function (global) {
    let peerConnection = null;
    let dataChannel = null;
    let localPeerId = null;
    let isInitiator = false;
    let isPolite = false;
    let signalListener = null;
    let offerRetryInterval = null;
    let lastOfferAt = 0;
    let creatingOffer = false;
    let signalingFrozen = false;
    let pendingIceCandidates = [];

    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ]
    };

    function generatePeerId() {
        return 'peer-' + Math.random().toString(36).substr(2, 9);
    }

    async function init(role, reuseExistingPeerId = false) {
        try {
            if (peerConnection || dataChannel || signalListener) {
                await close();
            }

            try {
                if (window.RoomManager && typeof RoomManager.unfreeze === 'function') {
                    RoomManager.unfreeze('webrtc-init');
                }
            } catch (_) { }

            if (!reuseExistingPeerId || !localPeerId) {
                localPeerId = generatePeerId();
            }

            isInitiator = (role === 'host');
            isPolite = !isInitiator;
            pendingIceCandidates = [];

            if (!reuseExistingPeerId) {
                await RoomManager.setMyPeerId(localPeerId);
            }

            peerConnection = new RTCPeerConnection(configuration);

            peerConnection.onicecandidate = (event) => {
                if (signalingFrozen) return;
                if (event.candidate) {
                    const candidateData = {
                        candidate: event.candidate.candidate,
                        sdpMLineIndex: event.candidate.sdpMLineIndex,
                        sdpMid: event.candidate.sdpMid
                    };

                    RoomManager.sendSignal({
                        type: 'ice-candidate',
                        from: isInitiator ? 'host' : 'guest',
                        to: isInitiator ? 'guest' : 'host',
                        data: candidateData
                    });
                }
            };

            peerConnection.onconnectionstatechange = () => {
                if (global.WebRTCConnection && global.WebRTCConnection.onConnectionStateChange) {
                    global.WebRTCConnection.onConnectionStateChange(peerConnection.connectionState);
                }

                if (peerConnection.connectionState === 'connected') {
                    freezeSignaling('pc-connected');
                    if (global.WebRTCConnection && global.WebRTCConnection.onConnected) {
                        global.WebRTCConnection.onConnected();
                    }
                }

                if (peerConnection.connectionState === 'disconnected' ||
                    peerConnection.connectionState === 'failed') {
                    try {
                        if (window.RoomManager && typeof RoomManager.unfreeze === 'function') {
                            RoomManager.unfreeze('pc-' + peerConnection.connectionState);
                        }
                    } catch (_) { }
                    if (global.WebRTCConnection && global.WebRTCConnection.onDisconnected) {
                        global.WebRTCConnection.onDisconnected();
                    }
                }
            };

            if (isInitiator) {
                dataChannel = peerConnection.createDataChannel('gameChannel');
                setupDataChannel();

                if (offerRetryInterval) {
                    clearInterval(offerRetryInterval);
                    offerRetryInterval = null;
                }
                offerRetryInterval = setInterval(() => {
                    try {
                        const now = Date.now();
                        const room = (global.RoomManager && global.RoomManager.getCurrentRoom) ? global.RoomManager.getCurrentRoom() : null;
                        const connected = isConnected();
                        const canOffer = peerConnection && peerConnection.signalingState === 'stable' && !creatingOffer;

                        if (connected || !canOffer) {
                            return;
                        }

                        if (room && room.guestId) {
                            if (now - lastOfferAt > 4000) {
                                lastOfferAt = now;
                                createOffer().catch(() => { });
                            }
                        }
                    } catch (e) {
                    }
                }, 2500);
            } else {
                peerConnection.ondatachannel = (event) => {
                    dataChannel = event.channel;
                    setupDataChannel();
                };
            }

            if (!signalingFrozen && !signalListener) {
                signalListener = RoomManager.listenToSignals(handleSignal);
            }

            return { success: true, peerId: localPeerId };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    function freezeSignaling(reason = '') {
        if (signalingFrozen) return;
        signalingFrozen = true;
        if (offerRetryInterval) {
            clearInterval(offerRetryInterval);
            offerRetryInterval = null;
        }
        if (signalListener) {
            try { signalListener(); } catch (_) { }
            signalListener = null;
        }
        if (peerConnection) {
            try { peerConnection.onicecandidate = null; } catch (_) { }
        }
        try {
            if (window.RoomManager && typeof RoomManager.freezeAfterConnect === 'function') {
                RoomManager.freezeAfterConnect();
            }
        } catch (_) { }
    }

    function setupDataChannel() {
        if (!dataChannel) return;

        dataChannel.onopen = () => {
            if (offerRetryInterval) {
                clearInterval(offerRetryInterval);
                offerRetryInterval = null;
            }
            freezeSignaling('datachannel-open');
            if (global.WebRTCConnection && global.WebRTCConnection.onDataChannelOpen) {
                global.WebRTCConnection.onDataChannelOpen();
            }
        };

        dataChannel.onclose = () => {
            try {
                if (window.RoomManager && typeof RoomManager.unfreeze === 'function') {
                    RoomManager.unfreeze('datachannel-close');
                }
            } catch (_) { }
            if (global.WebRTCConnection && global.WebRTCConnection.onDataChannelClose) {
                global.WebRTCConnection.onDataChannelClose();
            }
        };

        dataChannel.onerror = () => {
        };

        dataChannel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                if (global.WebRTCConnection && global.WebRTCConnection.onMessage) {
                    global.WebRTCConnection.onMessage(message);
                }
            } catch (error) {
            }
        };
    }

    async function createOffer() {
        try {
            if (signalingFrozen) {
                return { success: false, error: 'Signaling is frozen' };
            }
            if (!isInitiator) {
                throw new Error('Only the host can create an offer');
            }
            if (!peerConnection) {
                throw new Error('PeerConnection not initialized');
            }
            if (creatingOffer) return { success: false, error: 'Offer already in progress' };
            if (peerConnection.signalingState !== 'stable') return { success: false, error: 'Signaling state is not stable' };
            creatingOffer = true;
            const offer = await peerConnection.createOffer({ iceRestart: true });
            await peerConnection.setLocalDescription(offer);

            const offerData = {
                type: offer.type,
                sdp: offer.sdp
            };

            await RoomManager.sendSignal({
                type: 'offer',
                from: 'host',
                to: 'guest',
                data: offerData
            });
            creatingOffer = false;
            return { success: true };
        } catch (error) {
            creatingOffer = false;
            return { success: false, error: error.message };
        }
    }

    async function handleSignal(signal) {
        try {
            if (signalingFrozen) return;
            switch (signal.type) {
                case 'offer':
                    if (!peerConnection) {
                        return;
                    }
                    try {
                        if (peerConnection.signalingState !== 'stable') {
                            if (isPolite) {
                                await peerConnection.setLocalDescription({ type: 'rollback' });
                            } else {
                                try {
                                    await peerConnection.setLocalDescription({ type: 'rollback' });
                                } catch (e) { }
                                try {
                                    await createOffer();
                                } catch (e) { }
                                return;
                            }
                        }
                    } catch (e) {
                    }

                    await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
                    await flushPendingIceCandidates();

                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);

                    const answerData = {
                        type: answer.type,
                        sdp: answer.sdp
                    };

                    await RoomManager.sendSignal({
                        type: 'answer',
                        from: 'guest',
                        to: 'host',
                        data: answerData
                    });
                    break;

                case 'request-offer':
                    if (isInitiator) {
                        try {
                            await createOffer();
                        } catch (e) {
                        }
                    }
                    break;

                case 'answer':
                    try {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
                        await flushPendingIceCandidates();
                    } catch (e) {
                        return;
                    }
                    break;

                case 'ice-candidate':
                    await addOrQueueIceCandidate(signal.data);
                    break;
            }
        } catch (error) {
        }
    }

    async function addOrQueueIceCandidate(candidateData) {
        try {
            if (!peerConnection) return;
            if (!candidateData || candidateData.candidate === null) {
                return;
            }
            const candidate = new RTCIceCandidate(candidateData);
            if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
                try {
                    await peerConnection.addIceCandidate(candidate);
                } catch (e) {
                }
            } else {
                pendingIceCandidates.push(candidate);
            }
        } catch (e) {
        }
    }

    async function flushPendingIceCandidates() {
        if (!pendingIceCandidates || pendingIceCandidates.length === 0) return;
        if (!peerConnection || !peerConnection.remoteDescription) return;
        const queue = pendingIceCandidates;
        pendingIceCandidates = [];
        for (const cand of queue) {
            try {
                await peerConnection.addIceCandidate(cand);
            } catch (e) {
            }
        }
    }

    function sendMessage(message) {
        try {
            if (!dataChannel || dataChannel.readyState !== 'open') {
                return { success: false, error: 'Data channel unavailable' };
            }

            const data = JSON.stringify(message);
            dataChannel.send(data);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async function close() {
        try {
            if (offerRetryInterval) {
                clearInterval(offerRetryInterval);
                offerRetryInterval = null;
            }

            if (signalListener) {
                signalListener();
                signalListener = null;
            }

            if (dataChannel) {
                dataChannel.close();
                dataChannel = null;
            }

            if (peerConnection) {
                peerConnection.close();
                peerConnection = null;
            }

            signalingFrozen = false;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    function isConnected() {
        return dataChannel && dataChannel.readyState === 'open';
    }

    function getPeerId() {
        return localPeerId;
    }

    function getConnectionState() {
        return peerConnection ? peerConnection.connectionState : 'closed';
    }

    global.WebRTCConnection = {
        init,
        createOffer,
        sendMessage,
        close,
        isConnected,
        getPeerId,
        getConnectionState,
        onConnected: null,
        onDisconnected: null,
        onDataChannelOpen: null,
        onDataChannelClose: null,
        onMessage: null,
        onConnectionStateChange: null
    };
})(window);