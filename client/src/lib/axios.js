import axios from 'axios';

// In production (Vercel), the frontend and backend live on different
// domains, so VITE_API_URL (set at build time) is required and used as-is.
// In local/LAN dev, VITE_API_URL is normally unset, so we fall back to
// whatever host the page itself was loaded from (localhost on this computer,
// or this computer's LAN IP when opened from a phone) — otherwise a phone
// would try to reach its own "localhost", where nothing is running.
const baseURL = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:3001`
        : undefined;

export default axios.create({ baseURL });

export const axiosPrivate = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});