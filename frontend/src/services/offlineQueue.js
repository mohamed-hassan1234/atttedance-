// Lightweight offline queue for attendance records captured while the
// invigilator's device has no internet connection (FR-13, FR-14).
// Records are kept in localStorage on the device until they can be
// synced to the backend via POST /api/attendance/sync.

import api from './api';

const QUEUE_KEY = 'seams_offline_queue';

export const getQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
  } catch {
    return [];
  }
};

export const addToQueue = (record) => {
  const queue = getQueue();
  queue.push({ ...record, queuedAt: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return queue;
};

export const clearQueue = () => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
};

export const removeSyncedFromQueue = (syncedStudentIds) => {
  const queue = getQueue().filter((r) => !syncedStudentIds.includes(r.studentId));
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

// Attempts to push everything currently queued to the server.
// Returns the sync results array from the backend.
export const syncQueue = async () => {
  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, results: [] };

  const payload = queue.map((r) => ({
    studentId: r.studentId,
    examId: r.examId,
    timeStamp: r.queuedAt,
  }));

  const { data } = await api.post('/attendance/sync', { records: payload });

  const syncedIds = (data.data || [])
    .filter((r) => r.status === 'Synced')
    .map((r) => r.studentId);

  removeSyncedFromQueue(syncedIds);

  return { synced: syncedIds.length, results: data.data };
};
