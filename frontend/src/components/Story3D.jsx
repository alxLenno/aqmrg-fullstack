import StyledSelect from './StyledSelect';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
const escape = text => String(text).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
export default function Story3D({ points, axes, playing, onReady }) {
  const host = useRef(null);
  const plot = useRef(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const { theme } = useTheme();
  const [logScale, setLogScale] = useState(false);
  const plotted = useMemo(() => logScale ? points.filter(p => axes.every(a => p[a.key] > 0)) : points, [points, axes, logScale]);
  const positions = useMemo(() => new Set(plotted.map(p => JSON.stringify(axes.map(a => p[a.key])))).size, [plotted, axes]);
  useEffect(() => {
    const container = host.current;
    let stopped = false, observer;
    const firstRender = !container.data;
    if (firstRender) { setReady(false); onReady(false); }
    setError('');
    const timeout = setTimeout(() => { if (!stopped) { setError('3D rendering is taking too long. You can continue with the 2D story.'); onReady(true); } }, 25000);
    async function render() {
      try {
        const imported = await import('plotly.js-gl3d-dist-min');
        if (stopped) return;
        const Plotly = imported.default || imported;
        plot.current = Plotly;
        const sample = plotted;
        const axis = parameter => ({ type:logScale ? 'log' : 'linear', title: { text: escape(`${parameter.label} (${parameter.unit || 'unitless'})`) }, gridcolor: theme === 'light' ? '#cbd5e1' : '#334155', zerolinecolor: '#64748b', color: theme === 'light' ? '#334155' : '#cbd5e1' });
        await Plotly.react(container, [{ type:'scatter3d', mode:'markers', x:sample.map(p=>p[axes[0].key]), y:sample.map(p=>p[axes[1].key]), z:sample.map(p=>p[axes[2].key]), marker:{ size:theme === 'light' ? 2 : 2.5, opacity:theme === 'light' ? 0.65 : 0.9, color:sample.map(p=>p[axes[2].key]), colorscale:theme === 'light' ? 'Viridis' : [[0,'#38bdf8'],[0.35,'#2dd4bf'],[0.7,'#a3e635'],[1,'#fef08a']], showscale:true, colorbar:{title:{text:`${escape(axes[2].label)}<br>${escape(axes[2].unit || 'unitless')}`},thickness:12,len:0.65,tickformat:'.3~s',tickfont:{color:theme === 'light' ? '#334155' : '#cbd5e1'},outlinewidth:0} }, hovertemplate:`${escape(axes[0].label)}: %{x:.3g} ${escape(axes[0].unit)}<br>${escape(axes[1].label)}: %{y:.3g} ${escape(axes[1].unit)}<br>${escape(axes[2].label)}: %{z:.3g} ${escape(axes[2].unit)}<extra></extra>` }], { autosize:true, uirevision:axes.map(axis=>axis.key).join(':') + ':' + logScale, paper_bgcolor:'rgba(0,0,0,0)', margin:{l:25,r:85,t:15,b:20}, font:{ color:theme === 'light' ? '#334155' : '#cbd5e1' }, scene:{ xaxis:axis(axes[0]), yaxis:axis(axes[1]), zaxis:axis(axes[2]), camera:{center:{x:0,y:0,z:-0.25},eye:{x:1.55,y:1.55,z:1.22}}, aspectmode:'manual', aspectratio:{x:1.4,y:1.4,z:1}, bgcolor:'rgba(0,0,0,0)' } }, { responsive:true, displaylogo:false, modeBarButtonsToRemove:['toImage','sendDataToCloud'] });
        if (stopped) { if (!container.isConnected) Plotly.purge(container); return; }
        clearTimeout(timeout); setError(''); setReady(true); onReady(true);
        observer = new ResizeObserver(() => { if (!stopped && container.isConnected && container.offsetWidth && container.offsetHeight) { Promise.resolve(Plotly.Plots.resize(container)).catch(() => {}); } }); observer.observe(container);
      } catch { if (!stopped) { clearTimeout(timeout); setError('3D is unavailable on this browser. Continue with the 2D scatter plots or matrix.'); onReady(true); } }
    }
    render();
    return () => { stopped=true; clearTimeout(timeout); observer?.disconnect(); };
  }, [plotted, axes, theme, onReady, logScale]);
  useEffect(() => {
    const container = host.current;
    return () => plot.current?.purge(container);
  }, []);
  useEffect(() => {
    if (!ready || !playing || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let angle=Math.PI/4;
    const timer=setInterval(()=>{ angle+=0.015; if (!host.current?.isConnected) return; plot.current?.relayout(host.current, { 'scene.camera.eye':{x:2.19*Math.cos(angle),y:2.19*Math.sin(angle),z:1.22} })?.catch(() => {}); },200);
    return ()=>clearInterval(timer);
  }, [ready, playing]);
  return <div className="story-three-d"><label className="story-scale-control">Axis scale<StyledSelect aria-label="3D axis scale" value={logScale ? 'log' : 'linear'} onChange={event=>setLogScale(event.target.value === 'log')}><option value="linear">Linear · all complete readings</option><option value="log">Logarithmic · positive values only</option></StyledSelect></label><div ref={host} className="story-three-d-canvas" aria-label={`Interactive 3D scatter plot of ${axes.map(a=>a.label).join(', ')}`} />{error ? <p role="status">{error}</p> : !ready && <p role="status">Preparing the interactive 3D plot…</p>}<p className="story-caption">Drag to rotate; scroll or pinch to zoom. Color represents {axes[2].label}. {ready ? 'Plotted' : 'Preparing'} {plotted.length.toLocaleString()} of {points.length.toLocaleString()} complete readings · {positions.toLocaleString()} distinct positions. Repeated coordinates overlap. {logScale && `${(points.length-plotted.length).toLocaleString()} readings with zero or negative axis values are omitted in logarithmic mode; switch to Linear to include them.`}</p></div>;
}
