import '../../assets/main.css';
import { useCallback, useEffect, useState } from 'react';
import { setTitle } from '../../utils/generalFunctions';
import { DataCard } from '../../components/Datacard/index';
import useAxiosPrivate from '../../hooks/auth/useAxiosPrivate';
import useAuth from '../../hooks/auth/useAuth';
import { hasAnyRole } from '../../utils/roles';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const RANGES = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
];

const TRIGGER_LABELS = {
    auto: 'Automatic',
    manual: 'Manual switch',
    remote: 'Remote (dashboard)',
};

// Hour buckets come back as "2026-09-27 14:00:00", day buckets as
// "2026-09-27" — show only the part that changes within the range.
const formatBucket = (bucket, granularity) => {
    if (!bucket) return '';
    if (granularity === 'hour') return bucket.slice(11, 16);
    return bucket.slice(5);
};

const formatDuration = (ms) => {
    if (!ms && ms !== 0) return '—';
    return `${(ms / 1000).toFixed(1)}s`;
};

const formatGap = (seconds) => {
    if (seconds == null) return '—';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
};

export const Reports = () => {
    setTitle('Reports');
    const axiosPrivate = useAxiosPrivate();
    const { auth } = useAuth();
    const isAdmin = hasAnyRole(auth, ['admin']);

    const [range, setRange] = useState('24h');
    const [houses, setHouses] = useState([]);
    const [selectedHouse, setSelectedHouse] = useState('');
    const [summary, setSummary] = useState(null);
    const [levels, setLevels] = useState({ data: [], bucket: 'hour' });
    const [lifts, setLifts] = useState({ data: [], breakdown: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Only admins can target another house; for everyone else the server
    // pins the query to their own device regardless of what's sent.
    const houseParam = isAdmin && selectedHouse ? `&esp32_id=${encodeURIComponent(selectedHouse)}` : '';

    useEffect(() => {
        if (!isAdmin) return undefined;
        let mounted = true;
        (async () => {
            try {
                const res = await axiosPrivate.get('/users/houses');
                if (mounted) setHouses((res.data || []).filter((h) => h.esp32_id));
            } catch (err) {
                console.error('Error loading houses:', err?.response?.data?.message || err.message);
            }
        })();
        return () => { mounted = false; };
    }, [axiosPrivate, isAdmin]);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [s, w, l] = await Promise.all([
                axiosPrivate.get(`/reports/summary?range=${range}${houseParam}`),
                axiosPrivate.get(`/reports/water-level?range=${range}${houseParam}`),
                axiosPrivate.get(`/reports/lift-events?range=${range}${houseParam}`),
            ]);
            setSummary(s.data);
            setLevels({ data: w.data?.data || [], bucket: w.data?.bucket || 'hour' });
            setLifts({ data: l.data?.data || [], breakdown: l.data?.breakdown || {} });
        } catch (err) {
            const msg = err?.response?.data?.message || err.message;
            setError(msg === 'No device found for this account'
                ? 'No device is linked to this account yet, so there is nothing to report on.'
                : `Couldn't load reports: ${msg}`);
        } finally {
            setLoading(false);
        }
    }, [axiosPrivate, range, houseParam]);

    useEffect(() => { load(); }, [load]);

    const chartData = levels.data.map((d) => ({
        ...d,
        label: formatBucket(d.bucket, levels.bucket),
    }));

    const breakdownData = ['auto', 'manual', 'remote'].map((k) => ({
        name: TRIGGER_LABELS[k],
        count: lifts.breakdown[k] || 0,
    }));

    const hasReadings = chartData.length > 0;
    const hasLifts = lifts.data.length > 0;

    return (
        <>
            <h1 className="page-title">Reports</h1>
            <p className="page-subtitle">Water level trends and lift activity recorded by the device.</p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '18px' }}>
                <select
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    style={selectStyle}
                    aria-label="Time range"
                >
                    {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>

                {isAdmin && (
                    <select
                        value={selectedHouse}
                        onChange={(e) => setSelectedHouse(e.target.value)}
                        style={selectStyle}
                        aria-label="House"
                    >
                        <option value="">All houses</option>
                        {houses.map((h) => (
                            <option key={h.esp32_id} value={h.esp32_id}>{h.username}</option>
                        ))}
                    </select>
                )}
            </div>

            {error && (
                <div style={{
                    marginBottom: '16px', padding: '10px 14px', borderRadius: '9px',
                    background: 'var(--hl-danger-bg)', color: 'var(--hl-danger)', fontSize: '13px', fontWeight: 600,
                }}>
                    {error}
                </div>
            )}

            <div className="hl-page-stack">
                <div className="hl-kpi-grid">
                    <DataCard
                        title="Lifts this week"
                        value={loading ? '—' : summary?.liftsThisWeek ?? 0}
                        footer={`${summary?.automaticLifts ?? 0} triggered automatically`}
                        variant="green"
                    />
                    <DataCard
                        title="Average water level"
                        value={loading ? '—' : summary?.avgLevel24h ?? '—'}
                        footer="Across the last 24 hours"
                        variant="blue"
                    />
                    <DataCard
                        title="Highest water level"
                        value={loading ? '—' : summary?.maxLevel24h ?? '—'}
                        footer="Peak in the last 24 hours"
                        variant={Number(summary?.maxLevel24h) >= 3 ? 'amber' : 'blue'}
                    />
                    <DataCard
                        title="Longest gap"
                        value={loading ? '—' : formatGap(summary?.longestGapSeconds)}
                        footer={`${summary?.readings24h ?? 0} readings in 24h`}
                        variant="green"
                    />
                </div>

                <div className="hl-card-shell">
                    <div className="hl-glance-title">Water level trend</div>
                    {hasReadings ? (
                        <div style={{ width: '100%', height: 260, marginTop: '12px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
                                    <defs>
                                        <linearGradient id="wlFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--hl-accent)" stopOpacity={0.35} />
                                            <stop offset="100%" stopColor="var(--hl-accent)" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--hl-border)" vertical={false} />
                                    <XAxis dataKey="label" tick={axisTick} stroke="var(--hl-border)" />
                                    <YAxis tick={axisTick} stroke="var(--hl-border)" domain={[0, 4]} />
                                    <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, n === 'avgLevel' ? 'Average' : 'Peak']} />
                                    <Area type="monotone" dataKey="avgLevel" stroke="var(--hl-accent)" strokeWidth={2} fill="url(#wlFill)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyNote loading={loading} what="readings" />
                    )}
                </div>

                <div className="hl-card-shell">
                    <div className="hl-glance-title">What triggered each lift</div>
                    {hasLifts ? (
                        <div style={{ width: '100%', height: 220, marginTop: '12px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={breakdownData} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--hl-border)" vertical={false} />
                                    <XAxis dataKey="name" tick={axisTick} stroke="var(--hl-border)" />
                                    <YAxis tick={axisTick} stroke="var(--hl-border)" allowDecimals={false} />
                                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Lifts']} />
                                    <Bar dataKey="count" fill="var(--hl-accent)" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyNote loading={loading} what="lift events" />
                    )}
                </div>

                <div className="hl-card-shell">
                    <div className="hl-glance-title">Recent lift activity</div>
                    {hasLifts ? (
                        <div style={{ overflowX: 'auto', marginTop: '12px' }}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>When</th>
                                        {isAdmin && <th style={thStyle}>House</th>}
                                        <th style={thStyle}>Direction</th>
                                        <th style={thStyle}>Trigger</th>
                                        <th style={thStyle}>Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lifts.data.map((e) => (
                                        <tr key={e.id}>
                                            <td style={tdStyle}>{new Date(e.completedAt).toLocaleString()}</td>
                                            {isAdmin && <td style={tdStyle}>{e.username || '—'}</td>}
                                            <td style={tdStyle}>{e.direction === 'lift' ? 'Raised' : 'Lowered'}</td>
                                            <td style={tdStyle}>{TRIGGER_LABELS[e.trigger] || e.trigger}</td>
                                            <td style={tdStyle}>{formatDuration(e.durationMs)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyNote loading={loading} what="lift events" />
                    )}
                </div>
            </div>
        </>
    );
};

const EmptyNote = ({ loading, what }) => (
    <p style={{ color: 'var(--hl-ink-secondary)', fontSize: '13px', marginTop: '10px' }}>
        {loading ? 'Loading…' : `No ${what} recorded in this period yet.`}
    </p>
);

const selectStyle = {
    padding: '8px 12px',
    borderRadius: '9px',
    border: '1px solid var(--hl-border)',
    background: 'var(--hl-card-bg)',
    color: 'var(--hl-ink)',
    fontSize: '13px',
    fontWeight: 600,
};

const axisTick = { fill: 'var(--hl-ink-secondary)', fontSize: 11 };

const tooltipStyle = {
    background: 'var(--hl-card-bg)',
    border: '1px solid var(--hl-border)',
    borderRadius: '9px',
    fontSize: '12px',
    color: 'var(--hl-ink)',
};

const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' };
const thStyle = {
    textAlign: 'left', padding: '8px 10px', color: 'var(--hl-ink-secondary)',
    fontWeight: 600, borderBottom: '1px solid var(--hl-border)', whiteSpace: 'nowrap',
};
const tdStyle = {
    padding: '8px 10px', color: 'var(--hl-ink)',
    borderBottom: '1px solid var(--hl-border)', whiteSpace: 'nowrap',
};

export default Reports;
