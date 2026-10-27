import '../../../assets/main.css';
import * as React from 'react';
import { setTitle } from '../../../utils/generalFunctions';
import useAxiosPrivate from '../../../hooks/auth/useAxiosPrivate';
import { RegisterBuyerDialog } from '../../../components/RegisterBuyerDialog/index';
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
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'bought', label: 'Bought' },
    { value: 'closed', label: 'Closed' },
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
const PILLS = { new: ['warning', 'New'], contacted: ['info', 'Contacted'], bought: ['success', 'Bought'], closed: ['danger', 'Closed'] };

const when = (value) => (value ? new Date(value).toLocaleString() : '');

// Questions sent from the website. No account is made for an inquiry: when a customer pays in
// person, "Register buyer" turns the inquiry into their account, ID record and serial code.
export const Inquiries = () => {
    setTitle('Inquiries');
    const axiosPrivate = useAxiosPrivate();

    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [filter, setFilter] = React.useState('new');
    const [notice, setNotice] = React.useState('');
    const [error, setError] = React.useState('');
    const [registering, setRegistering] = React.useState(false);
    const [prefill, setPrefill] = React.useState(null);

    const load = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await axiosPrivate.get('/inquiries');
            setRows(res.data || []);
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not load inquiries.');
        } finally {
            setLoading(false);
        }
    }, [axiosPrivate]);

    React.useEffect(() => { load(); }, [load]);

    const shown = rows.filter((r) => filter === 'all' || r.status === filter);
    const newCount = rows.filter((r) => r.status === 'new').length;

    const setStatus = async (row, status) => {
        setError('');
        try {
            await axiosPrivate.put(`/inquiries/${row.id}/status`, { status });
            setNotice(`Inquiry from ${row.fullName} marked ${status}.`);
            load();
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not update the inquiry.');
        }
    };

    const remove = async (row) => {
        if (!window.confirm(`Delete the inquiry from ${row.fullName}? This cannot be undone.`)) return;
        setError('');
        try {
            await axiosPrivate.delete(`/inquiries/${row.id}`);
            setNotice('Inquiry deleted.');
            load();
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not delete the inquiry.');
        }
    };

    const openRegister = (row) => { setPrefill(row || null); setRegistering(true); };
    const closeRegister = (registered) => {
        setRegistering(false);
        if (registered) { setNotice('Buyer registered.'); load(); }
    };

    return (
        <>
            <h1 className="page-title">Inquiries</h1>
            <p className="page-subtitle">People who asked about HydroLift on the website. They have no account. Register them as a buyer once they pay in person.</p>

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
                                    {f.label}{f.value === 'new' && newCount > 0 ? ` (${newCount})` : ''}
                                </Button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <Button onClick={() => openRegister(null)} sx={{ ...solidBtn, px: 2.5 }}>Register a buyer</Button>
                            <Button
                                onClick={load}
                                disabled={loading}
                                startIcon={<RefreshIcon sx={{ animation: loading ? 'hl-spin 0.8s linear infinite' : 'none' }} />}
                                sx={{ ...outlineBtn, px: 2.5, '@keyframes hl-spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }}
                            >
                                Refresh
                            </Button>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <Table sx={{ mt: 2 }} className="maintenance-table">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: 'var(--hl-page-bg)' }}>
                                    <TableCell sx={th}>Sent</TableCell>
                                    <TableCell sx={th}>Name</TableCell>
                                    <TableCell sx={th}>Contact</TableCell>
                                    <TableCell sx={th}>Size</TableCell>
                                    <TableCell sx={th}>Question</TableCell>
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
                                            <TableCell sx={{ ...td, fontWeight: 600 }}>{r.fullName}</TableCell>
                                            <TableCell sx={td}>
                                                <div style={mono}>{r.mobileNumber}</div>
                                                <div style={{ fontSize: 12, color: 'var(--hl-ink-tertiary)' }}>{r.email}</div>
                                            </TableCell>
                                            <TableCell sx={td}>{r.sizeLabel || '—'}</TableCell>
                                            <TableCell sx={{ ...td, maxWidth: 280 }}>{r.message || '—'}</TableCell>
                                            <TableCell><span style={pillStyle(kind)}>{label}</span></TableCell>
                                            <TableCell className="maintenance-table__action-col">
                                                <div className="maintenance-table__actions" style={{ flexWrap: 'wrap', maxWidth: 300 }}>
                                                    {r.status !== 'bought' && (
                                                        <Button className="maintenance-table__action-btn" onClick={() => openRegister(r)} sx={solidBtn}>Register buyer</Button>
                                                    )}
                                                    {r.status === 'new' && (
                                                        <Button className="maintenance-table__action-btn" onClick={() => setStatus(r, 'contacted')} sx={outlineBtn}>Mark contacted</Button>
                                                    )}
                                                    {(r.status === 'new' || r.status === 'contacted') && (
                                                        <Button className="maintenance-table__action-btn" onClick={() => setStatus(r, 'closed')} sx={outlineBtn}>Close</Button>
                                                    )}
                                                    {r.status === 'closed' && (
                                                        <Button className="maintenance-table__action-btn" onClick={() => setStatus(r, 'new')} sx={outlineBtn}>Reopen</Button>
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

                    {loading && <Typography sx={{ color: 'var(--hl-ink-tertiary)', mt: 2 }}>Loading inquiries...</Typography>}
                    {!loading && shown.length === 0 && (
                        <Typography sx={{ color: 'var(--hl-ink-secondary)', mt: 2 }}>
                            {filter === 'new' ? 'No new inquiries.' : 'No inquiries to show.'}
                        </Typography>
                    )}
                </CardContent>
            </Card>

            <RegisterBuyerDialog open={registering} onClose={closeRegister} prefill={prefill} />
        </>
    );
};

export default Inquiries;
