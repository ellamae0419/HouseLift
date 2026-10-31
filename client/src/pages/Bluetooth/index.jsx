import '../../assets/main.css';
import * as React from 'react';
import { setTitle } from '../../utils/generalFunctions';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

// The same ids as arduino/HouseLift-bluetooth/ble_control.h.
const SERVICE_UUID = '7f1c0001-5b6a-4c2e-9f3a-8d2b1c4e6a10';
const COMMAND_UUID = '7f1c0002-5b6a-4c2e-9f3a-8d2b1c4e6a10';
const STATUS_UUID = '7f1c0003-5b6a-4c2e-9f3a-8d2b1c4e6a10';

const outlineBtn = { color: 'var(--hl-accent)', borderColor: 'var(--hl-accent)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' };
const solidBtn = { backgroundColor: 'var(--hl-accent)', color: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none', '&:hover': { backgroundColor: 'var(--hl-secondary-dark)' }, '&.Mui-disabled': { backgroundColor: 'var(--hl-accent)', color: '#fff', opacity: 0.45 } };
const fieldSx = { '& .MuiInputBase-input': { color: 'var(--heading)' }, '& .MuiInputLabel-root': { color: 'var(--text)' }, '& .MuiOutlinedInput-root': { backgroundColor: 'var(--background)' } };
const cardSx = { backgroundColor: 'var(--hl-card-bg)', border: '1px solid var(--hl-border)', borderRadius: '14px', boxShadow: 'none', mb: 2 };
const notice = (kind) => ({ marginBottom: 14, padding: '10px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: `var(--hl-${kind}-bg)`, color: kind === 'danger' ? 'var(--hl-danger)' : `var(--hl-${kind}-ink)` });

const encode = (text) => new TextEncoder().encode(text);

// Lets a phone or computer standing near the unit raise or lower it over Bluetooth, with no WiFi.
// It only works in a browser that has Web Bluetooth: Chrome or Edge on Android and computers, or the
// Bluefy browser on an iPhone. The unit refuses every command until the right PIN is sent.
export const BluetoothControl = () => {
    setTitle('Bluetooth control');

    const supported = typeof navigator !== 'undefined' && !!navigator.bluetooth;
    const secure = typeof window !== 'undefined' ? window.isSecureContext : true;

    const [phase, setPhase] = React.useState('idle');   // idle, connecting, pin, ready
    const [deviceName, setDeviceName] = React.useState('');
    const [pin, setPin] = React.useState('');
    const [state, setState] = React.useState(null);     // { wl, pos, auto, moving }
    const [error, setError] = React.useState('');
    const [info, setInfo] = React.useState('');
    const [busy, setBusy] = React.useState(false);

    const link = React.useRef({ device: null, command: null, status: null, queue: Promise.resolve(), timer: null });

    // Bluetooth allows one operation at a time, so every read and write waits for the one before.
    const enqueue = (job) => {
        const next = link.current.queue.then(job, job);
        link.current.queue = next.catch(() => {});
        return next;
    };

    const write = (text) => enqueue(async () => {
        const chr = link.current.command;
        const data = encode(text);
        await (chr.writeValueWithResponse ? chr.writeValueWithResponse(data) : chr.writeValue(data));
    });

    const readStatus = () => enqueue(async () => {
        const view = await link.current.status.readValue();
        return JSON.parse(new TextDecoder().decode(view));
    });

    const stopPolling = () => {
        clearInterval(link.current.timer);
        link.current.timer = null;
    };

    const dropLink = React.useCallback((message) => {
        stopPolling();
        const { device } = link.current;
        try { if (device?.gatt?.connected) device.gatt.disconnect(); } catch { /* already gone */ }
        link.current = { device: null, command: null, status: null, queue: Promise.resolve(), timer: null };
        setPhase('idle');
        setState(null);
        setPin('');
        if (message) setError(message);
    }, []);

    React.useEffect(() => () => dropLink(''), [dropLink]);

    const applyStatus = (status) => {
        if (status.locked) {
            setError('Too many wrong PINs. Bluetooth control is locked for a minute. Please wait and try again.');
            setPhase('pin');
        } else if (!status.auth) {
            setPhase('pin');
        } else {
            setPhase('ready');
            setState({ wl: Number(status.wl), pos: Number(status.pos), auto: !!status.auto, moving: !!status.moving });
        }
        return status;
    };

    const startPolling = () => {
        stopPolling();
        link.current.timer = setInterval(async () => {
            try { applyStatus(await readStatus()); } catch { /* the disconnect handler deals with a lost link */ }
        }, 2000);
    };

    const connect = async () => {
        setError('');
        setInfo('');
        setPhase('connecting');
        try {
            const device = await navigator.bluetooth.requestDevice({ filters: [{ services: [SERVICE_UUID] }] });
            device.addEventListener('gattserverdisconnected', () => dropLink('The Bluetooth connection was lost. Stand closer to the unit and connect again.'));
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService(SERVICE_UUID);
            link.current = { ...link.current, device, command: await service.getCharacteristic(COMMAND_UUID), status: await service.getCharacteristic(STATUS_UUID) };
            setDeviceName(device.name || 'HydroLift');
            applyStatus(await readStatus());
            setPhase((p) => (p === 'connecting' ? 'pin' : p));
            startPolling();
        } catch (err) {
            const cancelled = err?.name === 'NotFoundError';
            dropLink(cancelled ? '' : `Could not connect: ${err?.message || 'unknown problem'}. Make sure the unit is powered, close to you, and running the Bluetooth firmware.`);
        }
    };

    const unlock = async (e) => {
        e?.preventDefault();
        setBusy(true);
        setError('');
        try {
            await write(`PIN:${pin.trim()}`);
            const status = await readStatus();
            applyStatus(status);
            if (!status.auth && !status.locked) setError('That PIN is not right.');
            if (status.auth) setPin('');
        } catch (err) {
            setError(`Could not send the PIN: ${err?.message || 'unknown problem'}`);
        } finally {
            setBusy(false);
        }
    };

    const send = async (command, label) => {
        setBusy(true);
        setError('');
        setInfo('');
        try {
            await write(command);
            setInfo(`${label} sent.`);
            setTimeout(async () => { try { applyStatus(await readStatus()); } catch { /* next poll will catch up */ } }, 600);
        } catch (err) {
            setError(`Could not send the command: ${err?.message || 'unknown problem'}`);
        } finally {
            setBusy(false);
        }
    };

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
                        </>
                    )}

                    {phase === 'connecting' && <Typography sx={{ color: 'var(--hl-ink-secondary)' }}>Connecting…</Typography>}

                    {phase === 'pin' && (
                        <form onSubmit={unlock}>
                            <Typography sx={{ color: 'var(--hl-ink)', fontWeight: 600 }}>Connected to {deviceName}</Typography>
                            <Typography sx={{ color: 'var(--hl-ink-secondary)', mb: 1 }}>Enter the unit&apos;s Bluetooth PIN to unlock the controls.</Typography>
                            <TextField
                                label="Bluetooth PIN" type="password" fullWidth margin="dense" value={pin}
                                onChange={(e) => { setPin(e.target.value); setError(''); }}
                                inputProps={{ inputMode: 'numeric', autoComplete: 'off', maxLength: 12 }} sx={fieldSx}
                            />
                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                <Button type="submit" disabled={busy || !pin.trim()} sx={solidBtn}>{busy ? 'Checking…' : 'Unlock'}</Button>
                                <Button onClick={() => dropLink('')} sx={outlineBtn}>Disconnect</Button>
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
                                <Button onClick={() => dropLink('')} sx={outlineBtn}>Disconnect</Button>
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
