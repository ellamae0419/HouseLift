import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import useRefreshToken from "../hooks/auth/useRefreshToken";
import useAuth from "../hooks/auth/useAuth";

const PersistLogin = () => {
    const [isLoading, setIsLoading] = useState(true);
    const refresh = useRefreshToken();
    const { auth } = useAuth();

    useEffect(() => {
        let isMounted = true;

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
        !auth?.accessToken ? checkRefreshToken() : setIsLoading(false);

        return () => isMounted = false;
    }, [])

    return isLoading
        ? <h2 className="container">Loading...</h2>
        : <Outlet />;
}

export default PersistLogin;