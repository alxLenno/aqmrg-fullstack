import { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, Bar, ReferenceLine } from 'recharts';
import { chartSummary, chartValue, histogram } from '../utils/charts';
import './MetricCharts.css';

export default function MetricCharts({ data, parameter, bucket, view = 'both', timeLabel = 'browser local time', compact = false }) {
  const { key, label, unit, color } = parameter;
  const series = useMemo(() => data.map(row => ({ ...row, [key]: chartValue(key, row[key]) })), [data, key]);
  const summary = useMemo(() => chartSummary(series, key), [series, key]);
  const bins = useMemo(() => histogram(series, key), [series, key]);
  const format = value => Number(value).toLocaleString('en-GB', { maximumFractionDigits: key === 'co' || key === 'o3' ? 3 : 2 });
  const sampleLabel = bucket === 'hourly' ? 'readings' : ({ daily: 'hourly averages', weekly: 'daily averages', monthly: 'weekly averages', yearly: 'monthly averages' }[bucket] || 'averages');
  const tooltipStyle = { background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 };
  const tick = { fill: 'var(--text-secondary)', fontSize: 12 };
  if (!summary) return <p className="metric-chart-empty">No valid {label} measurements in this period.</p>;
  const distribution = bins.map(bin => ({ ...bin, range: bin.start === bin.end ? format(bin.start) : `${format(bin.start)}–${format(bin.end)}` }));
  return <div className="metric-charts">
    <dl className="metric-chart-summary">
      {[['Latest', summary.latest], ['Mean', summary.mean], ['Minimum', summary.min], ['Maximum', summary.max]].map(([title, value]) => <div key={title}><dt>{title}</dt><dd>{format(value)} <small>{unit}</small></dd></div>)}
      <div><dt>Change over period</dt><dd>{summary.change > 0 ? '+' : ''}{format(summary.change)} <small>{unit}</small></dd></div>
    </dl>
    <p className="metric-chart-context">{summary.count} {sampleLabel} · {summary.min === summary.max ? `All available values are ${format(summary.min)} ${unit}.` : 'Summaries exclude missing or invalid measurements.'}</p>
    <div className={`metric-chart-pair ${view !== 'both' ? 'single' : ''}`}>
      {view !== 'distribution' && <section className="metric-chart-plot" aria-label={`${label} time trend`}><h4>Time trend <span>{unit} · {timeLabel}</span></h4>
        <ResponsiveContainer width="100%" height={compact ? '100%' : 260}>
          <ComposedChart data={series} margin={{ top: 15, right: 20, left: 0, bottom: 14 }} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tick={tick} tickLine={false} minTickGap={30} interval="preserveStartEnd" />
            <YAxis tick={tick} tickLine={false} width={58} tickFormatter={format} domain={summary.min === summary.max ? [Math.min(0, summary.min), summary.max === 0 ? 1 : summary.max + Math.max(Math.abs(summary.max) * 0.1, 0.01)] : ['auto', 'auto']} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--text-primary)', marginBottom: 5 }} formatter={value => [`${format(value)} ${unit}`, label]} labelFormatter={name => `Time: ${name}`} />
            <ReferenceLine y={summary.mean} stroke="var(--text-secondary)" strokeDasharray="5 5" label={{ value: 'Mean', fill: 'var(--text-secondary)', position: 'insideTopRight', fontSize: 11 }} />
            <Area type="linear" dataKey={key} name={label} fill={color} fillOpacity={0.09} stroke={color} strokeWidth={2.5} dot={summary.count === 1 ? { r: 4 } : false} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </section>}
      {view !== 'trend' && <section className="metric-chart-plot" aria-label={`${label} value distribution`}><h4>Value distribution <span>Count of {sampleLabel}</span></h4>
        <ResponsiveContainer width="100%" height={compact ? '100%' : 260}>
          <ComposedChart data={distribution} margin={{ top: 15, right: 20, left: 0, bottom: 14 }} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="range" tick={tick} tickLine={false} minTickGap={22} interval="preserveStartEnd" />
            <YAxis tick={tick} tickLine={false} width={45} allowDecimals={false} domain={[0, 'auto']} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--text-primary)', marginBottom: 5 }} formatter={value => [value, sampleLabel]} labelFormatter={name => `${label}: ${name} ${unit}`} cursor={{ fill: 'var(--accent-glow)' }} />
            <Bar dataKey="count" name={sampleLabel} fill={color} radius={[5, 5, 0, 0]} maxBarSize={64} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="metric-chart-axis-label">{label} value range ({unit || 'unitless'})</p>
      </section>}
    </div>
  </div>;
}
