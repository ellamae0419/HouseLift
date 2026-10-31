import { useCallback, useEffect, useRef, useState } from 'react';

// The same ids as arduino/HouseLift-bluetooth/ble_control.h.
const SERVICE_UUID = '7f1c0001-5b6a-4c2e-9f3a-8d2b1c4e6a10';
const COMMAND_UUID = '7f1c0002-5b6a-4c2e-9f3a-8d2b1c4e6a10';
const STATUS_UUID = '7f1c0003-5b6a-4c2e-9f3a-8d2b1c4e6a10';

const encode = (text) => new TextEncoder().encode(text);
const emptyLink = () => ({ device: null, command: null, status: null, queue: Promise.resolve(), timer: null });

// Talks to a HydroLift unit over Bluetooth Low Energy (Web Bluetooth). Used by the dashboard's
// "Bluetooth control" page and by the offline /remote page, so both behave the same way.
// phase: idle -> connecting -> pin -> ready.   state: { wl, pos, auto, moving } once signed in.
// It works in Chrome and Edge (Android and computers) and in the Bluefy browser on an iPhone.
const useHydroLiftBluetooth = () => {
    const supported = typeof navigator !== 'undefined' && !!navigator.bluetooth;
    const secure = typeof window !== 'undefined' ? window.isSecureContext : true;

    const [phase, setPhase] = useState('idle');
    const [deviceName, setDeviceName] = useState('');
    const [pin, setPin] = useState('');
    const [state, setState] = useState(null);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [busy, setBusy] = useState(false);

    const link = useRef(emptyLink());

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

    const dropLink = useCallback((message) => {
        stopPolling();
        const { device } = link.current;
        try { if (device?.gatt?.connected) device.gatt.disconnect(); } catch { /* already gone */ }
        link.current = emptyLink();
        setPhase('idle');
        setState(null);
        setPin('');
        if (message) setError(message);
    }, []);

    useEffect(() => () => dropLink(''), [dropLink]);

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
            setTimeout(async () => { try { applyStatus(await readStatus()); } catch { /* the next poll will catch up */ } }, 600);
        } catch (err) {
            setError(`Could not send the command: ${err?.message || 'unknown problem'}`);
        } finally {
            setBusy(false);
        }
    };

    const disconnect = () => dropLink('');
    const clearError = () => setError('');

    return { supported, secure, phase, deviceName, pin, setPin, state, error, clearError, info, busy, connect, unlock, send, disconnect };
};

export default useHydroLiftBluetooth;
