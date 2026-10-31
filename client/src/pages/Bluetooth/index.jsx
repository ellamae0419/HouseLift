import '../../assets/main.css';
import { setTitle } from '../../utils/generalFunctions';
import { shopBase, shopUrl } from '../../utils/siteLinks';
import useHydroLiftBluetooth from '../../hooks/useHydroLiftBluetooth';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

const outlineBtn = { color: 'var(--hl-accent)', borderColor: 'var(--hl-accent)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' };
const solidBtn = { backgroundColor: 'var(--hl-accent)', color: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none', '&:hover': { backgroundColor: 'var(--hl-secondary-dark)' }, '&.Mui-disabled': { backgroundColor: 'var(--hl-accent)', color: '#fff', opacity: 0.45 } };
const fieldSx = { '& .MuiInputBase-input': { color: 'var(--heading)' }, '& .MuiInputLabel-root': { color: 'var(--text)' }, '& .MuiOutlinedInput-root': { backgroundColor: 'var(--background)' } };
const cardSx = { backgroundColor: 'var(--hl-card-bg)', border: '1px solid var(--hl-border)', borderRadius: '14px', boxShadow: 'none', mb: 2 };
const notice = (kind) => ({ marginBottom: 14, padding: '10px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: `var(--hl-${kind}-bg)`, color: kind === 'danger' ? 'var(--hl-danger)' : `var(--hl-${kind}-ink)` });

// Lets a phone or computer standing near the unit raise or lower it over Bluetooth, with no WiFi.
// It only works in a browser that has Web Bluetooth: Chrome or Edge on Android and computers, or the
// Bluefy browser on an iPhone. The unit refuses every command until the right PIN is sent.
export const BluetoothControl = () => {
    setTitle('Bluetooth control');

    const { supported, secure, phase, deviceName, pin, setPin, state, error, clearError, info, busy, connect, unlock, send, disconnect } = useHydroLiftBluetooth();
    const moving = !!state?.moving;

    return (
        <>
            <h1 className="page-title">Bluetooth control</h1>
            <p className="page-subtitle">Raise or lower your HydroLift from your phone when you are standing near it. This needs no WiFi.</p>

            {!supported && (
                <div role="alert" style={notice('warning')}>
                    This browser cannot use Bluetooth. On an Android phone or a computer, open this page in Chrome or Edge. On an iPhone, open it in the free Bluefy browser (Apple does not allow Bluetooth in Safari or Chrome on iPhone).
                </div>
            )}
            {supported && !secure && (
                <div role="alert" style={notice('warning')}>
                    Bluetooth only works on a secure page. Open this site with <strong>https://</strong> at the start of the address.
                </div>
            )}
            {error && <div role="alert" style={notice('danger')}>{error}</div>}
            {info && !error && <div role="status" style={notice('success')}>{info}</div>}

            <Card sx={cardSx}>
                <CardContent>
                    {phase === 'idle' && (
                        <>
                            <Typography sx={{ color: 'var(--hl-ink-secondary)', mb: 2 }}>
                                Stand near the unit with its power on, then tap Connect and choose your HydroLift from the list. Bluetooth reaches about 10 meters, less through walls.
                            </Typography>
                            <Button onClick={connect} disabled={!supported || !secure} sx={{ ...solidBtn, px: 3 }}>Connect to my HydroLift</Button>
                            {shopBase && (
                                <Typography variant="body2" sx={{ color: 'var(--hl-ink-secondary)', mt: 2 }}>
                                    No internet where the unit is? Open the offline remote once while you are online:{' '}
                                    <a href={shopUrl('/remote')} style={{ color: 'var(--hl-accent)', fontWeight: 600 }}>{shopUrl('/remote')}</a>
                                    . It saves itself on your device and needs no login, so it opens with no internet afterwards.
                                </Typography>
                            )}
                        </>
                    )}

                    {phase === 'connecting' && <Typography sx={{ color: 'var(--hl-ink-secondary)' }}>Connecting…</Typography>}

                    {phase === 'pin' && (
                        <form onSubmit={unlock}>
                            <Typography sx={{ color: 'var(--hl-ink)', fontWeight: 600 }}>Connected to {deviceName}</Typography>
                            <Typography sx={{ color: 'var(--hl-ink-secondary)', mb: 1 }}>Enter the unit&apos;s Bluetooth PIN to unlock the controls.</Typography>
                            <TextField
                                label="Bluetooth PIN" type="password" fullWidth margin="dense" value={pin}
                                onChange={(e) => { setPin(e.target.value); clearError(); }}
                                inputProps={{ inputMode: 'numeric', autoComplete: 'off', maxLength: 12 }} sx={fieldSx}
                            />
                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                <Button type="submit" disabled={busy || !pin.trim()} sx={solidBtn}>{busy ? 'Checking…' : 'Unlock'}</Button>
                                <Button onClick={disconnect} sx={outlineBtn}>Disconnect</Button>
                            </div>
                        </form>
                    )}

                    {phase === 'ready' && state && (
                        <>
                            <Typography sx={{ color: 'var(--hl-ink)', fontWeight: 600, mb: 1.5 }}>Connected to {deviceName}</Typography>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
                                <div style={{ padding: 14, borderRadius: 10, background: 'var(--hl-page-bg)' }}>
                                    <div style={{ fontSize: 12, color: 'var(--hl-ink-tertiary)' }}>Water level (0 to 4)</div>
                                    <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--hl-ink)' }}>{state.wl.toFixed(1)}</div>
                                </div>
                                <div style={{ padding: 14, borderRadius: 10, background: 'var(--hl-page-bg)' }}>
                                    <div style={{ fontSize: 12, color: 'var(--hl-ink-tertiary)' }}>Platform height</div>
                                    <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--hl-ink)' }}>{state.pos}%</div>
                                    <div style={{ height: 6, borderRadius: 3, background: 'var(--hl-border)', marginTop: 6 }}>
                                        <div style={{ height: 6, borderRadius: 3, width: `${Math.min(100, Math.max(0, state.pos))}%`, background: 'var(--hl-accent)' }} />
                                    </div>
                                </div>
                                <div style={{ padding: 14, borderRadius: 10, background: 'var(--hl-page-bg)' }}>
                                    <div style={{ fontSize: 12, color: 'var(--hl-ink-tertiary)' }}>Status</div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--hl-ink)' }}>{moving ? 'Moving…' : 'Resting'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--hl-ink-secondary)' }}>Auto lift is {state.auto ? 'on' : 'off'}</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                                <Button onClick={() => send('FULL_UP', 'Lift')} disabled={busy || moving} sx={{ ...solidBtn, px: 3 }}>Lift fully</Button>
                                <Button onClick={() => send('FULL_DOWN', 'Lower')} disabled={busy || moving} sx={{ ...solidBtn, px: 3 }}>Lower fully</Button>
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                                <Button onClick={() => send('STEP_UP', 'Step up')} disabled={busy || moving} sx={outlineBtn}>Step up</Button>
                                <Button onClick={() => send('STEP_DOWN', 'Step down')} disabled={busy || moving} sx={outlineBtn}>Step down</Button>
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                                <Button onClick={() => send(state.auto ? 'AUTO_OFF' : 'AUTO_ON', state.auto ? 'Auto lift off' : 'Auto lift on')} disabled={busy} sx={outlineBtn}>
                                    {state.auto ? 'Turn auto lift off' : 'Turn auto lift on'}
                                </Button>
                                <Button onClick={disconnect} sx={outlineBtn}>Disconnect</Button>
                            </div>
                            <Typography variant="body2" sx={{ color: 'var(--hl-ink-secondary)' }}>
                                Flood texts and history still need WiFi. This page is only a remote control for when you are next to the unit.
                            </Typography>
                        </>
                    )}
                </CardContent>
            </Card>
        </>
    );
};

export default BluetoothControl;
