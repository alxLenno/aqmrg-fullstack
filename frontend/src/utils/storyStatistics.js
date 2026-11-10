export function quantile(sorted, p) {
  if (!sorted.length) return null;
  const at = (sorted.length - 1) * p, low = Math.floor(at);
  return sorted[low] + (sorted[Math.ceil(at)] - sorted[low]) * (at - low);
}
export function describe(values) {
  const sorted = values.filter(Number.isFinite).sort((a,b)=>a-b), n = sorted.length;
  if (!n) return null;
  const mean = sorted.reduce((a,b)=>a+b,0)/n;
  const m2 = sorted.reduce((s,v)=>s+(v-mean)**2,0)/n;
  const sd = n>1 ? Math.sqrt(m2*n/(n-1)) : null;
  const q1=quantile(sorted,.25), q3=quantile(sorted,.75), iqr=q3-q1;
  const inliers=sorted.filter(v=>v>=q1-1.5*iqr && v<=q3+1.5*iqr);
  return {n,sorted,mean,sd,min:sorted[0],max:sorted.at(-1),q1,median:quantile(sorted,.5),q3,iqr,
    low:inliers[0],high:inliers.at(-1),outliers:sorted.filter(v=>v<q1-1.5*iqr || v>q3+1.5*iqr),
    skew:n>=3&&m2>0 ? sorted.reduce((s,v)=>s+(v-mean)**3,0)/n/m2**1.5 : null,
    kurtosis:n>=4&&m2>0 ? sorted.reduce((s,v)=>s+(v-mean)**4,0)/n/m2**2-3 : null};
}
// Standard-normal CDF approximation; invert by bisection for plotting positions.
function cdf(x) {
  const sign=x<0?-1:1, a=Math.abs(x)/Math.SQRT2, t=1/(1+.3275911*a);
  const erf=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-a*a);
  return .5*(1+sign*erf);
}
export function normalQuantile(p) {
  if (!(p>0&&p<1)) return null;
  let lo=-9,hi=9;
  for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(cdf(mid)<p)lo=mid;else hi=mid;}
  return (lo+hi)/2;
}
export function shapeData(stats, fullData = false) {
  if (!stats || stats.n<10 || !stats.sd) return null;
  const {sorted,n,min,max,mean,sd}=stats;
  const bins=Math.min(30,Math.max(8,Math.ceil(Math.sqrt(n)))), width=(max-min)/bins;
  const sampled=fullData ? sorted : sorted.filter((_,i)=>i%Math.max(1,Math.ceil(n/1000))===0);
  const bandwidth=1.06*sd*n**(-.2), factor=Math.sqrt(2*Math.PI);
  const points=Array.from({length:bins},(_,i)=>({x:min+(i+.5)*width,count:0}));
  sorted.forEach(v=>points[Math.min(bins-1,Math.floor((v-min)/width))].count++);
  points.forEach(p=>{p.density=p.count/(n*width);p.normal=Math.exp(-.5*((p.x-mean)/sd)**2)/(sd*factor);p.kde=sampled.reduce((s,v)=>s+Math.exp(-.5*((p.x-v)/bandwidth)**2),0)/(sampled.length*bandwidth*factor);});
  const shown=fullData ? n : Math.min(n,400);
  const qq=Array.from({length:shown},(_,j)=>{const i=Math.round(j*(n-1)/(shown-1));return {observed:sorted[i],expected:mean+sd*normalQuantile((i+.5)/n)};});
  return {points,qq,bandwidth};
}
