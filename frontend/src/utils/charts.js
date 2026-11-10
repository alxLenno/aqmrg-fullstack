export function chartValue(key, value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || (key !== 'temperature' && number < 0)) return null;
  return number;
}
export function chartSummary(data, key) {
  const values = data.map(row => chartValue(key, row[key])).filter(value => value !== null);
  if (!values.length) return null;
  return { count: values.length, min: Math.min(...values), max: Math.max(...values),
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    latest: values.at(-1), change: values.at(-1) - values[0] };
}
export function histogram(data, key) {
  const values = data.map(row => chartValue(key, row[key])).filter(value => value !== null);
  if (!values.length) return [];
  const min = Math.min(...values), max = Math.max(...values);
  if (min === max) return [{ start: min, end: max, count: values.length }];
  const count = Math.min(10, Math.max(2, Math.ceil(Math.sqrt(values.length))));
  const width = (max - min) / count;
  const bins = Array.from({ length: count }, (_, index) => ({ start: min + index * width, end: index === count - 1 ? max : min + (index + 1) * width, count: 0 }));
  values.forEach(value => { bins[Math.min(count - 1, Math.floor((value - min) / width))].count += 1; });
  return bins;
}
