import './Brand.css';
export default function Brand({ compact = false }) {
  return <div className={`uil-brand${compact ? ' uil-brand-compact' : ''}`} aria-label="UoN IoT Lab — UiL">
    <img className="uil-brand-logo" src="/uon-logo.png" width="1200" height="797" alt="University of Nairobi" />
    <div className="uil-brand-wordmark"><strong>UoN IoT Lab</strong><span><b>UiL</b><span aria-hidden="true"> · </span>Air quality observatory</span></div>
  </div>;
}
