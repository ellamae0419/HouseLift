import jwt_decode from "jwt-decode";

const normalizeRoles = (roles) => {
    if (!roles) return [];
    return Array.isArray(roles) ? roles : [roles];
};

export const getRolesFromAuth = (auth) => {
    try {
        const decoded = auth?.accessToken ? jwt_decode(auth.accessToken) : undefined;
        return normalizeRoles(decoded?.user?.roles);
    } catch (error) {
        return [];
    }
};

export const hasAnyRole = (auth, allowedRoles = []) => {
    const roles = getRolesFromAuth(auth);
    return roles.some((role) => allowedRoles.includes(role));
};