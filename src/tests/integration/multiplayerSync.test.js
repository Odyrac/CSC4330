describe('MultiplayerSync', () => {
  let mockWebRTC;
  let mockRoomManager;
  let mockGameController;
  let mockGameState;
  let mockToast;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    mockWebRTC = {
      init: jest.fn(),
      createOffer: jest.fn(),
      sendMessage: jest.fn(),
      close: jest.fn(),
      isConnected: jest.fn(() => true),
      onConnected: null,
      onDisconnected: null,
      onDataChannelOpen: null,
      onDataChannelClose: null,
      onMessage: null,
    };

    mockRoomManager = {
      init: jest.fn(),
      createRoom: jest.fn(),
      joinRoom: jest.fn(),
      sendSignal: jest.fn(),
      listenToSignals: jest.fn(),
      isHost: jest.fn(() => true),
      onRoomUpdate: null,
      onRoomClosed: null,
      freezeAfterConnect: jest.fn(),
    };

    mockGameController = {
      setupGame: jest.fn(),
    };

    mockGameState = {
      players: {
        player: { facedown: [{id: 'p1'}], current: null, discard: [] },
        opponent: { facedown: [{id: 'o1'}], current: null, discard: [] },
      },
      board: [],
      trumpPiles: [],
      foundationPiles: [],
      currentPlayerId: 'player',
    };

    mockToast = {
      show: jest.fn(),
    };

    global.WebRTCConnection = mockWebRTC;
    global.RoomManager = mockRoomManager;
    global.GameController = mockGameController;
    global.GameState = mockGameState;
    global.Toast = mockToast;

    // Load the script
    __loadScript('src/scripts/multiplayerSync.js');
  });

  test('should initialize without errors', () => {
    expect(() => window.MultiplayerSync.init()).not.toThrow();
  });
});
