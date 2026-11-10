import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapSources.css';

export default function MapSources({ dark = false }) {
  const map = useMap();
  const selectedSource = useRef('openfreemap');
  useEffect(() => {
    let disposed = false;
    let generation = 0;
    let layer;
    let deadline;
    const control = L.control({ position: 'topright' });
    const box = L.DomUtil.create('div', 'map-source-control');
    const label = L.DomUtil.create('label', '', box);
    label.textContent = 'Map source ';
    const select = L.DomUtil.create('select', '', label);
    select.setAttribute('aria-label', 'Map source');
    for (const [value, text] of [['openfreemap', 'OpenFreeMap'], ['osm', 'OpenStreetMap']]) {
      const option = document.createElement('option');
      option.value = value; option.textContent = text; select.append(option);
    }
    const notice = L.DomUtil.create('p', 'map-source-notice', box);
    notice.setAttribute('role', 'status');
    L.DomEvent.disableClickPropagation(box);
    L.DomEvent.disableScrollPropagation(box);
    L.DomEvent.on(box, 'keydown', L.DomEvent.stopPropagation);
    control.onAdd = () => box;
    control.addTo(map);

    async function choose(source, fallback = false) {
      selectedSource.current = source;
      const version = ++generation;
      clearTimeout(deadline);
      if (layer) { map.removeLayer(layer); layer = null; }
      select.value = source;
      const active = () => !disposed && version === generation;
      if (source === 'osm') {
        notice.textContent = fallback ? 'OpenFreeMap unavailable · using OpenStreetMap' : 'Loading OpenStreetMap…';
        let loaded = false;
        layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        });
        layer.on('tileload', () => { if (active()) { loaded = true; clearTimeout(deadline); notice.textContent = fallback ? 'OpenStreetMap · automatic fallback' : ''; } });
        layer.on('tileerror', () => { if (active()) notice.textContent = 'Some map tiles unavailable · station markers remain visible'; });
        layer.addTo(map);
        deadline = setTimeout(() => { if (active() && !loaded) notice.textContent = 'Map background unavailable · station markers remain visible'; }, 15000);
        return;
      }
      notice.textContent = 'Loading OpenFreeMap…';
      const fail = () => { if (active()) choose('osm', true); };
      deadline = setTimeout(fail, 20000);
      try {
        const [{ maplibreGL }, { setWorkerUrl }] = await Promise.all([
          import('@maplibre/maplibre-gl-leaflet'), import('maplibre-gl'),
        ]);
        if (!active()) return;
        setWorkerUrl(workerUrl);
        layer = maplibreGL({
          style: `https://tiles.openfreemap.org/styles/${dark ? 'dark' : 'liberty'}`,
          attribution: '<a href="https://openfreemap.org/">OpenFreeMap</a> · &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> · &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        });
        layer.addTo(map);
        const vectorMap = layer.getMaplibreMap();
        let errors = 0;
        vectorMap.on('error', () => { if (active() && ++errors >= 3) fail(); });
        vectorMap.on('load', () => { if (active()) { clearTimeout(deadline); errors = 0; notice.textContent = ''; } });
        vectorMap.on('webglcontextlost', fail);
      } catch { fail(); }
    }
    const changed = () => choose(select.value);
    select.addEventListener('change', changed);
    choose(selectedSource.current);
    return () => {
      disposed = true; generation += 1; clearTimeout(deadline);
      select.removeEventListener('change', changed);
      control.remove();
      if (layer) map.removeLayer(layer);
    };
  }, [map, dark]);
  return null;
}
