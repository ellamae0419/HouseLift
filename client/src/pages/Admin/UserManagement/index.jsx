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

export const UserManagement = () => {
    setTitle('User Management');
    const axiosPrivate = useAxiosPrivate();
    const [users, setUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [editingUser, setEditingUser] = React.useState(null);
    const [form, setForm] = React.useState({ username: '', email: '', password: '', roles: 'user' });
    const [error, setError] = React.useState('');

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
        setForm({ username: '', email: '', password: '', roles: 'user' });
        setDialogOpen(true);
    };

    const openEditDialog = (user) => {
        setEditingUser(user);
        setForm({ username: user.username, email: user.email, password: '', roles: user.roles || 'user' });
        setDialogOpen(true);
    };

    const submitForm = async () => {
        setError('');
        if (!form.username || !form.email || (!editingUser && !form.password)) {
            setError('Username, email and password are required');
            return;
        }

        try {
            if (editingUser) {
                await axiosPrivate.put(`/users/${editingUser.id}`, { username: form.username, email: form.email, roles: form.roles });
            } else {
                await axiosPrivate.post('/users', { username: form.username, email: form.email, password: form.password, roles: form.roles });
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
            <p className="page-subtitle">Review signups and manage access for HydroLift accounts.</p>

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
                                        <TableCell>
                                            <span style={{
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                padding: '4px 10px',
                                                borderRadius: '999px',
                                                color: pending ? 'var(--hl-warning-ink)' : 'var(--hl-success-ink)',
                                                background: pending ? 'var(--hl-warning-bg)' : 'var(--hl-success-bg)',
                                            }}>
                                                {pending ? 'Pending' : 'Approved'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="maintenance-table__action-col">
                                            <div className="maintenance-table__actions">
                                                {pending ? (
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
                <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{editingUser ? 'Edit user' : 'Add user'}</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Username"
                        fullWidth
                        margin="normal"
                        value={form.username}
                        onChange={(e) => setForm((state) => ({ ...state, username: e.target.value }))}
                        sx={{ '& .MuiInputBase-input': { color: 'var(--heading)' }, '& .MuiInputLabel-root': { color: 'var(--text)' }, '& .MuiOutlinedInput-root': { backgroundColor: 'var(--background)' } }}
                    />
                    <TextField
                        label="Email"
                        fullWidth
                        margin="normal"
                        value={form.email}
                        onChange={(e) => setForm((state) => ({ ...state, email: e.target.value }))}
                        sx={{ '& .MuiInputBase-input': { color: 'var(--heading)' }, '& .MuiInputLabel-root': { color: 'var(--text)' }, '& .MuiOutlinedInput-root': { backgroundColor: 'var(--background)' } }}
                    />
                    {!editingUser && (
                        <TextField
                            label="Password"
                            type="password"
                            fullWidth
                            margin="normal"
                            value={form.password}
                            onChange={(e) => setForm((state) => ({ ...state, password: e.target.value }))}
                            sx={{ '& .MuiInputBase-input': { color: 'var(--heading)' }, '& .MuiInputLabel-root': { color: 'var(--text)' }, '& .MuiOutlinedInput-root': { backgroundColor: 'var(--background)' } }}
                        />
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