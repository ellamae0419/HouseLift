import { useLocation, Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/auth/useAuth";
import { Error } from "../pages/Error/index";
import { getRolesFromAuth } from "../utils/roles";
import useIdleLogout from "../hooks/auth/useIdleLogout";

export const RequireAuth = ({ allowedRoles }) => {
    const { auth } = useAuth();
    const location = useLocation();

    const roles = getRolesFromAuth(auth);

    // Signs the person out after a quiet spell, so a forgotten tab does not stay open for days.
    useIdleLogout(Boolean(auth?.accessToken));

    if (!auth?.accessToken) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return (
        roles.find(role => allowedRoles?.includes(role))
            ? <Outlet />
            : auth?.username && <Error code="403"/>
    )
}

export const RequireNotAuth = () => {
    const { auth } = useAuth();
    const location = useLocation();

    return (
        auth?.username
            ? <Navigate to="/" state={{ from: location }} replace />
            : <Outlet />
    )
}