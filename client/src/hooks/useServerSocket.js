import { useEffect, useRef, useState } from 'react';
import useAuth from './auth/useAuth';

const RECONNECT_MIN_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 15000;

export default function useServerSocket() {
    const { auth } = useAuth();
    const accessToken = auth?.accessToken;

    const [wlValue, setWlValue] = useState(null);
    const [connected, setConnected] = useState(false);
    const [readingsById, setReadingsById] = useState({});
    // Real device online/offline, pushed by the server the instant a device
    // socket connects or disconnects — not just "is my own browser tab open".
    const [deviceStatusById, setDeviceStatusById] = useState({});
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectDelayRef = useRef(RECONNECT_MIN_DELAY_MS);
    const stoppedRef = useRef(false);

    useEffect(() => {
        // No token yet (not logged in, or still refreshing on page load) —
        // nothing to connect with.
        if (!accessToken) return undefined;

        stoppedRef.current = false;

        // In production (Vercel), the backend lives on a different domain, so
        // VITE_API_URL (set at build time) is required and used as-is, just
        // swapped to a ws(s):// URL. In local/LAN dev, VITE_API_URL is normally
        // unset, so we fall back to whatever host the page itself was loaded
        // from (localhost on this computer, or this computer's LAN IP when
        // opened from a phone) — otherwise a phone would try to open a
        // WebSocket to its own "localhost".
        let wsUrl;
        if (import.meta.env.VITE_API_URL) {
            wsUrl = import.meta.env.VITE_API_URL.replace(/^http/, 'ws');
        } else {
            const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
            const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            wsUrl = `${protocol}//${hostname}:3001`;
        }
        // The server tells a logged-in browser apart from a device by this
        // token — without it (or with an expired one) the connection is
        // closed as unauthorized.
        wsUrl += `?token=${encodeURIComponent(accessToken)}`;

        const connect = () => {
            if (stoppedRef.current) return;

            try {
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.addEventListener('open', () => {
                    console.log('WS connected to', wsUrl.split('?')[0]);
                    setConnected(true);
                    // Reset backoff once a connection actually succeeds.
                    reconnectDelayRef.current = RECONNECT_MIN_DELAY_MS;
                });

                ws.addEventListener('message', (ev) => {
                    try {
                        const msg = JSON.parse(ev.data);
                        if (msg?.type === 'sensor-reading') {
                            const rawValue = msg.wl_value ?? msg.wlValue ?? msg.value;
                            const v = Number(rawValue);
                            console.debug('WS sensor-reading received', msg.esp32_id, v);
                            if (!Number.isNaN(v)) {
                                setWlValue(v);
                                if (msg.esp32_id) {
                                    setReadingsById((prev) => ({ ...prev, [msg.esp32_id]: v }));
                                }
                            }
                        } else if (msg?.type === 'device-status' && msg.esp32_id) {
                            setDeviceStatusById((prev) => ({ ...prev, [msg.esp32_id]: !!msg.online }));
                        }
                    } catch (err) {
                        console.warn('Invalid WS message', err);
                    }
                });

                ws.addEventListener('close', () => {
                    console.log('WS disconnected');
                    setConnected(false);
                    scheduleReconnect();
                });
                ws.addEventListener('error', (e) => {
                    console.error('WS error', e);
                });
            } catch (err) {
                console.error('Failed to create WS', err);
                scheduleReconnect();
            }
        };

        // Retries with capped exponential backoff instead of giving up after
        // one drop — a server restart or brief network blip shouldn't require
        // the user to navigate away and back just to get live data again.
        // Note: the access token lives only 10 seconds, so a retry here reuses
        // whatever token this effect closed over — if it's since expired, the
        // server will keep closing the socket until something elsewhere
        // (e.g. an API call) refreshes auth.accessToken and this effect reruns.
        const scheduleReconnect = () => {
            if (stoppedRef.current) return;
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(() => {
                reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, RECONNECT_MAX_DELAY_MS);
                connect();
            }, reconnectDelayRef.current);
        };

        connect();

        return () => {
            stoppedRef.current = true;
            clearTimeout(reconnectTimeoutRef.current);
            try { wsRef.current?.close(); } catch (e) { /* socket already closed */ }
        };
    }, [accessToken]);

    return { wlValue, connected, readingsById, deviceStatusById };
}
