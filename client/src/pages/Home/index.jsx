import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { setTitle } from '../../utils/generalFunctions';
import { Container } from '../../components/Container/index';
import { HouseIllustration } from '../../components/HouseIllustration/index';
import useNotifications from '../../hooks/useNotifications';
import useServerSocket from '../../hooks/useServerSocket';
import useAuth from '../../hooks/auth/useAuth';
import useAxiosPrivate from '../../hooks/auth/useAxiosPrivate';
import './index.css';

const ShieldCheckIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5z" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);

const AlertTriangleIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m10.29 3.86-8.18 14.14A1.5 1.5 0 0 0 3.4 20.4h17.2a1.5 1.5 0 0 0 1.29-2.4L13.71 3.86a1.5 1.5 0 0 0-2.42 0Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const SlidersIcon = ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
    </svg>
);

const TargetIcon = ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
);

const BellIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

export const Home = () => {
    setTitle('Dashboard');
    const { auth } = useAuth();
    const { unreadCount } = useNotifications();
    const { wlValue, connected } = useServerSocket();
    const axiosPrivate = useAxiosPrivate();
    const [threshold, setThreshold] = useState(null);
    const [demoLevel, setDemoLevel] = useState(0);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await axiosPrivate.post('/esp32/config', { esp32_id: 'esp32-default' });
                const t = Number(res?.data?.threshold);
                if (mounted && !Number.isNaN(t)) setThreshold(t);
            } catch (err) {
                console.error('Error loading flood threshold:', err?.response?.data?.message || err.message);
            }
        })();
        return () => { mounted = false; };
    }, [axiosPrivate]);

    // Use the live sensor reading once one arrives; until then let the stepper
    // below drive a demo value, so the dashboard is still usable without hardware.
    const waterLevel = wlValue ?? demoLevel;
    const flooded = threshold != null && waterLevel >= threshold;
    const firstName = auth?.username || 'there';

    return (
        <Container>
            <div className="hl-dashboard">
                <div className="hl-dashboard-header">
                    <div>
                        <div className="hl-dashboard-greeting">Hi, {firstName}</div>
                        <h1 className="hl-dashboard-title">{firstName}'s Pet House</h1>
                    </div>
                    <div className="hl-dashboard-actions">
                        <Link to="/notifications" className="hl-icon-btn" aria-label="Notifications">
                            <BellIcon />
                            {unreadCount > 0 && <span className="hl-icon-btn-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                        </Link>
                        <Link to="/profile" className="hl-avatar" aria-label="Profile">
                            {firstName.slice(0, 1).toUpperCase()}
                        </Link>
                    </div>
                </div>

                <div className="hl-status-card">
                    <HouseIllustration flooded={flooded} />
                    <div className="hl-status-row">
                        {flooded ? <AlertTriangleIcon /> : <ShieldCheckIcon />}
                        <div>
                            <div className="hl-status-title" data-flooded={flooded}>
                                {flooded ? 'Flood detected' : 'All clear'}
                            </div>
                            <div className="hl-status-subtitle">
                                {flooded ? 'Platform raised automatically' : 'Platform lowered, resting on ground'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="hl-chip-row">
                    <div className="hl-chip">
                        <div className="hl-chip-label"><SlidersIcon /> Water level</div>
                        <div className="hl-chip-value">{waterLevel} cm</div>
                        {wlValue == null && (
                            <div className="hl-chip-stepper">
                                <button type="button" onClick={() => setDemoLevel((v) => Math.max(0, v - 1))} aria-label="Decrease demo water level">–</button>
                                <button type="button" onClick={() => setDemoLevel((v) => v + 1)} aria-label="Increase demo water level">+</button>
                            </div>
                        )}
                    </div>
                    <div className="hl-chip">
                        <div className="hl-chip-label"><TargetIcon /> Flood trigger</div>
                        <div className="hl-chip-value">{threshold ?? '—'} cm</div>
                        <div className="hl-chip-caption">Auto lift threshold</div>
                    </div>
                </div>

                <div className="hl-monitor-row">
                    <div>
                        <div className="hl-monitor-title">Live monitoring</div>
                        <div className="hl-monitor-subtitle">Sensor feed updates the platform automatically</div>
                    </div>
                    <span className={`hl-status-dot ${connected ? 'is-connected' : 'is-offline'}`}>
                        {connected ? 'Connected' : 'Offline'}
                    </span>
                </div>

                <Link to="/history" className="hl-panel-row">
                    <div>
                        <div className="hl-monitor-title">Elevation history</div>
                        <div className="hl-monitor-subtitle">Flood and maintenance events for this house</div>
                    </div>
                    <span className="hl-panel-row__link">
                        View
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
                    </span>
                </Link>
            </div>
        </Container>
    );
};

export default Home;
