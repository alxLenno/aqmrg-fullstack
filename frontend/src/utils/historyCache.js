import { fetchAllHistory } from '../api/dashboard';
let snapshot = null;
let pending = null;
let restored = false;
const timestamp = row => row.recorded_at || row.timestamp;
const time = value => Date.parse(/Z$|[+-]\d{2}:\d{2}$/.test(value || '') ? value : String(value).replace(' ', 'T') + '+03:00');
export const historyKey = row => row.id != null ? `${row.original_device_id || row.device_id}:${row.id}` : `${row.original_device_id || row.device_id}:${timestamp(row)}`;
export function mergeHistory(previous, incoming) {
  const merged = new Map(previous.map(row => [historyKey(row), row]));
  incoming.forEach(row => merged.set(historyKey(row), row));
  return [...merged.values()];
}
async function storage(write) {
  if (typeof indexedDB === 'undefined') return null;
  return new Promise(resolve => {
    const open = indexedDB.open('uil-history-v1', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('snapshots');
    open.onerror = () => resolve(null);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('snapshots', write ? 'readwrite' : 'readonly');
      const request = write ? tx.objectStore('snapshots').put(write, 'all') : tx.objectStore('snapshots').get('all');
      let result = null;
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onerror = tx.onabort = () => { db.close(); resolve(null); };
    };
  });
}
export async function cachedHistory() {
  if (!restored) { const saved = await storage(); snapshot = snapshot || (Array.isArray(saved) ? saved : null); restored = true; }
  return snapshot;
}
export async function refreshHistory() {
  if (pending) return pending;
  pending = (async () => {
    await cachedHistory();
    const latest = (snapshot || []).reduce((best, row) => time(timestamp(row)) > time(best) || !best ? timestamp(row) : best, null);
    // Include the boundary timestamp so readings arriving at the same second are retained.
    const incoming = await fetchAllHistory(latest ? 200 : 5000, '', {since:latest, cache:'no-store', signal:AbortSignal.timeout(300000)});
    snapshot = mergeHistory(snapshot || [], incoming);
    await storage(snapshot);
    return snapshot;
  })();
  try { return await pending; } finally { pending = null; }
}
