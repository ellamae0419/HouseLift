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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import RefreshIcon from '@mui/icons-material/Refresh';

const FILTERS = [
    { value: 'pending', label: 'Needs review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
];

const outlineBtn = { color: 'var(--hl-accent)', borderColor: 'var(--hl-accent)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' };
const solidBtn = { backgroundColor: 'var(--hl-accent)', color: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none', '&:hover': { backgroundColor: 'var(--hl-secondary-dark)' }, '&.Mui-disabled': { backgroundColor: 'var(--hl-accent)', color: '#fff', opacity: 0.5 } };
const dangerBtn = { color: 'var(--hl-danger)', borderColor: 'var(--hl-danger)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' };
const th = { color: 'var(--hl-ink-secondary)', fontWeight: 600 };
const td = { color: 'var(--hl-ink)' };
const fieldSx = { '& .MuiInputBase-input': { color: 'var(--heading)' }, '& .MuiInputLabel-root': { color: 'var(--text)' }, '& .MuiOutlinedInput-root': { backgroundColor: 'var(--background)' } };
const mono = { fontFamily: 'var(--font-mono)' };

// The danger colours have no separate "-ink" shade in the theme.
const pillStyle = (kind) => ({
    fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px', whiteSpace: 'nowrap',
    color: kind === 'danger' ? 'var(--hl-danger)' : `var(--hl-${kind}-ink)`, background: `var(--hl-${kind}-bg)`,
});

const copyText = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
};

const peso = (n) => `₱${Number(n).toLocaleString('en-PH')}`;
const when = (value) => (value ? new Date(value).toLocaleString() : '');

const CopyButton = ({ text, label = 'Copy' }) => {
    const [state, setState] = React.useState('');
    return (
        <Button
            size="small"
            onClick={async () => {
                setState((await copyText(text)) ? 'Copied' : 'Select and copy it by hand');
                setTimeout(() => setState(''), 2000);
            }}
            sx={{ ...outlineBtn, py: 0.25, px: 1.25 }}
        >
            {state || label}
        </Button>
    );
};

export const Orders = () => {
    setTitle('Orders and ID checks');
    const axiosPrivate = useAxiosPrivate();

    const [orders, setOrders] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [filter, setFilter] = React.useState('pending');
    const [notice, setNotice] = React.useState('');
    const [error, setError] = React.useState('');

    // ID review dialog
    const [reviewing, setReviewing] = React.useState(null);
    const [photoUrl, setPhotoUrl] = React.useState('');
    const [photoError, setPhotoError] = React.useState('');
    const [rejecting, setRejecting] = React.useState(false);
    const [reason, setReason] = React.useState('');
    const [reviewBusy, setReviewBusy] = React.useState(false);
    const [reviewError, setReviewError] = React.useState('');

    // Serial dialog
    const [issuing, setIssuing] = React.useState(null);
    const [units, setUnits] = React.useState([]);
    const [unitChoice, setUnitChoice] = React.useState('new');
    const [paid, setPaid] = React.useState(false);
    const [issueBusy, setIssueBusy] = React.useState(false);
    const [issueError, setIssueError] = React.useState('');
    const [issued, setIssued] = React.useState(null);

    const load = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await axiosPrivate.get('/orders');
            setOrders(res.data || []);
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not load orders.');
        } finally {
            setLoading(false);
        }
    }, [axiosPrivate]);

    React.useEffect(() => { load(); }, [load]);

    const shown = orders.filter((o) => filter === 'all' || o.status === filter);
    const pendingCount = orders.filter((o) => o.status === 'pending').length;

    /* ----- ID review ----- */
    const openReview = async (order) => {
        setReviewing(order);
        setPhotoUrl('');
        setPhotoError('');
        setRejecting(false);
        setReason('');
        setReviewError('');
        try {
            const res = await axiosPrivate.get(`/orders/${order.id}/id-image`, { responseType: 'blob' });
            setPhotoUrl(URL.createObjectURL(res.data));
        } catch {
            setPhotoError('Could not load the ID photo.');
        }
    };

    const closeReview = () => {
        if (photoUrl) URL.revokeObjectURL(photoUrl);
        setReviewing(null);
        setPhotoUrl('');
    };

    const decide = async (action) => {
        setReviewBusy(true);
        setReviewError('');
        try {
            const res = action === 'approve'
                ? await axiosPrivate.put(`/orders/${reviewing.id}/approve`)
                : await axiosPrivate.put(`/orders/${reviewing.id}/reject`, { reason });
            setNotice(res.data?.message || 'Done.');
            closeReview();
            load();
        } catch (err) {
            setReviewError(err?.response?.data?.message || 'Something went wrong.');
        } finally {
            setReviewBusy(false);
        }
    };

    /* ----- Serial code ----- */
    const openIssue = async (order) => {
        setIssuing(order);
        setIssued(null);
        setIssueError('');
        setPaid(false);
        setUnitChoice('new');
        setUnits([]);
        try {
            const res = await axiosPrivate.get('/orders/free-units');
            setUnits(res.data || []);
        } catch {
            /* "Create a new unit" still works */
        }
    };

    const closeIssue = () => {
        const wasIssued = Boolean(issued);
        setIssuing(null);
        setIssued(null);
        if (wasIssued) load();
    };

    const issue = async () => {
        setIssueBusy(true);
        setIssueError('');
        try {
            const res = await axiosPrivate.post(`/orders/${issuing.id}/serial`, unitChoice === 'new' ? {} : { esp32Id: unitChoice });
            setIssued(res.data);
        } catch (err) {
            setIssueError(err?.response?.data?.message || 'Could not issue the serial code.');
        } finally {
            setIssueBusy(false);
        }
    };

    const statusPill = (o) => {
        if (o.status === 'pending') return <span style={pillStyle('warning')}>ID waiting</span>;
        if (o.status === 'rejected') return <span style={pillStyle('danger')}>Rejected</span>;
        if (o.serialStatus === 'redeemed') return <span style={pillStyle('success')}>Activated</span>;
        if (o.serialCode) return <span style={pillStyle('success')}>Code issued</span>;
        return <span style={pillStyle('success')}>ID approved</span>;
    };

    return (
        <>
            <h1 className="page-title">Orders and ID checks</h1>
            <p className="page-subtitle">Check each buyer&apos;s ID, then give them a serial code when they pay in person.</p>

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
                                    {f.label}{f.value === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
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
                                    <TableCell sx={th}>Order</TableCell>
                                    <TableCell sx={th}>Customer</TableCell>
                                    <TableCell sx={th}>Contact</TableCell>
                                    <TableCell sx={th}>Status</TableCell>
                                    <TableCell sx={th}>Serial code</TableCell>
                                    <TableCell sx={th}>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {shown.map((o) => (
                                    <TableRow key={o.id}>
                                        <TableCell sx={td}>
                                            <div style={{ fontWeight: 600 }}>#{o.id}{o.sizeLabel ? ` · ${o.sizeLabel}` : ''}</div>
                                            <div style={{ fontSize: 12, color: 'var(--hl-ink-tertiary)' }}>{when(o.createdAt)}</div>
                                        </TableCell>
                                        <TableCell sx={td}>
                                            <div style={{ fontWeight: 600 }}>{o.fullName}</div>
                                            <div style={{ fontSize: 12, color: 'var(--hl-ink-tertiary)' }}>{o.username}</div>
                                        </TableCell>
                                        <TableCell sx={td}>
                                            <div style={mono}>{o.mobileNumber}</div>
                                            <div style={{ fontSize: 12, color: 'var(--hl-ink-tertiary)' }}>{o.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            {statusPill(o)}
                                            {o.status === 'rejected' && o.rejectReason && (
                                                <div style={{ fontSize: 12, color: 'var(--hl-ink-secondary)', marginTop: 4, maxWidth: 220 }}>{o.rejectReason}</div>
                                            )}
                                            {o.paidAt && <div style={{ fontSize: 12, color: 'var(--hl-ink-tertiary)', marginTop: 4 }}>Paid {when(o.paidAt)}</div>}
                                        </TableCell>
                                        <TableCell sx={td}>
                                            {o.serialCode ? (
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <span style={{ ...mono, fontWeight: 600 }}>{o.serialCode}</span>
                                                    <CopyButton text={o.serialCode} />
                                                    <div style={{ width: '100%', fontSize: 12, color: 'var(--hl-ink-tertiary)', ...mono }}>{o.esp32Id}</div>
                                                </div>
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell className="maintenance-table__action-col">
                                            <div className="maintenance-table__actions">
                                                {o.status === 'pending' && (
                                                    <Button className="maintenance-table__action-btn" onClick={() => openReview(o)} sx={solidBtn}>Review ID</Button>
                                                )}
                                                {o.status === 'approved' && !o.serialCode && (
                                                    <Button className="maintenance-table__action-btn" onClick={() => openIssue(o)} sx={solidBtn}>Issue serial code</Button>
                                                )}
                                                {o.status !== 'pending' && (
                                                    <Button className="maintenance-table__action-btn" onClick={() => openReview(o)} sx={outlineBtn}>View ID</Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {loading && <Typography sx={{ color: 'var(--hl-ink-tertiary)', mt: 2 }}>Loading orders...</Typography>}
                    {!loading && shown.length === 0 && (
                        <Typography sx={{ color: 'var(--hl-ink-secondary)', mt: 2 }}>
                            {filter === 'pending' ? 'No IDs are waiting for review.' : 'No orders to show.'}
                        </Typography>
                    )}
                </CardContent>
            </Card>

            {/* ---------- Review the ID ---------- */}
            <Dialog open={Boolean(reviewing)} onClose={closeReview} fullWidth maxWidth="md" sx={{ '& .MuiPaper-root': { backgroundColor: 'var(--background-card)', color: 'var(--heading)' } }}>
                {reviewing && (
                    <>
                        <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                            Order #{reviewing.id}: {reviewing.fullName}
                        </DialogTitle>
                        <DialogContent>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                                <div>
                                    {photoUrl && <img src={photoUrl} alt={`ID photo of ${reviewing.fullName}`} style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 10, border: '1px solid var(--hl-border)', background: 'var(--background)' }} />}
                                    {!photoUrl && !photoError && <Typography sx={{ color: 'var(--hl-ink-tertiary)' }}>Loading ID photo…</Typography>}
                                    {photoError && <Typography sx={{ color: 'var(--hl-danger)' }}>{photoError}</Typography>}
                                </div>
                                <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 14px', fontSize: 14, alignContent: 'start' }}>
                                    <dt style={{ color: 'var(--hl-ink-tertiary)' }}>ID type</dt><dd style={{ margin: 0 }}>{reviewing.idTypeLabel}</dd>
                                    <dt style={{ color: 'var(--hl-ink-tertiary)' }}>Name given</dt><dd style={{ margin: 0 }}>{reviewing.fullName}</dd>
                                    <dt style={{ color: 'var(--hl-ink-tertiary)' }}>Username</dt><dd style={{ margin: 0 }}>{reviewing.username}</dd>
                                    <dt style={{ color: 'var(--hl-ink-tertiary)' }}>Mobile</dt><dd style={{ margin: 0, ...mono }}>{reviewing.mobileNumber}</dd>
                                    <dt style={{ color: 'var(--hl-ink-tertiary)' }}>Email</dt><dd style={{ margin: 0, wordBreak: 'break-all' }}>{reviewing.email}</dd>
                                    <dt style={{ color: 'var(--hl-ink-tertiary)' }}>Address</dt><dd style={{ margin: 0 }}>{reviewing.address}</dd>
                                    <dt style={{ color: 'var(--hl-ink-tertiary)' }}>Ordered</dt><dd style={{ margin: 0 }}>{when(reviewing.createdAt)}</dd>
                                </dl>
                            </div>

                            {reviewing.status === 'pending' && (
                                <Typography variant="body2" sx={{ color: 'var(--hl-ink-secondary)', mt: 2 }}>
                                    Check that the name on the ID matches the name given and that the photo is clear before approving.
                                </Typography>
                            )}
                            {rejecting && (
                                <TextField
                                    label="Reason for rejecting (the customer will see this)"
                                    fullWidth margin="normal" value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    inputProps={{ maxLength: 255 }} sx={fieldSx}
                                />
                            )}
                            {reviewError && <Typography sx={{ color: 'var(--red)', mt: 1 }}>{reviewError}</Typography>}
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
                            <Button onClick={closeReview} sx={outlineBtn}>Close</Button>
                            {reviewing.status === 'pending' && !rejecting && (
                                <>
                                    <Button onClick={() => setRejecting(true)} sx={dangerBtn}>Reject…</Button>
                                    <Button onClick={() => decide('approve')} disabled={reviewBusy || !photoUrl} sx={solidBtn}>
                                        {reviewBusy ? 'Approving…' : 'ID is valid, approve'}
                                    </Button>
                                </>
                            )}
                            {reviewing.status === 'pending' && rejecting && (
                                <Button onClick={() => decide('reject')} disabled={reviewBusy || !reason.trim()} sx={{ ...dangerBtn, '&.Mui-disabled': { opacity: 0.5 } }}>
                                    {reviewBusy ? 'Rejecting…' : 'Reject order'}
                                </Button>
                            )}
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* ---------- Issue the serial code ---------- */}
            <Dialog open={Boolean(issuing)} onClose={closeIssue} fullWidth maxWidth="sm" sx={{ '& .MuiPaper-root': { backgroundColor: 'var(--background-card)', color: 'var(--heading)' } }}>
                {issuing && !issued && (
                    <>
                        <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Issue serial code for order #{issuing.id}</DialogTitle>
                        <DialogContent>
                            <Typography sx={{ color: 'var(--hl-ink-secondary)', mb: 1 }}>
                                {issuing.fullName} ({issuing.username}). Do this when they pay and take the unit.
                            </Typography>
                            <FormControlLabel
                                control={<Checkbox checked={paid} onChange={(e) => setPaid(e.target.checked)} sx={{ color: 'var(--hl-accent)', '&.Mui-checked': { color: 'var(--hl-accent)' } }} />}
                                label={issuing.price ? `I received ${peso(issuing.price)} in person` : 'I received the payment in person'}
                                sx={{ '& .MuiFormControlLabel-label': { color: 'var(--heading)' } }}
                            />
                            <Typography variant="body2" sx={{ color: 'var(--hl-ink-secondary)', mt: 2, mb: 0.5 }}>Which unit are they receiving?</Typography>
                            <Select fullWidth size="small" value={unitChoice} onChange={(e) => setUnitChoice(e.target.value)}>
                                <MenuItem value="new">Create a new unit (shows its device ID and key once)</MenuItem>
                                {units.map((u) => <MenuItem key={u.id} value={u.id}>{u.esp32_id}</MenuItem>)}
                            </Select>
                            {issueError && <Typography sx={{ color: 'var(--red)', mt: 1.5 }}>{issueError}</Typography>}
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2 }}>
                            <Button onClick={closeIssue} sx={outlineBtn}>Cancel</Button>
                            <Button onClick={issue} disabled={!paid || issueBusy} sx={solidBtn}>{issueBusy ? 'Issuing…' : 'Issue serial code'}</Button>
                        </DialogActions>
                    </>
                )}
                {issuing && issued && (
                    <>
                        <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Serial code ready</DialogTitle>
                        <DialogContent>
                            <Typography sx={{ color: 'var(--hl-ink-secondary)' }}>Give this code to {issuing.fullName}. They enter it after logging in.</Typography>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', margin: '14px 0' }}>
                                <span style={{ ...mono, fontSize: 26, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--hl-ink)' }}>{issued.code}</span>
                                <CopyButton text={issued.code} />
                            </div>
                            {issued.unit.deviceKey ? (
                                <div style={{ padding: 14, borderRadius: 10, background: 'var(--hl-warning-bg)', color: 'var(--hl-warning-ink)', fontSize: 13 }}>
                                    <strong>Flash these into the ESP32. The key is shown only this once.</strong>
                                    <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'max-content 1fr auto', gap: '6px 10px', alignItems: 'center' }}>
                                        <span>Device ID</span><span style={{ ...mono, wordBreak: 'break-all' }}>{issued.unit.esp32_id}</span><CopyButton text={issued.unit.esp32_id} />
                                        <span>Device key</span><span style={{ ...mono, wordBreak: 'break-all' }}>{issued.unit.deviceKey}</span><CopyButton text={issued.unit.deviceKey} />
                                    </div>
                                </div>
                            ) : (
                                <Typography variant="body2" sx={{ color: 'var(--hl-ink-secondary)' }}>
                                    Linked to existing unit <span style={mono}>{issued.unit.esp32_id}</span>.
                                </Typography>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2 }}>
                            <Button onClick={closeIssue} sx={solidBtn}>Done</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </>
    );
};

export default Orders;
