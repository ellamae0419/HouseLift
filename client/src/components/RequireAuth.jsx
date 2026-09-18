import { useLocation, Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/auth/useAuth";
import { Error } from "../pages/Error/index";
import { getRolesFromAuth } from "../utils/roles";

export const RequireAuth = ({ allowedRoles }) => {
    const { auth } = useAuth();
    const location = useLocation();

    const roles = getRolesFromAuth(auth);

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