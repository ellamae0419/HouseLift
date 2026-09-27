import "../../assets/main.css";
import * as React from "react";
import { setTitle } from "../../utils/generalFunctions";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { DataCard } from '../../components/Datacard/index';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import useAxiosPrivate from '../../hooks/auth/useAxiosPrivate';

const RANGES = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
];

const TRIGGER_LABELS = {
    auto: 'Automatic (flood)',
    manual: 'Manual switch',
    remote: 'Remote (dashboard)',
};

const TRIGGER_TONE = {
    auto: { color: 'var(--hl-warning-ink)', background: 'var(--hl-warning-bg)' },
    manual: { color: 'var(--hl-ink-secondary)', background: 'var(--hl-page-bg)' },
    remote: { color: 'var(--hl-success-ink)', background: 'var(--hl-success-bg)' },
};

export const Maintenance = () => {
    setTitle('Maintenance');
    const axiosPrivate = useAxiosPrivate();

    const [range, setRange] = React.useState('7d');
    const [events, setEvents] = React.useState([]);
    const [breakdown, setBreakdown] = React.useState({});
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                const res = await axiosPrivate.get(`/reports/lift-events?range=${range}&limit=200`);
                if (!mounted) return;
                setEvents(res.data?.data || []);
                setBreakdown(res.data?.breakdown || {});
                setError('');
            } catch (err) {
                if (!mounted) return;
                setError(err?.response?.data?.message || 'Could not load lift activity.');
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [axiosPrivate, range]);

    const total = events.length;
    const automatic = breakdown.auto || 0;
    // Every automatic lift means the water actually reached the threshold,
    // which is the thing worth inspecting a house for.
    const housesAffected = new Set(
        events.filter((e) => e.trigger === 'auto').map((e) => e.esp32_id)
    ).size;

    return (
        <>
            <h1 className="page-title">Maintenance</h1>
            <p className="page-subtitle">Every lift and retract the hardware has actually performed.</p>

            <div className="stacked-container" style={{ gap: '24px' }}>
                <div className="metrics-grid">
                    <DataCard
                        title="Lift cycles"
                        value={loading ? '—' : total}
                        footer="Recorded in this period"
                        variant="blue"
                    />
                    <DataCard
                        title="Flood-triggered"
                        value={loading ? '—' : automatic}
                        footer="Raised automatically by water level"
                        variant={automatic > 0 ? 'amber' : 'green'}
                    />
                    <DataCard
                        title="Houses affected"
                        value={loading ? '—' : housesAffected}
                        footer="Had at least one flood lift"
                        variant={housesAffected > 0 ? 'amber' : 'green'}
                    />
                </div>

                <div className="logs-wrapper">
                    <Card className="logs-card" sx={{ backgroundColor: 'var(--hl-card-bg)', border: '1px solid var(--hl-border)', borderRadius: '14px', boxShadow: 'none' }}>
                        <CardContent>
                            <div className="logs-header">
                                <Typography variant="h6" sx={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                                    Lift activity
                                </Typography>
                                <select
                                    value={range}
                                    onChange={(e) => setRange(e.target.value)}
                                    aria-label="Time range"
                                    style={{
                                        padding: '8px 12px', borderRadius: '9px', border: '1px solid var(--hl-border)',
                                        background: 'var(--hl-card-bg)', color: 'var(--hl-ink)', fontSize: '13px', fontWeight: 600,
                                    }}
                                >
                                    {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </div>

                            {error && (
                                <div style={{
                                    marginTop: '12px', padding: '10px 14px', borderRadius: '9px',
                                    background: 'var(--hl-danger-bg)', color: 'var(--hl-danger)', fontSize: '13px', fontWeight: 600,
                                }}>
                                    {error}
                                </div>
                            )}

                            <div className="table-responsive" style={{ marginTop: 12 }}>
                                <Table className="maintenance-table" sx={{ mt: 2, width: '100%' }}>
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: 'var(--hl-page-bg)' }}>
                                            <TableCell sx={headCell}>When</TableCell>
                                            <TableCell sx={headCell}>House</TableCell>
                                            <TableCell sx={headCell}>Action</TableCell>
                                            <TableCell sx={headCell}>Triggered by</TableCell>
                                            <TableCell sx={headCell}>Duration</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {events.map((e) => {
                                            const tone = TRIGGER_TONE[e.trigger] || TRIGGER_TONE.manual;
                                            return (
                                                <TableRow key={e.id}>
                                                    <TableCell sx={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-mono)' }}>
                                                        {new Date(e.completedAt).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'var(--hl-ink)', fontWeight: 600 }}>
                                                        {e.username || e.esp32_id}
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'var(--hl-ink)' }}>
                                                        {e.direction === 'lift' ? 'Raised' : 'Lowered'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span style={{
                                                            padding: '4px 10px', borderRadius: '999px',
                                                            fontSize: '12px', fontWeight: 600,
                                                            color: tone.color, background: tone.background,
                                                        }}>
                                                            {TRIGGER_LABELS[e.trigger] || e.trigger}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-mono)' }}>
                                                        {(e.durationMs / 1000).toFixed(1)}s
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {!loading && events.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} sx={{ color: 'var(--hl-ink-tertiary)', textAlign: 'center', py: 4 }}>
                                                    No lift activity recorded in this period yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {loading && (
                                            <TableRow>
                                                <TableCell colSpan={5} sx={{ color: 'var(--hl-ink-tertiary)', textAlign: 'center', py: 4 }}>
                                                    Loading…
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
};

const headCell = { color: 'var(--hl-ink-secondary)', fontWeight: 600 };

export default Maintenance;
