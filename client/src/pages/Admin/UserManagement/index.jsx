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

const outlineBtn = { color: 'var(--hl-accent)', borderColor: 'var(--hl-accent)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' };
const solidBtn = { backgroundColor: 'var(--hl-accent)', color: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none', '&:hover': { backgroundColor: 'var(--hl-secondary-dark)' } };
const mono = { fontFamily: 'var(--font-mono)' };

const CopyButton = ({ text }) => {
    const [state, setState] = React.useState('');
    return (
        <Button
            size="small"
            onClick={async () => {
                let ok = true;
                try { await navigator.clipboard.writeText(text); } catch { ok = false; }
                setState(ok ? 'Copied' : 'Select and copy it by hand');
                setTimeout(() => setState(''), 2000);
            }}
            sx={{ ...outlineBtn, py: 0.25, px: 1.25 }}
        >
            {state || 'Copy'}
        </Button>
    );
};

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
    // What a new house owner needs, shown once after the account is made: their login and serial code.
    const [created, setCreated] = React.useState(null);

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
                setError('Full name, address and mobile number are required');
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
                const res = await axiosPrivate.post('/users', { username: form.username, email: form.email, password: form.password, roles: form.roles, ...details });
                if (res.data?.serial) {
                    setCreated({ fullName: form.fullName.trim(), username: form.username, password: form.password, code: res.data.serial.code, unit: res.data.serial.unit });
                }
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

            <Dialog open={Boolean(created)} onClose={() => setCreated(null)} fullWidth maxWidth="sm" sx={{ '& .MuiPaper-root': { backgroundColor: 'var(--background-card)', color: 'var(--heading)' } }}>
                {created && (
                    <>
                        <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{created.fullName}&apos;s account is ready</DialogTitle>
                        <DialogContent>
                            <Typography sx={{ color: 'var(--hl-ink-secondary)' }}>
                                Give the user these three things. They log in with the username and password, then enter the serial code to link their unit to their account.
                            </Typography>
                            <div style={{ margin: '14px 0', display: 'grid', gridTemplateColumns: 'max-content 1fr auto', gap: '8px 12px', alignItems: 'center' }}>
                                <span>Username</span><span style={{ ...mono, fontWeight: 600 }}>{created.username}</span><CopyButton text={created.username} />
                                <span>Password</span><span style={{ ...mono, fontWeight: 600 }}>{created.password}</span><CopyButton text={created.password} />
                                <span>Serial code</span><span style={{ ...mono, fontWeight: 600, fontSize: 18, letterSpacing: '0.05em' }}>{created.code}</span><CopyButton text={created.code} />
                            </div>
                            <Typography variant="body2" sx={{ color: 'var(--hl-ink-secondary)', mb: 1.5 }}>
                                The password is not shown again. The serial code stays in the Serial code column of the table.
                            </Typography>
                            {created.unit?.deviceKey && (
                                <div style={{ padding: 14, borderRadius: 10, background: 'var(--hl-warning-bg)', color: 'var(--hl-warning-ink)', fontSize: 13 }}>
                                    <strong>Flash these into the ESP32. The key is shown only this once.</strong>
                                    <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'max-content 1fr auto', gap: '6px 10px', alignItems: 'center' }}>
                                        <span>Device ID</span><span style={{ ...mono, wordBreak: 'break-all' }}>{created.unit.esp32_id}</span><CopyButton text={created.unit.esp32_id} />
                                        <span>Device key</span><span style={{ ...mono, wordBreak: 'break-all' }}>{created.unit.deviceKey}</span><CopyButton text={created.unit.deviceKey} />
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2 }}>
                            <Button onClick={() => setCreated(null)} sx={solidBtn}>Done</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

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
                        helperText="We use this number to reach the owner."
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
                            A serial code is made automatically with this account. The user logs in and enters it to link their pet house.
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
        </>
    );
};

export default UserManagement;