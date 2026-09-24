import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

let posts = [];
let respond = (records) => records.map((r) => ({ clientId: r.clientId, status: 'Synced' }));
mock.module('../src/services/api.js', {
  defaultExport: {
    post: async (url, body) => {
      posts.push({ url, body });
      return { data: { data: respond(body.records) } };
    },
  },
});

const { addToQueue, getQueue, syncQueue } = await import('../src/services/offlineQueue.js');

const TOKEN = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

test.beforeEach(() => { store.clear(); posts = []; });

test('an offline QR scan is queued with its token and no eligibility claim', () => {
  addToQueue({ qrToken: TOKEN, examId: 'e1' });
  const [item] = getQueue();
  assert.equal(item.qrToken, TOKEN);
  assert.equal(item.examId, 'e1');
  assert.ok(item.clientId && item.queuedAt);
  assert.equal('eligible' in item || 'eligibilityStatus' in item, false);
});

test('scanning the same student twice offline queues one item', () => {
  addToQueue({ qrToken: TOKEN, examId: 'e1' });
  addToQueue({ qrToken: TOKEN, examId: 'e1' });
  addToQueue({ qrToken: TOKEN, examId: 'e2' });
  assert.equal(getQueue().length, 2);
});

test('sync posts queued QR items to /attendance/sync and removes only synced ones', async () => {
  addToQueue({ qrToken: TOKEN, examId: 'e1' });
  addToQueue({ studentId: 'CS-2', examId: 'e1' });
  respond = (records) => records.map((r, i) => ({ clientId: r.clientId, status: i === 0 ? 'Synced' : 'Failed' }));

  const out = await syncQueue();
  assert.equal(posts[0].url, '/attendance/sync');
  assert.equal(posts[0].body.records[0].qrToken, TOKEN);
  assert.equal(out.synced, 1);
  assert.deepEqual(getQueue().map((r) => r.studentId), ['CS-2']);
});

test('concurrent sync calls share one request (no double submission)', async () => {
  addToQueue({ qrToken: TOKEN, examId: 'e1' });
  respond = (records) => records.map((r) => ({ clientId: r.clientId, status: 'Synced' }));
  await Promise.all([syncQueue(), syncQueue(), syncQueue()]);
  assert.equal(posts.length, 1);
  assert.equal(getQueue().length, 0);
});
