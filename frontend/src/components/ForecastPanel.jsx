import { chartValue } from '../utils/charts';
import { readingTime } from '../utils/display';
export default function ForecastPanel({ forecast, comparison, loading, error }) {
 const nodes=Array.isArray(forecast?.nodes)?forecast.nodes:forecast?[forecast]:[];
 return <section className="card overview-forecast" aria-labelledby="estimate-title"><header className="card-header"><div><h3 id="estimate-title">PM2.5 model estimates</h3><p>Model output, shown separately from measured readings</p></div></header>
 {loading?<p className="overview-empty" role="status">Loading estimates…</p>:error?<p className="overview-empty" role="status">Estimates are currently unavailable. Check the node readings and connection status for available data.</p>:!nodes.length?<p className="overview-empty">No model estimates are available for this selection.</p>:<div className="overview-estimate-list">{nodes.map((node,i)=>{
 const comp=Array.isArray(comparison?.nodes)?comparison.nodes.find(c=>c.device_id===node.device_id):comparison;
 const estimate=chartValue('pm25',node.prediction),measured=chartValue('pm25',comp?.actual_pm25??node.actual_pm25);
 const time=readingTime(node.timestamp),alternatives=[['Ensemble',comp?.ensemble_median],...Object.entries(comp?.predictions||{})].filter(([,v])=>chartValue('pm25',v)!==null);
 return <article className="overview-estimate" key={node.device_id||i}><div><span className="overview-estimate-node">{node.device_id?`Node ${node.device_id}`:'Model output'}</span><strong>{estimate===null?'—':estimate.toFixed(2)} <small>µg/m³</small></strong><p>{time?new Date(time).toLocaleString('en-GB',{timeZone:'Africa/Nairobi',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+' EAT':'Estimate timestamp unavailable'}</p></div><div className="overview-estimate-context"><p>{estimate===null?'No estimate supplied':measured===null?'No paired measurement supplied':`Estimate − measured: ${estimate-measured>0?'+':''}${(estimate-measured).toFixed(2)} µg/m³`}</p>{alternatives.length>0&&<details><summary>Model comparisons</summary><dl>{alternatives.map(([name,value])=><div key={name}><dt>{name}</dt><dd>{Number(value).toFixed(2)} µg/m³</dd></div>)}</dl><p>Comparison outputs are not a confidence score or an independent model validation.</p></details>}</div></article>;
 })}</div>}
 </section>;
}
