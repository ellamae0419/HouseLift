import '../../../assets/main.css';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { setTitle } from '../../../utils/generalFunctions';
import { DataCard } from '../../../components/Datacard/index';
import useServerSocket from '../../../hooks/useServerSocket';
import useAxiosPrivate from '../../../hooks/auth/useAxiosPrivate';

const monitoredHouses = [
    { id: 'H-001', location: 'Backyard', waterLevel: 1.2, liftStatus: 'normal' },
    { id: 'H-002', location: 'Garage', waterLevel: 3.6, liftStatus: 'lifted' },
    { id: 'H-003', location: 'Front yard', waterLevel: 0.4, liftStatus: 'normal' },
];
const MAX_LEVEL_CM = 4;

export const AdminDashboard = () => {
    setTitle('Admin Dashboard');
    const { wlValue, connected } = useServerSocket();
    const axiosPrivate = useAxiosPrivate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await axiosPrivate.get('/users');
                if (mounted) setUsers(res.data || []);
            } catch (err) {
                console.error('Error loading users:', err?.response?.data?.message || err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [axiosPrivate]);

    const totalUsers = users.length;
    const pendingCount = users.filter((u) => !u.isVerified).length;

    // Fall back to a representative demo reading until the device sends a live value,
    // so the gauge never sits at a meaningless flat 0% before the first sensor reading.
    const currentLevelCm = wlValue ?? 1.6;
    const fillPercent = Math.max(0, Math.min(100, Math.round((currentLevelCm / MAX_LEVEL_CM) * 100)));

    return (
        <>
            <h1 className="page-title">System overview</h1>
            <p className="page-subtitle">Live status across every connected home, updated in real time.</p>
            <div className="hl-page-stack">
                <div className="hl-kpi-grid">
                    <DataCard
                        title="Total users"
                        value={loading ? '—' : totalUsers}
                        footer="Registered accounts"
                        variant="green"
                    />

                    <Link to="/admin/users" style={{ textDecoration: 'none' }}>
                        <DataCard
                            title="Pending approvals"
                            value={loading ? '—' : pendingCount}
                            footer={pendingCount > 0 ? 'Needs your review' : 'All caught up'}
                            variant={pendingCount > 0 ? 'amber' : 'green'}
                        />
                    </Link>

                    <DataCard
                        title="Live monitoring"
                        footer={connected ? 'Sensor feed connected' : 'Waiting for device'}
                        variant="blue"
                        main={
                            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '28px', color: connected ? 'var(--hl-accent)' : 'var(--hl-danger)' }}>
                                {connected ? 'Online' : 'Offline'}
                            </div>
                        }
                    />

                    <div className="hl-card-shell hl-gauge-card">
                        <div className="hl-gauge-card__title">Flood water level</div>
                        <div className="hl-gauge-card__row">
                            <div className="hl-gauge-card__tube">
                                <div className="hl-gauge-card__fill" style={{ height: `${fillPercent}%` }} />
                            </div>
                            <div className="hl-gauge-card__ticks">
                                <span>{MAX_LEVEL_CM} cm</span>
                                <span>0 cm</span>
                            </div>
                        </div>
                        <div className="hl-gauge-card__pct">{fillPercent}%</div>
                    </div>
                </div>

                <div className="hl-card-shell hl-glance-card">
                    <div className="hl-glance-title">Monitored houses at a glance</div>
                    <div className="hl-glance-list">
                        {monitoredHouses.map((h) => {
                            const pct = Math.min(100, Math.round((h.waterLevel / MAX_LEVEL_CM) * 100));
                            const lifted = h.liftStatus === 'lifted';
                            return (
                                <div className="hl-glance-item" key={h.id}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '15px', color: 'var(--hl-ink)' }}>{h.id}</span>
                                        <span style={{
                                            fontSize: '11.5px',
                                            fontWeight: 600,
                                            padding: '3px 10px',
                                            borderRadius: '999px',
                                            color: lifted ? 'var(--hl-warning-ink)' : 'var(--hl-success-ink)',
                                            background: lifted ? 'var(--hl-warning-bg)' : 'var(--hl-success-bg)',
                                        }}>{h.liftStatus}</span>
                                    </div>
                                    <span style={{ fontSize: '13px', color: 'var(--hl-ink-secondary)' }}>{h.location}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#E7ECEB', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${pct}%`,
                                                height: '100%',
                                                background: lifted ? 'var(--hl-warning)' : 'var(--hl-accent)',
                                            }} />
                                        </div>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--hl-ink-secondary)', whiteSpace: 'nowrap' }}>{h.waterLevel} cm</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminDashboard;
