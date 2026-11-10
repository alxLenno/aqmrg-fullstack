import { useEffect, useRef, useState } from 'react';
import { MapContainer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { fetchDashboardData } from '../api/dashboard';
import { ageText, freshness, numericReading, readingTime, summarize } from '../utils/display';
import 'leaflet/dist/leaflet.css';
import './DisplayMode.css';
import MapSources from './MapSources';
import { useTheme } from '../context/ThemeContext';
import { METRIC_CONFIG } from '../utils/metrics';
import YourDataTab from './YourDataTab';
import Brand from './Brand';

function FitStations({ sensors }) {
  const map = useMap();
  const positions = JSON.stringify(sensors.map(s => [s.latitude, s.longitude]));
  useEffect(() => {
    const points = JSON.parse(positions);
    if (points.length) map.fitBounds(points, { padding: [35, 35], maxZoom: 12, animate: false });
  }, [map, positions]);
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}
function Trend({ points }) {
  if (points.length < 2) return <p className="display-empty">The trend builds as new readings arrive. At least two updates are needed.</p>;
  const max = Math.max(...points.map(p => p.value), 1);
  const min = Math.min(...points.map(p => p.value), 0);
  const first = points[0].time;
  const span = Math.max(points.at(-1).time - first, 1);
  const path = points.map(p => `${30 + (p.time - first) / span * 900},${130 - (p.value - min) / (max - min) * 105}`).join(' ');
  return <svg className="display-trend" viewBox="0 0 960 155" role="img" aria-label={`PM2.5 trend from ${points[0].value.toFixed(1)} to ${points.at(-1).value.toFixed(1)} micrograms per cubic metre`}>
    <text x="0" y="18">{max.toFixed(1)}</text><text x="0" y="135">{min.toFixed(0)}</text>
    <line x1="30" y1="130" x2="930" y2="130" stroke="#334155" />
    <polyline points={path} fill="none" stroke="#67e8f9" strokeWidth="3" />
    <text x="30" y="153">{new Date(first).toLocaleTimeString('en-GB', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit' })} EAT</text>
    <text x="930" y="153" textAnchor="end">Latest</text>
  </svg>;
}
export default function DisplayMode() {
  const { theme, toggleTheme } = useTheme();
  const [storyMode, setStoryMode] = useState(() => new URLSearchParams(window.location.search).get('view') === 'story');
  const [sensors, setSensors] = useState([]);
  const [status, setStatus] = useState('connecting');
  const [now, setNow] = useState(Date.now);
  const [lastSync, setLastSync] = useState(null);
  const [trend, setTrend] = useState([]);
  const [page, setPage] = useState(0);
  const [screenMessage, setScreenMessage] = useState('');
  const wakeLock = useRef(null);
  const keepAwake = useRef(false);
  const deviceId = new URLSearchParams(window.location.search).get('device') || '';

  useEffect(() => {
    let stopped = false;
    let timer;
    let controller;
    let failures = 0;
    async function refresh() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const data = await fetchDashboardData(deviceId, { signal: controller.signal, cache: 'no-store' });
        if (stopped) return;
        const received = Date.now();
        setSensors(data.sensors);
        setStatus('connected');
        setLastSync(received);
        failures = 0;
        const summary = summarize(data.sensors, received, true);
        if (summary.current) setTrend(previous => {
          if (previous.length && summary.latest <= previous.at(-1).time) return previous;
          return [...previous, { time: summary.latest, value: summary.average }].slice(-180);
        });
      } catch {
        if (!stopped) { failures += 1; setStatus('disconnected'); }
      } finally {
        clearTimeout(timeout);
        if (!stopped) timer = setTimeout(refresh, Math.min(5000 * 2 ** Math.min(failures, 3), 30000));
      }
    }
    refresh();
    const clock = setInterval(() => setNow(Date.now()), 1000);
    const pages = setInterval(() => setPage(previous => previous + 1), 30000);
    const title = document.title;
    document.title = 'UoN IoT Lab — UiL | Live display';
    return () => { stopped = true; controller?.abort(); clearTimeout(timer); clearInterval(clock); clearInterval(pages); document.title = title; };
  }, [deviceId]);

  useEffect(() => {
    let disposed = false;
    const acquire = async () => {
      if (!keepAwake.current || document.visibilityState !== 'visible' || !navigator.wakeLock) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (disposed) { await lock.release(); return; }
        wakeLock.current = lock;
        setScreenMessage('Screen wake lock active');
        lock.addEventListener('release', () => { if (!disposed) setScreenMessage('Wake lock released; check device sleep settings'); });
      } catch { if (!disposed) setScreenMessage('Keep-awake unavailable; disable sleep on this device'); }
    };
    const visibility = () => { if (!wakeLock.current || wakeLock.current.released) acquire(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { disposed = true; document.removeEventListener('visibilitychange', visibility); wakeLock.current?.release(); };
  }, []);

  const startScreen = async () => {
    keepAwake.current = true;
    try { await document.documentElement.requestFullscreen?.(); } catch { /* Browser may restrict fullscreen. */ }
    if (navigator.wakeLock) {
      try { wakeLock.current = await navigator.wakeLock.request('screen'); setScreenMessage('Screen wake lock active'); }
      catch { setScreenMessage('Disable sleep in the device settings'); }
    } else setScreenMessage('Disable sleep in the device settings');
  };
  const [chapterHost, setChapterHost] = useState(null);
  const connected = status === 'connected';
  const summary = summarize(sensors, now, connected);
  const sorted = [...sensors].sort((a, b) => (a.name || a.device_id).localeCompare(b.name || b.device_id));
  const pageCount = Math.max(1, Math.ceil(sorted.length / 2));
  const pageIndex = page % pageCount;
  const visible = sorted.slice(pageIndex * 2, pageIndex * 2 + 2);
  const located = sensors.filter(s => typeof s.latitude === 'number' && typeof s.longitude === 'number' && Number.isFinite(s.latitude) && Number.isFinite(s.longitude) && Math.abs(s.latitude) <= 90 && Math.abs(s.longitude) <= 180 && !(s.latitude === 0 && s.longitude === 0));
  return <main className={`display-mode ${storyMode ? 'story-display' : ''}`} data-theme={theme}>
    <header className="display-header"><div><Brand compact /><h1>{storyMode ? 'Guided data story' : deviceId ? 'Station overview' : 'Network overview'}</h1></div>{storyMode && <div className="display-chapter-slot" ref={setChapterHost} />}<div className="display-clock"><strong>{new Date(now).toLocaleTimeString('en-GB', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit' })} <small>EAT</small></strong><span>{new Date(now).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long', day: 'numeric', month: 'long' })}</span></div></header>
    <div className={`display-connection ${connected ? 'connected' : 'offline'}`} role="status">{connected ? 'Connected' : status === 'connecting' ? 'Connecting to readings…' : 'Connection interrupted · retrying automatically'}<span>{lastSync ? `Last successful sync ${ageText(lastSync, now)}` : 'Waiting for the first successful sync'} · {summary.current ? 'Recent readings available' : 'No current PM2.5 readings'}</span></div>
    {storyMode ? <div className="display-story-host"><YourDataTab selectedDevice={deviceId} presentation autoPlay chapterHost={chapterHost} /></div> : <>
    <section className="display-kpis" aria-label="Network measurements">
      <article className={`display-kpi primary ${summary.current ? '' : 'old'}`}><h2>{summary.current ? 'Current mean PM2.5' : 'Last known mean PM2.5'}</h2><div className="display-number">{summary.average === null ? '—' : summary.average.toFixed(1)} <small>µg/m³</small></div><p>{summary.current ? `${summary.contributing} station${summary.contributing === 1 ? '' : 's'} with fresh PM2.5 readings` : summary.contributing ? 'Historical values · do not treat as current' : 'No PM2.5 measurements available'}</p></article>
      <article className="display-kpi"><h2>Fresh stations</h2><div className="display-number">{connected ? summary.freshCount : '—'} <small>/ {sensors.length}</small></div><p>{connected ? 'Reading received within 5 minutes' : 'Freshness unverified while disconnected'}</p></article>
      <article className="display-kpi"><h2>Latest sensor report</h2><div className="display-age">{ageText(summary.latest, now)}</div><p>{summary.latest ? new Date(summary.latest).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' }) + ' EAT' : 'No report received'}</p></article>
    </section>
    <div className="display-content"><div className="display-left"><section className="display-panel display-map"><h2>Station locations <small>Markers show reporting freshness</small></h2>{located.length ? <MapContainer center={[-1.286, 36.817]} zoom={11} zoomAnimation={false} scrollWheelZoom={false} zoomControl={false} dragging={false}><MapSources dark={theme === 'dark'} /><FitStations sensors={located} />{located.map(s => <CircleMarker key={s.device_id} center={[s.latitude, s.longitude]} radius={9} pathOptions={{ color: connected && freshness(s, now) === 'fresh' ? (theme === 'light' ? '#0369a1' : '#22d3ee') : (theme === 'light' ? '#b45309' : '#fbbf24'), fillOpacity: 0.8 }}><Tooltip><strong>Node {s.device_id}</strong><br />{s.location_name && s.location_name !== 'Unknown' ? s.location_name : 'Location unavailable'}<br />{connected ? freshness(s, now) : 'unverified'} · {ageText(readingTime(s.last_seen), now)}<br />PM2.5: {numericReading(s.readings?.pm25) === null ? 'No reading' : `${s.readings.pm25} µg/m³`}</Tooltip></CircleMarker>)}</MapContainer> : <p className="display-empty">No station coordinates available yet.</p>}</section><section className="display-panel display-trend-panel"><h2>Mean PM2.5 trend <small>Fresh readings collected since this screen opened · µg/m³</small></h2><Trend points={trend} /></section></div>
    <section className="display-panel display-stations"><h2>Node details <small>{pageCount > 1 ? `Page ${pageIndex + 1} / ${pageCount} · changes every 30s` : `${sensors.length} node${sensors.length === 1 ? '' : 's'}`}</small></h2>{visible.length ? visible.map(s => {
      const state = connected ? freshness(s, now) : 'unverified';
      const value = numericReading(s.readings?.pm25);
      const reportTime = readingTime(s.last_seen);
      const metrics = Object.entries(METRIC_CONFIG).filter(([key]) => {
        const reading = s.readings?.[key];
        return key !== 'pm25' && typeof reading === 'number' && Number.isFinite(reading) && (key === 'temperature' || reading >= 0);
      });
      const location = s.location_name && s.location_name !== 'Unknown' ? s.location_name : null;
      return <article className="display-station node-details" key={s.device_id}>
        <div className="node-identity">
          <h3>{s.device_id && s.device_id !== 'UNKNOWN' ? `Node ${s.device_id}` : 'Node ID unavailable'}</h3>
          <p>{[s.name !== s.device_id ? s.name : null, location].filter(Boolean).join(' · ')}</p>
          <span className={`display-freshness ${state}`}>{state === 'fresh' ? 'Fresh' : state === 'stale' ? 'Stale' : state === 'unverified' ? 'Unverified · offline' : 'Timestamp unknown'} · {ageText(reportTime, now)}</span>
          {reportTime !== null && <p className="node-report-time">Last report {new Date(reportTime).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })} EAT</p>}
        </div>
        <div className="node-readings">
        <p className="node-readings-label">Readings</p>
        <div className="display-station-value">{value === null ? '—' : value.toFixed(1)}<small>PM2.5 µg/m³{state !== 'fresh' ? ' · last known' : ''}</small></div>
        {metrics.length > 0 && <dl className="node-measurements" aria-label={`Additional measurements for ${s.device_id}`}>
          {metrics.map(([key, config]) => <div key={key}><dt>{config.label}</dt><dd>{s.readings[key].toFixed(key === 'co' || key === 'o3' ? 2 : 1)} <span>{config.unit}</span></dd></div>)}
        </dl>}
        </div>
      </article>;
    }) : <p className="display-empty">{status === 'connecting' ? 'Loading station readings…' : 'No station readings received. This screen will update automatically.'}</p>}</section></div></>}
    <footer className="display-footer"><span>Auto refresh · 5s when connected · stale after 5 minutes</span><span>{screenMessage}</span><div><button onClick={() => { const next = !storyMode; setStoryMode(next); const url = new URL(window.location.href); if (next) url.searchParams.set('view', 'story'); else url.searchParams.delete('view'); window.history.replaceState(null, '', url); }}>{storyMode ? 'Show overview' : 'Watch story'}</button><button onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button><a href="/about">About the Lab</a><a href="/">Dashboard</a><button onClick={startScreen}>Full screen / keep awake</button></div></footer>
  </main>;
}
