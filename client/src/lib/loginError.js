export const getLoginErrorMessage = (error) => {
    if (!error?.response) {
        return 'Cannot reach the sign-in service. Check your connection and try again.';
    }

    const { status, data } = error.response;
    if (status === 404 || status >= 500) {
        return 'The sign-in service is unavailable right now. Please try again later.';
    }

    if ([400, 401, 403, 429].includes(status)) {
        const message = data?.message;
        if (typeof message === 'string' && message.trim()) return message;
        if (status === 429) return 'Too many login attempts. Please try again in a few minutes.';
        return 'Unable to sign in. Check your username and password and try again.';
    }

    return 'Unable to sign in. Please try again.';
};
