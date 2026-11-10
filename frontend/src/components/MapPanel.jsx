import MapSources from './MapSources';
import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { discoverMetrics, formatMetricLabel, getMetricUnit } from '../utils/metrics';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon issues in Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

/**
 * Component to auto-fit the map to contain all sensor markers
 */
function ChangeView({ sensors }) {
    const map = useMap();
    useEffect(() => {
        const list = Array.isArray(sensors) ? sensors : [];
        if (list.length > 0) {
            const bounds = L.latLngBounds(list.map(s => [s?.latitude || 0, s?.longitude || 0]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: false });
        }
    }, [sensors, map]);
    return null;
}

export default function MapPanel({ sensors, loading }) {
    const { theme } = useTheme();
    const sensorsList = (Array.isArray(sensors) ? sensors : []).filter(s=>typeof s.latitude==='number'&&typeof s.longitude==='number'&&Number.isFinite(s.latitude)&&Number.isFinite(s.longitude)&&Math.abs(s.latitude)<=90&&Math.abs(s.longitude)<=180&&!(s.latitude===0&&s.longitude===0));
    
    // Discover relevant metrics for popups
    const activeMetricKeys = discoverMetrics(sensorsList);

    const getCustomIcon = sensor => L.divIcon({
        className:'custom-leaflet-icon',
        html:`<span class="overview-map-pin ${sensor.is_online ? 'reporting' : 'inactive'}"></span>`,
        iconSize:[18,18], iconAnchor:[9,9], popupAnchor:[0,-10],
    });

    if (loading && (!sensors || sensors.length === 0)) {
        return (
            <div className="card map-card loading">
                <div className="discovery-spinner"></div>
                <p>Initializing Geographic Services...</p>
            </div>
        );
    }

    return (
        <div className="card map-card animate-fade-in">
            <div className="card-header"><div><h3>Node locations</h3><p>Markers show reported node availability</p></div></div>
            <div className="overview-map-legend"><span><i className="reporting" />Reporting</span><span><i />Not reporting</span>{!sensorsList.length && <span>No valid node coordinates available</span>}</div>
            <div className="map-container-wrapper">
                <MapContainer 
                    center={[-1.286389, 36.817223]} // Default to Nairobi
                    zoom={12} 
                    style={{ height: '100%', minHeight:'340px', width: '100%', borderRadius: '8px' }}
                    scrollWheelZoom={false}
                    zoomAnimation={false}
                >
                    <MapSources dark={theme==='dark'} />
                    
                    <ChangeView sensors={sensorsList} />

                    {sensorsList.map((sensor) => {
                        const readings = sensor.readings || {};
                        const customIcon = getCustomIcon(sensor);
                        
                        return (
                            <Marker 
                                key={sensor.id} 
                                position={[sensor.latitude, sensor.longitude]}
                                icon={customIcon}
                            >
                                <Popup className="custom-popup">
                                    <div className="map-popup-content">
                                        <div className="popup-header">
                                            <span className="popup-node-status" style={{ background: sensor.is_online ? 'var(--accent)' : 'var(--text-secondary)' }}></span>
                                            <strong>Node {sensor.device_id}</strong>
                                        </div>
                                        <div className="popup-id">Last report: {sensor.last_seen || 'Unknown'}</div>
                                        
                                        <div className="popup-grid">
                                            {activeMetricKeys.slice(0, 6).map(key => (
                                              <div key={key} className="popup-stat">
                                                  <label>{formatMetricLabel(key)}:</label>
                                                  <span>
                                                    {readings[key] ?? '--'}
                                                    <small>{getMetricUnit(key)}</small>
                                                  </span>
                                              </div>
                                            ))}
                                        </div>

                                        
                                        <div className="popup-footer">
                                            <span className="tag-location">{sensor.location_name}</span>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>
        </div>
    );
}
