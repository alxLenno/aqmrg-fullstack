export const FRESH_MS = 5 * 60 * 1000;
export function readingTime(value) {
  if (typeof value !== 'string' || !value) return null;
  const normalized = /Z$|[+-]\d{2}:?\d{2}$/.test(value) ? value : value.replace(' ', 'T') + '+03:00';
  const time = Date.parse(normalized);
  return Number.isFinite(time) ? time : null;
}
export function freshness(sensor, now) {
  const time = readingTime(sensor.last_seen);
  if (time === null || time > now + 60000) return 'unknown';
  return now - time <= FRESH_MS && sensor.is_online !== false ? 'fresh' : 'stale';
}
export function numericReading(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
export function summarize(sensors, now, connected) {
  const fresh = sensors.filter(sensor => freshness(sensor, now) === 'fresh');
  const valid = list => list.map(s => numericReading(s.readings?.pm25)).filter(v => v !== null);
  const current = valid(fresh);
  const historical = valid(sensors);
  const values = connected && current.length ? current : historical;
  const times = sensors.map(s => readingTime(s.last_seen)).filter(t => t !== null && t <= now + 60000);
  return { freshCount: fresh.length, contributing: values.length,
    current: connected && current.length > 0,
    average: values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null,
    latest: times.length ? Math.max(...times) : null };
}
export function ageText(time, now) {
  if (time === null) return 'No timestamp';
  const seconds = Math.max(0, Math.floor((now - time) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
