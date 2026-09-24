import axios from 'axios';
import { setServerUnreachable } from './connectivityStore';

// In production (Vercel), the frontend and backend live on different
// domains. Calling the backend directly would make the login cookie a
// third-party cookie, which browsers increasingly block/drop outright —
// "Remember me" would then silently fail. Instead, requests go to /api on
// this same domain, and vercel.json rewrites/proxies that to the Railway
// backend server-side, so the cookie is set on this domain and stored as a
// normal first-party cookie. (VITE_API_URL just acts as the on/off flag for
// "are we in a split-domain production build" here — its literal value is
// what vercel.json's rewrite destination points at.)
// In local/LAN dev, VITE_API_URL is normally unset, so we fall back to
// whatever host the page itself was loaded from (localhost on this computer,
// or this computer's LAN IP when opened from a phone) — otherwise a phone
// would try to reach its own "localhost", where nothing is running.
const baseURL = import.meta.env.VITE_API_URL
    ? '/api'
    : typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:3001`
        : undefined;

// Flags the shared "server unreachable" banner on a true network failure
// (request never got a response) or a 5xx, and clears it the moment any
// request succeeds again. Login/Register keep their own existing messaging
// for `!err.response` on top of this — this only drives the global banner.
const attachConnectivityInterceptor = (instance) => {
    instance.interceptors.response.use(
        (response) => {
            setServerUnreachable(false);
            return response;
        },
        (error) => {
            const isNetworkError = !error?.response;
            const isServerError = error?.response?.status >= 500;
            setServerUnreachable(isNetworkError || isServerError);
            return Promise.reject(error);
        }
    );
};

// Without a timeout, a slow/restrictive network (e.g. some in-app browser
// WebViews) can hang a request forever — most visibly the silent
// login-check every page does on load, which would otherwise get stuck on
// "Loading..." with no way out.
const publicInstance = axios.create({ baseURL, timeout: 10000 });
export const axiosPrivate = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
    timeout: 10000,
});

attachConnectivityInterceptor(publicInstance);
attachConnectivityInterceptor(axiosPrivate);

export default publicInstance;