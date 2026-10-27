import { useEffect } from "react";
import useLogout from "./useLogout";
import { markActive, isIdleExpired, setIdleNotice } from "../../utils/idleSession";

const EVENTS = ['pointerdown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'wheel'];
const CHECK_EVERY_MS = 15 * 1000;
const WRITE_EVERY_MS = 5 * 1000;   // activity is noted at most this often, so mouse moves stay cheap

// Signs the person out after IDLE_MINUTES without any activity, in this tab or any other.
const useIdleLogout = (enabled) => {
    const logout = useLogout();

    useEffect(() => {
        if (!enabled) return undefined;

        let lastWrite = 0;
        const onActivity = () => {
            const now = Date.now();
            if (now - lastWrite < WRITE_EVERY_MS) return;
            lastWrite = now;
            markActive();
        };

        markActive();
        lastWrite = Date.now();
        EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));

        // Compares clock times, so a laptop that slept or a tab that was frozen is still caught.
        const timer = setInterval(() => {
            if (isIdleExpired()) {
                setIdleNotice();
                logout();
            }
        }, CHECK_EVERY_MS);

        return () => {
            clearInterval(timer);
            EVENTS.forEach((name) => window.removeEventListener(name, onActivity));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);
};

export default useIdleLogout;
