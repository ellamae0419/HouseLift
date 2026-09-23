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
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [profile, setProfile] = React.useState(null);
    const [form, setForm] = React.useState({ username: '', email: '', fullName: '', address: '', mobileNumber: '', password: '' });

    const loadProfile = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosPrivate.get('/users/me');
            setProfile(res.data);
        } catch (err) {
            console.error('Error loading profile:', err?.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    }, [axiosPrivate]);

    React.useEffect(() => { loadProfile(); }, [loadProfile]);

    const openEdit = () => {
        setForm({
            username: profile?.username || auth?.username || '',
            email: profile?.email || auth?.email || '',
            fullName: profile?.fullName || '',
            address: profile?.address || '',
            mobileNumber: profile?.mobileNumber || '',
            password: '',
        });
        setError('');
        setOpen(true);
    };

    const submitProfile = async () => {
        setError('');
        if (!form.username || !form.email) {
            setError('Username and email are required');
            return;
        }

        setSaving(true);
        try {
            const res = await axiosPrivate.put('/users/me', form);
            setAuth((prev) => ({ ...prev, username: res.data?.username || form.username, email: res.data?.email || form.email }));
            await loadProfile();
            setOpen(false);
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const fieldSx = { '& .MuiInputBase-input': { color: 'var(--heading)' }, '& .MuiInputLabel-root': { color: 'var(--text)' }, '& .MuiOutlinedInput-root': { backgroundColor: 'var(--background)' } };

    const rows = [
        { label: 'Full name', value: profile?.fullName },
        { label: 'Username', value: profile?.username },
        { label: 'Email', value: profile?.email },
        { label: 'Address', value: profile?.address },
        { label: 'Mobile number', value: profile?.mobileNumber },
    ];

    return (
        <>
            <h1 className="page-title">Profile</h1>
            <p className="page-subtitle">Manage your personal account information.</p>
            <Card sx={{ backgroundColor: 'var(--hl-card-bg)', border: '1px solid var(--hl-border)', borderRadius: '14px', boxShadow: 'none' }}>
                <CardContent>
                    <Typography variant="h6" sx={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-heading)', fontWeight: 600, mb: 1 }}>Account details</Typography>

                    {loading ? (
                        <Typography variant="body2" sx={{ color: 'var(--hl-ink-tertiary)' }}>Loading…</Typography>
                    ) : (
                        <Card variant="outlined" sx={{ mb: 2, backgroundColor: 'var(--hl-page-bg)', borderColor: 'var(--hl-border)', borderRadius: '12px', boxShadow: 'none' }}>
                            <CardContent>
                                {rows.map((row) => (
                                    <Typography key={row.label} variant="body2" sx={{ color: 'var(--hl-ink-secondary)', mb: 0.75 }}>
                                        <strong style={{ color: 'var(--hl-ink)' }}>{row.label}:</strong> {row.value || '—'}
                                    </Typography>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    <Button
                        onClick={openEdit}
                        sx={{ mr: 2, color: 'var(--hl-accent)', borderColor: 'var(--hl-accent)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' }}
                    >
                        Edit profile
                    </Button>
                    <Button
                        onClick={logout}
                        sx={{ color: 'var(--hl-danger)', borderColor: 'var(--hl-danger)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' }}
                    >
                        Log out
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" sx={{ '& .MuiPaper-root': { backgroundColor: 'var(--background-card)', color: 'var(--heading)' } }}>
                <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Edit profile</DialogTitle>
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
                    <TextField
                        label="Address"
                        fullWidth
                        margin="normal"
                        value={form.address}
                        onChange={(e) => setForm((state) => ({ ...state, address: e.target.value }))}
                        sx={fieldSx}
                    />
                    <TextField
                        label="Mobile number"
                        fullWidth
                        margin="normal"
                        value={form.mobileNumber}
                        onChange={(e) => setForm((state) => ({ ...state, mobileNumber: e.target.value }))}
                        sx={fieldSx}
                    />
                    <TextField
                        label="Password (leave blank to keep current)"
                        type="password"
                        fullWidth
                        margin="normal"
                        value={form.password}
                        onChange={(e) => setForm((state) => ({ ...state, password: e.target.value }))}
                        sx={fieldSx}
                    />
                    {error && <Typography sx={{ color: 'var(--red)', mt: 1 }}>{error}</Typography>}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setOpen(false)}
                        sx={{ color: 'var(--hl-accent)', borderColor: 'var(--hl-accent)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={submitProfile}
                        disabled={saving}
                        sx={{
                            backgroundColor: 'var(--hl-accent)', color: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none',
                            '&:hover': { backgroundColor: 'var(--hl-secondary-dark)' },
                            '&.Mui-disabled': { backgroundColor: 'var(--hl-accent)', color: '#fff', opacity: 0.6 },
                        }}
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default Profile;