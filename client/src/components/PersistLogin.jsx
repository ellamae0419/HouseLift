import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import useRefreshToken from "../hooks/auth/useRefreshToken";
import useAuth from "../hooks/auth/useAuth";
import axios from "../lib/axios";
import { isIdleExpired, clearActivity, setIdleNotice } from "../utils/idleSession";

const PersistLogin = () => {
    const [isLoading, setIsLoading] = useState(true);
    const refresh = useRefreshToken();
    const { auth, setAuth } = useAuth();

    useEffect(() => {
        let isMounted = true;

        // Opened from the shop's "Log in" link (/login?fresh=1): always show the login page, never an
        // account that was left signed in. The old session is ended on the server and the cookie cleared.
        const params = new URLSearchParams(window.location.search);
        const fresh = window.location.pathname === '/login' && params.has('fresh');

        // Closed the browser or walked away for too long: the session is over, even though the login
        // cookie is still valid for days.
        const expired = isIdleExpired();

        const endSession = async () => {
            await axios('/user/logout', { withCredentials: true }).catch(() => {});
            setAuth({});
            clearActivity();
            if (expired && !fresh) setIdleNotice();
            if (fresh) window.history.replaceState(null, '', '/login');
            isMounted && setIsLoading(false);
        };

        const checkRefreshToken = async () => {
            try {
                await refresh();
            } catch(err) {
                console.error(err);
            } finally {
                isMounted && setIsLoading(false);
            }
        }

        // A refresh wipes the in-memory access token, so always try to get a new
        // one from the login cookie. "Remember me" only pre-fills the login form;
        // it no longer decides whether a refresh keeps you signed in.
        if (fresh || expired) endSession();
        else if (!auth?.accessToken) checkRefreshToken();
        else setIsLoading(false);

        return () => isMounted = false;
    }, [])

    return isLoading
        ? <h2 className="container">Loading...</h2>
        : <Outlet />;
}

export default PersistLogin;