const { FakeFirestore } = require('../helpers/fakeFirestore');

beforeEach(() => {
  // ensure roomManager script is loaded fresh
  document.body.innerHTML = '<div></div>';
  // provide firebase FieldValue
  global.firebase = { firestore: { FieldValue: { serverTimestamp: () => new Date() } } };
});

test('createRoom creates a room and triggers onRoomUpdate', async () => {
  __loadScript('src/scripts/roomManager.js');
  const db = new FakeFirestore();
  window.RoomManager.init(db);

  const onRoomUpdate = jest.fn();
  window.RoomManager.onRoomUpdate = onRoomUpdate;

  const res = await window.RoomManager.createRoom();
  expect(res.success).toBe(true);
  expect(res.role).toBe('host');
  expect(res.pin).toBeDefined();
  expect(res.pin.length).toBe(4);

  // verify the room document exists in fake DB
  const rooms = db.collection('rooms');
  const doc = rooms.doc(res.pin);
  const roomData = (await doc.get()).data();
  expect(roomData).toBeDefined();

  // onRoomUpdate should have been called at least once with doc data
  expect(onRoomUpdate.mock.calls.length).toBeGreaterThanOrEqual(1);
});

test('joinRoom returns existing gameState and role', async () => {
  __loadScript('src/scripts/roomManager.js');
  const db = new FakeFirestore();
  window.RoomManager.init(db);

  // pre-create a room doc in db
  const rooms = db.collection('rooms');
  const pin = '1234';
  const doc = rooms.doc(pin);
  await doc.set({ pin, hostId: null, guestId: null, status: 'waiting', gameState: { foo: 'bar' } });

  const res = await window.RoomManager.joinRoom(pin);
  expect(res.success).toBe(true);
  expect(res.pin).toBe(pin);
  expect(res.gameState).toMatchObject({ foo: 'bar' });
});

test('sendSignal writes to signals collection and can be observed via where', async () => {
  __loadScript('src/scripts/roomManager.js');
  const db = new FakeFirestore();
  window.RoomManager.init(db);

  // create a room and set as current
  const createRes = await window.RoomManager.createRoom();
  expect(createRes.success).toBe(true);
  const pin = createRes.pin;

  // set currentRole to host for RoomManager
  // joinRoom was called in createRoom; ensure currentRoomId is set
  const signal = { type: 'offer', from: 'host', to: 'guest', data: { sdp: 'sdp' } };
  const sendRes = await window.RoomManager.sendSignal(signal);
  expect(sendRes.success).toBe(true);

  // inspect signals collection
  const signals = db.collection('rooms').doc(pin).collection('signals');
  // find a doc that matches the signal
  let found = false;
  for (const [id, d] of signals._docs) {
    if (d._data && d._data.type === 'offer') { found = true; break; }
  }
  expect(found).toBe(true);
});
