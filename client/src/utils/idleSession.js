// Automatic sign-out for people who walk away without pressing Log out.
// The time of the last click, key press, scroll or touch is kept in localStorage, so it is shared by
// every open tab and survives closing the browser. Coming back after IDLE_LIMIT_MS ends the session.
export const IDLE_MINUTES = 15;
export const IDLE_LIMIT_MS = IDLE_MINUTES * 60 * 1000;

const KEY = 'hlLastActivity';
const NOTICE_KEY = 'hlIdleLogoutNotice';

const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

export const markActive = () => safe(() => localStorage.setItem(KEY, String(Date.now())));
export const clearActivity = () => safe(() => localStorage.removeItem(KEY));

// True only when there is a record of past activity and it is too old. A browser that has never
// been used here has no record, so nobody is signed out by mistake.
export const isIdleExpired = () => {
    const last = Number(safe(() => localStorage.getItem(KEY), null));
    return Number.isFinite(last) && last > 0 && Date.now() - last > IDLE_LIMIT_MS;
};

// The login page shows "you were signed out" once after an automatic sign-out.
export const setIdleNotice = () => safe(() => sessionStorage.setItem(NOTICE_KEY, '1'));
export const takeIdleNotice = () => safe(() => {
    const had = sessionStorage.getItem(NOTICE_KEY) === '1';
    sessionStorage.removeItem(NOTICE_KEY);
    return had;
}, false);
