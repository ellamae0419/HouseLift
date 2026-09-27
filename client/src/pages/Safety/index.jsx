import '../../assets/main.css'
import { useCallback, useEffect, useState } from 'react';
import { setTitle } from '../../utils/generalFunctions';
import useServerSocket from '../../hooks/useServerSocket';
import useAxiosPrivate from '../../hooks/auth/useAxiosPrivate';

const MAX_LEVEL_CM = 4;

const REFRESH_MS = 20000;

export const HouseMonitoring = () => {
    setTitle("Flood Monitoring");
    const { readingsById, deviceStatusById } = useServerSocket();
    const axiosPrivate = useAxiosPrivate();
    const [houses, setHouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [liftingId, setLiftingId] = useState(null);
    const [liftMsg, setLiftMsg] = useState('');

    const loadHouses = useCallback(async () => {
        try {
            const res = await axiosPrivate.get('/users/houses');
            setHouses(res.data || []);
            setLoadError('');
        } catch (err) {
            console.error('Error loading houses:', err?.response?.data?.message || err.message);
            setLoadError("Couldn't load the house list. Check your connection and try refreshing the page.");
        } finally {
            setLoading(false);
        }
    }, [axiosPrivate]);

    useEffect(() => {
        loadHouses();
        // Keeps the online/offline pills fresh even if a device drops without
        // the socket noticing (e.g. it lost power rather than disconnecting).
        const timer = setInterval(loadHouses, REFRESH_MS);
        return () => clearInterval(timer);
    }, [loadHouses]);

    const isOnline = (h) => {
        const pushed = deviceStatusById[h.esp32_id];
        return pushed !== undefined ? pushed : !!h.online;
    };

    const handleLift = async (h) => {
        setLiftingId(h.esp32_id);
        setLiftMsg('');
        try {
            await axiosPrivate.post(`/users/esp32-lift?esp32_id=${encodeURIComponent(h.esp32_id)}`);
            setLiftMsg(`Lift command sent to ${h.username}'s pet house.`);
        } catch (err) {
            const status = err?.response?.status;
            setLiftMsg(status === 409
                ? `${h.username}'s device is offline — it has to be powered on first.`
                : err?.response?.data?.message || 'Could not send the lift command.');
        } finally {
            setLiftingId(null);
            setTimeout(() => setLiftMsg(''), 5000);
        }
    };

    return (
        <>
            <h1 className='page-title'>Flood monitoring</h1>
            <p className="page-subtitle">Live water level and lift status for every registered pet house.</p>

            {liftMsg && (
                <div style={{
                    marginBottom: '16px', padding: '10px 14px', borderRadius: '9px',
                    background: 'var(--hl-card-bg)', border: '1px solid var(--hl-border)',
                    color: 'var(--hl-ink)', fontSize: '13px', fontWeight: 600,
                }}>
                    {liftMsg}
                </div>
            )}

            {loadError && (
                <div style={{
                    marginBottom: '16px', padding: '10px 14px', borderRadius: '9px',
                    background: 'var(--hl-danger-bg)', color: 'var(--hl-danger)', fontSize: '13px', fontWeight: 600,
                }}>
                    {loadError}
                </div>
            )}

            <div className="hl-card-shell hl-glance-card">
                <div className="hl-glance-title">Monitored houses</div>
                <div className="hl-glance-list">
                    {houses.map((h) => {
                        const waterLevel = h.esp32_id ? readingsById[h.esp32_id] : undefined;
                        const hasReading = waterLevel != null;
                        const threshold = h.threshold != null ? Number(h.threshold) : null;
                        const lifted = hasReading && threshold != null && waterLevel >= threshold;
                        const pct = hasReading ? Math.min(100, Math.round((waterLevel / MAX_LEVEL_CM) * 100)) : 0;
                        const online = h.esp32_id ? isOnline(h) : false;

                        return (
                            <div className="hl-glance-item" key={h.userId}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '15px', color: 'var(--hl-ink)' }}>{h.username}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{
                                            fontSize: '11.5px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px',
                                            color: online ? 'var(--hl-success-ink)' : 'var(--hl-ink-tertiary)',
                                            background: online ? 'var(--hl-success-bg)' : 'var(--hl-page-bg)',
                                        }}>{online ? 'online' : 'offline'}</span>
                                        <span style={{
                                            fontSize: '11.5px',
                                            fontWeight: 600,
                                            padding: '3px 10px',
                                            borderRadius: '999px',
                                            color: !hasReading ? 'var(--hl-ink-tertiary)' : lifted ? 'var(--hl-warning-ink)' : 'var(--hl-success-ink)',
                                            background: !hasReading ? 'var(--hl-page-bg)' : lifted ? 'var(--hl-warning-bg)' : 'var(--hl-success-bg)',
                                        }}>{!hasReading ? 'no data' : lifted ? 'lifted' : 'normal'}</span>
                                    </div>
                                </div>
                                <span style={{ fontSize: '13px', color: 'var(--hl-ink-secondary)' }}>
                                    {threshold != null ? `Triggers at ${threshold} cm` : 'Threshold not set'}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#E7ECEB', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${pct}%`,
                                            height: '100%',
                                            background: lifted ? 'var(--hl-warning)' : 'var(--hl-accent)',
                                        }} />
                                    </div>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--hl-ink-secondary)', whiteSpace: 'nowrap' }}>
                                        {hasReading ? `${waterLevel} cm` : '— cm'}
                                    </span>
                                </div>

                                {h.esp32_id && (
                                    <button
                                        type="button"
                                        onClick={() => handleLift(h)}
                                        disabled={!online || liftingId === h.esp32_id}
                                        style={{
                                            marginTop: '4px', padding: '6px 12px', borderRadius: '8px',
                                            border: '1px solid var(--hl-border)', background: 'var(--hl-card-bg)',
                                            color: online ? 'var(--hl-accent)' : 'var(--hl-ink-tertiary)',
                                            fontSize: '12.5px', fontWeight: 600,
                                            cursor: online && liftingId !== h.esp32_id ? 'pointer' : 'not-allowed',
                                        }}
                                    >
                                        {liftingId === h.esp32_id ? 'Sending…' : online ? 'Lift now' : 'Device offline'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    {!loading && houses.length === 0 && (
                        <div style={{ color: 'var(--hl-ink-tertiary)', textAlign: 'center', padding: '24px', gridColumn: '1 / -1' }}>
                            No registered users yet.
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default HouseMonitoring;
