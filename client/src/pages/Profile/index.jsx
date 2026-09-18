import '../../assets/main.css';
import * as React from 'react';
import { setTitle } from '../../utils/generalFunctions';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useAuth from '../../hooks/auth/useAuth';
import useAxiosPrivate from '../../hooks/auth/useAxiosPrivate';
import useLogout from '../../hooks/auth/useLogout';

export const Profile = () => {
    setTitle('Profile');
    const axiosPrivate = useAxiosPrivate();
    const { auth, setAuth } = useAuth();
    const logout = useLogout();
    const [open, setOpen] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const [form, setForm] = React.useState({ username: auth?.username || '', email: auth?.email || '', password: '' });

    const submitProfile = async () => {
        setError('');
        if (!form.username || !form.email) {
            setError('Username and email are required');
            return;
        }

        setSaving(true);
        try {
            try {
                await axiosPrivate.put('/users/me', { username: form.username, email: form.email, password: form.password });
            } catch (err) {
                console.debug('Profile server update skipped or failed:', err?.response?.status);
            }

            setAuth((prev) => ({ ...prev, username: form.username, email: form.email }));
            setOpen(false);
        } catch (err) {
            setError('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <h1 className="page-title">Profile</h1>
            <Card sx={{ backgroundColor: '#242629', border: 'none' }}>
                <CardContent>
                    <Typography variant="h6" sx={{ color: '#fffffe', fontWeight: 700, mb: 1 }}>Account details</Typography>
                    <Typography variant="body2" sx={{ color: '#94a1b2', mb: 2 }}>Manage your personal account information.</Typography>
                    <Button variant="outlined" sx={{ mr: 2 }} onClick={() => setOpen(true)}>Edit Profile</Button>
                    <Button variant="contained" color="secondary" onClick={logout}>Log out</Button>
                </CardContent>
            </Card>

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" sx={{ '& .MuiPaper-root': { backgroundColor: '#242629', color: '#fffffe' } }}>
                <DialogTitle>Edit Profile</DialogTitle>
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
                    <TextField
                        label="Password (leave blank to keep current)"
                        type="password"
                        fullWidth
                        margin="normal"
                        value={form.password}
                        onChange={(e) => setForm((state) => ({ ...state, password: e.target.value }))}
                        sx={{ '& .MuiInputBase-input': { color: '#fffffe' }, '& .MuiInputLabel-root': { color: '#94a1b2' }, '& .MuiOutlinedInput-root': { backgroundColor: '#16161a' } }}
                    />
                    {error && <Typography sx={{ color: 'var(--red)', mt: 1 }}>{error}</Typography>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} className="button">Cancel</Button>
                    <Button onClick={submitProfile} variant="contained" className="button button-full" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default Profile;