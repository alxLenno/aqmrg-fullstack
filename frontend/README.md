# React + Vite

## AQMRG development

Run the frontend with `npm run dev`. Raw Analysis uses the historical readings API for its built-in charts and supports both nested PythonAnywhere rows and flattened Vercel/MongoDB rows.

An optional Grafana view is available automatically during local development at `http://localhost:3000`. For a deployed frontend, configure an absolute dashboard URL at build time:

```env
VITE_GRAFANA_DASHBOARD_URL=https://grafana.example.com/d/aqmrg_live_01/aqmrg-real-time-insights?orgId=1&kiosk
```

The Docker Compose stack provisions that dashboard against InfluxDB. Grafana embedding is enabled, but anonymous access remains disabled by default; users can sign in to Grafana in the embedded view or open it full screen. Only set `GRAFANA_ANONYMOUS_ENABLED=true` when read-only public sensor visibility is intentional.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# aqmrg-frontend


## Always-on screen

Open `/display` for the monitor view, or `/display?device=DEVICE_ID` for one station.
The layout targets a 1080p landscape monitor, polls every five seconds, and retries failed requests with a delay capped at 30 seconds. Requests time out after 12 seconds; the last readings remain visible and are labeled unverified during an outage. Readings older than five minutes are stale, regardless of backend reachability. The PM2.5 trend starts when the page opens and holds at most 180 updates in memory; it is not a historical archive. Lists longer than two nodes page automatically every 30 seconds.

Click **Full screen / keep awake** after opening the page. Wake lock depends on browser support and may be revoked by the OS; configure the device's power settings to prevent sleep for unattended use. Set this URL as the browser's startup page and configure the operating system to reopen the browser after login/restart. A web page cannot configure OS kiosk startup or guarantee recovery from a browser/device crash. Map tiles require an internet connection.


### Map sources

Both the dashboard and display map offer OpenFreeMap and OpenStreetMap in a **Map source** selector. OpenFreeMap is the initial source (dark in display mode). If its renderer fails, repeated tile requests fail, or startup takes longer than 20 seconds, the map switches to OpenStreetMap. A failure message remains visible if background tiles cannot load; station markers are separate from the background. Switch manually to retry OpenFreeMap. Required map attribution stays visible. Both sources use OpenStreetMap data, so changing sources does not improve inaccurate sensor coordinates.

The display’s **Node details** panel prioritizes real device IDs, names/locations, report timestamps, and available numeric measurements. It shows two nodes per page to keep measurements legible; PM2.5 stays prominent. Hardware metadata is not shown because the current adapter supplies fixed defaults rather than verified device details.


## Guided data story

**Your Data** retains a chapter-based story with professional, data-driven explanations. Explore manually or choose **Play story** (15/30/45/60 seconds per eligible chapter). Chapter selection, chart clicks, and keyboard focus in the chart pause playback. Hidden tabs pause playback too.

Choose a node, focus measurement, and latest-loaded-hour/24-hour/7-day/all-loaded window. Data refreshes independently every minute, using at most 3,000 returned records. Windows end at the latest loaded observation, not necessarily the current clock time, and may have partial coverage.

The quality chapter explains omitted measurements: all-zero, missing/invalid-only, constant, and insufficient paired data. Zero-only readings remain in live node details. Constant non-zero data remains in trends/distributions, but correlations require at least ten valid pairs from the same record and node with variation on both axes. Undefined correlations appear as N/A, never as zero. The minimum count is an eligibility rule, not a significance test.

The same story is available at `/display?view=story` or via **Watch story** in display mode. Optional `device=DEVICE_ID` restricts its node. The 3D chapter loads its plotting code only when reached, supports rotation/zoom, and shows a fallback message when the renderer is unavailable. Displayed scatter points are capped for rendering; correlation coefficients use all eligible loaded pairs.

### Restored exploratory figures

The guided story includes Statistics (sample standard deviation and interpolated quartiles), Normality & shape (density histogram, Gaussian KDE, normal reference, skewness, excess kurtosis, and a normal Q–Q plot), Box plots, and All relationships (paginated scatter panels). These follow the selected node, window, and focus measurement, including automatic focus rotation after each complete playback loop.

Shape diagnostics require at least ten valid, varying values. Their reference curve is descriptive and does not imply that measurements should be normal. Unsupported figures retain an explanatory tab and are skipped during unattended playback. Box plots group only recognized air-quality status labels reported with readings; when unavailable, an overall box plot summarizes valid values without inferring categories. Operational labels such as ControllerData are not air-quality categories. Scatter-group pages advance during playback; each coefficient uses all eligible paired observations even when plotted points are sampled.

### Operational dashboard layout

The dashboard uses a compact network summary, with node locations beside measured readings and a smaller model-estimate panel below the readings. The header owns export actions. Model outputs are separated from measured fields and comparison outputs are expandable; they are not presented as confidence or independent validation scores. Summary PM2.5 uses valid values from nodes within the five-minute freshness window. Zero values and valid negative temperatures are preserved, and stale/unverified readings are labeled.
