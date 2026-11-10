import { useState, useEffect, useRef } from 'react';
import Brand from './Brand';

export default function Header({ apiStatus, devices = [], selectedDevice = '', onDeviceChange, activeTab = 'dashboard' }) {
    const [exportOpen, setExportOpen] = useState(false);
    const exportRef = useRef(null);
    const titles = { dashboard: 'Air quality overview', sensors: 'Sensor stations', health: 'Station health', 'raw-analysis': 'Data analysis' };

    useEffect(() => {
        const dismiss = (event) => {
            if (!exportRef.current?.contains(event.target)) setExportOpen(false);
        };
        document.addEventListener('pointerdown', dismiss);
        return () => document.removeEventListener('pointerdown', dismiss);
    }, []);

    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const formattedTime = time.toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Africa/Nairobi',
    });

    if (activeTab === 'about') return <header className="topbar lab-page-header"><div className="topbar-left"><div className="uil-mobile-brand"><Brand compact /></div><h1 className="page-title">About the Lab</h1><span className="page-subtitle">People, purpose, and research at UoN IoT Lab</span></div><div className="topbar-right"><a className="export-toggle-btn" href="/">Observatory</a><a className="export-toggle-btn" href="/display?view=story">Live display</a></div></header>;
    return (
        <header className="topbar">
            <div className="topbar-left"><div className="uil-mobile-brand"><Brand compact /></div>
                <h1 className="page-title">{titles[activeTab] || 'Your data'}</h1>
                <span className="page-subtitle">
                    Air quality monitoring across Nairobi metropolitan area
                </span>
            </div>
            <div className="topbar-right">
                <a className="export-toggle-btn" href="/display">Display mode</a>
                <div className="device-picker-container">
                    <label className="picker-label" htmlFor="station-picker">Node</label>
                    <select
                        id="station-picker"
                        className="device-select"
                        value={selectedDevice}
                        onChange={(e) => onDeviceChange(e.target.value)}
                    >
                        <option value="">All nodes</option>
                        {devices.map(d => (
                            <option key={d.device_id || d} value={d.device_id || d}>
                                {d.name || d.device_id || d}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={`export-container ${exportOpen ? 'is-open' : ''}`} ref={exportRef}
                    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setExportOpen(false); }}
                    onKeyDown={(event) => { if (event.key === 'Escape') { setExportOpen(false); exportRef.current?.querySelector('button')?.focus(); } }}>
                    <button className="export-toggle-btn" type="button" aria-expanded={exportOpen} aria-controls="export-options" onClick={() => setExportOpen(open => !open)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>Export</span>
                    </button>
                    <div className="export-dropdown" id="export-options" hidden={!exportOpen}>
                        <a 
                            href={`/api/v1/data/export/csv${selectedDevice ? '?device_id=' + encodeURIComponent(selectedDevice) : ''}`} 
                            className="export-item"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                            Sensor Data (CSV)
                        </a>
                        <a 
                            href={`/api/v1/health/export/csv${selectedDevice ? '?device_id=' + encodeURIComponent(selectedDevice) : ''}`} 
                            className="export-item"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                            </svg>
                            Health Logs (CSV)
                        </a>
                    </div>
                </div>
            </div>
            <div className="topbar-status">
                <div className={`live-indicator ${apiStatus === 'connected' ? '' : 'disconnected'}`}>
                    <span className="live-dot"></span>
                    <span>{apiStatus === 'connected' ? 'Connected' : apiStatus === 'connecting' ? 'Connecting…' : 'Connection lost'}</span>
                </div>
                <div className="time-display">{formattedTime} EAT</div>
            </div>
        </header>
    );
}
