class FakeDoc {
  constructor(id, parentCollection) {
    this.id = id || Math.random().toString(36).substr(2, 9);
    this._data = null;
    this._listeners = [];
    this._parent = parentCollection;
  }

  async get() {
    return { exists: !!this._data, data: () => this._data };
  }

  async set(data, options) {
    if (options && options.merge && this._data) {
      this._data = Object.assign({}, this._data, data);
    } else {
      this._data = Object.assign({}, data);
    }
    this._triggerSnapshot();
    return Promise.resolve();
  }

  async update(data) {
    if (!this._data) throw new Error('No document');
    this._data = Object.assign({}, this._data, data);
    this._triggerSnapshot();
    return Promise.resolve();
  }

  async delete() {
    this._data = null;
    this._triggerSnapshotDeleted();
    return Promise.resolve();
  }

  onSnapshot(cb) {
    this._listeners.push(cb);
    // initial call
    cb(this._snapshotObj());
    return () => {
      const i = this._listeners.indexOf(cb);
      if (i !== -1) this._listeners.splice(i, 1);
    };
  }

  _snapshotObj() {
    const self = this;
    return {
      exists: !!self._data,
      data: () => self._data,
      ref: self
    };
  }

  _triggerSnapshot() {
    const snap = this._snapshotObj();
    this._listeners.forEach(cb => {
      try { cb(snap); } catch (e) { }
    });
  }

  _triggerSnapshotDeleted() {
    const snap = { exists: false };
    this._listeners.forEach(cb => {
      try { cb(snap); } catch (e) { }
    });
  }

  collection(name) {
    if (!this._collections) this._collections = {};
    if (!this._collections[name]) this._collections[name] = new FakeCollection(name, this);
    return this._collections[name];
  }
}

class FakeCollection {
  constructor(name, parentDoc) {
    this.name = name;
    this._docs = new Map();
    this._parent = parentDoc || null;
    this._whereListeners = [];
  }

  doc(id) {
    if (!id) {
      const d = new FakeDoc(undefined, this);
      this._docs.set(d.id, d);
      return d;
    }
    if (!this._docs.has(id)) {
      this._docs.set(id, new FakeDoc(id, this));
    }
    return this._docs.get(id);
  }

  where(field, op, value) {
    // create a simple query object that supports onSnapshot
    const coll = this;
    return {
      onSnapshot(cb) {
        // register listener
        const listener = { field, op, value, cb };
        coll._whereListeners.push(listener);
        // initial: find matching docs
        const matches = [];
        for (const [id, doc] of coll._docs.entries()) {
          if (doc._data && doc._data[field] === value) {
            matches.push({ type: 'added', doc: { data: () => doc._data, ref: doc } });
          }
        }
        try { cb({ docChanges: () => matches }); } catch (e) { }
        return () => {
          const idx = coll._whereListeners.indexOf(listener);
          if (idx !== -1) coll._whereListeners.splice(idx, 1);
        };
      }
    };
  }

  _notifyWhereListeners(change) {
    for (const l of this._whereListeners) {
      if (change.doc.data()[l.field] === l.value) {
        try { l.cb({ docChanges: () => [change] }); } catch (e) { }
      }
    }
  }
}

class FakeFirestore {
  constructor() {
    this._collections = new Map();
  }

  collection(name) {
    if (!this._collections.has(name)) this._collections.set(name, new FakeCollection(name));
    return this._collections.get(name);
  }

  // helper for tests to add a signal to a room's signals collection
  async addSignal(roomId, signal) {
    const rooms = this.collection('rooms');
    const roomDoc = rooms.doc(roomId);
    const signals = roomDoc.collection('signals');
    const doc = signals.doc();
    await doc.set(signal);
    // construct change object and notify listeners
    signals._notifyWhereListeners({ type: 'added', doc: { data: () => doc._data, ref: doc } });
    return doc;
  }
}

module.exports = { FakeFirestore, FakeCollection, FakeDoc };
