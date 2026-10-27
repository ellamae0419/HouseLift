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
import RefreshIcon from '@mui/icons-material/Refresh';
import { Link } from 'react-router-dom';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!*@#$%]).{8,24}$/;
const mobileRegex = /^09\d{9}$/;

const EMPTY_FORM = { fullName: '', username: '', email: '', password: '', address: '', mobileNumber: '', roles: 'user' };

const fieldSx = { '& .MuiInputBase-input': { color: 'var(--heading)' }, '& .MuiInputLabel-root': { color: 'var(--text)' }, '& .MuiOutlinedInput-root': { backgroundColor: 'var(--background)' } };

export const UserManagement = () => {
    setTitle('User Management');
    const axiosPrivate = useAxiosPrivate();
    const [users, setUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [editingUser, setEditingUser] = React.useState(null);
    const [form, setForm] = React.useState(EMPTY_FORM);
    const [error, setError] = React.useState('');

    // "Send test text": checks that flood alert texts can really go out.
    const [smsOpen, setSmsOpen] = React.useState(false);
    const [smsRoute, setSmsRoute] = React.useState(undefined); // undefined = checking, null = not set up, text = the route in use
    const [smsNumber, setSmsNumber] = React.useState('');
    const [smsBusy, setSmsBusy] = React.useState(false);
    const [smsResult, setSmsResult] = React.useState({ ok: false, text: '' });

    const openSmsDialog = async () => {
        setSmsOpen(true);
        setSmsResult({ ok: false, text: '' });
        setSmsRoute(undefined);
        try {
            const res = await axiosPrivate.get('/users/sms-status');
            setSmsRoute(res.data?.route ?? null);
        } catch {
            setSmsRoute(null);
            setSmsResult({ ok: false, text: 'Could not check the text setup. Try again in a moment.' });
        }
    };

    const sendTestText = async () => {
        setSmsBusy(true);
        setSmsResult({ ok: false, text: '' });
        try {
            const res = await axiosPrivate.post('/users/test-sms', { to: smsNumber.trim() });
            setSmsResult({ ok: true, text: res.data?.message || 'Test text sent.' });
        } catch (err) {
            setSmsResult({ ok: false, text: err?.response?.data?.message || 'The test text could not be sent.' });
        } finally {
            setSmsBusy(false);
        }
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await axiosPrivate.get('/users');
            setUsers(response.data || []);
        } catch (err) {
            console.error('Error loading users:', err.response?.data?.message || err.message);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        loadUsers();
    }, []);

    const openAddDialog = () => {
        setEditingUser(null);
        setForm(EMPTY_FORM);
        setError('');
        setDialogOpen(true);
    };

    const openEditDialog = (user) => {
        setEditingUser(user);
        setForm({
            fullName: user.fullName || '',
            username: user.username,
            email: user.email,
            password: '',
            address: user.address || '',
            mobileNumber: user.mobileNumber || '',
            roles: user.roles || 'user',
        });
        setError('');
        setDialogOpen(true);
    };

    const submitForm = async () => {
        setError('');
        if (!form.username || !form.email) {
            setError('Username and email are required');
            return;
        }
        if (form.mobileNumber && !mobileRegex.test(form.mobileNumber)) {
            setError('Mobile number must be 11 digits starting with 09');
            return;
        }
        if (!editingUser) {
            if (!form.fullName.trim() || !form.address.trim() || !form.mobileNumber) {
                setError('Full name, address and mobile number are required — the mobile number is where flood texts are sent');
                return;
            }
            if (!passwordRegex.test(form.password)) {
                setError('Password must be 8 to 24 characters with an uppercase letter, a lowercase letter, a number and a special character (! * @ # $ %)');
                return;
            }
        }

        const details = { fullName: form.fullName, address: form.address, mobileNumber: form.mobileNumber };

        try {
            if (editingUser) {
                await axiosPrivate.put(`/users/${editingUser.id}`, { username: form.username, email: form.email, roles: form.roles, ...details });
            } else {
                await axiosPrivate.post('/users', { username: form.username, email: form.email, password: form.password, roles: form.roles, ...details });
            }

            setDialogOpen(false);
            loadUsers();
        } catch (err) {
            setError(err?.response?.data?.message || 'Error saving user');
        }
    };

    const handleDelete = async (user) => {
        if (!confirm(`Delete user ${user.username}?`)) return;
        try {
            await axiosPrivate.delete(`/users/${user.id}`);
            loadUsers();
        } catch (err) {
            console.error('Error deleting user:', err.response?.data?.message || err.message);
        }
    };

    const handleDecline = async (user) => {
        if (!confirm(`Decline ${user.username}'s registration? This will delete their pending account.`)) return;
        try {
            await axiosPrivate.delete(`/users/${user.id}`);
            loadUsers();
        } catch (err) {
            console.error('Error declining user:', err.response?.data?.message || err.message);
        }
    };

    const [approvingId, setApprovingId] = React.useState(null);
    const handleApprove = async (user) => {
        setApprovingId(user.id);
        try {
            await axiosPrivate.put(`/users/${user.id}/approve`);
            loadUsers();
        } catch (err) {
            console.error('Error approving user:', err.response?.data?.message || err.message);
        } finally {
            setApprovingId(null);
        }
    };

    return (
        <>
            <h1 className="page-title">User management</h1>
            <p className="page-subtitle">Create accounts for your users and manage their access to HydroLift.</p>

            <Card sx={{ backgroundColor: 'var(--hl-card-bg)', border: '1px solid var(--hl-border)', borderRadius: '14px', boxShadow: 'none' }}>
                <CardContent>
                    <div className="settings-section-header">
                        <Typography variant="h6" sx={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Users</Typography>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <Button
                                onClick={loadUsers}
                                disabled={loading}
                                startIcon={<RefreshIcon sx={{ animation: loading ? 'hl-spin 0.8s linear infinite' : 'none' }} />}
                                sx={{
                                    color: 'var(--hl-accent)', borderColor: 'var(--hl-accent)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none', px: 2.5,
                                    '@keyframes hl-spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
                                }}
                            >
                                Refresh
                            </Button>
                            <Button
                                onClick={openSmsDialog}
                                sx={{
                                    color: 'var(--hl-accent)', borderColor: 'var(--hl-accent)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none', px: 2.5,
                                }}
                            >
                                Send test text
                            </Button>
                            <Button
                                onClick={openAddDialog}
                                sx={{
                                    backgroundColor: 'var(--hl-accent)', color: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none', px: 2.5,
                                    '&:hover': { backgroundColor: 'var(--hl-secondary-dark)' },
                                }}
                            >
                                + Add user
                            </Button>
                        </div>
                    </div>

                    <div className="table-responsive">
                    <Table sx={{ mt: 2 }} className="maintenance-table">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: 'var(--hl-page-bg)' }}>
                                <TableCell sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>Username</TableCell>
                                <TableCell sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>Email</TableCell>
                                <TableCell sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>Role</TableCell>
                                <TableCell sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>Serial code</TableCell>
                                <TableCell sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>Status</TableCell>
                                <TableCell sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((user) => {
                                const pending = !user.isVerified;
                                return (
                                    <TableRow key={user.id}>
                                        <TableCell sx={{ color: 'var(--hl-ink)' }}>{user.username}</TableCell>
                                        <TableCell sx={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-mono)' }}>{user.email}</TableCell>
                                        <TableCell sx={{ color: 'var(--hl-ink)' }}>{user.roles}</TableCell>
                                        <TableCell sx={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                                            {user.serialCode
                                                ? <>{user.serialCode}{user.serialStatus === 'redeemed' && <span style={{ color: 'var(--hl-ink-secondary)', fontFamily: 'inherit' }}> (used)</span>}</>
                                                : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <span style={{
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                padding: '4px 10px',
                                                borderRadius: '999px',
                                                color: pending ? 'var(--hl-warning-ink)' : 'var(--hl-success-ink)',
                                                background: pending ? 'var(--hl-warning-bg)' : 'var(--hl-success-bg)',
                                            }}>
                                                {pending ? (user.hasPendingOrder ? 'ID check' : 'Pending') : 'Approved'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="maintenance-table__action-col">
                                            <div className="maintenance-table__actions">
                                                {pending && user.hasPendingOrder ? (
                                                    <Button
                                                        className="maintenance-table__action-btn"
                                                        component={Link}
                                                        to="/admin/orders"
                                                        sx={{
                                                            backgroundColor: 'var(--hl-accent)', color: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none',
                                                            '&:hover': { backgroundColor: 'var(--hl-secondary-dark)' },
                                                        }}
                                                    >
                                                        Review ID
                                                    </Button>
                                                ) : pending ? (
                                                    <>
                                                        <Button
                                                            className="maintenance-table__action-btn"
                                                            onClick={() => handleApprove(user)}
                                                            disabled={approvingId === user.id}
                                                            sx={{
                                                                backgroundColor: 'var(--hl-success)', color: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none',
                                                                '&:hover': { backgroundColor: 'var(--hl-success)', opacity: 0.9 },
                                                                '&.Mui-disabled': { backgroundColor: 'var(--hl-success)', color: '#fff', opacity: 0.6 },
                                                            }}
                                                        >
                                                            {approvingId === user.id ? 'Confirming…' : 'Confirm'}
                                                        </Button>
                                                        <Button
                                                            className="maintenance-table__action-btn"
                                                            onClick={() => handleDecline(user)}
                                                            sx={{ color: 'var(--hl-danger)', borderColor: 'var(--hl-danger)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' }}
                                                        >
                                                            Decline
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            className="maintenance-table__action-btn"
                                                            onClick={() => openEditDialog(user)}
                                                            sx={{ color: 'var(--hl-accent)', borderColor: 'var(--hl-accent)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' }}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            className="maintenance-table__action-btn"
                                                            onClick={() => handleDelete(user)}
                                                            sx={{ color: 'var(--hl-danger)', borderColor: 'var(--hl-danger)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' }}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    </div>

                    {loading && <Typography sx={{ color: 'var(--hl-ink-tertiary)', mt: 2 }}>Loading users...</Typography>}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm" sx={{ '& .MuiPaper-root': { backgroundColor: 'var(--background-card)', color: 'var(--heading)' } }}>
                <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{editingUser ? 'Edit user' : 'Create account'}</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Full name"
                        fullWidth
                        margin="normal"
                        value={form.fullName}
                        onChange={(e) => setForm((state) => ({ ...state, fullName: e.target.value }))}
                        sx={fieldSx}
                    />
                    <TextField
                        label="Username"
                        fullWidth
                        margin="normal"
                        value={form.username}
                        onChange={(e) => setForm((state) => ({ ...state, username: e.target.value }))}
                        sx={fieldSx}
                    />
                    <TextField
                        label="Email"
                        fullWidth
                        margin="normal"
                        value={form.email}
                        onChange={(e) => setForm((state) => ({ ...state, email: e.target.value }))}
                        sx={fieldSx}
                    />
                    {!editingUser && (
                        <TextField
                            label="Password"
                            type="password"
                            fullWidth
                            margin="normal"
                            value={form.password}
                            onChange={(e) => setForm((state) => ({ ...state, password: e.target.value }))}
                            helperText="Give this username and password to the user. They can change the password later in their profile."
                            sx={fieldSx}
                        />
                    )}
                    <TextField
                        label="Mobile number"
                        placeholder="09XXXXXXXXX"
                        fullWidth
                        margin="normal"
                        value={form.mobileNumber}
                        onChange={(e) => setForm((state) => ({ ...state, mobileNumber: e.target.value }))}
                        helperText="Flood alert texts are sent to this number."
                        sx={fieldSx}
                    />
                    <TextField
                        label="Address"
                        placeholder="Street, barangay, city, province"
                        fullWidth
                        margin="normal"
                        value={form.address}
                        onChange={(e) => setForm((state) => ({ ...state, address: e.target.value }))}
                        sx={fieldSx}
                    />
                    {!editingUser && (
                        <Typography variant="body2" sx={{ color: 'var(--text-low)', mt: 1 }}>
                            The user's pet-house device is set up automatically with this account.
                        </Typography>
                    )}
                    <Select fullWidth value={form.roles} onChange={(e) => setForm((state) => ({ ...state, roles: e.target.value }))} sx={{ mt: 2 }}>
                        <MenuItem value="user">User</MenuItem>
                        <MenuItem value="app">App</MenuItem>
                    </Select>
                    {error && <Typography sx={{ color: 'var(--red)', mt: 1 }}>{error}</Typography>}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDialogOpen(false)}
                        sx={{ color: 'var(--hl-accent)', borderColor: 'var(--hl-accent)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={submitForm}
                        sx={{ backgroundColor: 'var(--hl-accent)', color: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none', '&:hover': { backgroundColor: 'var(--hl-secondary-dark)' } }}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={smsOpen} onClose={() => setSmsOpen(false)} fullWidth maxWidth="sm" sx={{ '& .MuiPaper-root': { backgroundColor: 'var(--background-card)', color: 'var(--heading)' } }}>
                <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Send a test text</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: 'var(--text-low)', mb: 1 }}>
                        Flood alerts are texted to each house owner&apos;s registered mobile number. Send one test text to your own number to check it works before a real flood.
                    </Typography>
                    <div
                        role="status"
                        style={{
                            padding: '10px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, marginTop: 8,
                            background: smsRoute ? 'var(--hl-success-bg)' : smsRoute === null ? 'var(--hl-warning-bg)' : 'var(--hl-page-bg)',
                            color: smsRoute ? 'var(--hl-success-ink)' : smsRoute === null ? 'var(--hl-warning-ink)' : 'var(--hl-ink-secondary)',
                        }}
                    >
                        {smsRoute === undefined && 'Checking the text setup…'}
                        {smsRoute === null && 'Text sending is not set up yet. In Render, add SMS_GATEWAY_USER and SMS_GATEWAY_PASSWORD from the SMS Gateway app on your phone, then redeploy.'}
                        {smsRoute && `Text sending is set up (${smsRoute}).`}
                    </div>
                    <TextField
                        label="Mobile number"
                        placeholder="09XXXXXXXXX"
                        fullWidth
                        margin="normal"
                        value={smsNumber}
                        onChange={(e) => setSmsNumber(e.target.value)}
                        error={Boolean(smsNumber) && !mobileRegex.test(smsNumber.trim())}
                        helperText="11 digits, starting with 09."
                        sx={fieldSx}
                    />
                    {smsResult.text && (
                        <Typography sx={{ color: smsResult.ok ? 'var(--hl-success-ink)' : 'var(--red)', mt: 1 }}>{smsResult.text}</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setSmsOpen(false)}
                        sx={{ color: 'var(--hl-accent)', borderColor: 'var(--hl-accent)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' }}
                    >
                        Close
                    </Button>
                    <Button
                        onClick={sendTestText}
                        disabled={smsBusy || !smsRoute || !mobileRegex.test(smsNumber.trim())}
                        sx={{
                            backgroundColor: 'var(--hl-accent)', color: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none',
                            '&:hover': { backgroundColor: 'var(--hl-secondary-dark)' }, '&.Mui-disabled': { backgroundColor: 'var(--hl-accent)', color: '#fff', opacity: 0.5 },
                        }}
                    >
                        {smsBusy ? 'Sending…' : 'Send test text'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default UserManagement;