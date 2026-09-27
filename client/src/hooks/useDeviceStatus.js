import { useCallback, useEffect, useState } from 'react';
import useAxiosPrivate from './auth/useAxiosPrivate';
import useServerSocket from './useServerSocket';

// How often to re-check with the server. The socket pushes device-status the
// instant a device connects or drops, but a browser that opens later has
// missed those pushes, so it needs an initial (and periodic) read.
const POLL_MS = 20000;

/**
 * Real device online/offline, as opposed to "is my own browser connected".
 * Pass an esp32_id to check a specific house (admin); omit it for the
 * logged-in user's own device.
 */
export default function useDeviceStatus(esp32Id) {
    const axiosPrivate = useAxiosPrivate();
    const { deviceStatusById } = useServerSocket();
    const [fetched, setFetched] = useState({ online: false, lastSeenAt: null, loaded: false });

    const refresh = useCallback(async () => {
        try {
            const query = esp32Id ? `?esp32_id=${encodeURIComponent(esp32Id)}` : '';
            const res = await axiosPrivate.get(`/users/esp32-status${query}`);
            setFetched({ online: !!res.data?.online, lastSeenAt: res.data?.lastSeenAt || null, loaded: true });
        } catch {
            // A user with no device linked yet gets a 404 — treat that as
            // offline rather than surfacing an error on every dashboard.
            setFetched({ online: false, lastSeenAt: null, loaded: true });
        }
    }, [axiosPrivate, esp32Id]);

    useEffect(() => {
        refresh();
        const timer = setInterval(refresh, POLL_MS);
        return () => clearInterval(timer);
    }, [refresh]);

    // A live push always wins over the last poll, since it's newer.
    const pushed = esp32Id ? deviceStatusById[esp32Id] : Object.values(deviceStatusById)[0];
    const online = pushed !== undefined ? pushed : fetched.online;

    return { online, lastSeenAt: fetched.lastSeenAt, loaded: fetched.loaded, refresh };
}
