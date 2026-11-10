import { useEffect, useState } from 'react';
import { ageText, freshness, readingTime, numericReading } from '../utils/display';
export default function StatsGrid({ sensors, loading, selectedDevice }) {
 const[now,setNow]=useState(() => Date.now());useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const list=Array.isArray(sensors)?sensors:[],fresh=list.filter(s=>freshness(s,now)==='fresh');
 const values=fresh.map(s=>numericReading(s.readings?.pm25)).filter(v=>v!==null);
 const times=list.map(s=>readingTime(s.last_seen)).filter(t=>t!==null&&t<=now+60000);
 const latest=times.length?Math.max(...times):null;
 return <section className="overview-summary" aria-label="Network summary" aria-busy={loading}>
 <article><span className="overview-summary-label">{selectedDevice ? 'Selected node PM2.5' : 'Network PM2.5'}</span><strong>{loading?'—':values.length?(values.reduce((a,b)=>a+b,0)/values.length).toFixed(1):'—'} <small>µg/m³</small></strong><span>{loading?'Loading readings':`${values.length} fresh node${values.length===1?'':'s'} contributing`}</span></article>
 <article><span className="overview-summary-label">Reporting nodes</span><strong>{loading?'—':fresh.length} <small>/ {list.length}</small></strong><span>{loading?'Checking nodes':list.length===0?'No nodes available':`${list.length-fresh.length} stale or unavailable · 5-minute freshness window`}</span></article>
 <article><span className="overview-summary-label">Latest sensor report</span><strong className="overview-report-age">{loading?'—':ageText(latest,now)}</strong><span>{latest?new Date(latest).toLocaleString('en-GB',{timeZone:'Africa/Nairobi',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+' EAT':'Waiting for a timestamped report'}</span></article>
 </section>;
}
