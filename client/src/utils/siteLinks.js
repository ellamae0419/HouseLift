// The shop and the dashboard are two separate websites. Each is told the other's
// address when it is built: VITE_APP_URL on the shop (where customers log in) and
// VITE_SHOP_URL on the dashboard site (where people go to buy). While developing on
// your own computer they fall back to this computer on ports 1234 and 1235.
const clean = (value) => (value || '').replace(/\/+$/, '');

const devFallback = (port) => (
    typeof window !== 'undefined' && !import.meta.env.PROD
        ? `${window.location.protocol}//${window.location.hostname}:${port}`
        : ''
);

export const appBase = clean(import.meta.env.VITE_APP_URL) || devFallback(1234);
export const shopBase = clean(import.meta.env.VITE_SHOP_URL) || devFallback(1235);

export const appUrl = (path = '/') => `${appBase}${path}`;
export const shopUrl = (path = '/') => `${shopBase}${path}`;
