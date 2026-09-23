import axios from 'axios';

// Talk to whatever host the page itself was loaded from (localhost on this
// computer, or this computer's LAN IP when opened from a phone) instead of a
// hardcoded VITE_API_URL — otherwise a phone would try to reach its own
// "localhost", where nothing is running.
const baseURL = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : import.meta.env.VITE_API_URL;

export default axios.create({ baseURL });

export const axiosPrivate = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});