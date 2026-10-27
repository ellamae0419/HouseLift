import * as React from 'react';
import useAxiosPrivate from '../../hooks/auth/useAxiosPrivate';
import axios from '../../lib/axios';
import { prepareIdPhoto } from '../../utils/idPhoto';
import { SIZES } from '../../config/shopSizes';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

const userRegex = /^[A-Za-z][A-Za-z0-9_-]{3,18}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!*@#$%]).{8,24}$/;
const fullNameRegex = /^[A-Za-zÀ-ÿ' -]{2,100}$/;
const mobileRegex = /^09\d{9}$/;

const outlineBtn = { color: 'var(--hl-accent)', borderColor: 'var(--hl-accent)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' };
const solidBtn = { backgroundColor: 'var(--hl-accent)', color: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none', '&:hover': { backgroundColor: 'var(--hl-secondary-dark)' }, '&.Mui-disabled': { backgroundColor: 'var(--hl-accent)', color: '#fff', opacity: 0.5 } };
const fieldSx = { '& .MuiInputBase-input': { color: 'var(--heading)' }, '& .MuiInputLabel-root': { color: 'var(--text)' }, '& .MuiOutlinedInput-root': { backgroundColor: 'var(--background)' } };
const mono = { fontFamily: 'var(--font-mono)' };

// A password the buyer can read off a slip of paper: no 0/O, 1/l/I. It always has an uppercase
// letter, a lowercase letter, a number and a special character, so the server accepts it.
const makePassword = () => {
    const pools = ['ABCDEFGHJKMNPQRSTUVWXYZ', 'abcdefghjkmnpqrstuvwxyz', '23456789', '!*@#$%'];
    const all = pools.join('');
    const pick = (chars) => chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];
    const out = pools.map(pick);
    while (out.length < 12) out.push(pick(all));
    for (let i = out.length - 1; i > 0; i--) {
        const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out.join('');
};

const suggestUsername = (fullName) => {
    const first = (fullName.trim().split(/\s+/)[0] || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 12);
    return first.length >= 2 ? `${first}${Math.floor(100 + Math.random() * 900)}` : '';
};

const copyText = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
};

const CopyButton = ({ text }) => {
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
            {state || 'Copy'}
        </Button>
    );
};

const emptyForm = (prefill) => ({
    size: prefill?.houseSize || '',
    fullName: prefill?.fullName || '',
    mobileNumber: prefill?.mobileNumber || '',
    email: prefill?.email || '',
    address: '',
    username: prefill?.fullName ? suggestUsername(prefill.fullName) : '',
    password: makePassword(),
    idType: '',
    unit: 'new',
});

// The admin uses this when a customer has just paid in person: it makes their account, records their
// ID and gives them a serial code in one go. Websites visitors never get an account any other way.
export const RegisterBuyerDialog = ({ open, onClose, prefill = null }) => {
    const axiosPrivate = useAxiosPrivate();

    const [form, setForm] = React.useState(() => emptyForm(null));
    const [idTypes, setIdTypes] = React.useState([]);
    const [units, setUnits] = React.useState([]);
    const [idImage, setIdImage] = React.useState('');
    const [idBusy, setIdBusy] = React.useState(false);
    const [met, setMet] = React.useState(false);
    const [showPw, setShowPw] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState('');
    const [done, setDone] = React.useState(null);

    React.useEffect(() => {
        if (!open) return;
        setForm(emptyForm(prefill));
        setIdImage('');
        setMet(false);
        setShowPw(false);
        setError('');
        setDone(null);
        axios.get('/shop/product').then((res) => setIdTypes(res.data?.idTypes || [])).catch(() => setIdTypes([]));
        axiosPrivate.get('/orders/free-units').then((res) => setUnits(res.data || [])).catch(() => setUnits([]));
    }, [open, prefill, axiosPrivate]);

    const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setError(''); };

    const valid = {
        fullName: fullNameRegex.test(form.fullName.trim()),
        mobileNumber: mobileRegex.test(form.mobileNumber),
        email: emailRegex.test(form.email) && form.email.length <= 75,
        address: form.address.trim().length >= 5,
        username: userRegex.test(form.username),
        password: passwordRegex.test(form.password),
    };
    const canSubmit = Object.values(valid).every(Boolean) && !!form.size && !!form.idType && !!idImage && met && !idBusy && !busy;

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setIdBusy(true);
        setError('');
        try {
            setIdImage(await prepareIdPhoto(file));
        } catch (err) {
            setIdImage('');
            setError(err.message === 'too-big' ? 'That photo is too large even after shrinking. Try another one.' : 'Could not read that file. Choose a photo (JPG or PNG).');
        } finally {
            setIdBusy(false);
        }
    };

    const submit = async () => {
        setBusy(true);
        setError('');
        try {
            const res = await axiosPrivate.post('/orders/walk-in', {
                fullName: form.fullName.trim(), username: form.username, email: form.email.trim(), mobileNumber: form.mobileNumber,
                address: form.address.trim(), password: form.password, size: form.size, idType: form.idType, idImage,
                ...(form.unit !== 'new' ? { esp32Id: form.unit } : {}),
                ...(prefill?.id ? { inquiryId: prefill.id } : {}),
            });
            setDone({ ...res.data, password: form.password, fullName: form.fullName.trim() });
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not register the buyer.');
        } finally {
            setBusy(false);
        }
    };

    const close = () => onClose(Boolean(done));
    const bad = (key) => form[key] !== '' && !valid[key];

    return (
        <Dialog open={open} onClose={close} fullWidth maxWidth="sm" sx={{ '& .MuiPaper-root': { backgroundColor: 'var(--background-card)', color: 'var(--heading)' } }}>
            {!done && (
                <>
                    <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Register a buyer</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" sx={{ color: 'var(--hl-ink-secondary)', mb: 1 }}>
                            Do this when the customer has paid in person. It makes their account, records their ID and gives them a serial code.
                        </Typography>

                        <TextField select label="Size" fullWidth margin="dense" value={form.size} onChange={set('size')} sx={fieldSx}>
                            {SIZES.map((s) => <MenuItem key={s.value} value={s.value}>{s.name} ({s.petWeight})</MenuItem>)}
                        </TextField>
                        <TextField label="Full name (as on the ID)" fullWidth margin="dense" value={form.fullName} onChange={set('fullName')}
                            onBlur={() => setForm((f) => (f.username ? f : { ...f, username: suggestUsername(f.fullName) }))}
                            error={bad('fullName')} helperText={bad('fullName') ? 'Letters only, 2 to 100 characters.' : ''} sx={fieldSx} />
                        <TextField label="Mobile number (flood texts go here)" fullWidth margin="dense" value={form.mobileNumber} onChange={set('mobileNumber')}
                            placeholder="09XXXXXXXXX" error={bad('mobileNumber')} helperText={bad('mobileNumber') ? '11 digits starting with 09.' : ''} sx={fieldSx} />
                        <TextField label="Email" fullWidth margin="dense" value={form.email} onChange={set('email')}
                            error={bad('email')} helperText={bad('email') ? 'Enter a valid email address.' : ''} sx={fieldSx} />
                        <TextField label="Home address" fullWidth margin="dense" value={form.address} onChange={set('address')}
                            placeholder="Street, barangay, city, province" error={bad('address')} helperText={bad('address') ? 'Enter the full address.' : ''} sx={fieldSx} />

                        <Typography sx={{ fontWeight: 600, mt: 2 }}>Their login</Typography>
                        <TextField label="Username" fullWidth margin="dense" value={form.username} onChange={set('username')}
                            error={bad('username')} helperText={bad('username') ? '4 to 19 characters, starting with a letter. Letters, numbers, _ or -.' : ''} sx={fieldSx} />
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <TextField label="Password" fullWidth margin="dense" value={form.password} onChange={set('password')} type={showPw ? 'text' : 'password'}
                                error={bad('password')} helperText={bad('password') ? '8 to 24 characters with an uppercase letter, a lowercase letter, a number and one of ! * @ # $ %.' : 'A strong one is made for you. You will see it once more when you finish.'} sx={fieldSx} />
                            <Button onClick={() => setShowPw((v) => !v)} sx={{ ...outlineBtn, mt: 1.5, px: 1.5, whiteSpace: 'nowrap' }}>{showPw ? 'Hide' : 'Show'}</Button>
                            <Button onClick={() => setForm((f) => ({ ...f, password: makePassword() }))} sx={{ ...outlineBtn, mt: 1.5, px: 1.5, whiteSpace: 'nowrap' }}>New</Button>
                        </div>

                        <Typography sx={{ fontWeight: 600, mt: 2 }}>Their ID</Typography>
                        <TextField select label="Type of ID you checked" fullWidth margin="dense" value={form.idType} onChange={set('idType')} sx={fieldSx}>
                            {idTypes.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                        </TextField>
                        <Button component="label" sx={{ ...outlineBtn, mt: 1 }} disabled={idBusy}>
                            {idBusy ? 'Preparing photo…' : idImage ? 'Choose a different photo' : 'Take or choose a photo of the ID'}
                            <input type="file" accept="image/*" hidden onChange={handleFile} />
                        </Button>
                        {idImage && (
                            <div style={{ marginTop: 10 }}>
                                <img src={idImage} alt="Preview of the ID photo" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 10, border: '1px solid var(--hl-border)' }} />
                                <div><Button size="small" onClick={() => setIdImage('')} sx={{ textTransform: 'none', color: 'var(--hl-danger)' }}>Remove photo</Button></div>
                            </div>
                        )}

                        <Typography sx={{ fontWeight: 600, mt: 2 }}>Which unit are they taking?</Typography>
                        <TextField select fullWidth margin="dense" value={form.unit} onChange={set('unit')} sx={fieldSx}>
                            <MenuItem value="new">Create a new unit (shows its device ID and key once)</MenuItem>
                            {units.map((u) => <MenuItem key={u.id} value={u.id}>{u.esp32_id}</MenuItem>)}
                        </TextField>

                        <FormControlLabel
                            sx={{ mt: 1, '& .MuiFormControlLabel-label': { color: 'var(--heading)' } }}
                            control={<Checkbox checked={met} onChange={(e) => setMet(e.target.checked)} sx={{ color: 'var(--hl-accent)', '&.Mui-checked': { color: 'var(--hl-accent)' } }} />}
                            label="I met this buyer, checked their ID and received the payment in person."
                        />
                        {error && <Typography sx={{ color: 'var(--red)', mt: 1 }} role="alert">{error}</Typography>}
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={close} sx={outlineBtn}>Cancel</Button>
                        <Button onClick={submit} disabled={!canSubmit} sx={solidBtn}>{busy ? 'Registering…' : 'Register buyer'}</Button>
                    </DialogActions>
                </>
            )}

            {done && (
                <>
                    <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{done.fullName} is registered</DialogTitle>
                    <DialogContent>
                        <Typography sx={{ color: 'var(--hl-ink-secondary)' }}>
                            Give the buyer these three things. They log in with the username and password, then enter the serial code to link the unit to their account.
                        </Typography>
                        <div style={{ margin: '14px 0', display: 'grid', gridTemplateColumns: 'max-content 1fr auto', gap: '8px 12px', alignItems: 'center' }}>
                            <span>Username</span><span style={{ ...mono, fontWeight: 600 }}>{done.username}</span><CopyButton text={done.username} />
                            <span>Password</span><span style={{ ...mono, fontWeight: 600 }}>{done.password}</span><CopyButton text={done.password} />
                            <span>Serial code</span><span style={{ ...mono, fontWeight: 600, fontSize: 18, letterSpacing: '0.05em' }}>{done.code}</span><CopyButton text={done.code} />
                        </div>
                        <Typography variant="body2" sx={{ color: 'var(--hl-ink-secondary)', mb: 1.5 }}>
                            This password is not shown again. The buyer can change it later with Forgot password.
                        </Typography>
                        {done.unit.deviceKey ? (
                            <div style={{ padding: 14, borderRadius: 10, background: 'var(--hl-warning-bg)', color: 'var(--hl-warning-ink)', fontSize: 13 }}>
                                <strong>Flash these into the ESP32. The key is shown only this once.</strong>
                                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'max-content 1fr auto', gap: '6px 10px', alignItems: 'center' }}>
                                    <span>Device ID</span><span style={{ ...mono, wordBreak: 'break-all' }}>{done.unit.esp32_id}</span><CopyButton text={done.unit.esp32_id} />
                                    <span>Device key</span><span style={{ ...mono, wordBreak: 'break-all' }}>{done.unit.deviceKey}</span><CopyButton text={done.unit.deviceKey} />
                                </div>
                            </div>
                        ) : (
                            <Typography variant="body2" sx={{ color: 'var(--hl-ink-secondary)' }}>
                                Linked to existing unit <span style={mono}>{done.unit.esp32_id}</span>.
                            </Typography>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={close} sx={solidBtn}>Done</Button>
                    </DialogActions>
                </>
            )}
        </Dialog>
    );
};

export default RegisterBuyerDialog;
