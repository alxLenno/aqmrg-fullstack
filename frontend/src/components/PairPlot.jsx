import { useMemo } from 'react';
import { extractMetrics, formatMetricLabel, getMetricUnit } from '../utils/metrics';
import { chartValue } from '../utils/charts';
import { sampleEvenly } from '../utils/story';
export default function PairPlot({ data, columns, fullData = false }) {
  const records = useMemo(() => (fullData ? data : sampleEvenly(data, 200)).map(row => extractMetrics(row)), [data, fullData]);
  const size = 170, inner = 130, pad = 20;
  const ranges = Object.fromEntries(columns.map(key => {
    const values = records.map(row => chartValue(key, row[key])).filter(value => value !== null);
    return [key, values.length ? [Math.min(...values), Math.max(...values)] : null];
  }));
  return <div className="story-pair-scroll"><svg viewBox={`0 0 ${size*columns.length} ${size*columns.length}`} width={size*columns.length} height={size*columns.length} role="img" aria-label="Scatter matrix of selected measurements; each off-diagonal cell compares paired readings">
    {columns.flatMap((y, i) => columns.map((x, j) => <g key={`${x}-${y}`} transform={`translate(${j*size+pad},${i*size+pad})`}>
      <rect width={inner} height={inner} rx="8" fill="var(--bg-secondary)" stroke="var(--border)" />
      {x === y ? <><text x={inner/2} y={inner/2} textAnchor="middle" fill="var(--text-primary)" fontSize="13">{formatMetricLabel(x)}</text><text x={inner/2} y={inner/2+20} textAnchor="middle" fill="var(--text-secondary)" fontSize="11">{getMetricUnit(x)}</text></> : records.map((row, index) => {
        const xv = chartValue(x, row[x]), yv = chartValue(y, row[y]);
        if (xv === null || yv === null || !ranges[x] || !ranges[y]) return null;
        const project = (value, range) => range[0] === range[1] ? inner/2 : 8 + (value-range[0])/(range[1]-range[0])*(inner-16);
        return <circle key={index} cx={project(xv,ranges[x])} cy={inner-project(yv,ranges[y])} r="2.5" fill="var(--accent)" opacity="0.65"><title>{`${formatMetricLabel(x)}: ${xv} ${getMetricUnit(x)}; ${formatMetricLabel(y)}: ${yv} ${getMetricUnit(y)}`}</title></circle>;
      })}
    </g>))}
  </svg></div>;
}
