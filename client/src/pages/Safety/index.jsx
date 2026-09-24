import '../../assets/main.css'
import { useEffect, useState } from 'react';
import { setTitle } from '../../utils/generalFunctions';
import useServerSocket from '../../hooks/useServerSocket';
import useAxiosPrivate from '../../hooks/auth/useAxiosPrivate';

const MAX_LEVEL_CM = 4;

export const HouseMonitoring = () => {
    setTitle("Flood Monitoring");
    const { readingsById, connected } = useServerSocket();
    const axiosPrivate = useAxiosPrivate();
    const [houses, setHouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await axiosPrivate.get('/users/houses');
                if (mounted) { setHouses(res.data || []); setLoadError(''); }
            } catch (err) {
                console.error('Error loading houses:', err?.response?.data?.message || err.message);
                if (mounted) setLoadError("Couldn't load the house list. Check your connection and try refreshing the page.");
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [axiosPrivate]);

    return (
        <>
            <h1 className='page-title'>Flood monitoring</h1>
            <p className="page-subtitle">Live water level and lift status for every registered pet house.</p>

            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px',
                fontSize: '13px', fontWeight: 600,
                color: connected ? 'var(--hl-success-ink)' : 'var(--hl-danger)',
            }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'currentColor' }} />
                {connected ? 'Live sensor feed connected' : 'Live sensor feed offline — reconnecting…'}
            </div>

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

                        return (
                            <div className="hl-glance-item" key={h.userId}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '15px', color: 'var(--hl-ink)' }}>{h.username}</span>
                                    <span style={{
                                        fontSize: '11.5px',
                                        fontWeight: 600,
                                        padding: '3px 10px',
                                        borderRadius: '999px',
                                        color: !hasReading ? 'var(--hl-ink-tertiary)' : lifted ? 'var(--hl-warning-ink)' : 'var(--hl-success-ink)',
                                        background: !hasReading ? 'var(--hl-page-bg)' : lifted ? 'var(--hl-warning-bg)' : 'var(--hl-success-bg)',
                                    }}>{!hasReading ? 'no data' : lifted ? 'lifted' : 'normal'}</span>
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
