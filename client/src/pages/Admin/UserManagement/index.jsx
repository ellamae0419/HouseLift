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

    return (
        <>
            <h1 className="page-title">User Management</h1>

            <Card sx={{ backgroundColor: '#242629', border: 'none' }}>
                <CardContent>
                    <div className="settings-section-header">
                        <Typography variant="h6" sx={{ color: '#fffffe', fontWeight: 700 }}>Users</Typography>
                        <Button variant="contained" color="primary" onClick={openAddDialog}>Add User</Button>
                    </div>

                    <Table sx={{ mt: 2 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ color: '#94a1b2' }}>Username</TableCell>
                                <TableCell sx={{ color: '#94a1b2' }}>Email</TableCell>
                                <TableCell sx={{ color: '#94a1b2' }}>Role</TableCell>
                                <TableCell sx={{ color: '#94a1b2' }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell sx={{ color: '#fffffe' }}>{user.username}</TableCell>
                                    <TableCell sx={{ color: '#fffffe' }}>{user.email}</TableCell>
                                    <TableCell sx={{ color: '#fffffe' }}>{user.roles}</TableCell>
                                    <TableCell>
                                        <Button className="button" onClick={() => openEditDialog(user)} sx={{ mr: 1 }}>Edit</Button>
                                        <Button className="button" onClick={() => handleDelete(user)}>Delete</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {loading && <Typography sx={{ color: '#94a1b2', mt: 2 }}>Loading users...</Typography>}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm" sx={{ '& .MuiPaper-root': { backgroundColor: '#242629', color: '#fffffe' } }}>
                <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Username"
                        fullWidth
                        margin="normal"
                        value={form.username}
                        onChange={(e) => setForm((state) => ({ ...state, username: e.target.value }))}
                        sx={{ '& .MuiInputBase-input': { color: '#fffffe' }, '& .MuiInputLabel-root': { color: '#94a1b2' }, '& .MuiOutlinedInput-root': { backgroundColor: '#16161a' } }}
                    />
                    <TextField
                        label="Email"
                        fullWidth
                        margin="normal"
                        value={form.email}
                        onChange={(e) => setForm((state) => ({ ...state, email: e.target.value }))}
                        sx={{ '& .MuiInputBase-input': { color: '#fffffe' }, '& .MuiInputLabel-root': { color: '#94a1b2' }, '& .MuiOutlinedInput-root': { backgroundColor: '#16161a' } }}
                    />
                    {!editingUser && (
                        <TextField
                            label="Password"
                            type="password"
                            fullWidth
                            margin="normal"
                            value={form.password}
                            onChange={(e) => setForm((state) => ({ ...state, password: e.target.value }))}
                            sx={{ '& .MuiInputBase-input': { color: '#fffffe' }, '& .MuiInputLabel-root': { color: '#94a1b2' }, '& .MuiOutlinedInput-root': { backgroundColor: '#16161a' } }}
                        />
                    )}
                    <Select fullWidth value={form.roles} onChange={(e) => setForm((state) => ({ ...state, roles: e.target.value }))} sx={{ mt: 2 }}>
                        <MenuItem value="user">User</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                    {error && <Typography sx={{ color: 'var(--red)', mt: 1 }}>{error}</Typography>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)} className="button">Cancel</Button>
                    <Button onClick={submitForm} variant="contained" className="button button-full">Save</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default UserManagement;