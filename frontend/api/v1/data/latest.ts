import type { VercelRequest, VercelResponse } from '@vercel/node';
export const maxDuration = 60;
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') return response.status(405).json({error:'Method not allowed'});
  const url = new URL('https://aqmrg.pythonanywhere.com/api/v1/data/latest');
  url.searchParams.set('per_node','true');
  if (typeof request.query.device_id === 'string' && request.query.device_id) url.searchParams.set('device_id',request.query.device_id);
  for (let attempt=0; attempt<2; attempt++) {
    try {
      const upstream = await fetch(url, {signal:AbortSignal.timeout(25000)});
      if (!upstream.ok) throw new Error('Source unavailable');
      const body = await upstream.json();
      const sensors = Array.isArray(body) ? body : body.sensors;
      if (!Array.isArray(sensors)) throw new Error('Invalid source response');
      response.setHeader('Cache-Control','no-store');
      return response.status(200).json({sensors,sensorsCount:sensors.length,sourceAvailable:true});
    } catch { /* Retry one transient timeout without inventing readings. */ }
  }
  return response.status(503).json({error:'Live readings are temporarily unavailable. Historical analysis remains available.',sourceAvailable:false});
}
