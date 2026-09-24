// Lightweight offline queue for attendance records captured while the
// invigilator's device has no internet connection (FR-13, FR-14).
// Records are kept in localStorage on the device until they can be
// synced to the backend via POST /api/attendance/sync.
//
// A queued item identifies the student either by `studentId` (manual entry) or by
// `qrToken` (QR scan made offline, where the Student ID cannot be resolved yet).
// Nothing about eligibility is stored: the server recomputes it during sync.

import api from './api.js';

const QUEUE_KEY = 'seams_offline_queue';

const newClientId = () => (
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
);

export const getQueue = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveQueue = (queue) => localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

const sameTarget = (a, b) => (
  a.examId === b.examId
  && ((a.qrToken && a.qrToken === b.qrToken) || (a.studentId && a.studentId === b.studentId))
);

// Returns the queue. An identical pending item (same exam + same student/QR) is
// not queued twice.
export const addToQueue = (record) => {
  const queue = getQueue();
  if (!queue.some((item) => sameTarget(item, record))) {
    queue.push({ ...record, clientId: newClientId(), queuedAt: new Date().toISOString() });
    saveQueue(queue);
  }
  return queue;
};

export const clearQueue = () => saveQueue([]);

export const removeSyncedFromQueue = (syncedClientIds) => {
  saveQueue(getQueue().filter((r) => !syncedClientIds.includes(r.clientId)));
};

let inFlight = null;

// Pushes everything currently queued to the server. Concurrent callers share the
// same request so an item can never be submitted twice at once.
export const syncQueue = () => {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    // Items queued before clientIds existed get one now so results can be matched.
    const queue = getQueue().map((r) => (r.clientId ? r : { ...r, clientId: newClientId() }));
    if (queue.length === 0) return { synced: 0, results: [] };
    saveQueue(queue);

    const payload = queue.map((r) => ({
      clientId: r.clientId,
      studentId: r.studentId,
      qrToken: r.qrToken,
      examId: r.examId,
      timeStamp: r.queuedAt,
    }));

    const { data } = await api.post('/attendance/sync', { records: payload });

    const syncedIds = (data.data || [])
      .filter((r) => r.status === 'Synced')
      .map((r) => r.clientId);

    removeSyncedFromQueue(syncedIds);

    return { synced: syncedIds.length, results: data.data };
  })().finally(() => { inFlight = null; });

  return inFlight;
};
