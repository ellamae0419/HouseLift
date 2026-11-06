import '../../../assets/main.css';
import * as React from 'react';
import { setTitle } from '../../../utils/generalFunctions';
import useAxiosPrivate from '../../../hooks/auth/useAxiosPrivate';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import RefreshIcon from '@mui/icons-material/Refresh';

const FILTERS = [
    { value: 'pending', label: 'Waiting' },
    { value: 'approved', label: 'Shown on shop' },
    { value: 'hidden', label: 'Hidden' },
    { value: 'all', label: 'All' },
];

const outlineBtn = { color: 'var(--hl-accent)', borderColor: 'var(--hl-accent)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' };
const solidBtn = { backgroundColor: 'var(--hl-accent)', color: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none', '&:hover': { backgroundColor: 'var(--hl-secondary-dark)' }, '&.Mui-disabled': { backgroundColor: 'var(--hl-accent)', color: '#fff', opacity: 0.5 } };
const dangerBtn = { color: 'var(--hl-danger)', borderColor: 'var(--hl-danger)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' };
const th = { color: 'var(--hl-ink-secondary)', fontWeight: 600 };
const td = { color: 'var(--hl-ink)' };
const mono = { fontFamily: 'var(--font-mono)' };

const pillStyle = (kind) => ({
    fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px', whiteSpace: 'nowrap',
    color: kind === 'danger' ? 'var(--hl-danger)' : `var(--hl-${kind}-ink)`, background: `var(--hl-${kind}-bg)`,
});
const PILLS = { pending: ['warning', 'Waiting'], approved: ['success', 'Shown on shop'], hidden: ['danger', 'Hidden'] };

const when = (value) => (value ? new Date(value).toLocaleString() : '');
const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

// Reviews buyers wrote on the shop with their serial code. A new one waits here: approve it to show it
// on the shop's home page, or hide it. Nothing a visitor writes appears on the shop without this step.
export const Reviews = () => {
    setTitle('Reviews');
    const axiosPrivate = useAxiosPrivate();

    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [filter, setFilter] = React.useState('pending');
    const [notice, setNotice] = React.useState('');
    const [error, setError] = React.useState('');

    const load = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await axiosPrivate.get('/reviews');
            setRows(res.data || []);
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not load reviews.');
        } finally {
            setLoading(false);
        }
    }, [axiosPrivate]);

    React.useEffect(() => { load(); }, [load]);

    const shown = rows.filter((r) => filter === 'all' || r.status === filter);
    const waiting = rows.filter((r) => r.status === 'pending').length;

    const setStatus = async (row, status, text) => {
        setError('');
        try {
            await axiosPrivate.put(`/reviews/${row.id}/status`, { status });
            setNotice(`${row.displayName}'s review ${text}.`);
            load();
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not update the review.');
        }
    };

    const remove = async (row) => {
        if (!window.confirm(`Delete the review from ${row.displayName}? This cannot be undone.`)) return;
        setError('');
        try {
            await axiosPrivate.delete(`/reviews/${row.id}`);
            setNotice('Review deleted.');
            load();
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not delete the review.');
        }
    };

    return (
        <>
            <h1 className="page-title">Reviews</h1>
            <p className="page-subtitle">What buyers wrote on the shop. Only buyers with a serial code can write one. Approve a review to show it on the shop&apos;s home page.</p>

            {notice && (
                <div role="status" style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 9, background: 'var(--hl-success-bg)', color: 'var(--hl-success-ink)', fontSize: 13, fontWeight: 600 }}>
                    {notice}
                </div>
            )}
            {error && (
                <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 9, background: 'var(--hl-danger-bg)', color: 'var(--hl-danger)', fontSize: 13, fontWeight: 600 }}>
                    {error}
                </div>
            )}

            <Card sx={{ backgroundColor: 'var(--hl-card-bg)', border: '1px solid var(--hl-border)', borderRadius: '14px', boxShadow: 'none' }}>
                <CardContent>
                    <div className="settings-section-header">
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {FILTERS.map((f) => (
                                <Button
                                    key={f.value}
                                    onClick={() => setFilter(f.value)}
                                    aria-pressed={filter === f.value}
                                    sx={filter === f.value ? { ...solidBtn, px: 2 } : { ...outlineBtn, px: 2 }}
                                >
                                    {f.label}{f.value === 'pending' && waiting > 0 ? ` (${waiting})` : ''}
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

                    <div className="table-responsive">
                        <Table sx={{ mt: 2 }} className="maintenance-table">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: 'var(--hl-page-bg)' }}>
                                    <TableCell sx={th}>Sent</TableCell>
                                    <TableCell sx={th}>Name shown</TableCell>
                                    <TableCell sx={th}>Rating</TableCell>
                                    <TableCell sx={th}>Review</TableCell>
                                    <TableCell sx={th}>Serial code</TableCell>
                                    <TableCell sx={th}>Status</TableCell>
                                    <TableCell sx={th}>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {shown.map((r) => {
                                    const [kind, label] = PILLS[r.status] || ['warning', r.status];
                                    return (
                                        <TableRow key={r.id}>
                                            <TableCell sx={td}><div style={{ fontSize: 13 }}>{when(r.createdAt)}</div></TableCell>
                                            <TableCell sx={{ ...td, fontWeight: 600 }}>
                                                {r.displayName}
                                                {r.sizeLabel && <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--hl-ink-tertiary)' }}>{r.sizeLabel} size</div>}
                                            </TableCell>
                                            <TableCell sx={td}>
                                                <span aria-label={`${r.rating} out of 5 stars`} style={{ color: 'var(--hl-warning-ink)', letterSpacing: 1, whiteSpace: 'nowrap' }}>{stars(r.rating)}</span>
                                            </TableCell>
                                            <TableCell sx={{ ...td, maxWidth: 320 }}>{r.comment || '—'}</TableCell>
                                            <TableCell sx={td}><span style={mono}>{r.serialCode}</span></TableCell>
                                            <TableCell><span style={pillStyle(kind)}>{label}</span></TableCell>
                                            <TableCell className="maintenance-table__action-col">
                                                <div className="maintenance-table__actions" style={{ flexWrap: 'wrap', maxWidth: 260 }}>
                                                    {r.status !== 'approved' && (
                                                        <Button className="maintenance-table__action-btn" onClick={() => setStatus(r, 'approved', 'is now shown on the shop')} sx={solidBtn}>Approve</Button>
                                                    )}
                                                    {r.status !== 'hidden' && (
                                                        <Button className="maintenance-table__action-btn" onClick={() => setStatus(r, 'hidden', 'is hidden')} sx={outlineBtn}>Hide</Button>
                                                    )}
                                                    <Button className="maintenance-table__action-btn" onClick={() => remove(r)} sx={dangerBtn}>Delete</Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {loading && <Typography sx={{ color: 'var(--hl-ink-tertiary)', mt: 2 }}>Loading reviews...</Typography>}
                    {!loading && shown.length === 0 && (
                        <Typography sx={{ color: 'var(--hl-ink-secondary)', mt: 2 }}>
                            {filter === 'pending' ? 'No reviews are waiting.' : 'No reviews to show.'}
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </>
    );
};

export default Reviews;
