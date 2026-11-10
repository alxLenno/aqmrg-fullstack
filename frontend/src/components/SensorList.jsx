import { useEffect, useState } from 'react';
import { discoverMetrics, formatMetricLabel, getMetricUnit } from '../utils/metrics';
import { chartValue } from '../utils/charts';
import { ageText, freshness, readingTime } from '../utils/display';
export default function SensorList({ sensors, loading }) {
 const[now,setNow]=useState(() => Date.now());useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const list=Array.isArray(sensors)?sensors:[];
 return <section className="card overview-nodes" aria-labelledby="overview-nodes-title"><header className="card-header"><div><h3 id="overview-nodes-title">Node readings</h3><p>Latest values reported by each node</p></div></header>
 {loading?<p className="overview-empty" role="status">Loading node readings…</p>:!list.length?<p className="overview-empty">No node readings are available. New reports will appear automatically.</p>:<div className="overview-node-list">{list.map(sensor=>{
 const state=sensor.status_unknown?'unverified':freshness(sensor,now),time=readingTime(sensor.last_seen),keys=discoverMetrics([sensor]);const ordered=['pm25',...keys.filter(k=>k!=='pm25'&&!k.startsWith('predicted_')&&!k.startsWith('forecast_'))].filter(k=>k==='pm25'||chartValue(k,sensor.readings?.[k])!==null);
 return <article className="overview-node" key={sensor.device_id||sensor.id}><header><div><h4>Node {sensor.device_id||'unavailable'}</h4><p>{sensor.location_name&&sensor.location_name!=='Unknown'?sensor.location_name:'Location unavailable'}</p></div><span className={`overview-node-state ${state}`}>{state==='fresh'?'Fresh':state==='stale'?'Stale':state==='unverified'?'Unverified':'Time unknown'} · {ageText(time,now)}</span></header>
 <dl className="overview-reading-grid">{ordered.map(key=>{const value=chartValue(key,sensor.readings?.[key]);return <div key={key}><dt>{formatMetricLabel(key)}</dt><dd>{value===null?'—':value.toLocaleString('en-GB',{maximumFractionDigits:key==='co'||key==='o3'?3:1})} <small>{getMetricUnit(key)}</small></dd></div>;})}</dl>
 </article>;
 })}</div>}
 </section>;
}
