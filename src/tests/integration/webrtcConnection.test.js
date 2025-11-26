describe('WebRTCConnection', () => {
  // Mock RTCPeerConnection
  const mockPeerConnection = {
    createOffer: jest.fn(),
    createAnswer: jest.fn(),
    setLocalDescription: jest.fn(),
    setRemoteDescription: jest.fn(),
    addIceCandidate: jest.fn(),
    close: jest.fn(),
    createDataChannel: jest.fn(),
    onicecandidate: null,
    onconnectionstatechange: null,
    ondatachannel: null,
    signalingState: 'stable',
    connectionState: 'new',
    remoteDescription: null,
  };

  // Mock DataChannel
  const mockDataChannel = {
    send: jest.fn(),
    close: jest.fn(),
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
    readyState: 'connecting',
  };

  // Mock RoomManager
  const mockRoomManager = {
    setMyPeerId: jest.fn(),
    sendSignal: jest.fn(),
    listenToSignals: jest.fn(),
    getCurrentRoom: jest.fn(),
    freezeAfterConnect: jest.fn(),
    unfreeze: jest.fn(),
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup mock implementations
    mockPeerConnection.createOffer.mockResolvedValue({ type: 'offer', sdp: 'test-sdp' });
    mockPeerConnection.createAnswer.mockResolvedValue({ type: 'answer', sdp: 'test-sdp' });
    mockPeerConnection.setLocalDescription.mockResolvedValue();
    mockPeerConnection.setRemoteDescription.mockResolvedValue();
    mockPeerConnection.addIceCandidate.mockResolvedValue();
    mockPeerConnection.createDataChannel.mockReturnValue(mockDataChannel);

    global.RTCPeerConnection = jest.fn(() => mockPeerConnection);
    global.RTCIceCandidate = jest.fn();
    global.RTCSessionDescription = jest.fn((desc) => desc);
    global.RoomManager = mockRoomManager;

    // Load the script
    __loadScript('src/scripts/webrtcConnection.js');
  });

  test('should initialize as host', async () => {
    const result = await window.WebRTCConnection.init('host');
    expect(result.success).toBe(true);
    expect(result.peerId).toBeDefined();
    expect(global.RTCPeerConnection).toHaveBeenCalledTimes(1);
    expect(mockRoomManager.setMyPeerId).toHaveBeenCalledWith(result.peerId);
    expect(mockRoomManager.listenToSignals).toHaveBeenCalledTimes(1);
  });

  test('should initialize as guest', async () => {
    const result = await window.WebRTCConnection.init('guest');
    expect(result.success).toBe(true);
    expect(result.peerId).toBeDefined();
    expect(global.RTCPeerConnection).toHaveBeenCalledTimes(1);
    expect(mockRoomManager.setMyPeerId).toHaveBeenCalledWith(result.peerId);
    expect(mockRoomManager.listenToSignals).toHaveBeenCalledTimes(1);
  });

  test('should create an offer as host', async () => {
    await window.WebRTCConnection.init('host');
    const result = await window.WebRTCConnection.createOffer();

    expect(result.success).toBe(true);
    expect(mockPeerConnection.createOffer).toHaveBeenCalledTimes(1);
    expect(mockPeerConnection.setLocalDescription).toHaveBeenCalledWith({ type: 'offer', sdp: 'test-sdp' });
    expect(mockRoomManager.sendSignal).toHaveBeenCalledWith({
      type: 'offer',
      from: 'host',
      to: 'guest',
      data: { type: 'offer', sdp: 'test-sdp' },
    });
  });

  test('should handle an offer and create an answer as guest', async () => {
    await window.WebRTCConnection.init('guest');

    const handleSignal = mockRoomManager.listenToSignals.mock.calls[0][0];
    const offerSignal = {
      type: 'offer',
      from: 'host',
      to: 'guest',
      data: { type: 'offer', sdp: 'host-sdp' },
    };

    await handleSignal(offerSignal);

    expect(mockPeerConnection.setRemoteDescription).toHaveBeenCalledWith({ type: 'offer', sdp: 'host-sdp' });
    expect(mockPeerConnection.createAnswer).toHaveBeenCalledTimes(1);
    expect(mockPeerConnection.setLocalDescription).toHaveBeenCalledWith({ type: 'answer', sdp: 'test-sdp' });
    expect(mockRoomManager.sendSignal).toHaveBeenCalledWith({
      type: 'answer',
      from: 'guest',
      to: 'host',
      data: { type: 'answer', sdp: 'test-sdp' },
    });
  });

  test('should handle an answer as host', async () => {
    await window.WebRTCConnection.init('host');

    const handleSignal = mockRoomManager.listenToSignals.mock.calls[0][0];
    const answerSignal = {
      type: 'answer',
      from: 'guest',
      to: 'host',
      data: { type: 'answer', sdp: 'guest-sdp' },
    };

    await handleSignal(answerSignal);

    expect(mockPeerConnection.setRemoteDescription).toHaveBeenCalledWith({ type: 'answer', sdp: 'guest-sdp' });
  });

  test('should send ICE candidates', async () => {
    await window.WebRTCConnection.init('host');

    const iceEvent = {
      candidate: {
        candidate: 'candidate-string',
        sdpMLineIndex: 0,
        sdpMid: '0',
      },
    };

    mockPeerConnection.onicecandidate(iceEvent);

    expect(mockRoomManager.sendSignal).toHaveBeenCalledWith({
      type: 'ice-candidate',
      from: 'host',
      to: 'guest',
      data: {
        candidate: 'candidate-string',
        sdpMLineIndex: 0,
        sdpMid: '0',
      },
    });
  });

  test('should handle incoming ICE candidates', async () => {
    await window.WebRTCConnection.init('guest');
    // Remote description needs to be set before adding ICE candidates
    mockPeerConnection.remoteDescription = { type: 'offer', sdp: 'host-sdp' };

    const handleSignal = mockRoomManager.listenToSignals.mock.calls[0][0];
    const iceSignal = {
      type: 'ice-candidate',
      from: 'host',
      to: 'guest',
      data: {
        candidate: 'candidate-string',
        sdpMLineIndex: 0,
        sdpMid: '0',
      },
    };

    await handleSignal(iceSignal);

    expect(global.RTCIceCandidate).toHaveBeenCalledWith({
      candidate: 'candidate-string',
      sdpMLineIndex: 0,
      sdpMid: '0',
    });
    expect(mockPeerConnection.addIceCandidate).toHaveBeenCalledTimes(1);
  });

  test('should send a message via the data channel', async () => {
    // Initialize as host, which creates the data channel
    await window.WebRTCConnection.init('host');

    // Simulate the data channel being open
    mockDataChannel.readyState = 'open';

    const message = { type: 'test', payload: 'hello' };
    const result = window.WebRTCConnection.sendMessage(message);

    expect(result.success).toBe(true);
    expect(mockDataChannel.send).toHaveBeenCalledWith(JSON.stringify(message));
  });

  test('should handle an incoming message from the data channel', async () => {
    const onMessageCallback = jest.fn();
    window.WebRTCConnection.onMessage = onMessageCallback;

    // Initialize as guest and simulate data channel creation
    await window.WebRTCConnection.init('guest');
    mockPeerConnection.ondatachannel({ channel: mockDataChannel });

    const message = { type: 'test', payload: 'world' };
    const event = { data: JSON.stringify(message) };
    mockDataChannel.onmessage(event);

    expect(onMessageCallback).toHaveBeenCalledWith(message);
  });
});
