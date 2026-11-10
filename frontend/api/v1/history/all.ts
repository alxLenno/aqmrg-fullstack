import type { VercelRequest, VercelResponse } from '@vercel/node';
export const maxDuration = 60;
const canonical = (id: unknown) => !id || String(id).toLowerCase() === 'unknown' ? 'NODE001' : String(id);
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') return response.status(405).json({error:'Method not allowed'});
  const limit = Math.min(5000, Math.max(1, Number(request.query.limit) || 5000));
  const offset = Math.max(0, Number(request.query.offset) || 0);
  const since = typeof request.query.since === 'string' ? request.query.since : '';
  const time = (value: string) => Date.parse(/Z$|[+-]\d{2}:\d{2}$/.test(value) ? value : value.replace(' ', 'T') + '+03:00');
  if (since && !Number.isFinite(time(since))) return response.status(400).json({error:'Invalid history cursor'});
  const device = typeof request.query.device_id === 'string' ? canonical(request.query.device_id) : '';
  try {
    // The primary service supports a prefix limit, not offset pagination.
    // NODE001 includes the historical unknown identity confirmed by the lab.
    const url = new URL('https://aqmrg.pythonanywhere.com/api/v1/history/all');
    url.searchParams.set('limit', String(offset + limit + 1));
    if (device && device !== 'NODE001') url.searchParams.set('device_id', device);
    const upstream = await fetch(url, {signal:AbortSignal.timeout(55000)});
    if (!upstream.ok) throw new Error('History source unavailable');
    const body = await upstream.json();
    const raw = Array.isArray(body) ? body : body.readings;
    if (!Array.isArray(raw)) throw new Error('Invalid history response');
    const page = raw.slice(offset, offset + limit);
    const readings = page.map(r => ({...r, ...r.metrics, original_device_id:r.device_id, device_id:canonical(r.device_id), recorded_at:r.timestamp || r.recorded_at}))
      .filter(r => (!device || r.device_id === device) && (!since || time(r.recorded_at) >= time(since)));
    response.setHeader('Cache-Control','no-store');
    return response.status(200).json({readings,count:readings.length,next_offset:raw.length > offset + limit && (!since || page.every(r => time(r.timestamp || r.recorded_at) >= time(since))) ? offset + limit : null});
  } catch {
    return response.status(503).json({error:'Historical source unavailable. Retry; no empty dataset has been substituted.'});
  }
}
