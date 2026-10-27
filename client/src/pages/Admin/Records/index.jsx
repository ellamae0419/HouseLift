import '../../../assets/main.css';
import * as React from 'react';
import { setTitle } from '../../../utils/generalFunctions';
import useAxiosPrivate from '../../../hooks/auth/useAxiosPrivate';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import RefreshIcon from '@mui/icons-material/Refresh';

const outlineBtn = { color: 'var(--hl-accent)', borderColor: 'var(--hl-accent)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' };
const solidBtn = { backgroundColor: 'var(--hl-accent)', color: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none', '&:hover': { backgroundColor: 'var(--hl-secondary-dark)' } };
const th = { color: 'var(--hl-ink-secondary)', fontWeight: 600, whiteSpace: 'nowrap' };
const td = { color: 'var(--hl-ink)' };
const fieldSx = { minWidth: 220, '& .MuiInputBase-input': { color: 'var(--heading)' }, '& .MuiInputLabel-root': { color: 'var(--text)' }, '& .MuiOutlinedInput-root': { backgroundColor: 'var(--background)' } };

const pillStyle = (kind) => ({
    fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px', whiteSpace: 'nowrap',
    color: `var(--hl-${kind}-ink)`, background: `var(--hl-${kind}-bg)`,
});

const show = (value, type) => {
    if (value === null || value === undefined || value === '') return <span style={{ color: 'var(--hl-ink-secondary)' }}>—</span>;
    if (type === 'time') return new Date(value).toLocaleString();
    if (type === 'yesno') return <span style={pillStyle(value ? 'success' : 'warning')}>{value ? 'Yes' : 'No'}</span>;
    if (type === 'number') return Number(value).toLocaleString();
    return String(value);
};

export const Records = () => {
    setTitle('All records');
    const axiosPrivate = useAxiosPrivate();

    const [tables, setTables] = React.useState([]);
    const [active, setActive] = React.useState('users');
    const [data, setData] = React.useState(null);
    const [query, setQuery] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const load = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [list, table] = await Promise.all([axiosPrivate.get('/records'), axiosPrivate.get(`/records/${active}`)]);
            setTables(list.data || []);
            setData(table.data);
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not load the records.');
        } finally {
            setLoading(false);
        }
    }, [axiosPrivate, active]);

    React.useEffect(() => { load(); }, [load]);

    const needle = query.trim().toLowerCase();
    const rows = (data?.rows || []).filter((r) => !needle || Object.values(r).some((v) => v !== null && String(v).toLowerCase().includes(needle)));

    return (
        <>
            <h1 className="page-title">All records</h1>
            <p className="page-subtitle">Every table in the system, read-only. Passwords, device keys and ID photos are never shown here.</p>

            {error && (
                <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 9, background: 'var(--hl-danger-bg)', color: 'var(--hl-danger)', fontSize: 13, fontWeight: 600 }}>
                    {error}
                </div>
            )}

            <Card sx={{ backgroundColor: 'var(--hl-card-bg)', border: '1px solid var(--hl-border)', borderRadius: '14px', boxShadow: 'none' }}>
                <CardContent>
                    <div className="settings-section-header">
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {tables.map((t) => (
                                <Button
                                    key={t.key}
                                    onClick={() => { setActive(t.key); setQuery(''); }}
                                    aria-pressed={active === t.key}
                                    sx={active === t.key ? { ...solidBtn, px: 2 } : { ...outlineBtn, px: 2 }}
                                >
                                    {t.label} ({t.count.toLocaleString()})
                                </Button>
                            ))}
                        </div>
                        <Button
                            onClick={load}
                            disabled={loading}
                            startIcon={<RefreshIcon sx={{ animation: loading ? 'hl-spin 0.8s linear infinite' : 'none' }} />}
                            sx={{ ...outlineBtn, px: 2.5, '@keyframes hl-spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }}
                        >
                            Refresh
                        </Button>
                    </div>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}>
                        <TextField
                            size="small" label="Search this table" value={query}
                            onChange={(e) => setQuery(e.target.value)} sx={fieldSx}
                        />
                        {data && (
                            <span style={{ color: 'var(--hl-ink-secondary)', fontSize: 13 }}>
                                {needle ? `${rows.length} match${rows.length === 1 ? '' : 'es'} · ` : ''}
                                {data.total > data.limit
                                    ? `Showing the newest ${data.limit.toLocaleString()} of ${data.total.toLocaleString()}`
                                    : `${data.total.toLocaleString()} row${data.total === 1 ? '' : 's'}`}
                            </span>
                        )}
                    </div>

                    <div className="table-responsive">
                        <Table sx={{ mt: 2 }} className="maintenance-table">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: 'var(--hl-page-bg)' }}>
                                    {(data?.columns || []).map((c) => <TableCell key={c.key} sx={th}>{c.label}</TableCell>)}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((r, i) => (
                                    <TableRow key={i}>
                                        {data.columns.map((c) => (
                                            // The shared table style lets cells wrap, which splits codes and dates in two.
                                            // An inline style is the only thing that beats it.
                                            <TableCell
                                                key={c.key}
                                                sx={{ ...td, ...(c.type === 'mono' ? { fontFamily: 'var(--font-mono)' } : {}) }}
                                                style={c.type ? { whiteSpace: 'nowrap' } : undefined}
                                            >
                                                {show(r[c.key], c.type)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                                {data && rows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={data.columns.length} sx={{ ...td, textAlign: 'center', py: 4 }}>
                                            {needle ? 'Nothing matches your search.' : 'This table is empty for now.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </>
    );
};

export default Records;
