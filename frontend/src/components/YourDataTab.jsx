import { describe } from '../utils/storyStatistics';
import { createPortal } from 'react-dom';
import StyledSelect from './StyledSelect';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchDashboardData } from '../api/dashboard';
import { MIN_PAIRS, nodeId, normalizeStory, storyMetrics, assessMetrics, pairedReadings, pearson, sampleEvenly, storyDate } from '../utils/story';
import { cachedHistory, refreshHistory } from '../utils/historyCache';
import MetricCharts from './MetricCharts';
import AboutLab from './AboutLab';
import { ShapeFigure, CategoryFigure, ScatterGridFigure } from './StoryFigures';
import './DataStory.css';
const Story3D = lazy(() => import('./Story3D'));
const savedView = () => { try { return JSON.parse(localStorage.getItem('uil-story-view') || '{}'); } catch { return {}; } };
const format = value => Number(value).toLocaleString('en-GB', { maximumFractionDigits: 3 });

export default function YourDataTab({ selectedDevice = '', presentation = false, autoPlay = false, chapterHost = null }) {
  const [initialView] = useState(savedView);
  const [liveResolved, setLiveResolved] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveError, setLiveError] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [liveNodes, setLiveNodes] = useState([]);
  const [historyScope, setHistoryScope] = useState(initialView.historyScope ?? false);
  const [node, setNode] = useState(initialView.node ?? '');
  const [period, setPeriod] = useState(initialView.period ?? '24');
  const [focusKey, setFocusKey] = useState(initialView.focusKey ?? 'pm25');
  const [xKey, setXKey] = useState(initialView.xKey || 'temperature');
  const [zKey, setZKey] = useState(initialView.zKey || 'humidity');
  const [chapter, setChapter] = useState(initialView.chapter ?? 'lab');
  const [playing, setPlaying] = useState(autoPlay);
  const [duration, setDuration] = useState(initialView.duration ?? 30);
  const [remaining, setRemaining] = useState(30);
  const [threeDReady, setThreeDReady] = useState(false);

  useEffect(() => {
    let stopped = false, timer, controller;
    async function load() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000);
      try {
        // Live availability must never gate historical analysis.
        fetchDashboardData('', { signal: controller.signal }).then(live => {
          if (!stopped) { setLiveNodes(live.sensors.filter(s => s.is_online).map(s => s.device_id)); setLiveError(false); setLiveResolved(true); }
        }).catch(() => { if (!stopped) setLiveError(true); });
        const cached = await cachedHistory();
        if (!stopped && cached) { setHistory(cached); setLoading(false); }
        const data = await refreshHistory();
        if (!stopped) { setHistory(Array.isArray(data) ? data.filter(row => row && typeof row === 'object') : []); setError(''); }
      } catch { if (!stopped) setError('Historical data could not refresh. Any charts below use the last successful batch.'); }
      finally { clearTimeout(timeout); if (!stopped) { setLoading(false); timer = setTimeout(load, 60000); } }
    }
    load();
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); };
  }, [refresh]);
  useEffect(() => {
    const visibility = () => { if (document.hidden) setPlaying(false); };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  const nodes = useMemo(() => [...new Set(history.map(nodeId))].sort(), [history]);
  const availableNodes = historyScope ? nodes : nodes.filter(id => liveNodes.includes(id) || (!liveResolved && id === initialView.node));
  const activeNode = (availableNodes.includes(node) ? node : availableNodes.includes(selectedDevice) ? selectedDevice : availableNodes[0]) || '';
  useEffect(() => {
    try { localStorage.setItem('uil-story-view', JSON.stringify({historyScope,node:activeNode || initialView.node || '',period,focusKey,xKey,zKey,chapter,duration})); } catch { /* Storage can be disabled. */ }
  }, [historyScope,activeNode,initialView,period,focusKey,xKey,zKey,chapter,duration]);
  const nodeHistory = useMemo(() => history.filter(row => nodeId(row) === activeNode), [history, activeNode]);
  const normalized = useMemo(() => normalizeStory(nodeHistory), [nodeHistory]);
  const rows = useMemo(() => {
    const valid = normalized.filter(row => row.time !== null).sort((a,b) => a.time - b.time);
    const end = valid.at(-1)?.time;
    return period === 'all' ? valid : valid.filter(row => row.time >= end - Number(period)*3600000);
  }, [normalized, period]);
  const parameters = useMemo(() => storyMetrics(nodeHistory), [nodeHistory]);
  const assessments = useMemo(() => assessMetrics(rows, parameters), [rows, parameters]);
  const included = useMemo(() => assessments.filter(metric => !metric.excluded), [assessments]);
  const excluded = useMemo(() => assessments.filter(metric => metric.excluded), [assessments]);
  const focus = included.find(metric => metric.key === focusKey) || included.find(metric => metric.key === 'pm25') || included[0];
  const relatable = useMemo(() => activeNode === 'Unknown node' ? [] : assessments.filter(metric => !metric.relationshipReason), [assessments, activeNode]);
  const relationships = useMemo(() => focus ? relatable.filter(metric => metric.key !== focus.key).map(metric => ({ ...metric, ...pearson(rows, metric.key, focus.key) })).filter(item => item.r !== null).sort((a,b) => Math.abs(b.r)-Math.abs(a.r)) : [], [rows, relatable, focus]);
  const x = relationships.find(metric => metric.key === xKey) || relationships[0];
  const scatterPoints = useMemo(() => focus && x ? pairedReadings(rows, [x.key, focus.key]) : [], [rows, focus, x]);
  const shownScatter = useMemo(() => period === 'all' ? scatterPoints : sampleEvenly(scatterPoints, 800), [scatterPoints, period]);
  const matrixKeys = useMemo(() => {
    const keys = focus && !focus.relationshipReason ? [focus, ...relationships] : relatable;
    return keys.slice(0, presentation ? 6 : 8);
  }, [focus, relationships, relatable, presentation]);
  const matrix = useMemo(() => matrixKeys.map(y => matrixKeys.map(x => pearson(rows, x.key, y.key))), [rows, matrixKeys]);
  const z = relatable.find(metric => metric.key === zKey && metric.key !== x?.key && metric.key !== focus?.key) || relatable.find(metric => metric.key !== x?.key && metric.key !== focus?.key);
  const axes3d = useMemo(() => x && focus && z ? [x, focus, z] : [], [x, focus, z]);
  const triplePoints = useMemo(() => axes3d.length === 3 ? pairedReadings(rows, axes3d.map(metric => metric.key)) : [], [rows, axes3d]);
  const series = useMemo(() => rows.map(row => ({ ...row.metrics, name: storyDate(row.time) })), [rows]);
  const snapshot = useMemo(() => included.map(metric => {
    const values = rows.map(row => row.metrics[metric.key]).filter(value => value !== null && value !== undefined);
    return { ...metric, stats:describe(values), latest: rows.at(-1)?.metrics[metric.key], min: Math.min(...values), max: Math.max(...values), coverage: rows.length ? Math.round(metric.count / rows.length * 100) : 0 };
  }), [included, rows]);
  const chapters = useMemo(() => {
    const list = [{ key:'lab', label:'About the Lab', title:'UoN IoT Lab: introduction and team' }, { key:'overview', label:'Overview & statistics', title:'Measurement overview and statistics' }, { key:'quality', label:'Data quality', title:'Which measurements can we use?' }];
    if (focus) list.push({ key:'trend', label:'Trend', title:`How did ${focus.label} change?` }, { key:'shape', label:'Distribution & shape', title:`${focus.label}: distribution shape` }, { key:'categories', label:'Box plots', title:`${focus.label}: spread and outliers` }, { key:'scatterGrid', label:'All relationships', title:`${focus.label}: all eligible relationships` });
    if (matrixKeys.length >= 2) list.push({ key:'matrix', label:'Correlation', title:'How do the measurements relate?' });
    if (triplePoints.length >= MIN_PAIRS) list.push({ key:'threeD', label:'3D exploration', title:'Explore three measurements together' });
    return list;
  }, [focus, matrixKeys.length, triplePoints.length]);
  const activeChapter = chapters.find(item => item.key === (chapter === 'statistics' ? 'overview' : chapter === 'scatter' || chapter === 'compare' ? 'scatterGrid' : chapter)) || chapters[0];
  const active = chapter === 'scatter' && activeChapter.key === 'scatterGrid' ? {...activeChapter, key:'scatter', title:`${focus.label}: selected relationship`} : activeChapter;
  const index = chapters.findIndex(item => item.key === activeChapter.key);
  const chapterKeys = chapters.map(item => item.key).join('|');
  const playbackKeys = chapters.filter(item => (item.key !== 'shape' || (focus?.count >= 10 && !focus.constant)) && (item.key !== 'scatterGrid' || relationships.length > 0)).map(item => item.key).join('|');
  const rotationKeys = included.map(metric => metric.key).join('|');
  const currentFocusKey = focus?.key || '';
  const hasRows = rows.length > 0;
  const waitingFor3D = active.key === 'threeD' && !threeDReady;
  useEffect(() => {
    if (!playing || !hasRows || loading || waitingFor3D) return;
    const playable = playbackKeys.split('|');
    if (!playable.includes(active.key)) {
      const visible = chapterKeys.split('|'), at = visible.indexOf(active.key);
      setChapter(visible.slice(at + 1).find(key => playable.includes(key)) || playable[0]);
      return;
    }
    const start = Date.now(); setRemaining(duration);
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now()-start)/1000);
      setRemaining(Math.max(0, duration-elapsed));
      if (elapsed >= duration) {
        const keys = playbackKeys.split('|');
        const next = (keys.indexOf(active.key) + 1) % keys.length;
        if (next === 0 && rotationKeys) {
          const measurements = rotationKeys.split('|');
          setFocusKey(measurements[(measurements.indexOf(currentFocusKey) + 1) % measurements.length]);
          setXKey(''); setZKey(''); setThreeDReady(false);
        }
        setChapter(keys[next]); clearInterval(timer);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [playing, duration, active.key, chapterKeys, playbackKeys, rotationKeys, currentFocusKey, hasRows, loading, waitingFor3D]);
  const navigate = key => { setChapter(key); setPlaying(false); };
  const choose = setter => event => { setter(event.target.value); setPlaying(false); };
  const tooltipStyle = { background:'var(--bg-primary)', color:'var(--text-primary)', border:'1px solid var(--border)', borderRadius:8 };
  const windowStart = rows[0]?.time ?? null, windowEnd = rows.at(-1)?.time ?? null;
  const untimed = normalized.filter(row => row.time === null).length;
  const chapterNavigation = <nav className="data-story-nav" aria-label="Story chapters">{chapters.map((item,i)=><button type="button" key={item.key} aria-current={item.key===activeChapter.key ? 'step' : undefined} onClick={()=>navigate(item.key)}>{i+1}. {item.label}</button>)}</nav>;
  return <section className={`data-story ${presentation ? 'presentation' : ''}`} aria-label="Guided data story">
    <aside className="story-rail" aria-label="Story navigation and controls"><details className="story-settings" open={presentation || undefined}><summary>Settings · {activeNode || 'Waiting for node'} · {period === 'all' ? 'All history' : period === '1' ? 'Latest hour' : period === '24' ? 'Latest 24 hours' : 'Latest 7 days'}</summary><div className="data-story-toolbar">
      <div><h2>Your data, explained</h2><p>Explore at your pace, or play the guided story.</p></div>
      <div className="data-story-controls">
        <label>Source<StyledSelect aria-label="Node source" value={historyScope ? 'history' : 'live'} onChange={event=>{setHistoryScope(event.target.value === 'history');setNode('');setPlaying(false);}}><option value="live">Active nodes</option><option value="history">History · all nodes</option></StyledSelect></label><label>Node<StyledSelect aria-label="Node" value={activeNode} disabled={!availableNodes.length} onChange={choose(setNode)}>{!availableNodes.length && <option value={activeNode}>{activeNode || 'No active nodes'}</option>}{availableNodes.map(id=><option key={id} value={id}>{id}</option>)}</StyledSelect></label>
        <label>Period<StyledSelect aria-label="Period" value={period} onChange={choose(setPeriod)}><option value="1">Latest hour</option><option value="24">Latest 24 hours</option><option value="168">Latest 7 days</option><option value="all">All history</option></StyledSelect></label>
        <label>Focus measurement<StyledSelect aria-label="Focus measurement" value={focus?.key || ''} disabled={!included.length} onChange={choose(setFocusKey)}>{!included.length && <option value="">No plottable measurements</option>}{included.map(metric=><option key={metric.key} value={metric.key}>{metric.label}</option>)}</StyledSelect></label>
        <p className="story-rotation-note">Playback cycles through included measurements; unavailable charts are skipped.</p><label>Slide duration<StyledSelect aria-label="Slide duration" value={duration} onChange={event=>{setDuration(Number(event.target.value));setPlaying(false);}}>{[15,30,45,60].map(seconds=><option key={seconds} value={seconds}>{seconds} seconds</option>)}</StyledSelect></label>

        {!presentation && <a className="story-display-link" href={`/display?view=story${activeNode && activeNode !== 'Unknown node' ? '&device='+encodeURIComponent(activeNode) : ''}`}>Watch on display ↗</a>}
      </div>
    </div>
    </details>{chapterHost ? createPortal(chapterNavigation, chapterHost) : chapterNavigation}
    <div className="data-story-context"><span>{activeNode ? `Node ${activeNode}` : 'No node selected'} · {rows.length.toLocaleString()} timestamped readings</span><span>{storyDate(windowStart)} — {storyDate(windowEnd)}</span></div>
    {!liveResolved && !historyScope && initialView.node && <p className="story-caption" role="status">Restoring saved view · checking live node availability…</p>}
    {liveError && <div className="story-data-warning" role="status">Live node status is unavailable. Historical readings can still be explored. <button type="button" onClick={()=>{setHistoryScope(true);setPlaying(false);}}>Browse history</button></div>}
    {error && <div className="story-data-warning" role="status">{error} <button type="button" onClick={()=>setRefresh(value=>value+1)}>Retry</button></div>}
{active.key === 'scatter' && x && focus && <div className="story-axis-controls"><label>Compare against {focus.label}<StyledSelect aria-label="X axis" value={x.key} onChange={choose(setXKey)}>{relationships.map(metric=><option key={metric.key} value={metric.key}>{metric.label}</option>)}</StyledSelect></label><span className="story-correlation-value">Pearson r = {x.r.toFixed(2)} · {x.n} paired readings</span></div>}{active.key === 'threeD' && axes3d.length === 3 && <div className="story-axis-controls"><label>X axis<StyledSelect aria-label="X axis" value={x.key} onChange={choose(setXKey)}>{relationships.map(metric=><option key={metric.key} value={metric.key}>{metric.label}</option>)}</StyledSelect></label><span>Y axis: {focus.label}</span><label>Z axis<StyledSelect aria-label="Z axis" value={z.key} onChange={choose(setZKey)}>{relatable.filter(metric=>metric.key!==x.key&&metric.key!==focus.key).map(metric=><option key={metric.key} value={metric.key}>{metric.label}</option>)}</StyledSelect></label></div>}    <div className="story-exclusion-note"><strong>{excluded.length} excluded measurement{excluded.length===1?'':'s'}.</strong> {excluded.slice(0,3).map(metric=>`${metric.label}: ${metric.reason.toLowerCase()}`).join('; ')}{excluded.length>3?'…':''} <button type="button" onClick={()=>navigate('quality')}>View data-quality reasons</button></div>
    <footer className="data-story-footer"><button type="button" className="story-play" onClick={()=>setPlaying(value=>!value)} disabled={loading || !rows.length}>{playing ? 'Pause story' : 'Play story'}</button><button type="button" onClick={()=>navigate(chapters[(index-1+chapters.length)%chapters.length].key)}>← Previous</button><span>{playing ? active.key==='threeD'&&!threeDReady ? 'Preparing 3D; slide timer waits for the chart' : `Playing · next chapter in ${remaining}s` : 'Paused · interact freely, or press Play story'} · {index+1}/{chapters.length}</span><button type="button" onClick={()=>navigate(chapters[(index+1)%chapters.length].key)}>Next →</button></footer>
    </aside>
    <div className={`data-story-stage chapter-${active.key}`} onPointerDownCapture={()=>setPlaying(false)} onFocusCapture={()=>setPlaying(false)}>
      <header><span className="data-story-step">Chapter {index+1} of {chapters.length}</span><h3>{active.title}</h3></header>
      {active.key === 'lab' ? <AboutLab presentation /> : loading ? <p className="story-empty" role="status">Loading complete history across all pages…</p> : !rows.length && active.key !== 'quality' ? <p className="story-empty">{!activeNode ? 'No active node is available. Choose History · all nodes to explore stored readings.' : 'No timestamped readings are available for this node and period.'}</p> : <>
      {active.key === 'overview' && <>
        <p className="story-narrative">This story follows one node through its observations, value distributions, and measurement relationships. The selected window ends at its latest loaded reading, rather than assuming the data is current.</p>
        <div className="story-overview-stats"><article><strong>{rows.length.toLocaleString()}</strong><span>readings in this window</span></article><article><strong>{included.length}</strong><span>measurements available for exploration</span></article><article><strong>{excluded.length}</strong><span>measurements excluded with reasons</span></article></div>
        <div className="story-snapshot-grid">{snapshot.map(metric => <button type="button" key={metric.key} className="story-snapshot-card" onClick={()=>{setFocusKey(metric.key);navigate('trend');}} aria-label={`Explore ${metric.label} trend`}>
          <span className="snapshot-label">{metric.label}</span>
          <strong>{metric.latest === null || metric.latest === undefined ? '—' : format(metric.latest)} <small>{metric.unit}</small></strong>
          <span className="snapshot-range">Window range: {format(metric.min)}–{format(metric.max)} {metric.unit}</span>
          <span className="snapshot-statistics"><span>Mean <b>{format(metric.stats.mean)}</b></span><span>Sample SD <b>{metric.stats.sd === null ? '—' : format(metric.stats.sd)}</b></span><span>Q1 <b>{format(metric.stats.q1)}</b></span><span>Median <b>{format(metric.stats.median)}</b></span><span>Q3 <b>{format(metric.stats.q3)}</b></span><span>IQR <b>{format(metric.stats.iqr)}</b></span></span>
          <span className="snapshot-coverage">{metric.count.toLocaleString()} valid · {metric.latest === null || metric.latest === undefined ? 'Missing in latest record · ' : ''}{metric.coverage}% valid coverage{metric.constant ? ' · Constant' : ''}</span>
        </button>)}</div>

        <p className="story-narrative">Values are from the latest loaded record ({storyDate(rows.at(-1)?.time ?? null)}); ranges and coverage describe the selected window. Statistics use all valid readings in this window; quartiles use linear interpolation and sample SD uses n−1. Select a measurement to explore its trend.</p>
      </>}
      {active.key === 'quality' && <>
        <p className="story-narrative">Zero-only measurements are omitted from exploratory charts for this period. This does not establish a sensor fault. Constant non-zero measurements remain in summaries but cannot have a correlation coefficient.</p>
        <div className="story-quality-grid">{assessments.map(metric => {
          const coverage = rows.length ? Math.round(metric.count / rows.length * 100) : 0;
          return <article className="story-quality-card" key={metric.key}>
            <header><h4>{metric.label}</h4><span className={`quality-status ${metric.excluded ? 'excluded' : metric.relationshipReason ? 'summary' : 'eligible'}`}>{metric.excluded ? 'Excluded' : metric.relationshipReason ? 'Summary only' : 'Eligible'}</span></header>
            <div className="quality-coverage"><strong>{coverage}%</strong><span>valid coverage</span></div>
            <div className="quality-track" role="meter" aria-label={`${metric.label} valid coverage`} aria-valuenow={coverage} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${coverage}%`}} /></div>
            <p className="quality-counts">{metric.count.toLocaleString()} valid · {metric.missing.toLocaleString()} missing / invalid</p>
            <p className="quality-reason">{metric.reason || metric.relationshipReason || 'Available for summaries and relationships'}</p>
          </article>;
        })}</div>
        <p className="story-caption">{activeNode === 'Unknown node' ? 'Relationships are disabled because these records do not identify their node. ' : ''}{untimed} records without valid timestamps excluded from time-window analysis. Relationships require at least {MIN_PAIRS} valid paired readings with variation on both axes; this is an eligibility rule, not a significance test.</p>
      </>}
      {active.key === 'trend' && focus && <>
        <p className="story-narrative">{`Follow ${focus.label} through the selected window. The dashed line marks its mean; missing readings are excluded from summaries.`}</p>
        <MetricCharts data={series} parameter={focus} bucket="hourly" view={active.key} timeLabel="EAT" compact />
      </>}
      
      {active.key === 'shape' && focus && <ShapeFigure rows={rows} focus={focus} fullData={period === 'all'} />}
      {active.key === 'categories' && focus && <CategoryFigure rows={rows} focus={focus} fullData={period === 'all'} />}
      {active.key === 'scatterGrid' && focus && <ScatterGridFigure key={focus.key} rows={rows} focus={focus} relationships={relationships} playing={playing} duration={duration} fullData={period === 'all'} />}
      {active.key === 'scatter' && x && focus && <>
        <button type="button" onClick={()=>navigate('scatterGrid')}>← All relationships</button>
        
        <p className="story-narrative">{Math.abs(x.r) < 0.005 ? 'This paired sample shows little linear association.' : `${x.r > 0 ? 'Higher' : 'Lower'} ${x.label} values tended to coincide with higher ${focus.label} values in this sample.`} This association does not establish causation; time patterns and other factors may influence both.</p>
        <div className="story-scatter"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{top:10,right:30,bottom:35,left:20}} accessibilityLayer>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" />
          <XAxis type="number" dataKey={x.key} name={x.label} unit={x.unit ? ` ${x.unit}` : ''} tick={{fill:'var(--text-secondary)',fontSize:11}} label={{value:`${x.label} (${x.unit || 'unitless'})`,position:'bottom',fill:'var(--text-secondary)'}} />
          <YAxis type="number" dataKey={focus.key} name={focus.label} unit={focus.unit ? ` ${focus.unit}` : ''} tick={{fill:'var(--text-secondary)',fontSize:11}} width={80} />
          <Tooltip content={({active,payload})=>{
            const point = payload?.[0]?.payload;
            return active && point ? <div className="story-scatter-tooltip" style={tooltipStyle}><strong>Node {point.node}</strong><p>{storyDate(point.time)}</p><p>{x.label}: {format(point[x.key])} {x.unit}</p><p>{focus.label}: {format(point[focus.key])} {focus.unit}</p></div> : null;
          }} cursor={{strokeDasharray:'3 3'}} />
          <Scatter name={`${x.label} vs ${focus.label}`} data={shownScatter} fill="var(--accent)" fillOpacity={0.65} isAnimationActive={false} />
        </ScatterChart></ResponsiveContainer></div>
        <p className="story-caption">Y axis: {focus.label} ({focus.unit || 'unitless'}). Each point pairs measurements from the same record and node. {shownScatter.length} of {scatterPoints.length} points displayed; r uses all valid pairs.</p>
      </>}
      {active.key === 'matrix' && <>
        <p className="story-narrative">Compare the direction and size of linear associations. Select a cell to explore that pair. N/A means insufficient paired readings or no paired variation; it is not a zero correlation.</p>
        <div className="story-table-scroll"><table className="story-correlation-table"><thead><tr><th>Pearson r</th>{matrixKeys.map(metric=><th key={metric.key}>{metric.label}</th>)}</tr></thead><tbody>{matrixKeys.map((y,i)=><tr key={y.key}><th>{y.label}</th>{matrixKeys.map((x,j)=>{const cell=matrix[i][j];return <td key={x.key}><button type="button" disabled={x.key===y.key || cell.r===null} style={{background:cell.r===null?'var(--bg-secondary)':`rgba(${cell.r<0?'245,158,11':'6,182,212'},${0.08+Math.abs(cell.r)*0.35})`}} title={`${x.label} / ${y.label}: ${cell.r===null?cell.reason:cell.r.toFixed(3)}; n=${cell.n}`} onClick={()=>{setFocusKey(y.key);setXKey(x.key);navigate('scatter');}}>{cell.r===null?'N/A':cell.r.toFixed(2)}<small>n={cell.n}</small></button></td>;})}</tr>)}</tbody></table></div>
        <p className="story-caption">Amber: negative · cyan: positive · values near 0: little linear association. Up to {presentation ? 6 : 8} varying measurements are shown, prioritizing the focus and its relationships. Correlation does not establish causation.</p>
      </>}
      {active.key === 'threeD' && axes3d.length===3 && <>
        
        <p className="story-narrative">Explore {triplePoints.length} complete observations across three measurements. Interaction pauses playback.</p>
        <Suspense fallback={<p role="status">Loading 3D exploration…</p>}><Story3D points={triplePoints} axes={axes3d} playing={playing} onReady={setThreeDReady} /></Suspense>
      </>}
      </>}
    </div>
    <p className="story-caption story-methodology">History is cached on this browser; only readings at or after the latest saved timestamp are checked each minute. Legacy unknown records are attributed to NODE001. Rendering may sample points; statistics use all eligible loaded readings. A requested period may have partial coverage. Manual chart interaction or chapter navigation pauses playback; playback also pauses when this tab is hidden.</p>
  </section>;
}
