import { chartValue } from './charts.js';
import { extractMetrics, discoverMetrics, METRIC_CONFIG, formatMetricLabel, getMetricUnit } from './metrics.js';
import { readingTime } from './display.js';
export const MIN_PAIRS = 10;
export const nodeId = row => (!row.device_id || String(row.device_id).toLowerCase() === 'unknown' ? 'NODE001' : String(row.device_id));
export const recordTime = row => readingTime(row.recorded_at || row.timestamp || row.last_seen);
export function storyMetrics(records) {
  const keys = new Set(discoverMetrics(records));
  records.forEach(row => {
    const source = row.readings || row.metrics || row.last_readings || row;
    Object.keys(METRIC_CONFIG).forEach(key => { if (Object.hasOwn(source, key)) keys.add(key); });
  });
  return [...keys].map(key => ({ key, label: formatMetricLabel(key), unit: getMetricUnit(key), color: METRIC_CONFIG[key]?.color || '#3b82f6' }));
}
export function reportedCategory(row) {
  const accepted = new Set(['good','moderate','warning','unhealthy for sensitive','unhealthy for sensitive groups','unhealthy','very unhealthy','danger','hazardous']);
  const candidates = [row.readings?.status, row.metrics?.status, row.status];
  return candidates.find(value => typeof value === 'string' && accepted.has(value.trim().toLowerCase()))?.trim() || null;
}
export function normalizeStory(records) {
  return records.map(row => ({ category: reportedCategory(row), node: nodeId(row), time: recordTime(row), metrics: Object.fromEntries(Object.entries(extractMetrics(row)).map(([key, value]) => [key, chartValue(key, value)])) }));
}
export function assessMetrics(rows, parameters) {
  return parameters.map(parameter => {
    const values = rows.map(row => row.metrics[parameter.key]).filter(value => value !== null && value !== undefined);
    const count = values.length;
    const zeroOnly = count > 0 && values.every(value => value === 0);
    const constant = count > 0 && values.every(value => value === values[0]);
    const reason = !count ? 'No valid readings in this period' : zeroOnly ? 'All valid readings are zero in this period' : null;
    return { ...parameter, count, missing: rows.length - count, zeroOnly, constant,
      excluded: Boolean(reason), reason,
      relationshipReason: reason || (constant ? 'No variation; correlation is undefined' : count < MIN_PAIRS ? `Fewer than ${MIN_PAIRS} valid readings` : null) };
  });
}
export function pairedReadings(rows, keys) {
  return rows.filter(row => keys.every(key => row.metrics[key] !== null && row.metrics[key] !== undefined))
    .map(row => ({ ...Object.fromEntries(keys.map(key => [key, row.metrics[key]])), time: row.time, node: row.node }));
}
export function pearson(rows, xKey, yKey) {
  const pairs = pairedReadings(rows, [xKey, yKey]);
  const n = pairs.length;
  if (n < MIN_PAIRS) return { r: null, n, reason: `Need at least ${MIN_PAIRS} paired readings` };
  const mx = pairs.reduce((s, p) => s + p[xKey], 0) / n;
  const my = pairs.reduce((s, p) => s + p[yKey], 0) / n;
  let xx = 0, yy = 0, xy = 0;
  pairs.forEach(p => { const x = p[xKey] - mx, y = p[yKey] - my; xx += x*x; yy += y*y; xy += x*y; });
  if (xx === 0 || yy === 0) return { r: null, n, reason: 'No variation in the paired readings' };
  return { r: Math.max(-1, Math.min(1, xy / Math.sqrt(xx * yy))), n, reason: null };
}
export function sampleEvenly(rows, maximum = 800) {
  if (rows.length <= maximum) return rows;
  return Array.from({ length: maximum }, (_, i) => rows[Math.round(i * (rows.length - 1) / (maximum - 1))]);
}
export const storyDate = time => time === null ? 'No valid timestamp' : new Date(time).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' EAT';
