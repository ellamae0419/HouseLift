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

// Customers who ordered online are locked out of the app until they enter the
// serial code they were given; the server records that in the login token.
// Tokens issued before this existed carry no flag and count as activated.
export const isActivated = (auth) => {
    try {
        const decoded = auth?.accessToken ? jwt_decode(auth.accessToken) : undefined;
        return decoded?.user?.activated !== false;
    } catch (error) {
        return true;
    }
};

export const hasAnyRole = (auth, allowedRoles = []) => {
    const roles = getRolesFromAuth(auth);
    return roles.some((role) => allowedRoles.includes(role));
};