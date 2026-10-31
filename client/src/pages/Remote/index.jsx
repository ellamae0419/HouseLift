import { useEffect, useState } from 'react';
import styles from './style.module.css';
import shellStyles from '../../components/ShopShell/shell.module.css';
import { setTitle } from '../../utils/generalFunctions';
import useHydroLiftBluetooth from '../../hooks/useHydroLiftBluetooth';

const CACHE = 'hl-remote-v1';   // the same name as in shop-site/public/sw-remote.js
const SHELL = '/index-shell';

// Saves this page and its files on the device, so it opens with no internet next time. Returns true when done.
const saveForOffline = async () => {
    if (!('serviceWorker' in navigator) || !('caches' in window)) return false;
    await navigator.serviceWorker.register('/sw-remote.js');
    await navigator.serviceWorker.ready;

    const cache = await caches.open(CACHE);
    const assets = [...document.querySelectorAll('script[src], link[rel="stylesheet"][href], link[rel="icon"][href], link[rel="apple-touch-icon"][href]')]
        .map((el) => el.src || el.href)
        .filter((href) => new URL(href).origin === window.location.origin);
    await cache.addAll([...new Set([...assets, `${window.location.origin}/logo.png`, `${window.location.origin}/remote.webmanifest`])]);

    const page = await fetch('/remote', { cache: 'no-store' });
    if (!page.ok) return false;
    await cache.put(SHELL, page);
    return true;
};

// The Bluetooth remote for the unit. It needs no login and no internet once it has been saved:
// the unit's own PIN is what keeps strangers out. Works in Chrome and Edge (Android and
// computers) and in the Bluefy browser on an iPhone.
export const Remote = () => {
    setTitle('HydroLift Bluetooth remote');
    const { supported, secure, phase, deviceName, pin, setPin, state, error, clearError, info, busy, connect, unlock, send, disconnect } = useHydroLiftBluetooth();
    const [saved, setSaved] = useState('checking');   // checking, yes, no

    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/remote.webmanifest';
        document.head.appendChild(link);

        let alive = true;
        saveForOffline()
            .then((ok) => { if (alive) setSaved(ok ? 'yes' : 'no'); })
            .catch(() => { if (alive) setSaved('no'); });
        return () => { alive = false; link.remove(); };
    }, []);

    const moving = !!state?.moving;

    return (
        <main className={styles.page}>
            <div className={styles.wrap}>
                <div className={styles.brand}>
                    <img src="/logo.png" alt="" width="40" height="40" />
                    <span>HydroLift</span>
                </div>
                <h1 className={styles.title}>Bluetooth remote</h1>
                <p className={styles.intro}>Raise or lower your HydroLift from this phone or computer when you are standing near it. It needs no WiFi and no login.</p>

                {!supported && (
                    <p className={`${styles.note} ${styles.warn}`} role="alert">
                        This browser cannot use Bluetooth. On an Android phone or a computer, open this page in Chrome or Edge. On an iPhone, open it in the free Bluefy browser (Apple does not allow Bluetooth in Safari or Chrome on iPhone).
                    </p>
                )}
                {supported && !secure && (
                    <p className={`${styles.note} ${styles.warn}`} role="alert">Bluetooth only works on a secure page. Open this address with https:// at the start.</p>
                )}
                {error && <p className={`${styles.note} ${styles.bad}`} role="alert">{error}</p>}
                {info && !error && <p className={`${styles.note} ${styles.good}`} role="status">{info}</p>}

                <section className={styles.card}>
                    {phase === 'idle' && (
                        <>
                            <p>Stand near the unit with its power on, then tap Connect and choose your HydroLift from the list. Bluetooth reaches about 10 meters, less through walls.</p>
                            <button type="button" className={shellStyles.btn} onClick={connect} disabled={!supported || !secure}>Connect to my HydroLift</button>
                        </>
                    )}

                    {phase === 'connecting' && <p>Connecting…</p>}

                    {phase === 'pin' && (
                        <form onSubmit={unlock} className={styles.form}>
                            <strong>Connected to {deviceName}</strong>
                            <label htmlFor="pin">Enter the unit&apos;s Bluetooth PIN
                                <input
                                    id="pin" type="password" inputMode="numeric" autoComplete="off" maxLength={12}
                                    value={pin} onChange={(e) => { setPin(e.target.value); clearError(); }}
                                />
                            </label>
                            <div className={styles.row}>
                                <button type="submit" className={shellStyles.btn} disabled={busy || !pin.trim()}>{busy ? 'Checking…' : 'Unlock'}</button>
                                <button type="button" className={`${shellStyles.btn} ${shellStyles.btnOutline}`} onClick={disconnect}>Disconnect</button>
                            </div>
                        </form>
                    )}

                    {phase === 'ready' && state && (
                        <>
                            <strong>Connected to {deviceName}</strong>
                            <div className={styles.tiles}>
                                <div className={styles.tile}><small>Water level (0 to 4)</small><b>{state.wl.toFixed(1)}</b></div>
                                <div className={styles.tile}>
                                    <small>Platform height</small><b>{state.pos}%</b>
                                    <div className={styles.bar}><div style={{ width: `${Math.min(100, Math.max(0, state.pos))}%` }} /></div>
                                </div>
                                <div className={styles.tile}><small>Status</small><b>{moving ? 'Moving…' : 'Resting'}</b><small>Auto lift is {state.auto ? 'on' : 'off'}</small></div>
                            </div>
                            <div className={styles.row}>
                                <button type="button" className={shellStyles.btn} onClick={() => send('FULL_UP', 'Lift')} disabled={busy || moving}>Lift fully</button>
                                <button type="button" className={shellStyles.btn} onClick={() => send('FULL_DOWN', 'Lower')} disabled={busy || moving}>Lower fully</button>
                            </div>
                            <div className={styles.row}>
                                <button type="button" className={`${shellStyles.btn} ${shellStyles.btnOutline}`} onClick={() => send('STEP_UP', 'Step up')} disabled={busy || moving}>Step up</button>
                                <button type="button" className={`${shellStyles.btn} ${shellStyles.btnOutline}`} onClick={() => send('STEP_DOWN', 'Step down')} disabled={busy || moving}>Step down</button>
                            </div>
                            <div className={styles.row}>
                                <button type="button" className={`${shellStyles.btn} ${shellStyles.btnOutline}`} onClick={() => send(state.auto ? 'AUTO_OFF' : 'AUTO_ON', state.auto ? 'Auto lift off' : 'Auto lift on')} disabled={busy}>
                                    {state.auto ? 'Turn auto lift off' : 'Turn auto lift on'}
                                </button>
                                <button type="button" className={`${shellStyles.btn} ${shellStyles.btnOutline}`} onClick={disconnect}>Disconnect</button>
                            </div>
                        </>
                    )}
                </section>

                <p className={styles.note} id="offline-status">
                    {saved === 'yes' && <><strong>Saved on this device.</strong> You can open this page again with no internet. To put it on your home screen, use your browser menu: Install app or Add to Home screen.</>}
                    {saved === 'checking' && 'Saving this page on your device so it works with no internet…'}
                    {saved === 'no' && 'This page could not be saved for offline use in this browser. It still works while you have internet.'}
                </p>
                <p className={styles.note}>Flood texts and the dashboard still need the internet. This page is only a remote control for when you are next to the unit.</p>
            </div>
        </main>
    );
};

export default Remote;
