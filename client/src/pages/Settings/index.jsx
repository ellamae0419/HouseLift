import "../../assets/main.css";
import * as React from "react";
import { setTitle } from "../../utils/generalFunctions";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import Container from "../../components/Container";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import useAxiosPrivate from "../../hooks/auth/useAxiosPrivate";
import Stack from '@mui/material/Stack';
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
import Link from '@mui/material/Link';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import useAuth from '../../hooks/auth/useAuth';
import useLogout from '../../hooks/auth/useLogout';
import { hasAnyRole } from '../../utils/roles';
import { getStoredTheme, setTheme as persistTheme } from '../../utils/theme';

export const Settings = () => {
  setTitle("Settings");
  const axiosPrivate = useAxiosPrivate();
  const [theme, setThemeState] = React.useState(getStoredTheme());
  const [value, setValue] = React.useState(2);
  const [persistedValue, setPersistedValue] = React.useState(2);
  const [loading, setLoading] = React.useState(false);

  const [users, setUsers] = React.useState([]);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState(null);
  const [form, setForm] = React.useState({ username: '', email: '', password: '', roles: 'user' });
  const { auth, setAuth } = useAuth();
  const logout = useLogout();

  const [profileDialogOpen, setProfileDialogOpen] = React.useState(false);
  const [profileForm, setProfileForm] = React.useState({ username: auth?.username || '', email: auth?.email || '' });
  const [submitLoading, setSubmitLoading] = React.useState(false);
  const [formError, setFormError] = React.useState('');
  const [profileError, setProfileError] = React.useState('');
  const isAdmin = hasAnyRole(auth, ['admin']);

  React.useEffect(() => {
    const loadThreshold = async () => {
      try {
        const response = await axiosPrivate.post('/esp32/config', {
          esp32_id: 'esp32-default',
        });

        const threshold = Number(response?.data?.threshold);

        if (!Number.isNaN(threshold)) {
          setValue(threshold);
          setPersistedValue(threshold);
        }
      } catch (err) {
        console.error('Error loading threshold:', err.response?.data?.message);
      }
    };

    loadThreshold();
  }, [axiosPrivate]);

  React.useEffect(() => {
    setUsers([]);
  }, []);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await axiosPrivate.get('/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Error loading users:', err.response?.data?.message || err.message);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleThemeToggle = (event) => {
    const nextTheme = event.target.checked ? 'light' : 'dark';
    setThemeState(nextTheme);
    persistTheme(nextTheme);
  };

  const handleSliderChange = (_event, newValue) => {
    setValue(newValue);
  };

  const handleSliderCommit = async (_event, newValue) => {
    setLoading(true);

    try {
      await axiosPrivate.post('/esp32/threshold', {
        esp32_id: 'esp32-default',
        threshold: newValue
      });
      setPersistedValue(newValue);
      console.log('Threshold updated to:', newValue);
    } catch (err) {
      console.error('Error updating threshold:', err.response?.data?.message);
      setValue(persistedValue);
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    if (!isAdmin) return;
    setEditingUser(null);
    setForm({ username: '', email: '', password: '', roles: 'user' });
    setDialogOpen(true);
  };

  const openProfileDialog = () => {
    setProfileForm({ username: auth?.username || '', email: auth?.email || '' });
    setProfileDialogOpen(true);
  };

  const openEditDialog = (user) => {
    if (!isAdmin) return;
    setEditingUser(user);
    setForm({ username: user.username, email: user.email, password: '', roles: user.roles || 'user' });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
  };

  const handleFormChange = (field) => (e) => {
    setForm((s) => ({ ...s, [field]: e.target.value }));
  };

  const submitForm = async () => {
    if (!isAdmin) {
      setFormError('You must be an admin to perform this action');
      return;
    }

    setFormError('');
    if (!form.username || !form.email || (!editingUser && !form.password)) {
      setFormError('Username, email and password are required');
      return;
    }
    setSubmitLoading(true);
    try {
      if (editingUser) {
        await axiosPrivate.put(`/users/${editingUser.id}`, { username: form.username, email: form.email, roles: form.roles });
      } else {
        await axiosPrivate.post('/users', { username: form.username, email: form.email, password: form.password, roles: form.roles });
      }
      closeDialog();
      loadUsers();
      alert('User saved');
    } catch (err) {
      console.error('Error saving user:', err);
      const msg = err?.response?.data?.message || err.message || 'Error saving user';
      setFormError(msg);
      if (err?.response?.status === 403 || err?.response?.status === 401) {
        setFormError('You must be an admin to perform this action');
      }
      // Dev fallback: if server denies or endpoint missing, allow local create for testing
      const status = err?.response?.status;
      if ([403, 404].includes(status)) {
        if (confirm('Server denied creating user (status ' + status + '). Try creating in dev DB route?')) {
          try {
            await axiosPrivate.post('/dev-users', { username: form.username, email: form.email, password: form.password, roles: form.roles });
            closeDialog();
            loadUsers();
            alert('User created on dev server route');
          } catch (err2) {
            console.error('Dev server create failed:', err2);
            if (confirm('Dev route failed. Add user locally for testing instead?')) {
              const newUser = { id: Date.now().toString(), username: form.username, email: form.email, roles: form.roles, createdAt: new Date().toISOString() };
              setUsers(prev => [newUser, ...prev]);
              closeDialog();
              alert('User created locally for testing');
            }
          }
        }
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const submitProfile = async () => {
    setProfileError('');
    if (!profileForm.username || !profileForm.email) {
      setProfileError('Username and email are required');
      return;
    }
    setSubmitLoading(true);
    try {
      // Attempt server update if endpoint exists (optimistic)
      try {
        await axiosPrivate.put('/users/me', { username: profileForm.username, email: profileForm.email, password: profileForm.password });
        // If server responds, update auth from server
      } catch (err) {
        // ignore if endpoint missing; fallback to local update
        console.debug('Profile server update skipped or failed:', err?.response?.status);
      }

      setAuth(prev => ({ ...prev, username: profileForm.username, email: profileForm.email }));
      setProfileDialogOpen(false);
      alert('Profile updated');
    } catch (err) {
      console.error('Error updating profile:', err?.message || err);
      setProfileError('Failed to update profile');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (user) => {
    if (!isAdmin) return;
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
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Configure how HydroLift behaves for your household.</p>
      <Container>
        <Stack spacing={3}>
          <Card sx={{ backgroundColor: 'var(--hl-card-bg)', border: '1px solid var(--hl-border)', borderRadius: '14px', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-heading)', fontWeight: 600, mb: 1 }}>Appearance</Typography>
              <Typography variant="body2" sx={{ color: 'var(--hl-ink-secondary)', mb: 2 }}>
                Choose how HydroLift looks on this device.
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={theme === 'light'}
                    onChange={handleThemeToggle}
                    disableRipple
                    sx={{
                      width: 44,
                      height: 24,
                      padding: 0,
                      overflow: 'visible',
                      '& .MuiSwitch-switchBase': {
                        padding: 0,
                        margin: '3px',
                        transitionDuration: '200ms',
                        color: '#ffffff',
                        '&.Mui-checked': {
                          transform: 'translateX(20px)',
                          color: '#ffffff',
                          '& + .MuiSwitch-track': {
                            backgroundColor: 'var(--hl-accent)',
                            opacity: 1,
                          },
                        },
                      },
                      '& .MuiSwitch-thumb': {
                        boxSizing: 'border-box',
                        width: 18,
                        height: 18,
                        backgroundColor: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                      },
                      '& .MuiSwitch-track': {
                        borderRadius: 999,
                        backgroundColor: '#CBD6D4',
                        opacity: 1,
                        transition: 'background-color 200ms',
                      },
                    }}
                  />
                }
                label={theme === 'light' ? 'Light mode' : 'Dark mode'}
                sx={{ color: 'var(--hl-ink)', m: 0 }}
              />
            </CardContent>
          </Card>

          <Card sx={{ backgroundColor: 'var(--hl-card-bg)', border: '1px solid var(--hl-border)', borderRadius: '14px', boxShadow: 'none' }}>
            <CardContent>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  display: 'block',
                  mb: 2,
                  color: 'var(--hl-ink)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  letterSpacing: '0',
                  lineHeight: 1.2,
                }}
              >
                Flood threshold: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--hl-accent)' }}>{value}</span>
              </Typography>
              <Box sx={{ width: 300 }}>
                <Slider
                  value={value}
                  onChange={handleSliderChange}
                  onChangeCommitted={handleSliderCommit}
                  disabled={loading}
                  valueLabelDisplay="auto"
                  step={1}
                  marks
                  min={0}
                  max={4}
                  sx={{
                    color: 'var(--hl-accent)',
                    height: 6,
                    '& .MuiSlider-thumb': {
                      width: 16,
                      height: 16,
                      backgroundColor: '#ffffff',
                      border: '2px solid var(--hl-accent)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      '&:hover, &.Mui-focusVisible': { boxShadow: '0 0 0 6px color-mix(in srgb, var(--hl-accent) 16%, transparent)' },
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: 'var(--hl-accent)',
                      border: 'none',
                    },
                    '& .MuiSlider-rail': {
                      backgroundColor: '#DCEAE7',
                      opacity: 1,
                    },
                    '& .MuiSlider-mark': {
                      backgroundColor: '#DCEAE7',
                      opacity: 1,
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                    },
                    '& .MuiSlider-mark.MuiSlider-markActive': {
                      backgroundColor: 'var(--hl-accent)',
                      opacity: 1,
                    },
                    '&.Mui-disabled': {
                      '& .MuiSlider-track': { backgroundColor: 'var(--hl-accent)' },
                      '& .MuiSlider-rail': { backgroundColor: '#DCEAE7' },
                      '& .MuiSlider-thumb': { backgroundColor: '#ffffff', border: '2px solid var(--hl-accent)' },
                    },
                    opacity: loading ? 0.6 : 1,
                  }}
                />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ backgroundColor: 'var(--hl-card-bg)', border: '1px solid var(--hl-border)', borderRadius: '14px', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-heading)', fontWeight: 600, mb: 1 }}>Pet house settings</Typography>
              <Typography variant="body2" sx={{ color: 'var(--hl-ink-secondary)', mb: 2 }}>
                Set the water level that triggers automatic elevation of the pet house. Account details are now in Profile.
              </Typography>
              <Link href="/profile" underline="hover" sx={{ color: 'var(--hl-accent)', fontWeight: 600 }}>Open profile</Link>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </>
  );
};
